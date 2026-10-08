import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAbility,
  executeAbility,
  tickCooldowns,
  applyDamageKeywords,
  absorbWithBonusHealth,
  isHealingPrevented,
  applyAbilityEffects,
  tickActiveEffects,
  calculateTotalStat,
  getStatBonuses,
  updateBlizzardFieldEffects,
  hasDamageReflection
} from './AbilityLogic';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

const unit = (id, stats = {}) => ({
  id,
  name: id,
  stats: { health: 50, maxHealth: 80, speed: 30, resistance: 20, strength: 30, ta: 40, ...stats }
});

describe('executeAbility', () => {
  it('returns a cooldown one higher than listed (the current turn counts)', () => {
    const result = executeAbility('humble', { caster: unit('p1'), playerName: 'p1', cooldowns: {} });
    expect(result.success).toBe(true);
    expect(result.newCooldown).toBe(getAbility('humble').cooldown + 1);
  });

  it('refuses abilities on cooldown and unknown abilities', () => {
    expect(executeAbility('humble', { caster: unit('p1'), playerName: 'p1', cooldowns: { humble: 1 } }).success).toBe(false);
    expect(executeAbility('nope', {}).success).toBe(false);
  });
});

describe('tickCooldowns', () => {
  it('counts every cooldown down by one, never below zero', () => {
    expect(tickCooldowns({ a: 2, b: 0, c: 1 })).toEqual({ a: 1, b: 0, c: 0 });
  });
});

describe('damage keywords', () => {
  const effects = [
    { type: 'damage_immunity', target: 'shielded', turnsRemaining: 1 },
    { type: 'damage_taken_multiplier', target: 'cursed', value: 1.5, turnsRemaining: 1 },
    { type: 'damage_taken_multiplier', target: 'fresh', value: 1.5, turnsRemaining: 1, appliedThisTurn: true }
  ];

  it('negates damage on immune targets and scales cursed targets', () => {
    expect(applyDamageKeywords(10, effects, 'shielded')).toBe(0);
    expect(applyDamageKeywords(10, effects, 'cursed')).toBe(15);
    expect(applyDamageKeywords(10, effects, 'nobody')).toBe(10);
  });

  it('ignores effects that only start next turn', () => {
    expect(applyDamageKeywords(10, effects, 'fresh')).toBe(10);
  });

  it('respects a minimum', () => {
    expect(applyDamageKeywords(0.2, [], 'x', { minimumDamage: 1 })).toBe(1);
  });
});

describe('bonus health', () => {
  const buffs = [
    { type: 'stat_buff', stat: 'health', target: 'p1', value: 10, turnsRemaining: 2 },
    { type: 'stat_buff', stat: 'speed', target: 'p1', value: 5, turnsRemaining: 2 }
  ];

  it('absorbs part of a hit and shrinks the buff', () => {
    const { remainingDamage, effects } = absorbWithBonusHealth(4, buffs, 'p1');
    expect(remainingDamage).toBe(0);
    expect(effects.find(e => e.stat === 'health').value).toBe(6);
  });

  it('is used up by a bigger hit and the rest goes through', () => {
    const { remainingDamage, effects } = absorbWithBonusHealth(15, buffs, 'p1');
    expect(remainingDamage).toBe(5);
    expect(effects.some(e => e.stat === 'health')).toBe(false);
    expect(effects.some(e => e.stat === 'speed')).toBe(true);
  });
});

