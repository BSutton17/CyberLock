// Pure helpers for enemy state and turn order inside a combat session.
// No sockets or globals: everything here takes plain data and returns plain data.

export function isEnemyAlive(enemy) {
  return enemy && !enemy.isDeadBody && (enemy.stats?.health || 0) > 0;
}

export function markEnemyAsCorpse(enemy) {
  if (!enemy) return enemy;
  return {
    ...enemy,
    isDeadBody: true,
    corpseTurnsRemaining: 1,
    stats: {
      ...enemy.stats,
      health: 0
    }
  };
}

export function tickEnemyCorpses(combat) {
  if (!combat?.enemies?.length) return false;

  const previousLength = combat.enemies.length;
  combat.enemies = combat.enemies
    .map(enemy => {
      if (!enemy?.isDeadBody) return enemy;
      const turnsRemaining = (enemy.corpseTurnsRemaining ?? 1) - 1;
      if (turnsRemaining <= 0) return null;
      return {
        ...enemy,
        corpseTurnsRemaining: turnsRemaining
      };
    })
    .filter(Boolean);

  return combat.enemies.length !== previousLength;
}

export function normalizeEnemiesForCombat(incomingEnemies = [], existingEnemies = []) {
  return incomingEnemies.map(incomingEnemy => {
    const existingEnemy = existingEnemies.find(enemy => enemy.id === incomingEnemy.id);
    const alreadyCorpse = existingEnemy?.isDeadBody;

    if (alreadyCorpse) {
      return {
        ...incomingEnemy,
        isDeadBody: true,
        corpseTurnsRemaining: existingEnemy.corpseTurnsRemaining ?? 1,
        stats: {
          ...incomingEnemy.stats,
          health: 0
        }
      };
    }

    if ((incomingEnemy.stats?.health || 0) <= 0) {
      return markEnemyAsCorpse(incomingEnemy);
    }

    return {
      ...incomingEnemy,
      isDeadBody: false,
      corpseTurnsRemaining: 0
    };
  });
}

export function shouldApplyEnemyUpdateForEncounter(combat, incomingEnemies = []) {
  if (!combat || !Array.isArray(incomingEnemies) || incomingEnemies.length === 0) return false;

  const currentEnemyIds = new Set((combat.enemies || []).map(enemy => enemy.id));
  if (currentEnemyIds.size === 0) return true;

  const incomingEnemyIds = new Set(incomingEnemies.map(enemy => enemy.id));
  for (const incomingId of incomingEnemyIds) {
    if (!currentEnemyIds.has(incomingId)) {
      return false;
    }
  }

  return true;
}

export function removeDeadEnemiesFromTurnOrder(combat) {
  if (!combat?.turnOrder) return;
  const currentTurn = combat.turnOrder[combat.currentTurnIndex];
  const aliveEnemyIds = new Set((combat.enemies || []).filter(isEnemyAlive).map(enemy => enemy.id));
  combat.turnOrder = combat.turnOrder.filter(turn => turn.type !== 'enemy' || aliveEnemyIds.has(turn.id));

  if (combat.turnOrder.length === 0) {
    combat.currentTurnIndex = 0;
    return;
  }

  if (currentTurn) {
    const preservedIndex = combat.turnOrder.findIndex(turn => turn.type === currentTurn.type && turn.id === currentTurn.id);
    if (preservedIndex !== -1) {
      combat.currentTurnIndex = preservedIndex;
      return;
    }
  }

  if (combat.currentTurnIndex >= combat.turnOrder.length) {
    combat.currentTurnIndex = 0;
  }
}

// Allies and living enemies sorted fastest first. Ties keep insertion order (allies before enemies).
export function calculateTurnOrder(players = [], characterSelections = {}, enemies = []) {
  const characters = [];

  players.forEach(player => {
    const character = characterSelections?.[player];
    characters.push({
      type: 'ally',
      id: player,
      speed: character?.stats.speed || 0
    });
  });

  enemies.filter(isEnemyAlive).forEach(enemy => {
    characters.push({
      type: 'enemy',
      id: enemy.id,
      speed: enemy.stats.speed || 0
    });
  });

  return characters.sort((a, b) => b.speed - a.speed);
}
