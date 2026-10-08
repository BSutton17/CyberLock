// Shared rules for merging character updates from the server into local state.

export const MAX_CHARACTER_LEVEL = 5;

export const getAllowedAbilitySlots = (level) => {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
};

export const sanitizeCharacterProgression = (character) => {
  if (!character || typeof character !== 'object') return character;

  const rawLevel = Number(character.level);
  const level = Number.isFinite(rawLevel)
    ? Math.max(1, Math.min(MAX_CHARACTER_LEVEL, rawLevel))
    : 1;
  const allowedAbilitySlots = getAllowedAbilitySlots(level);
  const abilities = Array.isArray(character.abilities)
    ? character.abilities.slice(0, allowedAbilitySlots).filter(Boolean)
    : [];
  const ultimate = level >= 3 ? (character.ultimate || null) : null;

  return { ...character, level, abilities, ultimate };
};

const hasUltimate = (ultimate) =>
  (typeof ultimate === 'string' && ultimate.trim().length > 0) ||
  (!!ultimate && typeof ultimate === 'object' && !!ultimate.id);

// Server snapshots sometimes arrive with empty ability lists for the same character
// (e.g. mid-update); keep what we had rather than wiping the player's loadout.
export const mergeCharacterPayload = (incoming, previous = {}) => {
  const sameCharacter = !!incoming?.id && !!previous?.id && incoming.id === previous.id;

  let abilities = incoming?.abilities;
  if (!Array.isArray(abilities)) {
    abilities = previous?.abilities;
  } else if (abilities.length === 0 && sameCharacter && Array.isArray(previous?.abilities) && previous.abilities.length > 0) {
    abilities = previous.abilities;
  }

  const ultimate = hasUltimate(incoming?.ultimate)
    ? incoming.ultimate
    : (sameCharacter ? previous?.ultimate : null);

  return sanitizeCharacterProgression({ ...previous, ...incoming, abilities, ultimate });
};
