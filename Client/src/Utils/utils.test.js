import { describe, it, expect, vi, afterEach } from 'vitest';
import { ABILITIES } from '@shared/combat/abilities.js';
import { enrichCharacterAbilities, enrichAllCharacters } from './characterUtils';

afterEach(() => {
  vi.restoreAllMocks();
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
