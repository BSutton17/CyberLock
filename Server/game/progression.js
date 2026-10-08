// Character progression rules. The server is the authority on levels and stat points so a
// refresh or a duplicate "ready" can never level a character twice.

export const MAX_CHARACTER_LEVEL = 5;
export const LEVEL_UP_POINTS = 15;
export const LEVEL_UP_STATS = ['maxHealth', 'speed', 'resistance', 'strength', 'ta'];

// Levels at which a character picks a new ability slot / ultimate.
export const ABILITY_UNLOCK_LEVELS = [3, 5];

export const getLevel = (character) => {
  const level = Number(character?.level);
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(MAX_CHARACTER_LEVEL, Math.floor(level)));
};

export const isMaxLevel = (character) => getLevel(character) >= MAX_CHARACTER_LEVEL;

/**
 * Applies one level-up to `baseCharacter` using the stat allocation from `submittedCharacter`.
 * Only increases to LEVEL_UP_STATS count; everything else (abilities, weapon, name) comes from
 * the base. Returns { character, leveledUp, unlocksAbility, error }.
 */
export function applyLevelUp(baseCharacter, submittedCharacter) {
  if (!baseCharacter || typeof baseCharacter !== 'object') {
    return { character: baseCharacter, leveledUp: false, unlocksAbility: false, error: 'missing character' };
  }

  const baseLevel = getLevel(baseCharacter);
  if (baseLevel >= MAX_CHARACTER_LEVEL) {
    return { character: baseCharacter, leveledUp: false, unlocksAbility: false, error: null };
  }

  const baseStats = baseCharacter.stats || {};
  const submittedStats = submittedCharacter?.stats || {};
  const increases = {};
  let spent = 0;

  for (const stat of LEVEL_UP_STATS) {
    const before = Number(baseStats[stat]) || 0;
    const after = Number(submittedStats[stat]);
    const delta = Number.isFinite(after) ? Math.floor(after - before) : 0;
    increases[stat] = Math.max(0, delta);
    spent += increases[stat];
  }

  if (spent > LEVEL_UP_POINTS) {
    return {
      character: baseCharacter,
      leveledUp: false,
      unlocksAbility: false,
      error: `spent ${spent} points but only ${LEVEL_UP_POINTS} are available`
    };
  }

  const stats = { ...baseStats };
  for (const stat of LEVEL_UP_STATS) {
    stats[stat] = (Number(baseStats[stat]) || 0) + increases[stat];
  }
  stats.health = stats.maxHealth;

  const level = baseLevel + 1;
  return {
    character: { ...baseCharacter, level, stats },
    leveledUp: true,
    unlocksAbility: ABILITY_UNLOCK_LEVELS.includes(level),
    error: null
  };
}
