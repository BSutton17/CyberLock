// Socket.IO event handlers for lobby, story, progression and combat.
// Every handler uses the room this socket joined (socket.data.room); a room named in the payload
// is only accepted if it matches.
import {
  createRoom,
  generateRoomCode,
  claimSeat,
  removePlayer,
  clearReadyFlags,
  isCharacterTaken,
  everyoneIn
} from '../game/rooms.js';
import { isEnemyAlive } from '../../shared/combat/turnOrder.js';
import { applyLevelUp, isMaxLevel, getLevel } from '../game/progression.js';
import { sanitizeDisplayName } from '../auth/session.js';
import { normalizeAttribute } from '../narrator/decisions.js';
import { createCombatController } from './combat.js';

const ROOM_CODE_PATTERN = /^\d{4,6}$/;
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;
const STORY_EVENTS = new Set(['game_start', 'choice_made', 'story_choice', 'dynamic_scenario', 'encounter_end', 'next_encounter', 'shop_intro', 'shop_continue', 'campaign_end']);

const cloneDeep = (value) => JSON.parse(JSON.stringify(value ?? null));

export function createGameState() {
  return {
    rooms: {},
    combat: {},
    sockets: {},            // room -> { playerName: Set(socketId) }
    pendingDisconnects: {}, // room -> { playerName: timeoutId }
    combatTimers: {},       // room -> the fight's next scheduled step
    combatNarration: {},    // room -> Promise chain, so combat lines arrive in order
    storyQueues: {},        // room -> Promise chain, so story events run one at a time
    seenAiRequests: new Map()
  };
}

/**
 * @param combatOptions - optional { generateEnemies, random } overrides for the fight engine (tests)
 */
