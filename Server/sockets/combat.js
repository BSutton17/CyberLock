// Runs each room's fight on the server. Players send intents; the rules engine (shared/combat)
// decides what happens; this module paces turns, runs enemies, keeps time limits, narrates,
// and broadcasts the result to everyone as `combat_state`.
import * as engine from '../../shared/combat/engine.js';
import {
  advanceTurn,
  tickEnemyCorpses,
  calculateTurnOrder,
  removeAllyFromTurnOrder,
  insertAllyIntoTurnOrder,
  isEnemyAlive
} from '../../shared/combat/turnOrder.js';
import { generateEncounterEnemies, getEncounterConfig, isFinalEncounter, TOTAL_ENCOUNTERS } from '../../shared/combat/encounters.js';
import { getAbility } from '../../shared/combat/effects.js';
import { generateEnemySpawnPositions, generatePlayerSpawnPositions } from '../game/spawning.js';
import { isBot } from '../game/bots.js';
import { chooseStep } from '../../shared/combat/partyAI.js';
import { flavorCombatLog } from '../narrator/combatFlavor.js';

const ENDED_COMBAT_CLEANUP_MS = 5000;
const DISCONNECTED_TURN_TIMEOUT_MS = 5000;
// Most steps (move-and-act, ability, reposition) a bot takes in one turn.
const MAX_BOT_STEPS = 4;
// Steps a live bot weighs per decision, to keep the server responsive.
const BOT_MAX_CANDIDATES = 20;
const SCENE_KEY_PATTERN = /^[a-z_]{1,30}$/;

