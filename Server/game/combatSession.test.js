import { describe, it, expect } from 'vitest';
import {
  isEnemyAlive,
  markEnemyAsCorpse,
  tickEnemyCorpses,
  normalizeEnemiesForCombat,
  shouldApplyEnemyUpdateForEncounter,
  removeDeadEnemiesFromTurnOrder,
  calculateTurnOrder,
  advanceTurn,
  removeAllyFromTurnOrder,
  insertAllyIntoTurnOrder
} from './combatSession.js';

const enemy = (id, health = 40, extra = {}) => ({
  id,
  name: id,
  stats: { health, maxHealth: 40, speed: 20, strength: 10 },
  ...extra
});

const ally = id => ({ type: 'ally', id });
const foe = id => ({ type: 'enemy', id });

describe('isEnemyAlive', () => {
  it('is true for an enemy with health above zero', () => {
    expect(isEnemyAlive(enemy('a'))).toBe(true);
  });

  it('is false at zero health, for corpses, and for missing enemies', () => {
    expect(isEnemyAlive(enemy('a', 0))).toBe(false);
    expect(isEnemyAlive(enemy('a', 40, { isDeadBody: true }))).toBe(false);
    expect(isEnemyAlive(null)).toBeFalsy();
  });
});

describe('markEnemyAsCorpse', () => {
  it('zeroes health, flags the body, and keeps other stats', () => {
    const corpse = markEnemyAsCorpse(enemy('a', 12));
    expect(corpse).toMatchObject({ isDeadBody: true, corpseTurnsRemaining: 1 });
    expect(corpse.stats).toEqual({ health: 0, maxHealth: 40, speed: 20, strength: 10 });
  });

  it('does not mutate the original enemy', () => {
    const original = enemy('a', 12);
    markEnemyAsCorpse(original);
    expect(original.stats.health).toBe(12);
    expect(original.isDeadBody).toBeUndefined();
  });
});

describe('tickEnemyCorpses', () => {
  it('removes corpses whose last turn has passed and reports the change', () => {
    const combat = { enemies: [enemy('alive'), markEnemyAsCorpse(enemy('dead'))] };
    expect(tickEnemyCorpses(combat)).toBe(true);
    expect(combat.enemies.map(e => e.id)).toEqual(['alive']);
  });

  it('counts down corpses that have turns remaining', () => {
    const combat = { enemies: [{ ...markEnemyAsCorpse(enemy('dead')), corpseTurnsRemaining: 2 }] };
    expect(tickEnemyCorpses(combat)).toBe(false);
    expect(combat.enemies[0].corpseTurnsRemaining).toBe(1);
  });

  it('returns false when there is nothing to tick', () => {
    expect(tickEnemyCorpses({ enemies: [] })).toBe(false);
    expect(tickEnemyCorpses(null)).toBe(false);
  });
});

describe('normalizeEnemiesForCombat', () => {
  it('keeps an existing corpse dead even if a stale payload reports health', () => {
    const existing = [markEnemyAsCorpse(enemy('a'))];
    const [result] = normalizeEnemiesForCombat([enemy('a', 25)], existing);
    expect(result.isDeadBody).toBe(true);
    expect(result.stats.health).toBe(0);
  });

  it('turns enemies reported at zero health into corpses', () => {
    const [result] = normalizeEnemiesForCombat([enemy('a', 0)], []);
    expect(result).toMatchObject({ isDeadBody: true, corpseTurnsRemaining: 1 });
  });

  it('marks living enemies as not dead', () => {
    const [result] = normalizeEnemiesForCombat([enemy('a', 25)], []);
    expect(result).toMatchObject({ isDeadBody: false, corpseTurnsRemaining: 0 });
    expect(result.stats.health).toBe(25);
  });
});

describe('shouldApplyEnemyUpdateForEncounter', () => {
  const combat = { enemies: [enemy('a'), enemy('b')] };

  it('accepts updates that only mention enemies in this encounter', () => {
    expect(shouldApplyEnemyUpdateForEncounter(combat, [enemy('a')])).toBe(true);
  });

  it('rejects updates mentioning enemies from another encounter', () => {
    expect(shouldApplyEnemyUpdateForEncounter(combat, [enemy('a'), enemy('zz')])).toBe(false);
  });

  it('rejects empty or invalid payloads', () => {
    expect(shouldApplyEnemyUpdateForEncounter(combat, [])).toBe(false);
    expect(shouldApplyEnemyUpdateForEncounter(combat, null)).toBe(false);
    expect(shouldApplyEnemyUpdateForEncounter(null, [enemy('a')])).toBe(false);
  });

  it('accepts anything when the encounter has no enemies yet', () => {
    expect(shouldApplyEnemyUpdateForEncounter({ enemies: [] }, [enemy('new')])).toBe(true);
  });
});