export function registerGameSockets({ io, state, narrator, timing, logger = console, combatOptions = {} }) {
  // buildNarratorContext is a function declaration below, so it can be handed over here.
  const combat = createCombatController({ io, state, timing, narrator, logger, buildNarratorContext, ...combatOptions });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const emitPresence = (room) => {
    if (!state.rooms[room]) return;
    io.to(room).emit('presence_updated', { connected: combat.connectedPlayers(room) });
  };

  const emitReadyStatuses = (room, target = io.to(room)) => {
    const roomState = state.rooms[room];
    if (!roomState) return;
    target.emit('update_ready_status', roomState.readyPlayers);
    target.emit('ability_ready_status', roomState.abilityReadyPlayers);
    target.emit('attribute_ready_status', roomState.attributeReadyPlayers);
    target.emit('level_up_ready_status', roomState.levelUpReadyPlayers);
  };

  const setScreens = (room, screenFor) => {
    const roomState = state.rooms[room];
    if (!roomState) return;
    for (const player of roomState.players) {
      roomState.playerScreens[player] = typeof screenFor === 'function' ? screenFor(player) : screenFor;
    }
  };

  const storyStateFor = (room) => {
    const roomState = state.rooms[room];
    if (!roomState) return null;
    return {
      combatFlowIndex: roomState.encountersStarted || 0,
      selectedFaction: roomState.selectedFaction,
      lastStoryMessage: roomState.lastStoryMessage || null,
      gameOver: !!roomState.gameOver
    };
  };

  const deleteRoom = (room) => {
    combat.stopRoom(room);
    for (const timeoutId of Object.values(state.pendingDisconnects[room] || {})) clearTimeout(timeoutId);
    delete state.pendingDisconnects[room];
    delete state.rooms[room];
    delete state.combat[room];
    delete state.sockets[room];
    delete state.storyQueues[room];
    narrator?.resetSession(room);
    logger.log?.(`[ROOM] ${room} closed`);
  };

  const scheduleEmptyRoomCleanup = (room) => {
    setTimeout(() => {
      const roomState = state.rooms[room];
      if (roomState && roomState.players.length === 0) deleteRoom(room);
    }, EMPTY_ROOM_TTL_MS).unref?.();
  };

  // ---- Ready gates. Each moves the room forward once everyone seated is ready. ----

  function maybeCompleteCharacterSelect(room) {
    const roomState = state.rooms[room];
    if (!roomState || roomState.stage !== 'characterSelect') return;
    const allChosen = roomState.players.every(player => roomState.characterSelections[player]);
    if (!allChosen || !everyoneIn(roomState.players, roomState.readyPlayers)) return;

    roomState.stage = 'attributes1';
    roomState.attributeReadyPlayers = [];
    setScreens(room, 'characterBuilder');
    io.to(room).emit('character_customization');
  }

  function maybeCompleteAttributes(room) {
    const roomState = state.rooms[room];
    if (!roomState || !everyoneIn(roomState.players, roomState.attributeReadyPlayers)) return;

    if (roomState.stage === 'attributes1') {
      roomState.stage = 'attributes2';
      roomState.attributeReadyPlayers = [];
      roomState.abilityReadyPlayers = [];
      setScreens(room, 'characterBuilderPart2');
      io.to(room).emit('attribute_ready_status', []);
      io.to(room).emit('attribute_part1_complete');
      io.to(room).emit('attributes_updated', roomState.attributes);
    } else if (roomState.stage === 'attributes2') {
      roomState.stage = 'abilities';
      roomState.attributeReadyPlayers = [];
      roomState.abilityReadyPlayers = [];
      setScreens(room, 'chooseAbilities');
      io.to(room).emit('ability_ready_status', []);
      io.to(room).emit('start_main_game');
    }
  }

  function maybeCompleteAbilities(room) {
    const roomState = state.rooms[room];
    if (!roomState) return;

    if (roomState.stage === 'abilities' && everyoneIn(roomState.players, roomState.abilityReadyPlayers)) {
      roomState.stage = 'playing';
      roomState.abilityReadyPlayers = [];
      setScreens(room, 'main');
      io.to(room).emit('start_game');
      return;
    }

    const round = roomState.abilityRound;
    if (roomState.stage === 'playing' && round) {
      const required = round.required.filter(player => roomState.players.includes(player));
      if (required.every(player => roomState.abilityReadyPlayers.includes(player))) {
        roomState.abilityRound = null;
        roomState.abilityReadyPlayers = [];
        setScreens(room, 'main');
        io.to(room).emit('start_game');
      }
    }
  }

  function maybeCompleteLevelUp(room) {
    const roomState = state.rooms[room];
    const levelUp = roomState?.levelUp;
    if (!levelUp) return;

    const required = levelUp.required.filter(player => roomState.players.includes(player));
    if (!required.every(player => levelUp.done.includes(player))) return;

    roomState.completedLevelUps.push(levelUp.key);
    roomState.levelUp = null;
    roomState.levelUpReadyPlayers = [];

    const chooseAbilities = levelUp.unlocks.filter(player => roomState.players.includes(player));
    roomState.abilityReadyPlayers = [];
    roomState.abilityRound = chooseAbilities.length ? { required: chooseAbilities } : null;
    setScreens(room, player => (chooseAbilities.includes(player) ? 'chooseAbilities' : 'main'));

    io.to(room).emit('ability_ready_status', []);
    io.to(room).emit('level_up_complete', { players: roomState.characterSelections, chooseAbilities });
  }

  function maybeAdvanceGates(room) {
    maybeCompleteCharacterSelect(room);
    maybeCompleteAttributes(room);
    maybeCompleteAbilities(room);
    maybeCompleteLevelUp(room);
  }

  // Removes a player for good (left the game, or never came back after disconnecting).
  function finalizePlayer(room, playerName) {
    const roomState = state.rooms[room];
    const pending = state.pendingDisconnects[room]?.[playerName];
    if (pending) {
      clearTimeout(pending);
      delete state.pendingDisconnects[room][playerName];
    }
    if (!roomState || !roomState.players.includes(playerName)) return;

    const newAdmin = removePlayer(roomState, playerName);
    delete state.sockets[room]?.[playerName];

    delete roomState.cooldowns?.[playerName];
    combat.removeFromFight(room, playerName, { leftForGood: true });

    if (roomState.players.length === 0) {
      deleteRoom(room);
      return;
    }

    io.to(room).emit('updatePlayerList', roomState.players);
    io.to(room).emit('update_character_selections', roomState.characterSelections);
    if (newAdmin) {
      io.to(room).emit('admin_changed', { admin: newAdmin });
    }
    emitReadyStatuses(room);
    emitPresence(room);
    maybeAdvanceGates(room);
  }

  // Keeps level and stats server-owned once the game is underway.
  function mergeCharacterUpdate(existing, incoming, allowFullReplace) {
    if (allowFullReplace || !existing || existing.id !== incoming?.id) return incoming;
    return {
      ...existing,
      abilities: Array.isArray(incoming.abilities) ? incoming.abilities : existing.abilities,
      ultimate: incoming.ultimate ?? existing.ultimate
    };
  }

  function buildNarratorContext(room) {
    const roomState = state.rooms[room];
    const fight = state.combat[room];
    const attributesByPlayer = {};
    for (const [player, attributes] of Object.entries(roomState?.attributes || {})) {
      attributesByPlayer[player] = (Array.isArray(attributes) ? attributes : []).map(normalizeAttribute);
    }

    const party = (roomState?.players || [])
      .filter(player => roomState.characterSelections?.[player])
      .map(player => {
        const character = roomState.characterSelections[player];
        return {
          playerName: player,
          characterId: character.id,
          characterName: character.name,
          role: character.role,
          level: getLevel(character),
          isDown: (character.stats?.health ?? 1) <= 0,
          topAttributes: (attributesByPlayer[player] || []).filter(Boolean).slice(0, 2)
        };
      });

    return {
      party,
      players: roomState?.players || [],
      attributesByPlayer,
      connectedPlayers: combat.connectedPlayers(room),
      partyFaction: roomState?.selectedFaction || null,
      encounterIndex: roomState?.encountersStarted || 0,
      enemies: (fight?.enemies || []).map(enemy => ({ name: enemy.name, tier: enemy.tier, isDead: !isEnemyAlive(enemy) }))
    };
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  io.on('connection', (socket) => {
    const user = socket.data.user;

    const currentRoom = (payloadRoom) => {
      const room = socket.data.room;
      if (!room || !state.rooms[room]) return null;
      if (payloadRoom !== undefined && payloadRoom !== null && String(payloadRoom) !== room) return null;
      return room;
    };
    const me = () => socket.data.playerName;

    // ---------------- Rooms ----------------

    socket.on('create_room', (_payload, ack) => {
      const code = generateRoomCode(candidate => !!state.rooms[candidate]);
      state.rooms[code] = createRoom(code);
      scheduleEmptyRoomCleanup(code);
      if (typeof ack === 'function') ack({ room: code });
    });

    socket.on('join_room', (roomArg, nameArg, ack) => {
      const code = String(roomArg ?? '').trim();
      const reply = (payload) => {
        if (typeof ack === 'function') ack(payload);
        if (!payload.ok) socket.emit('join_error', payload);
      };

      if (!ROOM_CODE_PATTERN.test(code)) {
        return reply({ ok: false, code: 'invalid_room', message: 'Room codes are 4 to 6 digits.' });
      }

      const roomState = state.rooms[code];
      if (!roomState) {
        return reply({ ok: false, code: 'room_not_found', message: 'That game no longer exists. The server may have restarted.' });
      }

      const requestedName = sanitizeDisplayName(nameArg || user.name);
      const seat = claimSeat(roomState, requestedName, user.id);
      if (!seat.ok) {
        if (seat.error === 'room_full') socket.emit('room_full', { room: code, maxPlayers: 6 });
        return reply({ ok: false, code: seat.error, message: seat.message });
      }

      const playerName = seat.name;

      // Leaving another room first (switching games).
      if (socket.data.room && socket.data.room !== code) {
        socket.leave(socket.data.room);
      }

      const pending = state.pendingDisconnects[code]?.[playerName];
      if (pending) {
        clearTimeout(pending);
        delete state.pendingDisconnects[code][playerName];
      }

      socket.join(code);
      socket.data.room = code;
      socket.data.playerName = playerName;
      state.sockets[code] = state.sockets[code] || {};
      state.sockets[code][playerName] = state.sockets[code][playerName] || new Set();
      state.sockets[code][playerName].add(socket.id);

      reply({ ok: true, room: code, playerName, isAdmin: roomState.admin === playerName });
      socket.emit('joined_room', { room: code, playerName, isAdmin: roomState.admin === playerName });
      socket.emit('setAdmin', roomState.admin === playerName);
      io.to(code).emit('updatePlayerList', roomState.players);
      io.to(code).emit('admin_changed', { admin: roomState.admin });
      emitPresence(code);

      if (Object.keys(roomState.characterSelections).length > 0) {
        socket.emit('update_character_selections', roomState.characterSelections);
      }
      if (Object.keys(roomState.attributes).length > 0) {
        socket.emit('attributes_updated', roomState.attributes);
      }
      emitReadyStatuses(code, socket);
      socket.emit('restore_screen', { screen: roomState.playerScreens[playerName] || 'waiting' });
      if (roomState.selectedFaction) {
        socket.emit('faction_selected', roomState.selectedFaction);
      }
      socket.emit('story_state', storyStateFor(code));

      if (combat.activeCombat(code)) {
        socket.emit('start_game');
        combat.rejoinFight(code, playerName);
      } else if (roomState.gameOver) {
        socket.emit('combat_ended', { result: 'all_dead' });
      }
    });

    socket.on('leave_room', () => {
      const room = socket.data.room;
      const playerName = me();
      if (!room || !playerName) return;
      socket.leave(room);
      socket.data.room = null;
      socket.data.playerName = null;
      finalizePlayer(room, playerName);
    });

    socket.on('disconnect', () => {
      const room = socket.data.room;
      const playerName = me();
      if (!room || !playerName || !state.rooms[room]) return;

      const sockets = state.sockets[room]?.[playerName];
      sockets?.delete(socket.id);
      if (sockets && sockets.size > 0) return; // still connected in another tab

      const roomState = state.rooms[room];
      clearReadyFlags(roomState, playerName);
      emitReadyStatuses(room);

      combat.removeFromFight(room, playerName);

      emitPresence(room);

      state.pendingDisconnects[room] = state.pendingDisconnects[room] || {};
      clearTimeout(state.pendingDisconnects[room][playerName]);
      const timeoutId = setTimeout(() => finalizePlayer(room, playerName), timing.disconnectGraceMs);
      timeoutId.unref?.();
      state.pendingDisconnects[room][playerName] = timeoutId;
    });

    socket.on('player_screen_updated', ({ room: payloadRoom, screen } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room || typeof screen !== 'string') return;
      state.rooms[room].playerScreens[me()] = screen;
    });

    socket.on('request_ready_status', () => {
      const room = currentRoom();
      if (!room) return;
      emitReadyStatuses(room, socket);
      const levelUp = state.rooms[room].levelUp;
      socket.emit('level_up_state', { active: !!levelUp, done: levelUp?.done || [] });
    });

    // ---------------- Lobby ----------------

    socket.on('startGame', () => {
      const room = currentRoom();
      if (!room) return;
      const roomState = state.rooms[room];
      if (roomState.admin !== me()) return;
      if (roomState.stage !== 'lobby') return;

      roomState.stage = 'characterSelect';
      setScreens(room, 'characterSelect');
      io.to(room).emit('gameStarted', { room, players: roomState.players });
    });

    socket.on('reset_game', () => {
      const room = currentRoom();
      if (!room) return;
      const roomState = state.rooms[room];

      Object.assign(roomState, {
        characterSelections: {},
        readyPlayers: [],
        abilitySelections: {},
        abilityReadyPlayers: [],
        abilityRound: null,
        levelUpReadyPlayers: [],
        levelUp: null,
        completedLevelUps: [],
        attributes: {},
        attributeReadyPlayers: [],
        selectedFaction: null,
        encountersStarted: 0,
        lastStoryMessage: null,
        gameOver: false,
        cooldowns: {},
        partyPositions: null,
        stage: 'lobby'
      });
      setScreens(room, 'waiting');

      combat.stopRoom(room);
      delete state.combat[room];
      narrator?.resetSession(room);
      io.to(room).emit('game_reset');
    });

    socket.on('character_selected', ({ room: payloadRoom, character } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room || !character || typeof character !== 'object') return;
      const roomState = state.rooms[room];
      const playerName = me();

      if (isCharacterTaken(roomState, playerName, character.id)) {
        socket.emit('character_taken', { characterId: character.id });
        socket.emit('update_character_selections', roomState.characterSelections);
        return;
      }

      const allowFullReplace = roomState.stage === 'lobby' || roomState.stage === 'characterSelect';
      roomState.characterSelections[playerName] = mergeCharacterUpdate(roomState.characterSelections[playerName], character, allowFullReplace);
      io.to(room).emit('update_character_selections', roomState.characterSelections);
    });

    socket.on('character_removed', ({ room: payloadRoom } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      if (roomState.stage !== 'characterSelect') return;
      delete roomState.characterSelections[me()];
      roomState.readyPlayers = roomState.readyPlayers.filter(player => player !== me());
      io.to(room).emit('update_character_selections', roomState.characterSelections);
      io.to(room).emit('update_ready_status', roomState.readyPlayers);
    });

    socket.on('player_ready', ({ room: payloadRoom } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      if (!roomState.characterSelections[me()]) return;
      if (!roomState.readyPlayers.includes(me())) roomState.readyPlayers.push(me());
      io.to(room).emit('update_ready_status', roomState.readyPlayers);
      maybeCompleteCharacterSelect(room);
    });

    socket.on('update_attributes', ({ room: payloadRoom, newAttributes } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room || !Array.isArray(newAttributes)) return;
      const roomState = state.rooms[room];
      roomState.attributes[me()] = newAttributes.slice(0, 10).map(value => (typeof value === 'string' ? value.slice(0, 30) : null));
      io.to(room).emit('attributes_updated', roomState.attributes);
    });

    const markAttributesReady = ({ room: payloadRoom } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      if (!roomState.attributeReadyPlayers.includes(me())) roomState.attributeReadyPlayers.push(me());
      io.to(room).emit('attribute_ready_status', roomState.attributeReadyPlayers);
      maybeCompleteAttributes(room);
    };
    socket.on('attribute_part1_ready', markAttributesReady);
    socket.on('attributes_part2_ready', markAttributesReady);

    socket.on('select_ability', ({ room: payloadRoom, abilities } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      roomState.abilitySelections[me()] = abilities;
      io.to(room).emit('ability_selections_updated', roomState.abilitySelections);
    });

    socket.on('ability_ready', ({ room: payloadRoom } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      if (!roomState.abilityReadyPlayers.includes(me())) roomState.abilityReadyPlayers.push(me());
      io.to(room).emit('ability_ready_status', roomState.abilityReadyPlayers);
      maybeCompleteAbilities(room);
    });

    socket.on('faction_selected', ({ room: payloadRoom, faction } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room || (faction !== 'enforcers' && faction !== 'rebels')) return;
      state.rooms[room].selectedFaction = faction;
      io.to(room).emit('faction_selected', faction);
    });

    // ---------------- Level up ----------------

    socket.on('level_up', ({ room: payloadRoom, encounterIndex } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      if (roomState.levelUp) return; // already open

      const key = Number.isFinite(Number(encounterIndex)) ? Number(encounterIndex) : roomState.encountersStarted || 0;
      if (roomState.completedLevelUps.includes(key)) {
        logger.log?.(`[LEVEL] Ignoring duplicate level-up ${key} in room ${room}`);
        return;
      }

      const required = roomState.players.filter(player => roomState.characterSelections[player]);
      const alreadyMax = required.filter(player => isMaxLevel(roomState.characterSelections[player]));

      if (alreadyMax.length === required.length) {
        roomState.completedLevelUps.push(key);
        io.to(room).emit('level_up_complete', { players: roomState.characterSelections, chooseAbilities: [] });
        return;
      }

      roomState.levelUp = {
        key,
        snapshot: cloneDeep(roomState.characterSelections),
        required,
        done: [...alreadyMax],
        unlocks: []
      };
      roomState.levelUpReadyPlayers = [...alreadyMax];
      setScreens(room, 'levelup');
      io.to(room).emit('level_up_ready_status', roomState.levelUpReadyPlayers);
      io.to(room).emit('level_up', { maxLevelPlayers: alreadyMax });
    });

    socket.on('level_up_ready', ({ room: payloadRoom, updatedCharacter } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      const roomState = state.rooms[room];
      const levelUp = roomState.levelUp;
      const playerName = me();

      if (!levelUp || levelUp.done.includes(playerName) || !levelUp.required.includes(playerName)) {
        socket.emit('level_up_ready_status', roomState.levelUpReadyPlayers);
        return;
      }

      const base = levelUp.snapshot[playerName];
      const result = applyLevelUp(base, updatedCharacter);
      if (result.error) {
        socket.emit('level_up_rejected', { message: `Level up was not applied: ${result.error}.` });
        return;
      }

      // Keep abilities chosen since the snapshot; take level and stats from the server rules.
      const current = roomState.characterSelections[playerName] || base;
      roomState.characterSelections[playerName] = {
        ...current,
        level: result.character.level,
        stats: result.character.stats
      };
      levelUp.done.push(playerName);
      if (result.unlocksAbility) levelUp.unlocks.push(playerName);
      if (!roomState.levelUpReadyPlayers.includes(playerName)) roomState.levelUpReadyPlayers.push(playerName);

      io.to(room).emit('characters_updated', { [playerName]: roomState.characterSelections[playerName] });
      io.to(room).emit('level_up_ready_status', roomState.levelUpReadyPlayers);
      maybeCompleteLevelUp(room);
    });

    // ---------------- Narrator ----------------

    socket.on('ai_request', async ({ requestId, room: payloadRoom, eventType, message, data } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room || typeof eventType !== 'string') return;

      if (requestId) {
        if (state.seenAiRequests.has(requestId)) return;
        state.seenAiRequests.set(requestId, Date.now());
        if (state.seenAiRequests.size > 2000) {
          const cutoff = Date.now() - 10 * 60 * 1000;
          for (const [id, time] of state.seenAiRequests) if (time < cutoff) state.seenAiRequests.delete(id);
        }
      }

      const isChat = eventType === 'chat_message' || data?.source === 'chatbot';
      const from = me();
      const thinkingTarget = isChat ? socket : io.to(room);
      thinkingTarget.emit(isChat ? 'chatbot_thinking' : 'ai_thinking', { requestId: requestId || null, thinking: true, from, eventType });

      const run = async () => {
        try {
          const result = await narrator.handleEvent({ room, eventType, message, data, context: buildNarratorContext(room) });
          const roomState = state.rooms[room];
          if (roomState && STORY_EVENTS.has(eventType)) {
            roomState.lastStoryMessage = {
              eventType,
              response: result.response,
              options: result.options || null,
              attribute: result.attribute || null,
              startCombat: !!result.startCombat
            };
          }
          return result;
        } catch (error) {
          logger.error?.('[AI] Narrator failed:', error);
          return { response: 'Static fills the comms for a moment, then clears.', location: null, attribute: null, startCombat: false, options: null, fallback: true };
        }
      };

      // Story beats change shared state, so they run one at a time per room.
      let result;
      if (STORY_EVENTS.has(eventType)) {
        const previous = state.storyQueues[room] || Promise.resolve();
        const next = previous.then(run, run);
        state.storyQueues[room] = next.catch(() => {});
        result = await next;
      } else {
        result = await run();
      }

      const payload = {
        requestId: requestId || null,
        eventType,
        response: result.response,
        location: result.location || null,
        attribute: result.attribute || null,
        startCombat: !!result.startCombat,
        options: result.options || null,
        from,
        ...(result.fallback ? { fallback: true } : {})
      };

      if (isChat) {
        socket.emit('chatbot_thinking', { requestId: requestId || null, thinking: false, eventType });
        socket.emit('chatbot_message', payload);
      } else {
        io.to(room).emit('ai_thinking', { requestId: requestId || null, thinking: false });
        io.to(room).emit('ai_message', payload);
      }
    });

    // ---------------- Combat ----------------

    // The story controller starts the next fight; the server builds it from the campaign.
    socket.on('start_combat', ({ room: payloadRoom, sceneKey, playerPositions } = {}) => {
      const room = currentRoom(payloadRoom);
      if (!room) return;
      if (!combat.startCombat(room, { sceneKey, playerPositions })) {
        // Already fighting (e.g. two clients tried to start it): just show this client the board.
        combat.sendStateTo(socket, room);
      }
    });

    // Player intents. The server checks and applies them; a refusal goes back to the sender only.
    const intent = (kind) => (payload = {}, ack) => {
      const room = currentRoom(payload?.room);
      const result = room
        ? combat.handleIntent(room, me(), kind, payload)
        : { ok: false, error: 'no_room', message: 'You are not in a game.' };
      if (!result.ok) socket.emit('combat_error', { action: kind, error: result.error, message: result.message });
      if (typeof ack === 'function') ack(result.ok ? { ok: true } : { ok: false, error: result.error, message: result.message });
    };
    socket.on('combat_move', intent('move'));
    socket.on('combat_attack', intent('attack'));
    socket.on('combat_ability', intent('ability'));
    socket.on('combat_end_turn', intent('end_turn'));

    socket.on('request_combat_state', () => {
      const room = currentRoom();
      if (room) combat.sendStateTo(socket, room);
    });
  });

  return { combat, finalizePlayer, buildNarratorContext };
}
