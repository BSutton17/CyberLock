// Headless fights and campaigns for balance testing. Everything runs through the real rules
// (shared/combat) with bots playing the party, so results reflect the actual game.
import * as engine from '../../shared/combat/engine.js';
import { calculateTurnOrder } from '../../shared/combat/turnOrder.js';
import { generateEncounterEnemies, getEncounterConfig, TOTAL_ENCOUNTERS } from '../../shared/combat/encounters.js';
import { ABILITIES } from '../../shared/combat/abilities.js';
import { playUntil } from '../../shared/combat/autoplay.js';
import { lookaheadTurn, greedyTurn } from '../../shared/combat/partyAI.js';
import CharactersData from '../../shared/data/characters.js';
import { generateEnemySpawnPositions, generatePlayerSpawnPositions } from '../game/spawning.js';
import { LEVEL_UP_POINTS, ABILITY_UNLOCK_LEVELS } from '../game/progression.js';

// How a typical player spends the 15 points per level. Fixed (not rolled) so results are repeatable.
export function levelUpPlan(character) {
    if (character.role === 'Tank') return { maxHealth: 6, resistance: 4, strength: 5 };
    if (character.role === 'Support') return { ta: 7, maxHealth: 5, resistance: 3 };
    return engine.usesTaForWeapon(character)
        ? { ta: 7, maxHealth: 5, speed: 3 }
        : { strength: 7, maxHealth: 5, speed: 3 };
}

export const CHARACTER_IDS = CharactersData.characters.map(character => character.id);

/** Small, fast, seedable random source. */
export function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const pick = (list, random) => list[Math.floor(random() * list.length)];

