// The campaign's ten fights and how their enemies are built.

import { ABILITIES } from './abilities.js';
import EnemiesData from '../data/enemies.js';

// One entry per fight, in story order. How many enemies show up depends on the party's size
// (see encounterComposition); the numbers here are the most a big party faces.
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
// Party size
// ---------------------------------------------------------------------------

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * How many enemies of each tier a fight fields for a party of `partySize` (1-6). Small parties
 * face fewer enemies so they aren't simply out-acted; ENEMY_POWER then evens out the rest.
 */
export function encounterComposition(encounterIndex, partySize) {
    const config = getEncounterConfig(encounterIndex);
    const size = clamp(Math.round(Number(partySize) || 1), 1, 6);
    switch (config.combatType) {
        case 'low':
            return { generic: size + 1, mid: 0, mini: 0, boss: 0 };
        case 'medium':
            return { generic: clamp(size - 2, 0, (config.numOfGeneric || 0) + 1), mid: size >= 3 ? config.numOfMid : 1, mini: 0, boss: 0 };
        case 'mini-boss':
            return { generic: clamp(size - 3, 0, config.numOfGeneric || 0), mid: size >= 3 ? config.numOfMid : size - 1, mini: config.numOfMini || 1, boss: 0 };
        case 'boss':
            return { generic: clamp(size - 2, 0, config.numOfGeneric || 0), mid: size >= 3 ? config.numOfMid : 0, mini: 0, boss: 1 };
        default:
            return { generic: size + 1, mid: 0, mini: 0, boss: 0 };
    }
}

// Multiplier on enemy max health, Resistance, Strength and TA for each story fight (rows, in order)
// and party size (columns, 1-6 players). Toughness scales along with damage, so a small party
// faces enemies that go down as quickly as a big party's do and fights don't drag on. Tuned with `node scripts/balance.js calibrate` so a party of any
// size has about the same chance of winning each fight. 1 = the enemy's normal stats.
export const ENEMY_POWER = [
    [0.56, 0.88, 1.08, 1.27, 1.27, 1.38], // fight 1
    [0.42, 0.84, 0.84, 0.88, 1, 1.22], // fight 2
    [0.29, 0.56, 0.63, 0.72, 0.92, 0.95], // fight 3
    [0.72, 1.08, 1.38, 1.63, 1.92, 1.92], // fight 4
    [0.51, 1.09, 1.17, 1.22, 1.44, 1.7], // fight 5
    [0.61, 0.84, 1.17, 1.38, 1.77, 1.92], // fight 6
    [0.34, 0.58, 0.81, 0.92, 1.33, 1.57], // fight 7
    [0.63, 1, 1.38, 1.63, 1.74, 1.74], // fight 8
    [0.49, 0.78, 1, 1.27, 1.5, 1.63], // fight 9
    [0.33, 0.78, 0.84, 1.08, 1.33, 1.38] // fight 10
];

export function enemyPowerFor(encounterIndex, partySize) {
    const row = ENEMY_POWER[clamp(Number(encounterIndex) || 0, 0, ENEMY_POWER.length - 1)];
    return row[clamp(Math.round(Number(partySize) || 1), 1, 6) - 1] ?? 1;
}

// ---------------------------------------------------------------------------
// Enemy creation
// ---------------------------------------------------------------------------

/**
 * A fresh enemy from a template. +6 to every stat per level above 1, then max health, Resistance,
 * Strength and TA are multiplied by `power` (from ENEMY_POWER, so fights fit the party's size).
 */
export function createEnemyInstance(template, instanceNumber, { level: enemyLevel = 1, power = 1, random = Math.random } = {}) {
    const level = Math.max(1, enemyLevel || 1);
    const levelBonus = (level - 1) * 6;
    const base = template.stats;
    const scale = (value) => Math.max(1, Math.round(value * power));
    const maxHealth = scale((base.maxHealth || base.health || 0) + levelBonus);

    const enemy = {
        ...template,
        level,
        stats: {
            health: maxHealth,
            maxHealth,
            speed: (base.speed || 0) + levelBonus,
            resistance: scale((base.resistance || 0) + levelBonus),
            strength: scale((base.strength || 0) + levelBonus),
            ta: scale((base.ta || 0) + levelBonus)
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
 * @param {number} [options.power] - overrides ENEMY_POWER (used when tuning it)
 * @param {() => number} [options.random]
 */
export function generateEncounterEnemies({ encounterIndex = 0, partyFaction = null, partySize = 1, partyLevel = 1, power = null, random = Math.random } = {}) {
    const config = getEncounterConfig(encounterIndex);
    const enemyFaction = opposingFaction(partyFaction);
    const counts = encounterComposition(encounterIndex, partySize);
    const enemyPower = power ?? enemyPowerFor(encounterIndex, partySize);

    const generated = [];
    // `fightersAfter`: enemies still to be added after this tier (bosses and mini-bosses always fight).
    const pickFrom = (tier, count, { limitSupports = false, level = partyLevel, fightersAfter = 0 } = {}) => {
        const pool = tierPool(tier, enemyFaction);
        for (let index = 0; index < count && pool.length > 0; index++) {
            // Medium fights get at most one support, so they don't just heal each other forever.
            const supportTaken = generated.some(enemy => enemy.tier === tier && enemy.role === 'Support');
            const nonSupports = pool.filter(enemy => enemy.role !== 'Support');
            // A support never fights alone: a lone healer just out-heals a small party forever.
            const wouldBeAlone = index === count - 1 && fightersAfter === 0 && !generated.some(enemy => enemy.role !== 'Support');
            const eligible = ((limitSupports && supportTaken) || wouldBeAlone) && nonSupports.length > 0 ? nonSupports : pool;
            const template = eligible[Math.floor(random() * eligible.length)];
            generated.push(createEnemyInstance(template, generated.length, { level, power: enemyPower, random }));
        }
    };

    pickFrom('generic', counts.generic, { fightersAfter: counts.boss + counts.mid + counts.mini });

    if (counts.boss > 0) {
        const bosses = tierPool('boss', enemyFaction);
        const orderedIds = ORDERED_BOSS_IDS_BY_FACTION[enemyFaction] || [];
        const bossId = orderedIds[Math.min(getBossOrdinal(encounterIndex), Math.max(0, orderedIds.length - 1))];
        const template = bosses.find(enemy => enemy.id === bossId) || bosses[0];
        // Bosses fight one level above the party.
        if (template) generated.push(createEnemyInstance(template, generated.length, { level: partyLevel + 1, power: enemyPower, random }));
    }

    pickFrom('mid-tier', counts.mid, { limitSupports: config.combatType === 'medium', fightersAfter: counts.mini });
    pickFrom('mini-boss', counts.mini);

    if (generated.length === 0) {
        pickFrom(counts.boss > 0 ? 'boss' : counts.mid > 0 ? 'mid-tier' : counts.mini > 0 ? 'mini-boss' : 'generic', 1);
    }

    return generated;
}
