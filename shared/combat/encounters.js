// The campaign's ten fights and how their enemies are built.

import { ABILITIES } from './abilities.js';
import EnemiesData from '../data/enemies.js';

// One entry per fight, in story order. Low fights always field party size + 2 generic enemies.
// postCombat: what happens after winning ('levelUp' or 'none').
export const STORY_COMBAT_FLOW = [
    { combatType: 'low', numOfGeneric: 0, numOfMid: 0, numOfMini: 0, Boss: false, postCombat: 'levelUp' },
    { combatType: 'medium', numOfGeneric: 2, numOfMid: 2, numOfMini: 0, Boss: false, postCombat: 'none' },
    { combatType: 'boss', numOfGeneric: 2, numOfMid: 1, numOfMini: 0, Boss: true, postCombat: 'levelUp' },

    { combatType: 'low', numOfGeneric: 0, numOfMid: 0, numOfMini: 0, Boss: false, postCombat: 'none' },
    { combatType: 'medium', numOfGeneric: 3, numOfMid: 2, numOfMini: 0, Boss: false, postCombat: 'levelUp' },
    { combatType: 'low', numOfGeneric: 0, numOfMid: 0, numOfMini: 0, Boss: false, postCombat: 'none' },
    { combatType: 'boss', numOfGeneric: 2, numOfMid: 1, numOfMini: 0, Boss: true, postCombat: 'levelUp' },

    { combatType: 'low', numOfGeneric: 0, numOfMid: 0, numOfMini: 0, Boss: false, postCombat: 'none' },
    { combatType: 'mini-boss', numOfGeneric: 3, numOfMid: 2, numOfMini: 1, Boss: false, postCombat: 'none' },
    { combatType: 'boss', numOfGeneric: 4, numOfMid: 1, numOfMini: 0, Boss: true, postCombat: 'none' }
];

export const TOTAL_ENCOUNTERS = STORY_COMBAT_FLOW.length;

export function getEncounterConfig(encounterIndex) {
    const index = Math.max(0, Math.min(TOTAL_ENCOUNTERS - 1, Number(encounterIndex) || 0));
    return STORY_COMBAT_FLOW[index];
}

export const isFinalEncounter = (encounterIndex) => Number(encounterIndex) >= TOTAL_ENCOUNTERS - 1;

// The three bosses of each side, in the order the party meets them.
export const ORDERED_BOSS_IDS_BY_FACTION = {
    enforcers: ['enforcer_the_architect', 'enforcer_macro_hull', 'enforcer_genisis'],
    rebels: ['rebel_garret_maxwell', 'rebel_levi_wicker', 'rebel_virgil_wesley']
};

export function getEnemyFaction(enemy) {
    const id = String(enemy?.id || '').toLowerCase();
    if (id.startsWith('enforcer_') || id.startsWith('division_') || id.startsWith('vanguard_')) return 'enforcers';
    if (id.startsWith('rebel_') || id === 'field_captain' || id.startsWith('operations_') || id.startsWith('rebellion_')) return 'rebels';
    return null;
}

// The party fights whichever side it did not join.
export function opposingFaction(partyFaction) {
    if (partyFaction === 'enforcers') return 'rebels';
    if (partyFaction === 'rebels') return 'enforcers';
    return null;
}

// ---------------------------------------------------------------------------
// Enemy abilities
// ---------------------------------------------------------------------------

// Player abilities that make no sense for (or would break) an enemy.
const ENEMY_BANNED_ABILITY_IDS = new Set(['charge', 'eagle_eye', 'gtg', 'iron_sharpens_iron', 'zen']);

const ROLES_BY_BEHAVIOR = {
    aggressive: ['DPS'],
    defensive: ['DPS', 'Tank'],
    intelligent: ['DPS', 'Tank'],
    support: ['Support']
};

export function getAbilitiesByLevelAndRole(level, roles) {
    return Object.values(ABILITIES).filter(ability =>
        !ENEMY_BANNED_ABILITY_IDS.has(ability.id) &&
        ability.level === level &&
        roles.includes(ability.role)
    );
}

