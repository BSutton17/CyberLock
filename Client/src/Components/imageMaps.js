// Image lookups for characters and enemies. Paths are relative to Client/public.

export const FALLBACK_IMAGE = '/favicon.png';

export const CHARACTER_IMAGE_MAP = {
  offensive_tank_1: '/characters/Offensive_Tank_1.png',
  defensive_tank_2: '/characters/Defensive_Tank_2.png',
  spellcaster_dps_1: '/characters/Spell_Caster_DPS_1.png',
  aggressive_dps_2: '/characters/Aggressive_DPS_2.png',
  traditional_warrior_dps_3: '/characters/Traditional_Warrior_3.png',
  healing_support_1: '/characters/Healing_Support.png',
  offensive_support_2: '/characters/Offensive_Support.png',
  jack_of_all_trades_support_3: '/characters/Spell_Caster_DPS_2.png',
  hacker_support_4: '/characters/Hacker.png'
};

export const ENEMY_IMAGE_MAP = {
  enforcer_soldier: '/enemies/Enforcer_Solider.png',
  enforcer_drone: '/enemies/Enforcer_Drone.png',
  rebel_initiate: '/enemies/Rebel_Initiate.png',
  rebel_field_tech: '/enemies/Rebel_Field_Tech.png',
  division_command: '/enemies/Enforcer_Division_Command.png',
  division_strategist: '/enemies/Enforcer_Division_Strategist.png',
  vanguard_captain: '/enemies/Enforcer_Vangaurd_Captain.png',
  field_captain: '/enemies/Rebel_Field_Captain.png',
  rebel_coordinator: '/enemies/Rebel_Coordinator.png',
  operations_handler: '/enemies/Rebel_Operations_Handler.png',
  division_chief: '/enemies/Enforcer_Division_Command.png',
  rebellion_chief: '/enemies/Rebel_Field_Captain.png',
  enforcer_the_architect: '/enemies/The Architect.png',
  enforcer_macro_hull: '/enemies/Macro Hull.png',
  enforcer_genisis: '/enemies/Genisis.png',
  rebel_garret_maxwell: '/enemies/Garret Maxwell.png',
  rebel_levi_wicker: '/enemies/Levi Wicker.png',
  rebel_virgil_wesley: '/enemies/Virgil Wesley.png'
};

export const ENEMY_NAME_IMAGE_MAP = {
  'Garret Maxwell': '/enemies/Garret Maxwell.png',
  'Genisis': '/enemies/Genisis.png',
  'Levi Wicker': '/enemies/Levi Wicker.png',
  'Macro Hull': '/enemies/Macro Hull.png',
  'The Architect': '/enemies/The Architect.png',
  'Virgil Wesley': '/enemies/Virgil Wesley.png'
};

export const getCharacterImage = (character) => {
  if (!character?.id) return FALLBACK_IMAGE;
  return CHARACTER_IMAGE_MAP[character.id] || FALLBACK_IMAGE;
};

// Enemy instances carry ids like "enforcer_soldier_3"; strip the instance suffix to find the template image.
export const getEnemyImage = (enemy) => {
  const rawId = typeof enemy === 'string' ? enemy : enemy?.id;
  const enemyName = typeof enemy === 'object' ? enemy?.name : null;
  if (!rawId) return ENEMY_NAME_IMAGE_MAP[enemyName] || FALLBACK_IMAGE;

  const normalizedId = rawId.replace(/_\d+$/, '');
  return ENEMY_IMAGE_MAP[rawId] || ENEMY_IMAGE_MAP[normalizedId] || ENEMY_NAME_IMAGE_MAP[enemyName] || FALLBACK_IMAGE;
};
