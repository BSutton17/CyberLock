import { describe, it, expect } from 'vitest';
import { sanitizeCharacterProgression, mergeCharacterPayload, getAllowedAbilitySlots } from './characterProgression';

describe('getAllowedAbilitySlots', () => {
  it('unlocks a slot at levels 3 and 5', () => {
    expect([1, 2, 3, 4, 5].map(getAllowedAbilitySlots)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe('sanitizeCharacterProgression', () => {
  it('clamps level to 1-5 and trims abilities to the slots allowed', () => {
    const result = sanitizeCharacterProgression({ level: 9, abilities: ['a', 'b', 'c', 'd'], ultimate: 'u' });
    expect(result).toMatchObject({ level: 5, abilities: ['a', 'b', 'c'], ultimate: 'u' });
  });

  it('removes the ultimate below level 3', () => {
    expect(sanitizeCharacterProgression({ level: 2, abilities: [], ultimate: 'u' }).ultimate).toBeNull();
  });
});

describe('mergeCharacterPayload', () => {
  const previous = { id: 'tank', level: 3, abilities: ['a', 'b'], ultimate: { id: 'ult' } };

  it('keeps known abilities when the same character arrives with an empty list', () => {
    const merged = mergeCharacterPayload({ id: 'tank', level: 3, abilities: [], ultimate: '' }, previous);
    expect(merged.abilities).toEqual(['a', 'b']);
    expect(merged.ultimate).toEqual({ id: 'ult' });
  });

  it('takes the new loadout when it has one, or when the character changed', () => {
    expect(mergeCharacterPayload({ id: 'tank', level: 3, abilities: ['x'] }, previous).abilities).toEqual(['x']);
    expect(mergeCharacterPayload({ id: 'other', level: 1, abilities: [] }, previous).abilities).toEqual([]);
  });
});