/** One random ability per unlocked tier (levels 1, 3 and 5), matching the enemy's behavior. */
export function assignEnemyAbilities(enemy, random = Math.random) {
    const { level = 1, behavior = 'aggressive' } = enemy;
    const roles = ROLES_BY_BEHAVIOR[behavior] || ['DPS'];

    return [1, 3, 5]
        .filter(abilityLevel => level >= abilityLevel)
        .map(abilityLevel => {
            const options = getAbilitiesByLevelAndRole(abilityLevel, roles);
            if (options.length === 0) return null;
            const picked = options[Math.floor(random() * options.length)];
            return { id: picked.id, name: picked.name, level: picked.level, role: picked.role };
        })
        .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Enemy creation
// ---------------------------------------------------------------------------

/**
 * A fresh enemy from a template, scaled to the party.
 * +6 to every stat per level above 1; +10% resistance per player above three.
 */
export function createEnemyInstance(template, instanceNumber, partySize, partyLevel = 1, random = Math.random) {
    const resistanceMultiplier = 1 + Math.max(0, partySize - 3) * 0.1;
    const level = Math.max(1, partyLevel || 1);
    const levelBonus = (level - 1) * 6;
    const base = template.stats;
    const maxHealth = (base.maxHealth || base.health || 0) + levelBonus;

    const enemy = {
        ...template,
        level,
        stats: {
            health: maxHealth,
            maxHealth,
            speed: (base.speed || 0) + levelBonus,
            resistance: ((base.resistance || 0) + levelBonus) * resistanceMultiplier,
            strength: (base.strength || 0) + levelBonus,
            ta: (base.ta || 0) + levelBonus
        },
        weapon: { ...template.weapon },
        id: `${template.id}_${instanceNumber + 1}`,
        isDeadBody: false,
        corpseTurnsRemaining: 0,
        usedAbilityLastTurn: false
    };

    enemy.abilities = assignEnemyAbilities(enemy, random);
    enemy.cooldowns = Object.fromEntries(enemy.abilities.map(ability => [ability.id, 0]));
    return enemy;
}

function tierPool(tier, enemyFaction) {
    const pool = EnemiesData.enemies.filter(enemy => enemy.tier === tier);
    return enemyFaction ? pool.filter(enemy => getEnemyFaction(enemy) === enemyFaction) : pool;
}

// Which of the three bosses this fight uses (0 for the first boss fight, and so on).
export function getBossOrdinal(encounterIndex) {
    const index = Math.max(0, Number(encounterIndex) || 0);
    return Math.max(0, STORY_COMBAT_FLOW.slice(0, index + 1).filter(encounter => encounter.combatType === 'boss').length - 1);
}

/**
 * The enemies for one fight.
 * @param {object} options
 * @param {number} options.encounterIndex - 0-based fight number in the story
 * @param {string|null} options.partyFaction - 'rebels' or 'enforcers' (the party fights the other side)
 * @param {number} options.partySize
 * @param {number} options.partyLevel - highest level in the party
 * @param {() => number} [options.random]
 */
export function generateEncounterEnemies({ encounterIndex = 0, partyFaction = null, partySize = 1, partyLevel = 1, random = Math.random } = {}) {
    const config = getEncounterConfig(encounterIndex);
    const enemyFaction = opposingFaction(partyFaction);
    const size = Math.max(1, partySize);

    const smallPartyHardFight = size <= 3 && ['medium', 'boss', 'mini-boss'].includes(config.combatType);
    const genericCount = config.combatType === 'low'
        ? size + 2
        : smallPartyHardFight ? 0 : Math.max(0, config.numOfGeneric || 0);
    const midCount = Math.max(0, config.numOfMid || 0);
    const miniCount = Math.max(0, config.numOfMini || 0);
    const bossCount = config.combatType === 'boss' ? 1 : 0;

    const generated = [];
    const pickFrom = (tier, count, { limitSupports = false } = {}) => {
        const pool = tierPool(tier, enemyFaction);
        for (let index = 0; index < count && pool.length > 0; index++) {
            // Medium fights get at most one support, so they don't just heal each other forever.
            const supportTaken = generated.some(enemy => enemy.tier === tier && enemy.role === 'Support');
            const nonSupports = pool.filter(enemy => enemy.role !== 'Support');
            const eligible = limitSupports && supportTaken && nonSupports.length > 0 ? nonSupports : pool;
            const template = eligible[Math.floor(random() * eligible.length)];
            generated.push(createEnemyInstance(template, generated.length, size, partyLevel, random));
        }
    };

    pickFrom('generic', genericCount);

    if (bossCount > 0) {
        const bosses = tierPool('boss', enemyFaction);
        const orderedIds = ORDERED_BOSS_IDS_BY_FACTION[enemyFaction] || [];
        const bossId = orderedIds[Math.min(getBossOrdinal(encounterIndex), Math.max(0, orderedIds.length - 1))];
        const template = bosses.find(enemy => enemy.id === bossId) || bosses[0];
        // Bosses fight one level above the party.
        if (template) generated.push(createEnemyInstance(template, generated.length, size, partyLevel + 1, random));
    }

    pickFrom('mid-tier', midCount, { limitSupports: config.combatType === 'medium' });
    pickFrom('mini-boss', miniCount);

    if (generated.length === 0) {
        pickFrom(bossCount > 0 ? 'boss' : midCount > 0 ? 'mid-tier' : miniCount > 0 ? 'mini-boss' : 'generic', 1);
    }

    return generated;
}