describe('applyAbilityEffects', () => {
  const state = () => ({
    enemies: [unit('e1', { health: 30 })],
    playerCharacters: { p1: unit('p1', { health: 40 }), dead: unit('dead', { health: 0 }) },
    activeEffects: [],
    effectOwnerTurnId: 'p1'
  });

  it('damages enemies and players', () => {
    const updates = applyAbilityEffects({ damage: [{ target: 'e1', amount: 12 }, { target: 'p1', amount: 5 }] }, state());
    expect(updates.enemies[0].stats.health).toBe(18);
    expect(updates.playerCharacters.p1.stats.health).toBe(35);
  });

  it('lets bonus health soak ability damage on players', () => {
    const start = state();
    start.activeEffects = [{ type: 'stat_buff', stat: 'health', target: 'p1', value: 8, turnsRemaining: 1 }];
    const updates = applyAbilityEffects({ damage: [{ target: 'p1', amount: 10 }] }, start);
    expect(updates.playerCharacters.p1.stats.health).toBe(38);
    expect(updates.activeEffects).toEqual([]);
  });

  it('heals players up to their max, never the dead', () => {
    const updates = applyAbilityEffects({ healing: [{ target: 'p1', amount: 100 }, { target: 'dead', amount: 10 }] }, state());
    expect(updates.playerCharacters.p1.stats.health).toBe(80);
    expect(updates.playerCharacters.dead.stats.health).toBe(0);
  });

  it('heals enemies (enemy support units)', () => {
    const updates = applyAbilityEffects({ healing: [{ target: 'e1', amount: 5 }] }, state());
    expect(updates.enemies[0].stats.health).toBe(35);
  });

  it('blocks healing on targets hit by Poison Apple', () => {
    const start = state();
    start.activeEffects = [{ type: 'healing_prevented', target: 'e1', turnsRemaining: 2 }];
    expect(isHealingPrevented(start.activeEffects, 'e1')).toBe(true);
    const updates = applyAbilityEffects({ healing: [{ target: 'e1', amount: 5 }] }, start);
    expect(updates.enemies[0].stats.health).toBe(30);
  });

  it('starts most effects next turn but some immediately, and records the owner', () => {
    const updates = applyAbilityEffects({
      effects: [
        { type: 'stat_buff', stat: 'speed', target: 'p1', value: 5, duration: 2 },
        { type: 'stat_buff', stat: 'speed', target: 'p1', value: 30, duration: 1, tickOnCastTurn: true }
      ]
    }, state());
    expect(updates.activeEffects[0]).toMatchObject({ appliedThisTurn: true, turnsRemaining: 2, ownerTurnId: 'p1' });
    expect(updates.activeEffects[1]).toMatchObject({ appliedThisTurn: false, turnsRemaining: 1 });
  });
});

describe('tickActiveEffects', () => {
  it('only ticks effects owned by whoever is ending their turn', () => {
    const effects = [
      { type: 'stat_buff', stat: 'speed', target: 'p1', value: 5, turnsRemaining: 1, ownerTurnId: 'p1' },
      { type: 'stat_buff', stat: 'speed', target: 'p2', value: 5, turnsRemaining: 1, ownerTurnId: 'p2' }
    ];
    const { updatedEffects } = tickActiveEffects(effects, {}, [], 'p1');
    expect(updatedEffects).toEqual([effects[1]]);
  });

  it('applies an enemy stat debuff once and fully restores it when it expires', () => {
    const enemies = [unit('e1', { resistance: 20 })];
    const debuff = { type: 'stat_debuff', stat: 'resistance', target: 'e1', value: -10, turnsRemaining: 1, appliedThisTurn: true, ownerTurnId: 'p1' };

    const first = tickActiveEffects([debuff], {}, enemies, 'p1');
    expect(first.updatedEnemies[0].stats.resistance).toBe(10);

    const second = tickActiveEffects(first.updatedEffects, {}, first.updatedEnemies, 'p1');
    expect(second.updatedEnemies[0].stats.resistance).toBe(20);
    expect(second.updatedEffects).toEqual([]);
  });

  it('heals over time on players and enemies, unless healing is prevented', () => {
    const effects = [
      { type: 'healing_over_time', target: 'p1', amount: 5, turnsRemaining: 2 },
      { type: 'healing_over_time', target: 'e1', amount: 5, turnsRemaining: 2 },
      { type: 'healing_over_time', target: 'e2', amount: 5, turnsRemaining: 2 },
      { type: 'healing_prevented', target: 'e2', turnsRemaining: 2 }
    ];
    const result = tickActiveEffects(effects, { p1: unit('p1', { health: 40 }) }, [unit('e1', { health: 40 }), unit('e2', { health: 40 })]);
    expect(result.updatedCharacters.p1.stats.health).toBe(45);
    expect(result.updatedEnemies[0].stats.health).toBe(45);
    expect(result.updatedEnemies[1].stats.health).toBe(40);
  });

  it('burns and poisons enemies and players alike', () => {
    const effects = [
      { type: 'burn', target: 'e1', damagePercent: 0.1, turnsRemaining: 1 },
      { type: 'poison', target: 'p1', damagePercent: 0.05, turnsRemaining: 1 }
    ];
    const result = tickActiveEffects(effects, { p1: unit('p1', { health: 40, maxHealth: 80 }) }, [unit('e1', { health: 50 })]);
    expect(result.updatedEnemies[0].stats.health).toBe(45);
    expect(result.updatedCharacters.p1.stats.health).toBe(36);
  });

  it('applies damage over time and drops it from the dead', () => {
    const effects = [
      { type: 'damage_over_time', target: 'e1', amount: 7, turnsRemaining: 2 },
      { type: 'damage_over_time', target: 'gone', amount: 7, turnsRemaining: 2 }
    ];
    const result = tickActiveEffects(effects, {}, [unit('e1', { health: 10 })]);
    expect(result.updatedEnemies[0].stats.health).toBe(3);
    expect(result.updatedEffects.map(e => e.target)).toEqual(['e1']);
  });
});

