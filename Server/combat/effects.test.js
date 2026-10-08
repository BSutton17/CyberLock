import { describe, it, expect } from 'vitest';
import {
  getAbility,
  executeAbility,
  tickCooldowns,
  applyDamageKeywords,
  absorbWithBonusHealth,
  isHealingPrevented,
  calculateTotalStat,
  getStatBonuses,
  effectiveUnit,
  createActiveEffect,
  removeEffectsOwnedBy,
  zonesAffecting
} from '../../shared/combat/effects.js';

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

  it('knows when healing is blocked', () => {
    expect(isHealingPrevented([{ type: 'healing_prevented', target: 'e1', turnsRemaining: 2 }], 'e1')).toBe(true);
    expect(isHealingPrevented([], 'e1')).toBe(false);
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

describe('stat totals', () => {
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

  // Enemy debuffs used to change the enemy's stored stats and had to be undone on expiry,
  // which drifted. Now they are worked out on the fly, the same way as for players.
  it('treats enemy debuffs like player ones and never touches base stats', () => {
    const enemy = unit('e1', { resistance: 20 });
    const effects = [{ type: 'stat_debuff', stat: 'resistance', target: 'e1', value: -10, turnsRemaining: 1 }];
    expect(effectiveUnit(enemy, 'e1', { activeEffects: effects, side: 'enemy' }).stats.resistance).toBe(10);
    expect(enemy.stats.resistance).toBe(20);
  });
});

describe('zones and sides', () => {
  const blizzard = (side) => ({ type: 'blizzard_field', center: { row: 2, col: 2 }, radius: 1, turnsRemaining: 3, side });

  it('halves the speed of opponents standing in a blizzard, only while they are inside', () => {
    const enemy = unit('e1', { speed: 40 });
    expect(effectiveUnit(enemy, 'e1', { activeEffects: [blizzard('ally')], side: 'enemy', position: { row: 2, col: 3 } }).stats.speed).toBe(20);
    expect(effectiveUnit(enemy, 'e1', { activeEffects: [blizzard('ally')], side: 'enemy', position: { row: 5, col: 5 } }).stats.speed).toBe(40);
  });

  it('never slows the side that cast the blizzard', () => {
    const player = unit('p1', { speed: 40 });
    expect(effectiveUnit(player, 'p1', { activeEffects: [blizzard('ally')], side: 'ally', position: { row: 2, col: 2 } }).stats.speed).toBe(40);
    expect(effectiveUnit(player, 'p1', { activeEffects: [blizzard('enemy')], side: 'ally', position: { row: 2, col: 2 } }).stats.speed).toBe(20);
  });

  it('finds helpful and harmful zones by side', () => {
    const field = { type: 'healing_field', center: { row: 0, col: 0 }, radius: 1, turnsRemaining: 2, side: 'ally' };
    expect(zonesAffecting([field], { type: 'healing_field', side: 'ally', position: { row: 1, col: 1 }, helpful: true })).toHaveLength(1);
    expect(zonesAffecting([field], { type: 'healing_field', side: 'enemy', position: { row: 1, col: 1 }, helpful: true })).toHaveLength(0);
    expect(zonesAffecting([field], { type: 'healing_field', side: 'ally', position: { row: 3, col: 3 }, helpful: true })).toHaveLength(0);
  });
});

describe('createActiveEffect', () => {
  it('starts most effects next turn but some immediately, and records the owner', () => {
    expect(createActiveEffect({ type: 'stat_buff', stat: 'speed', target: 'p1', value: 5, duration: 2 }, { ownerId: 'p1' }))
      .toMatchObject({ appliedThisTurn: true, turnsRemaining: 2, ownerTurnId: 'p1' });
    expect(createActiveEffect({ type: 'stat_buff', stat: 'speed', target: 'p1', value: 30, duration: 1, tickOnCastTurn: true }, { ownerId: 'p1' }))
      .toMatchObject({ appliedThisTurn: false, turnsRemaining: 1 });
  });

  it('remembers which side placed a zone', () => {
    const zone = createActiveEffect({ type: 'toxic_mist_field', center: { row: 1, col: 1 }, duration: 2 }, { ownerId: 'e1', side: 'enemy' });
    expect(zone.side).toBe('enemy');
  });

  it('drops everything a fallen unit owned', () => {
    const effects = [{ ownerTurnId: 'a' }, { ownerTurnId: 'b' }, { ownerTurnId: 'a' }];
    expect(removeEffectsOwnedBy(effects, ['a'])).toEqual([{ ownerTurnId: 'b' }]);
  });
});