describe('removeDeadEnemiesFromTurnOrder', () => {
  it('removes dead enemies and keeps pointing at the same combatant', () => {
    const combat = {
      enemies: [enemy('e1', 0), enemy('e2')],
      turnOrder: [foe('e1'), ally('p1'), foe('e2')],
      currentTurnIndex: 1
    };
    removeDeadEnemiesFromTurnOrder(combat);
    expect(combat.turnOrder).toEqual([ally('p1'), foe('e2')]);
    expect(combat.turnOrder[combat.currentTurnIndex]).toEqual(ally('p1'));
  });

  it('never removes allies', () => {
    const combat = { enemies: [], turnOrder: [ally('p1'), ally('p2')], currentTurnIndex: 0 };
    removeDeadEnemiesFromTurnOrder(combat);
    expect(combat.turnOrder).toEqual([ally('p1'), ally('p2')]);
  });

  // Current behavior: when the acting enemy itself dies, the index is left pointing
  // at the combatant after it. Callers that then also advance the index skip a turn.
  it('leaves the index on the next combatant when the current enemy dies', () => {
    const combat = {
      enemies: [enemy('e1', 0), enemy('e2')],
      turnOrder: [ally('p1'), foe('e1'), ally('p2'), foe('e2')],
      currentTurnIndex: 1
    };
    removeDeadEnemiesFromTurnOrder(combat);
    expect(combat.turnOrder[combat.currentTurnIndex]).toEqual(ally('p2'));
  });

  it('wraps to the start when the removed enemy was last in the order', () => {
    const combat = {
      enemies: [enemy('e1', 0)],
      turnOrder: [ally('p1'), foe('e1')],
      currentTurnIndex: 1
    };
    removeDeadEnemiesFromTurnOrder(combat);
    expect(combat.currentTurnIndex).toBe(0);
  });

  it('resets the index when nobody is left', () => {
    const combat = { enemies: [enemy('e1', 0)], turnOrder: [foe('e1')], currentTurnIndex: 0 };
    removeDeadEnemiesFromTurnOrder(combat);
    expect(combat.turnOrder).toEqual([]);
    expect(combat.currentTurnIndex).toBe(0);
  });
});

describe('calculateTurnOrder', () => {
  const selections = {
    alice: { stats: { speed: 40 } },
    bob: { stats: { speed: 10 } }
  };

  it('orders allies and living enemies fastest first', () => {
    const enemies = [
      { ...enemy('fast'), stats: { health: 10, speed: 30 } },
      { ...enemy('slow'), stats: { health: 10, speed: 5 } }
    ];
    expect(calculateTurnOrder(['alice', 'bob'], selections, enemies).map(t => t.id))
      .toEqual(['alice', 'fast', 'bob', 'slow']);
  });

  it('leaves dead enemies out', () => {
    const order = calculateTurnOrder(['alice'], selections, [enemy('dead', 0)]);
    expect(order).toEqual([{ type: 'ally', id: 'alice', speed: 40 }]);
  });

  it('gives players without a character speed 0 instead of crashing', () => {
    expect(calculateTurnOrder(['nobody'], {}, [])).toEqual([{ type: 'ally', id: 'nobody', speed: 0 }]);
  });

  it('puts allies before enemies on a speed tie', () => {
    const order = calculateTurnOrder(['alice'], selections, [{ ...enemy('tie'), stats: { health: 10, speed: 40 } }]);
    expect(order.map(t => t.type)).toEqual(['ally', 'enemy']);
  });
});

