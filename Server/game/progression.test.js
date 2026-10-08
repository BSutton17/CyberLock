import { describe, it, expect } from 'vitest';
import { applyLevelUp, getLevel, isMaxLevel, MAX_CHARACTER_LEVEL, LEVEL_UP_POINTS } from './progression.js';

const base = (level = 1) => ({
  id: 'offensive_tank_1',
  name: 'Shipment',
  level,
  abilities: [{ id: 'ability_boost' }],
  stats: { health: 40, maxHealth: 85, speed: 30, resistance: 35, strength: 35, ta: 15 }
});

const withStats = (character, changes) => ({ ...character, stats: { ...character.stats, ...changes } });

describe('getLevel / isMaxLevel', () => {
  it('clamps and defaults levels', () => {
    expect(getLevel({ level: 3 })).toBe(3);
    expect(getLevel({ level: 99 })).toBe(MAX_CHARACTER_LEVEL);
    expect(getLevel({})).toBe(1);
    expect(isMaxLevel({ level: 5 })).toBe(true);
    expect(isMaxLevel({ level: 4 })).toBe(false);
  });
});

describe('applyLevelUp', () => {
  it('adds one level, applies the allocated points, and heals to the new max', () => {
    const submitted = withStats(base(), { maxHealth: 95, strength: 40 });
    const { character, leveledUp, error } = applyLevelUp(base(), submitted);
    expect(error).toBeNull();
    expect(leveledUp).toBe(true);
    expect(character.level).toBe(2);
    expect(character.stats).toMatchObject({ maxHealth: 95, health: 95, strength: 40, speed: 30 });
  });

  it('takes the level from the server copy, not from whatever the client sent', () => {
    const submitted = { ...withStats(base(), { speed: 45 }), level: 5 };
    expect(applyLevelUp(base(1), submitted).character.level).toBe(2);
  });

  it('keeps abilities and identity from the server copy', () => {
    const submitted = { ...withStats(base(), { ta: 30 }), name: 'Hacked', abilities: [] };
    const { character } = applyLevelUp(base(), submitted);
    expect(character.name).toBe('Shipment');
    expect(character.abilities).toEqual([{ id: 'ability_boost' }]);
  });

  it('rejects allocations above the point budget', () => {
    const submitted = withStats(base(), { strength: 35 + LEVEL_UP_POINTS + 1 });
    const result = applyLevelUp(base(), submitted);
    expect(result.leveledUp).toBe(false);
    expect(result.error).toMatch(/points/);
    expect(result.character).toEqual(base());
  });

  it('ignores stat decreases instead of refunding them as extra points', () => {
    const submitted = withStats(base(), { speed: 0, strength: 35 + LEVEL_UP_POINTS });
    const { character, error } = applyLevelUp(base(), submitted);
    expect(error).toBeNull();
    expect(character.stats.speed).toBe(30);
    expect(character.stats.strength).toBe(35 + LEVEL_UP_POINTS);
  });

  it('does nothing for a max-level character', () => {
    const maxed = base(MAX_CHARACTER_LEVEL);
    const result = applyLevelUp(maxed, withStats(maxed, { strength: 50 }));
    expect(result.leveledUp).toBe(false);
    expect(result.character).toBe(maxed);
  });

  it('flags the levels that unlock a new ability', () => {
    expect(applyLevelUp(base(2), base(2)).unlocksAbility).toBe(true);
    expect(applyLevelUp(base(3), base(3)).unlocksAbility).toBe(false);
    expect(applyLevelUp(base(4), base(4)).unlocksAbility).toBe(true);
  });

  it('handles a missing character', () => {
    expect(applyLevelUp(null, base()).error).toBeTruthy();
  });
});
