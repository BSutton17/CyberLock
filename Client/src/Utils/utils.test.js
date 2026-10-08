import { describe, it, expect, vi, afterEach } from 'vitest';
import { ABILITIES } from '../GameComponents/Main/AbilityStore';
import { getAbilitiesByLevelAndRole, selectRandomAbility, assignEnemyAbilities } from './enemyAbilityUtils';
import { enrichCharacterAbilities, enrichAllCharacters } from './characterUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

const BANNED_FOR_ENEMIES = ['charge', 'eagle_eye', 'gtg', 'iron_sharpens_iron', 'zen'];

describe('getAbilitiesByLevelAndRole', () => {
  it('only returns abilities of that level and role', () => {
    const result = getAbilitiesByLevelAndRole(3, ['Tank']);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(a => a.level === 3 && a.role === 'Tank')).toBe(true);
  });

  it('never hands enemies the banned abilities', () => {
    for (const level of [1, 3, 5]) {
      const ids = getAbilitiesByLevelAndRole(level, ['DPS', 'Tank', 'Support']).map(a => a.id);
      for (const banned of BANNED_FOR_ENEMIES) {
        expect(ids).not.toContain(banned);
      }
    }
  });

  it('leaves every enemy role set with something to pick at every unlock level', () => {
    for (const roles of [['DPS'], ['DPS', 'Tank'], ['Support']]) {
      for (const level of [1, 3, 5]) {
        expect(getAbilitiesByLevelAndRole(level, roles).length, `${roles}@${level}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('selectRandomAbility', () => {
  it('returns null for an empty list', () => {
    expect(selectRandomAbility([])).toBeNull();
    expect(selectRandomAbility(null)).toBeNull();
  });

  it('picks by Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(selectRandomAbility(['a', 'b', 'c'])).toBe('c');
  });
});

describe('assignEnemyAbilities', () => {
  it('unlocks one ability per reached tier (levels 1, 3, 5)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(assignEnemyAbilities({ name: 'x', level: 1, behavior: 'aggressive' })).toHaveLength(1);
    expect(assignEnemyAbilities({ name: 'x', level: 4, behavior: 'aggressive' })).toHaveLength(2);
    expect(assignEnemyAbilities({ name: 'x', level: 5, behavior: 'aggressive' })).toHaveLength(3);
  });

  it('gives supports support abilities and aggressive enemies DPS abilities', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const support = assignEnemyAbilities({ name: 'medic', level: 5, behavior: 'support' });
    expect(support.every(a => a.role === 'Support')).toBe(true);
    const aggressive = assignEnemyAbilities({ name: 'brute', level: 5, behavior: 'aggressive' });
    expect(aggressive.every(a => a.role === 'DPS')).toBe(true);
  });
});

describe('enrichCharacterAbilities', () => {
  it('turns ability ids and partial objects into full ability summaries', () => {
    const enriched = enrichCharacterAbilities({
      name: 'Shipment',
      abilities: ['ability_boost', { id: 'defensive_jab' }],
      ultimate: 'executioners_judgment'
    });
    expect(enriched.abilities.map(a => a.name)).toEqual([ABILITIES.ability_boost.name, ABILITIES.defensive_jab.name]);
    expect(enriched.ultimate).toMatchObject({ id: 'executioners_judgment', cd: 0, disabled: false });
  });

  it('marks unknown abilities instead of crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const enriched = enrichCharacterAbilities({ abilities: ['does_not_exist'], ultimate: 'nope' });
    expect(enriched.abilities[0].name).toBe('Unknown Ability');
    expect(enriched.ultimate.name).toBe('Unknown Ultimate');
  });

  it('does not mutate the input', () => {
    const character = { abilities: ['humble'] };
    enrichCharacterAbilities(character);
    expect(character.abilities).toEqual(['humble']);
  });

  it('enriches a whole roster', () => {
    const result = enrichAllCharacters({ characters: [{ abilities: ['humble'] }] });
    expect(result.characters[0].abilities[0].id).toBe('humble');
  });
});