describe('advanceTurn', () => {
  it('moves to the next combatant and wraps at the end of the round', () => {
    const combat = { turnOrder: [ally('p1'), foe('e1')], currentTurnIndex: 0 };
    expect(advanceTurn(combat, ally('p1'))).toEqual(foe('e1'));
    expect(advanceTurn(combat, foe('e1'))).toEqual(ally('p1'));
    expect(combat.currentTurnIndex).toBe(0);
  });

  // Regression: an enemy killed by a DoT tick during its own turn used to make the
  // server advance twice, so the next player silently lost their turn.
  it('does not skip anyone when the acting enemy died during its own turn', () => {
    const combat = {
      enemies: [enemy('e1', 0), enemy('e2')],
      turnOrder: [ally('p1'), foe('e1'), ally('p2'), foe('e2')],
      currentTurnIndex: 1
    };
    const finished = combat.turnOrder[combat.currentTurnIndex];
    removeDeadEnemiesFromTurnOrder(combat);
    expect(advanceTurn(combat, finished)).toEqual(ally('p2'));
  });

  it('wraps correctly when the acting enemy was last in the round and died', () => {
    const combat = {
      enemies: [enemy('e1', 0), enemy('e2')],
      turnOrder: [ally('p1'), foe('e2'), foe('e1')],
      currentTurnIndex: 2
    };
    const finished = combat.turnOrder[2];
    removeDeadEnemiesFromTurnOrder(combat);
    expect(advanceTurn(combat, finished)).toEqual(ally('p1'));
  });

  it('returns null when nobody is left', () => {
    expect(advanceTurn({ turnOrder: [], currentTurnIndex: 3 }, ally('p1'))).toBeNull();
  });
});

describe('removeAllyFromTurnOrder', () => {
  // Regression: a player killed by an enemy after acting earlier in the round used to be
  // filtered out without fixing the index, so the pointer jumped off the acting enemy and
  // combat stalled.
  it('keeps the pointer on the acting enemy when a player who already acted dies', () => {
    const combat = { turnOrder: [ally('p1'), foe('e1'), ally('p2')], currentTurnIndex: 1 };
    expect(removeAllyFromTurnOrder(combat, 'p1')).toBe(false);
    expect(combat.turnOrder[combat.currentTurnIndex]).toEqual(foe('e1'));
  });

  it('reports when the removed ally was acting and points at the next combatant', () => {
    const combat = { turnOrder: [ally('p1'), ally('p2'), foe('e1')], currentTurnIndex: 1 };
    expect(removeAllyFromTurnOrder(combat, 'p2')).toBe(true);
    expect(combat.turnOrder[combat.currentTurnIndex]).toEqual(foe('e1'));
  });

  it('wraps when the acting ally was last', () => {
    const combat = { turnOrder: [foe('e1'), ally('p1')], currentTurnIndex: 1 };
    expect(removeAllyFromTurnOrder(combat, 'p1')).toBe(true);
    expect(combat.currentTurnIndex).toBe(0);
  });

  it('ignores players who are not in the order and never removes enemies with the same id', () => {
    const combat = { turnOrder: [foe('p1'), ally('p2')], currentTurnIndex: 0 };
    expect(removeAllyFromTurnOrder(combat, 'ghost')).toBe(false);
    removeAllyFromTurnOrder(combat, 'p1');
    expect(combat.turnOrder).toEqual([foe('p1'), ally('p2')]);
  });
});

describe('insertAllyIntoTurnOrder', () => {
  const withSpeed = (turn, speed) => ({ ...turn, speed });

  it('inserts by speed and keeps the pointer on the acting combatant', () => {
    const combat = {
      turnOrder: [withSpeed(foe('fast'), 50), withSpeed(ally('p1'), 30), withSpeed(foe('slow'), 10)],
      currentTurnIndex: 1
    };
    insertAllyIntoTurnOrder(combat, withSpeed(ally('back'), 40));
    expect(combat.turnOrder.map(t => t.id)).toEqual(['fast', 'back', 'p1', 'slow']);
    expect(combat.turnOrder[combat.currentTurnIndex].id).toBe('p1');
  });

  it('appends the slowest and never duplicates', () => {
    const combat = { turnOrder: [withSpeed(ally('p1'), 30)], currentTurnIndex: 0 };
    insertAllyIntoTurnOrder(combat, withSpeed(ally('p2'), 5));
    insertAllyIntoTurnOrder(combat, withSpeed(ally('p2'), 5));
    expect(combat.turnOrder.map(t => t.id)).toEqual(['p1', 'p2']);
  });
});