describe('player stat totals', () => {
  it('adds active buffs and multipliers, ignoring ones that start next turn', () => {
    const character = unit('p1', { speed: 30 });
    const effects = [
      { type: 'stat_buff', stat: 'speed', target: 'p1', value: 10, turnsRemaining: 1 },
      { type: 'stat_debuff', stat: 'speed', target: 'p1', multiplier: 0.5, turnsRemaining: 1 },
      { type: 'stat_buff', stat: 'speed', target: 'p1', value: 100, turnsRemaining: 1, appliedThisTurn: true }
    ];
    expect(calculateTotalStat(character, 'p1', 'speed', effects)).toBe(20);
    expect(getStatBonuses(character, 'p1', effects)).toEqual({ speed: -10 });
  });
});

describe('blizzard fields', () => {
  // Regression: an enemy walking into a blizzard got the slow applied twice but removed once.
  it('halves an entering enemy\'s speed once and restores it fully afterwards', () => {
    const field = { type: 'blizzard_field', center: { row: 2, col: 2 }, radius: 1, turnsRemaining: 3 };
    const enemies = [unit('e1', { speed: 40 })];
    const entered = updateBlizzardFieldEffects([field], enemies, { e1: { row: 2, col: 3 } });
    expect(entered.hasChanges).toBe(true);
    expect(entered.updatedEnemies[0].stats.speed).toBe(20);

    const afterTick = tickActiveEffects(entered.updatedEffects, {}, entered.updatedEnemies, 'someone');
    expect(afterTick.updatedEnemies[0].stats.speed).toBe(40);
  });

  it('leaves enemies outside the field alone', () => {
    const field = { type: 'blizzard_field', center: { row: 0, col: 0 }, radius: 1, turnsRemaining: 3 };
    const result = updateBlizzardFieldEffects([field], [unit('e1')], { e1: { row: 5, col: 5 } });
    expect(result.hasChanges).toBe(false);
  });
});

describe('Counter', () => {
  it('protects through the enemies\' turns after you cast it', () => {
    const cast = executeAbility('counter', { caster: unit('p1'), playerName: 'p1', cooldowns: {} });
    const applied = applyAbilityEffects(cast, { enemies: [], playerCharacters: { p1: unit('p1') }, activeEffects: [], effectOwnerTurnId: 'p1' });

    // Caster ends the turn: reflection switches on for the enemy phase.
    const afterOwnTurn = tickActiveEffects(applied.activeEffects, applied.playerCharacters, [], 'p1');
    expect(hasDamageReflection(afterOwnTurn.updatedEffects, 'p1')).toBe(true);

    // Caster's next end of turn: it wears off.
    const nextRound = tickActiveEffects(afterOwnTurn.updatedEffects, applied.playerCharacters, [], 'p1');
    expect(hasDamageReflection(nextRound.updatedEffects, 'p1')).toBe(false);
  });
});