export function shuffle(list, random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Ability ids a role can pick for a slot: tier 1, 3, 5 or 'ult'. */
export function abilityPool(role, tier) {
    return Object.values(ABILITIES)
        .filter(ability => ability.role === role && (tier === 'ult' ? ability.isUltimate : ability.level === tier && !ability.isUltimate))
        .map(ability => ability.id)
        .sort();
}

/**
 * A party member at `level` with the given loadout.
 * @param {string} characterId
 * @param {object} build - { level, abilities: { 1, 3, 5, ult } } ability ids per slot
 */
export function buildCharacter(characterId, { level = 1, abilities = {} } = {}) {
    const template = structuredClone(CharactersData.characters.find(character => character.id === characterId));
    const plan = levelUpPlan(template);
    const spent = Object.values(plan).reduce((a, b) => a + b, 0);
    if (spent !== LEVEL_UP_POINTS) throw new Error(`level-up plan for ${characterId} spends ${spent}`);
    for (let current = 1; current < level; current++) {
        for (const [stat, points] of Object.entries(plan)) template.stats[stat] += points;
    }
    template.stats.health = template.stats.maxHealth;
    template.level = level;

    const slots = [1, ...ABILITY_UNLOCK_LEVELS].filter(slotLevel => level >= slotLevel);
    template.abilities = slots.map(slotLevel => ({ id: abilities[slotLevel] })).filter(ability => ability.id);
    template.ultimate = level >= 3 && abilities.ult ? { id: abilities.ult } : '';
    return template;
}

/** Random loadout for a role, with any slots in `fixed` forced. */
export function randomLoadout(role, random, fixed = {}) {
    const loadout = {};
    for (const tier of [1, 3, 5, 'ult']) loadout[tier] = fixed[tier] ?? pick(abilityPool(role, tier), random);
    return loadout;
}

const roleOf = (characterId) => CharactersData.characters.find(character => character.id === characterId).role;

/** A random party: distinct characters, random loadouts. `fixed` maps member index -> slot overrides. */
export function randomParty(size, random, { characterIds = null, fixed = {} } = {}) {
    const ids = characterIds || shuffle(CHARACTER_IDS, random).slice(0, size);
    return ids.map((characterId, index) => ({
        name: `P${index + 1}`,
        characterId,
        loadout: randomLoadout(roleOf(characterId), random, fixed[index] || {})
    }));
}

/** Wraps a policy so ability use is counted per party member: { name: { abilityId: uses } }. */
function countingPolicy(policy, usage) {
    return (ctx, id) => {
        const before = { ...(ctx.cooldowns[id] || {}) };
        policy(ctx, id);
        for (const [abilityId, value] of Object.entries(ctx.cooldowns[id] || {})) {
            if (value > (before[abilityId] || 0)) {
                usage[id] = usage[id] || {};
                usage[id][abilityId] = (usage[id][abilityId] || 0) + 1;
            }
        }
    };
}

export const POLICIES = {
    lookahead: (seed) => (ctx, id) => lookaheadTurn(ctx, id, { seed }),
    greedy: () => greedyTurn
};

/**
 * Plays one story fight.
 * @param {object} options
 * @param {Array<{name, characterId, loadout}>} options.party
 * @param {number} options.encounterIndex
 * @param {number} options.level - party level for this fight
 * @param {'rebels'|'enforcers'} options.faction - the side the party joined
 * @param {number} options.seed
 * @param {object} [options.cooldowns] - carried-over cooldowns (ultimates), mutated
 * @returns {{ outcome, rounds, hpLeft, enemyDamage, score, usage, turns }}
 *   enemyDamage: share of the enemies' total health removed (1 on a win)
 *   score: 1 + hpLeft on a win, otherwise enemyDamage (a loss that nearly won scores close to 1)
 */
export function runFight({ party, encounterIndex, level, faction = 'rebels', seed = 1, cooldowns = {}, policy = 'lookahead', sceneKey = 'street', enemies = null, power = null }) {
    const random = seededRandom(seed);
    const characters = Object.fromEntries(party.map(member => [member.name, buildCharacter(member.characterId, { level, abilities: member.loadout })]));
    const names = Object.keys(characters);

    const foes = enemies || generateEncounterEnemies({ encounterIndex, partyFaction: faction, partySize: names.length, partyLevel: level, power, random });
    const config = getEncounterConfig(encounterIndex);
    const playerSpots = generatePlayerSpawnPositions(names, characters, sceneKey, random);
    const enemySpots = generateEnemySpawnPositions(foes, sceneKey, Object.values(playerSpots));

    for (const cds of Object.values(cooldowns)) {
        for (const abilityId of Object.keys(cds)) if (!ABILITIES[abilityId]?.isUltimate) cds[abilityId] = 0;
    }

    const ctx = {
        combat: engine.createCombatState({
            encounterIndex,
            sceneKey,
            combatType: config.combatType,
            postCombat: config.postCombat,
            enemies: foes,
            positions: { ...playerSpots, ...enemySpots },
            turnOrder: calculateTurnOrder(names, characters, foes)
        }),
        characters,
        cooldowns,
        random
    };
    engine.beginTurn(ctx);

    const usage = {};
    const outcome = playUntil(ctx, countingPolicy(POLICIES[policy](seed), usage), { maxTurns: 800 }) || 'stalled';
    const hpLeft = names.reduce((total, name) => total + Math.max(0, ctx.characters[name].stats.health), 0)
        / names.reduce((total, name) => total + ctx.characters[name].stats.maxHealth, 0);
    const rounds = ctx.combat.turnNumber / Math.max(1, names.length + foes.length);
    const enemyMax = foes.reduce((total, foe) => total + foe.stats.maxHealth, 0);
    const enemyLeft = foes.reduce((total, foe) => {
        const now = ctx.combat.enemies.find(enemy => enemy.id === foe.id);
        return total + (now && !now.isDeadBody ? Math.max(0, now.stats.health) : 0);
    }, 0);
    const enemyDamage = outcome === 'win' ? 1 : 1 - enemyLeft / Math.max(1, enemyMax);
    return {
        outcome,
        rounds,
        hpLeft: outcome === 'win' ? hpLeft : 0,
        enemyDamage,
        score: outcome === 'win' ? 1 + hpLeft : enemyDamage,
        usage,
        turns: ctx.combat.turnNumber
    };
}

// Party level when each fight starts (levels come after fights marked levelUp).
export function levelsByEncounter() {
    const levels = [];
    let level = 1;
    for (let index = 0; index < TOTAL_ENCOUNTERS; index++) {
        levels.push(level);
        if (getEncounterConfig(index).postCombat === 'levelUp') level = Math.min(5, level + 1);
    }
    return levels;
}

/**
 * Plays the story's fights in order until the party loses (the real game ends there).
 * Returns { won: fights won, fights: [{ encounterIndex, outcome, rounds, hpLeft }] }.
 */
export function runCampaign({ party, faction = 'rebels', seed = 1, policy = 'lookahead', upTo = TOTAL_ENCOUNTERS, continueAfterLoss = false }) {
    const levels = levelsByEncounter();
    const cooldowns = {};
    const fights = [];
    let won = 0;
    for (let encounterIndex = 0; encounterIndex < upTo; encounterIndex++) {
        const result = runFight({ party, encounterIndex, level: levels[encounterIndex], faction, seed: seed * 1000 + encounterIndex, cooldowns, policy });
        fights.push({ encounterIndex, ...result });
        if (result.outcome === 'win') won += 1;
        else if (!continueAfterLoss) break;
    }
    return { won, fights };
}