export function createCombatController({
  io,
  state,
  timing,
  narrator = null,
  logger = console,
  buildNarratorContext = () => ({}),
  generateEnemies = generateEncounterEnemies,
  random = Math.random,
  // Where the party starts each fight. Tests replace this to set up exact positions.
  spawnPlayers = (players, characters, sceneKey) => generatePlayerSpawnPositions(players, characters, sceneKey, random)
}) {
  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  // Bots are always "connected": they take turns and can be targeted like anyone else.
  const isConnected = (room, playerName) =>
    isBot(state.rooms[room], playerName) || (state.sockets[room]?.[playerName]?.size || 0) > 0;

  const connectedPlayers = (room) => (state.rooms[room]?.players || []).filter(player => isConnected(room, player));

  const connectedHumans = (room) => connectedPlayers(room).filter(player => !isBot(state.rooms[room], player));

  const livingPlayers = (room) => {
    const roomState = state.rooms[room];
    if (!roomState) return [];
    return roomState.players.filter(player => (roomState.characterSelections?.[player]?.stats?.health || 0) > 0);
  };

  const activeCombat = (room) => {
    const combat = state.combat[room];
    return combat && !combat.endedResult ? combat : null;
  };

  function contextFor(room) {
    const combat = state.combat[room];
    const roomState = state.rooms[room];
    if (!combat || !roomState) return null;
    roomState.cooldowns = roomState.cooldowns || {};
    return {
      combat,
      characters: roomState.characterSelections,
      cooldowns: roomState.cooldowns,
      targetablePlayers: connectedPlayers(room),
      random
    };
  }

  // ---------------------------------------------------------------------------
  // Timers. One pending step per room; callbacks check they still belong to the same turn.
  // ---------------------------------------------------------------------------

  function clearTimer(room) {
    const timer = state.combatTimers[room];
    if (timer) clearTimeout(timer);
    delete state.combatTimers[room];
  }

  function schedule(room, delayMs, step) {
    clearTimer(room);
    const combat = state.combat[room];
    const turnNumber = combat?.turnNumber;
    const run = () => {
      delete state.combatTimers[room];
      if (state.combat[room] !== combat || combat.endedResult || combat.turnNumber !== turnNumber) return;
      step();
    };
    if (!(delayMs > 0)) {
      run();
      return;
    }
    const timer = setTimeout(run, delayMs);
    timer.unref?.();
    state.combatTimers[room] = timer;
  }

  // ---------------------------------------------------------------------------
  // Broadcasting
  // ---------------------------------------------------------------------------

  function snapshotFor(room, events = []) {
    const ctx = contextFor(room);
    if (!ctx) return null;
    const combat = ctx.combat;
    return {
      ...engine.combatSnapshot(ctx),
      events,
      totalEncounters: TOTAL_ENCOUNTERS,
      turnMsRemaining: combat.turnDeadline ? Math.max(0, combat.turnDeadline - Date.now()) : null,
      paused: !!combat.paused
    };
  }

  function broadcast(room, events = []) {
    const snapshot = snapshotFor(room, events);
    if (snapshot) io.to(room).emit('combat_state', snapshot);
  }

  function sendStateTo(socket, room) {
    const snapshot = snapshotFor(room);
    if (snapshot) socket.emit('combat_state', snapshot);
  }

  // Combat commentary runs one line at a time per room so lines arrive in order.
  function narrate(room, actorId, summary) {
    if (!summary?.length) return;
    const roomState = state.rooms[room];
    const actorName = roomState?.characterSelections?.[actorId]?.name
      || state.combat[room]?.enemies?.find(enemy => enemy.id === actorId)?.name
      || actorId;
    const message = `${actorName}'s turn ends: ${summary.join(' ')}`;
    // If the narrator is missing or fails, still tell it as a story rather than a damage log.
    const fallbackText = flavorCombatLog(summary, buildNarratorContext(room), random) || summary.join(' ');

    const previous = state.combatNarration[room] || Promise.resolve();
    const next = previous.then(async () => {
      let text = fallbackText;
      try {
        const result = narrator
          ? await narrator.handleEvent({ room, eventType: 'turn_action', message, data: { actor: actorName, summaries: summary }, context: buildNarratorContext(room) })
          : null;
        text = result?.response || fallbackText;
      } catch (error) {
        logger.warn?.(`[COMBAT] narration failed: ${error.message}`);
      }
      if (state.rooms[room]) io.to(room).emit('combat_narration', { actor: actorName, text });
    });
    state.combatNarration[room] = next.catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Ending the fight
  // ---------------------------------------------------------------------------

  // Partly-used cooldowns carry over between fights only for ultimates.
  function resetNonUltimateCooldowns(roomState) {
    for (const cooldowns of Object.values(roomState.cooldowns || {})) {
      for (const abilityId of Object.keys(cooldowns)) {
        if (!getAbility(abilityId)?.isUltimate) cooldowns[abilityId] = 0;
      }
    }
  }

  function endCombat(room, result) {
    const combat = state.combat[room];
    const roomState = state.rooms[room];
    if (!combat || combat.endedResult) return;

    combat.endedResult = result;
    combat.turn = null;
    combat.turnDeadline = null;
    clearTimer(room);

    // Where the party stands on the story map afterwards.
    const partyPositions = Object.fromEntries(
      (roomState?.players || []).map(player => [player, combat.positions[player]]).filter(([, position]) => position)
    );

    if (roomState) {
      if (result === 'all_dead') {
        roomState.gameOver = true;
      } else {
        // Victory: everyone is patched up (the fallen too) and cooldowns reset.
        for (const [player, character] of Object.entries(roomState.characterSelections)) {
          const maxHealth = Math.max(1, character?.stats?.maxHealth || character?.stats?.health || 1);
          roomState.characterSelections[player] = { ...character, stats: { ...character.stats, health: maxHealth, maxHealth } };
        }
        resetNonUltimateCooldowns(roomState);
      }
      roomState.partyPositions = partyPositions;
    }

    combat.activeEffects = [];
    broadcast(room);
    io.to(room).emit('combat_ended', {
      result,
      encounterIndex: combat.encounterIndex,
      postCombat: combat.postCombat,
      isFinalEncounter: isFinalEncounter(combat.encounterIndex),
      partyPositions,
      characters: roomState?.characterSelections || {}
    });
    logger.log?.(`[COMBAT] Room ${room} encounter ${combat.encounterIndex} ended: ${result}`);

    // Keep the finished fight briefly so late clicks are recognised as stale.
    setTimeout(() => {
      if (state.combat[room] === combat) delete state.combat[room];
    }, ENDED_COMBAT_CLEANUP_MS).unref?.();
  }

  // Ends the fight if one side is gone. Returns true when it ended.
  function checkEnd(room) {
    const combat = state.combat[room];
    if (!combat) return true;
    if (combat.endedResult) return true;

    if (!(combat.enemies || []).some(isEnemyAlive)) {
      endCombat(room, 'enemies_defeated');
      return true;
    }
    // Disconnected players don't count as dead.
    if ((state.rooms[room]?.players || []).length > 0 && livingPlayers(room).length === 0) {
      endCombat(room, 'all_dead');
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Turn flow
  // ---------------------------------------------------------------------------

  // Tells everyone whose turn it is and starts its clock (or runs the enemy).
  function announce(room, { firstEnemyDelayMs = null } = {}) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult) return;
    const { combat } = ctx;
    const turn = combat.turn;
    combat.paused = false;
    combat.turnDeadline = null;

    if (!turn) {
      checkEnd(room);
      return;
    }

    if (turn.type === 'ally' && isBot(state.rooms[room], turn.id)) {
      // Nobody watching: wait for someone to come back rather than playing on alone.
      if (connectedHumans(room).length === 0) {
        combat.paused = true;
        clearTimer(room);
        broadcast(room);
        return;
      }
      broadcast(room);
      schedule(room, botDelay(), () => runBotStep(room));
      return;
    }

    if (turn.type === 'ally') {
      const limit = isConnected(room, turn.id) ? timing.allyTurnTimeoutMs : Math.min(DISCONNECTED_TURN_TIMEOUT_MS, timing.allyTurnTimeoutMs);
      if (limit > 0) {
        combat.turnDeadline = Date.now() + limit;
        schedule(room, limit, () => {
          logger.log?.(`[COMBAT] ${turn.id}'s turn timed out in room ${room}`);
          io.to(room).emit('turn_timed_out', { playerName: turn.id });
          endTurn(room);
        });
      }
      broadcast(room);
      return;
    }

    // Enemy turn. With nobody connected there is nobody to fight: wait until someone returns.
    if (connectedHumans(room).length === 0) {
      combat.paused = true;
      clearTimer(room);
      broadcast(room);
      return;
    }

    broadcast(room);
    schedule(room, firstEnemyDelayMs ?? timing.enemyThinkMs, () => runEnemyTurn(room));
  }

  function runEnemyTurn(room) {
    const ctx = contextFor(room);
    if (!ctx) return;
    const turn = ctx.combat.turn;
    if (!turn || turn.type !== 'enemy') return;

    const plan = engine.planEnemy(ctx, turn.id);
    const first = engine.runEnemyAbilityAndMove(ctx, turn.id, plan);
    broadcast(room, first.events);
    if (afterAction(room)) return;

    const stepMs = first.events.find(event => event.type === 'move')?.stepMs || 0;
    const moveTimeMs = first.moveSteps * stepMs * (timing.animationScale ?? 1);

    if (!plan?.useWeapon) {
      schedule(room, moveTimeMs + timing.enemyTurnEndDelayMs, () => endTurn(room));
      return;
    }

    schedule(room, moveTimeMs + timing.enemyAttackDelayMs, () => {
      const result = engine.runEnemyAttack(contextFor(room), turn.id, plan);
      broadcast(room, result.events);
      if (afterAction(room)) return;
      schedule(room, timing.enemyTurnEndDelayMs, () => endTurn(room));
    });
  }

  const botDelay = () => timing.botStepMs ?? timing.enemyThinkMs;

  // One step of a bot's turn: the party AI picks it, then it goes through the same rules a
  // player's intent does. The next step (or the end of the turn) is scheduled afterwards.
  function runBotStep(room) {
    const ctx = contextFor(room);
    if (!ctx) return;
    const turn = ctx.combat.turn;
    if (!turn || turn.type !== 'ally' || turn.finished || !isBot(state.rooms[room], turn.id)) return;

    turn.botSteps = (turn.botSteps || 0) + 1;
    let step = null;
    try {
      step = turn.botSteps <= MAX_BOT_STEPS
        ? chooseStep(ctx, turn.id, { seed: Math.floor(random() * 1e9), maxCandidates: BOT_MAX_CANDIDATES })
        : null;
    } catch (error) {
      logger.warn?.(`[COMBAT] bot ${turn.id} could not decide: ${error.message}`);
    }
    if (!step) {
      endTurn(room);
      return;
    }

    const here = ctx.combat.positions[turn.id];
    let acted = false;
    if (step.move && here && (step.move.row !== here.row || step.move.col !== here.col)) {
      const moved = engine.movePlayer(ctx, turn.id, { row: step.move.row, col: step.move.col });
      if (moved.ok) {
        acted = true;
        broadcast(room, moved.events);
      }
    }
    if (step.kind === 'attack' || step.kind === 'ability') {
      const result = step.kind === 'attack'
        ? engine.attack(ctx, turn.id, step.targetId)
        : ACTIONS.ability(ctx, turn.id, step);
      if (result.ok) {
        acted = true;
        broadcast(room, result.events);
      }
    }
    if (afterAction(room)) return;

    if (!acted || !engine.canStillAct(ctx, turn.id)) {
      schedule(room, timing.autoEndTurnDelayMs, () => endTurn(room));
      return;
    }
    schedule(room, botDelay(), () => runBotStep(room));
  }

  // After anything happens: end the fight if a side is gone, or the turn if its owner fell.
  // Returns true when the current turn is over.
  function afterAction(room) {
    if (checkEnd(room)) return true;
    const turn = state.combat[room]?.turn;
    if (turn?.actorDied) {
      endTurn(room, { delayMs: 0 });
      return true;
    }
    return false;
  }

  // Ends the current turn (effects tick), narrates it, then moves on after `delayMs`.
  function endTurn(room, { delayMs } = {}) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult || !ctx.combat.turn || ctx.combat.turn.finished) return;
    const turn = ctx.combat.turn;

    clearTimer(room);
    ctx.combat.turnDeadline = null;
    const { events, summary } = engine.finishTurn(ctx);
    broadcast(room, events);
    narrate(room, turn.id, summary);
    if (checkEnd(room)) return;

    const pause = delayMs ?? (turn.type === 'ally' ? timing.allyTurnAdvanceDelayMs : (timing.enemyTurnAdvanceDelayMs ?? 0));
    schedule(room, pause, () => advance(room));
  }

  function advance(room) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult) return;
    const { combat } = ctx;
    const finished = combat.turn ? { type: combat.turn.type, id: combat.turn.id } : null;

    advanceTurn(combat, finished);
    tickEnemyCorpses(combat);
    if (checkEnd(room)) return;

    engine.beginTurn(ctx);
    announce(room);
  }

  // ---------------------------------------------------------------------------
  // Starting a fight
  // ---------------------------------------------------------------------------

  /** Starts the room's next story fight. Returns false if one is already running or the story is over. */
  function startCombat(room, { sceneKey, playerPositions } = {}) {
    const roomState = state.rooms[room];
    if (!roomState || activeCombat(room)) return false;

    const encounterIndex = roomState.encountersStarted || 0;
    if (encounterIndex >= TOTAL_ENCOUNTERS) return false;

    clearTimer(room);
    const config = getEncounterConfig(encounterIndex);
    const scene = typeof sceneKey === 'string' && SCENE_KEY_PATTERN.test(sceneKey) ? sceneKey : 'street';
    const partyLevel = Math.max(1, ...roomState.players.map(player => Number(roomState.characterSelections[player]?.level) || 1));
    const enemies = generateEnemies({
      encounterIndex,
      partyFaction: roomState.selectedFaction,
      partySize: roomState.players.length,
      partyLevel,
      random
    });

    roomState.encountersStarted = encounterIndex + 1;
    roomState.gameOver = false;
    roomState.lastStoryMessage = null;
    roomState.cooldowns = roomState.cooldowns || {};
    resetNonUltimateCooldowns(roomState);

    // Players are placed first so enemies never spawn on top of them.
    const playerSpots = spawnPlayers(roomState.players, roomState.characterSelections, scene, { proposed: playerPositions });
    const enemySpots = generateEnemySpawnPositions(enemies, scene, Object.values(playerSpots));

    // Only players who are here and standing get a turn; others join when they come back.
    const activePlayers = roomState.players.filter(player =>
      isConnected(room, player) && (roomState.characterSelections[player]?.stats?.health ?? 1) > 0
    );

    const combat = engine.createCombatState({
      encounterIndex,
      sceneKey: scene,
      combatType: config.combatType,
      postCombat: config.postCombat,
      enemies,
      positions: { ...playerSpots, ...enemySpots },
      turnOrder: calculateTurnOrder(activePlayers, roomState.characterSelections, enemies)
    });
    state.combat[room] = combat;
    logger.log?.(`[COMBAT] Room ${room} encounter ${encounterIndex}: ${enemies.length} enemies, ${activePlayers.length} players`);

    engine.beginTurn(contextFor(room));
    // If an enemy is fastest, give the opening narration a moment to land first.
    announce(room, { firstEnemyDelayMs: timing.combatStartEnemyDelayMs });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Player intents
  // ---------------------------------------------------------------------------

  const ACTIONS = {
    move: (ctx, player, payload) => engine.movePlayer(ctx, player, payload?.to),
    attack: (ctx, player, payload) => engine.attack(ctx, player, payload?.targetId),
    ability: (ctx, player, payload) => engine.useAbility(ctx, player, {
      abilityId: payload?.abilityId,
      targetId: payload?.targetId ?? null,
      targets: Array.isArray(payload?.targets) ? payload.targets.slice(0, 6) : undefined,
      targetPosition: payload?.targetPosition
    })
  };

  /**
   * Applies one player's intent. Returns { ok } or { ok: false, message } for the sender.
   * kind: 'move' | 'attack' | 'ability' | 'end_turn'
   */
  function handleIntent(room, playerName, kind, payload) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult) return { ok: false, error: 'no_combat', message: 'There is no fight going on.' };

    if (kind === 'end_turn') {
      const allowed = engine.canEndTurn(ctx, playerName);
      if (!allowed.ok) return allowed;
      endTurn(room);
      return { ok: true };
    }

    const action = ACTIONS[kind];
    if (!action) return { ok: false, error: 'unknown_action', message: 'Unknown action.' };

    const result = action(ctx, playerName, payload);
    if (!result.ok) return result;

    broadcast(room, result.events);
    if (afterAction(room)) return { ok: true };

    // Nothing left to do this turn: end it for them.
    if (!engine.canStillAct(ctx, playerName)) {
      schedule(room, timing.autoEndTurnDelayMs, () => endTurn(room));
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // People coming and going
  // ---------------------------------------------------------------------------

  // A player dropped or left: take them out of the turn order.
  function removeFromFight(room, playerName, { leftForGood = false } = {}) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult) return;
    const { combat } = ctx;

    const wasCurrentTurn = removeAllyFromTurnOrder(combat, playerName);
    if (leftForGood) delete combat.positions[playerName];
    if (checkEnd(room)) return;

    if (wasCurrentTurn) {
      // Their turn ends without its end-of-turn effects; those resume if they come back.
      engine.beginTurn(ctx);
      announce(room);
    } else {
      broadcast(room);
    }
  }

  // A player (re)joined mid-fight: give them their turn back and send them the board.
  function rejoinFight(room, playerName) {
    const ctx = contextFor(room);
    if (!ctx || ctx.combat.endedResult) return false;
    const { combat } = ctx;
    const character = ctx.characters[playerName];

    if ((character?.stats?.health || 0) > 0 && combat.positions[playerName]) {
      insertAllyIntoTurnOrder(combat, { type: 'ally', id: playerName, speed: character?.stats?.speed || 0 });
    }

    // The rejoining socket is already in the room, so it gets this broadcast too.
    if (combat.paused) {
      announce(room);
    } else {
      broadcast(room);
    }
    return true;
  }

  function stopRoom(room) {
    clearTimer(room);
    delete state.combatNarration[room];
  }

  return {
    connectedPlayers,
    isConnected,
    livingPlayers,
    startCombat,
    handleIntent,
    removeFromFight,
    rejoinFight,
    sendStateTo,
    endCombat,
    checkEnd,
    stopRoom,
    activeCombat
  };
}
