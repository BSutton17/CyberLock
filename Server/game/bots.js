// Bot party members: computer-controlled characters that fill empty seats. Pure functions only;
// the socket handlers decide when to call them and the combat controller plays their turns.
import CharactersData from '../../shared/data/characters.js';
import { ABILITIES } from '../../shared/combat/abilities.js';
import { applyLevelUp, getLevel, ABILITY_UNLOCK_LEVELS, LEVEL_UP_POINTS } from './progression.js';
import { ATTRIBUTE_NAMES } from './attributes.js';
import { normalizeAttribute } from '../narrator/decisions.js';

const BOT_NAMES = ['Nova', 'Atlas', 'Echo', 'Rook', 'Vega', 'Byte', 'Onyx', 'Juno'];
export const BOT_SUFFIX = ' (bot)';

export const isBot = (room, name) => Array.isArray(room?.bots) && room.bots.includes(name);
export const humanPlayers = (room) => (room?.players || []).filter(name => !isBot(room, name));

/** A free bot name like "Nova (bot)". */
export function nextBotName(room) {
    const taken = new Set([...(room.players || []), ...Object.keys(room.memberIds || {})]);
    for (const base of BOT_NAMES) {
        const name = `${base}${BOT_SUFFIX}`;
        if (!taken.has(name)) return name;
    }
    for (let n = 1; ; n++) {
        const name = `Bot ${n}${BOT_SUFFIX}`;
        if (!taken.has(name)) return name;
    }
}

const takenCharacterIds = (room) => new Set(Object.values(room.characterSelections || {}).map(character => character?.id).filter(Boolean));

/**
 * The character a new bot plays: the role the party is missing most (Tank, then Support, then DPS),
 * picked at random among the characters nobody has taken. Null when every character is taken.
 */
export function chooseBotCharacter(room, random = Math.random) {
    const taken = takenCharacterIds(room);
    const free = CharactersData.characters.filter(character => !taken.has(character.id));
    if (free.length === 0) return null;
    const roles = Object.values(room.characterSelections || {}).map(character => character?.role);
    const count = (role) => roles.filter(r => r === role).length;
    const wanted = ['Tank', 'Support', 'DPS'].sort((a, b) => count(a) - count(b))
        .find(role => free.some(character => character.role === role));
    const options = free.filter(character => character.role === wanted);
    return structuredClone(options[Math.floor(random() * options.length)]);
}

// How likely a bot is to put each 5-point chunk into each stat (percent), by character.
// Gene Shock's chart only covered 85%; the remaining 15% goes to Strength.
export const LEVEL_UP_CHANCES = {
    Tank: { maxHealth: 26, resistance: 26, speed: 8, strength: 20, ta: 20 },
    Support: { ta: 52, maxHealth: 16, resistance: 16, speed: 16 },
    aggressive_dps_2: { strength: 35, speed: 35, maxHealth: 10, resistance: 20 },            // Leo
    spellcaster_dps_1: { ta: 40, maxHealth: 15, resistance: 15, speed: 15, strength: 15 },   // Gene Shock
    traditional_warrior_dps_3: { maxHealth: 20, resistance: 20, speed: 20, strength: 20, ta: 20 } // Last Legion
};
export const POINTS_PER_ROLL = 5;

export function levelUpChancesFor(character) {
    return LEVEL_UP_CHANCES[character?.id] || LEVEL_UP_CHANCES[character?.role] || LEVEL_UP_CHANCES.traditional_warrior_dps_3;
}

/**
 * How a bot spends its level-up points: LEVEL_UP_POINTS in chunks of 5, each chunk rolled on its
 * own against the character's chances. Returns { stat: points }.
 */
export function rollLevelUpPlan(character, random = Math.random) {
    const chances = Object.entries(levelUpChancesFor(character));
    const total = chances.reduce((sum, [, weight]) => sum + weight, 0);
    const plan = {};
    for (let roll = 0; roll < LEVEL_UP_POINTS / POINTS_PER_ROLL; roll++) {
        let pick = random() * total;
        const [stat] = chances.find(([, weight]) => (pick -= weight) < 0) || chances[chances.length - 1];
        plan[stat] = (plan[stat] || 0) + POINTS_PER_ROLL;
    }
    return plan;
}

/** The bot's character one level up (through the same rules players use). */
export function levelUpBot(character, random = Math.random) {
    const plan = rollLevelUpPlan(character, random);
    const spent = Object.values(plan).reduce((a, b) => a + b, 0);
    if (spent !== LEVEL_UP_POINTS) throw new Error(`bot level-up plan spends ${spent} points`);
    const submitted = { ...character, stats: { ...character.stats } };
    for (const [stat, points] of Object.entries(plan)) submitted.stats[stat] = (submitted.stats[stat] || 0) + points;
    return applyLevelUp(character, submitted);
}

const abilityIdOf = (ability) => (typeof ability === 'string' ? ability : ability?.id);

/**
 * Fills any empty ability slots the bot's level allows (level 1, 3 and 5 slots, plus an ultimate
 * from level 3) with random picks from its role. Existing picks are kept.
 */
export function fillBotAbilities(character, random = Math.random) {
    const level = getLevel(character);
    const slots = [1, ...ABILITY_UNLOCK_LEVELS].filter(slotLevel => level >= slotLevel);
    const abilities = Array.isArray(character.abilities) ? [...character.abilities] : [];
    const pickFrom = (filter) => {
        const options = Object.values(ABILITIES).filter(ability => ability.role === character.role && filter(ability));
        const ability = options[Math.floor(random() * options.length)];
        // Plain data, the same shape a player's pick has after it crosses the socket.
        return ability ? JSON.parse(JSON.stringify(ability)) : null;
    };

    slots.forEach((slotLevel, index) => {
        if (abilityIdOf(abilities[index])) return;
        abilities[index] = pickFrom(ability => !ability.isUltimate && ability.level === slotLevel);
    });

    const hasUltimate = !!abilityIdOf(character.ultimate);
    const ultimate = level >= 3 && !hasUltimate ? pickFrom(ability => ability.isUltimate) : character.ultimate;
    return { ...character, abilities: abilities.filter(Boolean), ultimate: ultimate || '' };
}

/**
 * Primary and secondary attributes for each bot, picked after every person has chosen: bots only
 * take attributes no person picked (and no other bot took). In a big party there may be too few
 * left, so a bot then settles for anything that isn't someone's primary.
 * Returns { botName: [primary, secondary] }.
 */
export function chooseBotAttributes(room, random = Math.random) {
    const picks = {};
    const key = (name) => normalizeAttribute(name);
    const humanPicks = humanPlayers(room).flatMap(name => (room.attributes?.[name] || []).slice(0, 2)).map(key).filter(Boolean);
    const taken = new Set(humanPicks);
    const primaries = new Set(humanPlayers(room).map(name => key(room.attributes?.[name]?.[0])).filter(Boolean));

    for (const bot of (room.bots || []).filter(name => room.players.includes(name))) {
        const chosen = [];
        for (let slot = 0; slot < 2; slot++) {
            const free = ATTRIBUTE_NAMES.filter(name => !taken.has(key(name)) && !chosen.includes(name));
            const fallback = ATTRIBUTE_NAMES.filter(name => !primaries.has(key(name)) && !chosen.includes(name));
            const options = free.length > 0 ? free : fallback;
            if (options.length === 0) break;
            const name = options[Math.floor(random() * options.length)];
            chosen.push(name);
            taken.add(key(name));
            if (slot === 0) primaries.add(key(name));
        }
        picks[bot] = chosen;
    }
    return picks;
}
