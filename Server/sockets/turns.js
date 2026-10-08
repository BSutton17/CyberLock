// Turn control for a room's fight: announcing turns, running enemy turns on a client,
// watchdogs for stalled enemy turns and AFK players, and victory/defeat detection.
import {
  isEnemyAlive,
  tickEnemyCorpses,
  advanceTurn
} from '../game/combatSession.js';

const ENEMY_TURN_MAX_RETRIES = 2;
const DISCONNECTED_TURN_TIMEOUT_MS = 5000;
const ENDED_COMBAT_CLEANUP_MS = 5000;

export function createTurnController({ io, state, timing, logger = console }) {
  const connectedPlayers = (room) => {
    const roomPlayers = state.rooms[room]?.players || [];
    const socketsByPlayer = state.sockets[room] || {};
    return roomPlayers.filter(player => (socketsByPlayer[player]?.size || 0) > 0);
  };

  const isConnected = (room, playerName) => (state.sockets[room]?.[playerName]?.size || 0) > 0;

  const livingPlayers = (room) => {
    const roomState = state.rooms[room];
    if (!roomState) return [];
    return roomState.players.filter(player => (roomState.characterSelections?.[player]?.stats?.health || 0) > 0);
  };

  function clearEnemyWatchdog(room) {
    const watchdog = state.enemyWatchdogs[room];
    if (!watchdog) return;
    clearTimeout(watchdog.timeoutId);
    delete state.enemyWatchdogs[room];
  }

  function clearAllyWatchdog(room) {
    const watchdog = state.allyWatchdogs[room];
    if (!watchdog) return;
    clearTimeout(watchdog.timeoutId);
    delete state.allyWatchdogs[room];
  }

  function clearAllyDelay(room) {
    const timeoutId = state.allyDelays[room];
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    delete state.allyDelays[room];
  }

  function clearDelayedEnemyStart(room) {
    const timeoutId = state.enemyStartDelays[room];
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    delete state.enemyStartDelays[room];
  }

  function clearRoomTimers(room) {
    clearEnemyWatchdog(room);
    clearAllyWatchdog(room);
    clearAllyDelay(room);
    clearDelayedEnemyStart(room);
  }

  function endCombat(room, result) {
    const combat = state.combat[room];
    if (!combat || combat.endedResult) return;

    combat.endedResult = result;
    clearRoomTimers(room);
    if (result === 'all_dead' && state.rooms[room]) {
      state.rooms[room].gameOver = true;
    }
    io.to(room).emit('combat_ended', { result });

    // Keep the session briefly so late packets from clients are recognized as stale.
    setTimeout(() => {
      if (state.combat[room] === combat) {
        delete state.combat[room];
      }
    }, ENDED_COMBAT_CLEANUP_MS).unref?.();
  }

  // Ends the fight if every enemy is dead. Returns true when the fight ended.
  function checkVictory(room) {
    const combat = state.combat[room];
    if (!combat) return false;
    if (combat.endedResult) return true;

    const aliveEnemies = (combat.enemies || []).filter(isEnemyAlive).length;
    const enemyTurns = (combat.turnOrder || []).filter(turn => turn.type === 'enemy').length;
    if (aliveEnemies > 0 && enemyTurns > 0) return false;

    endCombat(room, 'enemies_defeated');
    return true;
  }

  // Ends the fight if every seated player is dead. Disconnected players don't count as dead.
  function checkDefeat(room) {
    const combat = state.combat[room];
    if (!combat || combat.endedResult) return !!combat?.endedResult;
    if ((state.rooms[room]?.players || []).length === 0) return false;
    if (livingPlayers(room).length > 0) return false;

    endCombat(room, 'all_dead');
    return true;
  }

  function startAllyWatchdog(room, playerName) {
    clearAllyWatchdog(room);
    const timeoutMs = isConnected(room, playerName)
      ? timing.allyTurnTimeoutMs
      : Math.min(DISCONNECTED_TURN_TIMEOUT_MS, timing.allyTurnTimeoutMs);
    if (!(timeoutMs > 0)) return;

    const timeoutId = setTimeout(() => {
      delete state.allyWatchdogs[room];
      const combat = state.combat[room];
      if (!combat || combat.endedResult) return;
      const current = combat.turnOrder[combat.currentTurnIndex];
      if (current?.type !== 'ally' || current.id !== playerName) return;

      logger.log?.(`[TURNS] ${playerName}'s turn timed out in room ${room}`);
      io.to(room).emit('turn_timed_out', { playerName });
      advanceAndAnnounce(room, current);
    }, timeoutMs);
    timeoutId.unref?.();

    state.allyWatchdogs[room] = { timeoutId, playerName };
  }

  function dispatchEnemyTurn(room, enemyId) {
    const combat = state.combat[room];
    if (!combat || combat.endedResult) return;

    const handlers = connectedPlayers(room);
    if (handlers.length === 0) {
      // Nobody is connected to run the enemy; resume when someone rejoins.
      clearEnemyWatchdog(room);
      return;
    }

    const existing = state.enemyWatchdogs[room];
    const sameEnemy = existing && existing.enemyId === enemyId;
    const retries = sameEnemy ? existing.retries : 0;
    const executionId = sameEnemy && existing.executionId
      ? existing.executionId
      : `${room}:${enemyId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    io.to(room).emit('execute_enemy_turn', {
      enemyId,
      allies: handlers,
      alliedEnemies: (combat.enemies || []).filter(isEnemyAlive).map(enemy => enemy.id).filter(id => id !== enemyId),
      executionId
    });

    clearEnemyWatchdog(room);
    const timeoutId = setTimeout(() => {
      const latest = state.combat[room];
      if (!latest || latest.endedResult) {
        clearEnemyWatchdog(room);
        return;
      }

      const active = latest.turnOrder[latest.currentTurnIndex];
      if (active?.type !== 'enemy' || active.id !== enemyId) {
        clearEnemyWatchdog(room);
        return;
      }

      const watchdog = state.enemyWatchdogs[room];
      const attempts = watchdog?.retries ?? 0;
      if (attempts >= ENEMY_TURN_MAX_RETRIES) {
        logger.warn?.(`[TURNS] Enemy ${enemyId} stalled in room ${room}; skipping its turn`);
        clearEnemyWatchdog(room);
        advanceAndAnnounce(room, active);
        return;
      }

      state.enemyWatchdogs[room] = { timeoutId: null, enemyId, retries: attempts + 1, executionId };
      io.to(room).emit('turn_changed', { currentTurn: active });
      dispatchEnemyTurn(room, enemyId);
    }, timing.enemyTurnTimeoutMs);
    timeoutId.unref?.();

    state.enemyWatchdogs[room] = { timeoutId, enemyId, retries, executionId };
  }

  const hasEnemyWatchdogFor = (room, enemyId) => state.enemyWatchdogs[room]?.enemyId === enemyId;

  // Tells everyone whose turn it is and starts that turn.
  function announceTurn(room, { emit = true } = {}) {
    const combat = state.combat[room];
    if (!combat || combat.endedResult) return;

    if (!combat.turnOrder?.length) {
      checkDefeat(room);
      return;
    }
    if (combat.currentTurnIndex >= combat.turnOrder.length || combat.currentTurnIndex < 0) {
      combat.currentTurnIndex = 0;
    }

    const currentTurn = combat.turnOrder[combat.currentTurnIndex];
    if (emit) {
      io.to(room).emit('turn_changed', { currentTurn });
    }

    if (currentTurn.type === 'enemy') {
      clearAllyWatchdog(room);
      if (!hasEnemyWatchdogFor(room, currentTurn.id)) {
        dispatchEnemyTurn(room, currentTurn.id);
      }
    } else {
      clearEnemyWatchdog(room);
      startAllyWatchdog(room, currentTurn.id);
    }
  }

  // Ends `finishedTurn` and starts the next one.
  function advanceAndAnnounce(room, finishedTurn) {
    const combat = state.combat[room];
    if (!combat || combat.endedResult) return;

    clearEnemyWatchdog(room);
    clearAllyWatchdog(room);

    const next = advanceTurn(combat, finishedTurn);
    const removedCorpses = tickEnemyCorpses(combat);

    if (checkVictory(room)) return;
    if (!next) {
      checkDefeat(room);
      return;
    }

    announceTurn(room);
    if (removedCorpses) {
      io.to(room).emit('enemies_updated', { enemies: combat.enemies });
    }
  }

  // At combat start: optionally wait before the first enemy acts so narration can land.
  function beginCombat(room) {
    const combat = state.combat[room];
    if (!combat) return;
    const first = combat.turnOrder[combat.currentTurnIndex];
    if (!first) {
      checkDefeat(room);
      return;
    }

    if (first.type === 'enemy' && timing.combatStartEnemyDelayMs > 0) {
      clearDelayedEnemyStart(room);
      state.enemyStartDelays[room] = setTimeout(() => {
        delete state.enemyStartDelays[room];
        if (state.combat[room] === combat && !combat.endedResult) {
          announceTurn(room, { emit: false });
        }
      }, timing.combatStartEnemyDelayMs);
      state.enemyStartDelays[room].unref?.();
      return;
    }

    announceTurn(room, { emit: false });
  }

  return {
    connectedPlayers,
    isConnected,
    livingPlayers,
    clearEnemyWatchdog,
    clearAllyWatchdog,
    clearAllyDelay,
    clearRoomTimers,
    endCombat,
    checkVictory,
    checkDefeat,
    dispatchEnemyTurn,
    hasEnemyWatchdogFor,
    announceTurn,
    advanceAndAnnounce,
    beginCombat,
    startAllyWatchdog
  };
}
