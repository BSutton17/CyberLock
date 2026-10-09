// The balance experiments: how hard each fight is for each party size, and how each ability
// compares with the other abilities a player could have picked for the same slot.
import CharactersData from '../../shared/data/characters.js';
import { ABILITIES } from '../../shared/combat/abilities.js';
import { TOTAL_ENCOUNTERS, getEncounterConfig } from '../../shared/combat/encounters.js';
import { abilityPool, levelsByEncounter, randomParty, seededRandom, shuffle, pick, CHARACTER_IDS } from './simulate.js';

const ROLES = ['DPS', 'Tank', 'Support'];
export const TIERS = [1, 3, 5, 'ult'];

// Which fights each slot is judged in: the fights where a character has that slot.
const FIGHTS_FOR_TIER = { 1: [0, 1, 2], 3: [3, 4, 5, 6], 5: [7, 8, 9], ult: [3, 4, 5, 6, 7, 8, 9] };

const mean = (values) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const stdError = (values) => {
    if (values.length < 2) return 0;
    const m = mean(values);
    return Math.sqrt(values.reduce((total, v) => total + (v - m) ** 2, 0) / (values.length - 1) / values.length);
};

// ---------------------------------------------------------------------------
// Party size
// ---------------------------------------------------------------------------

/** Tasks: `samples` random parties of each size in each story fight. */
export function partySizeTasks({ sizes = [1, 2, 3, 4, 5, 6], samples = 60, seed = 1, policy = 'lookahead' } = {}) {
    const levels = levelsByEncounter();
    const tasks = [];
    for (const size of sizes) {
        for (let encounterIndex = 0; encounterIndex < TOTAL_ENCOUNTERS; encounterIndex++) {
            for (let sample = 0; sample < samples; sample++) {
                const taskSeed = seed * 1_000_003 + size * 10_007 + encounterIndex * 1009 + sample;
                const random = seededRandom(taskSeed);
                tasks.push({
                    meta: { size, encounterIndex },
                    party: randomParty(size, random),
                    encounterIndex,
                    level: levels[encounterIndex],
                    faction: random() < 0.5 ? 'rebels' : 'enforcers',
                    seed: taskSeed,
                    policy
                });
            }
        }
    }
    return tasks;
}

/** { [size]: { fights: [{ encounterIndex, winRate, hpLeft }], campaign } } */
export function summarizePartySizes(tasks, results) {
    const bySize = {};
    tasks.forEach((task, i) => {
        const { size, encounterIndex } = task.meta;
        bySize[size] = bySize[size] || {};
        (bySize[size][encounterIndex] = bySize[size][encounterIndex] || []).push(results[i]);
    });
    const summary = {};
    for (const [size, fights] of Object.entries(bySize)) {
        const rows = Object.entries(fights).map(([encounterIndex, list]) => ({
            encounterIndex: Number(encounterIndex),
            winRate: mean(list.map(r => (r.outcome === 'win' ? 1 : 0))),
            hpLeft: mean(list.filter(r => r.outcome === 'win').map(r => r.hpLeft)),
            rounds: mean(list.map(r => r.rounds)),
            samples: list.length
        })).sort((a, b) => a.encounterIndex - b.encounterIndex);
        summary[size] = { fights: rows, campaign: rows.reduce((odds, row) => odds * row.winRate, 1) };
    }
    return summary;
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

const charactersOfRole = (role) => CharactersData.characters.filter(character => character.role === role).map(character => character.id);

/**
 * Paired comparison: each scenario (party, fight, luck) is played once per ability in the pool,
 * with only the tested member's slot changed. Tasks carry { role, tier, scenario, abilityId }.
 */
export function abilityTasks({ samples = 150, seed = 7, sizes = [2, 3, 4, 5], roles = ROLES, tiers = TIERS, policy = 'lookahead' } = {}) {
    const levels = levelsByEncounter();
    const tasks = [];
    for (const role of roles) {
        for (const tier of tiers) {
            const pool = abilityPool(role, tier);
            for (let scenario = 0; scenario < samples; scenario++) {
                const scenarioSeed = seed * 1_000_003 + ROLES.indexOf(role) * 100_003 + TIERS.indexOf(tier) * 10_007 + scenario;
                const random = seededRandom(scenarioSeed);
                const size = pick(sizes, random);
                const subject = pick(charactersOfRole(role), random);
                const others = shuffle(CHARACTER_IDS.filter(id => id !== subject), random).slice(0, size - 1);
                const party = randomParty(size, random, { characterIds: [subject, ...others] });
                const encounterIndex = pick(FIGHTS_FOR_TIER[tier], random);
                const faction = random() < 0.5 ? 'rebels' : 'enforcers';
                for (const abilityId of pool) {
                    const armParty = party.map((member, index) => (index === 0 ? { ...member, loadout: { ...member.loadout, [tier]: abilityId } } : member));
                    tasks.push({
                        meta: { role, tier, scenario, abilityId, size },
                        party: armParty,
                        encounterIndex,
                        level: levels[encounterIndex],
                        faction,
                        seed: scenarioSeed,
                        policy
                    });
                }
            }
        }
    }
    return tasks;
}

/**
 * Per role and slot, each ability's average result and its edge over the slot average
 * (paired by scenario, with a standard error). Usage = times the tested member used it per fight.
 */
export function summarizeAbilities(tasks, results) {
    const groups = {};
    tasks.forEach((task, i) => {
        const { role, tier, scenario, abilityId } = task.meta;
        const key = `${role}|${tier}`;
        groups[key] = groups[key] || {};
        groups[key][scenario] = groups[key][scenario] || {};
        groups[key][scenario][abilityId] = results[i];
    });

    const summary = [];
    for (const [key, scenarios] of Object.entries(groups)) {
        const [role, tierText] = key.split('|');
        const tier = tierText === 'ult' ? 'ult' : Number(tierText);
        const pool = abilityPool(role, tier);
        const rows = pool.map(abilityId => {
            const edges = [];
            const scores = [];
            const wins = [];
            const uses = [];
            for (const arms of Object.values(scenarios)) {
                const slotAverage = mean(pool.map(id => arms[id].score));
                edges.push(arms[abilityId].score - slotAverage);
                scores.push(arms[abilityId].score);
                wins.push(arms[abilityId].outcome === 'win' ? 1 : 0);
                uses.push(arms[abilityId].usage?.P1?.[abilityId] || 0);
            }
            return {
                abilityId,
                name: ABILITIES[abilityId].name,
                edge: mean(edges),
                edgeError: stdError(edges),
                score: mean(scores),
                winRate: mean(wins),
                usesPerFight: mean(uses),
                samples: edges.length
            };
        }).sort((a, b) => b.edge - a.edge);
        summary.push({ role, tier, rows });
    }
    const order = (entry) => ROLES.indexOf(entry.role) * 10 + TIERS.indexOf(entry.tier);
    return summary.sort((a, b) => order(a) - order(b));
}

// ---------------------------------------------------------------------------
// Calibration of enemy power by party size
// ---------------------------------------------------------------------------

// The chance a party should have of winning each kind of fight, whatever its size. Together these
// give roughly a one-in-three chance of winning the whole campaign.
export const TARGET_WIN_RATES = { low: 0.95, medium: 0.9, 'mini-boss': 0.9, boss: 0.85 };

export function calibrationCells({ sizes = [1, 2, 3, 4, 5, 6], low = 0.25, high = 3.5 } = {}) {
    const cells = [];
    for (let encounterIndex = 0; encounterIndex < TOTAL_ENCOUNTERS; encounterIndex++) {
        for (const size of sizes) {
            cells.push({ encounterIndex, size, low, high, target: TARGET_WIN_RATES[getEncounterConfig(encounterIndex).combatType], history: [] });
        }
    }
    return cells;
}

export const cellPower = (cell) => Math.sqrt(cell.low * cell.high);

/** One bisection round: `samples` fights per cell at its current guess (same parties every round). */
export function calibrationTasks(cells, { samples = 80, seed = 3, policy = 'lookahead' } = {}) {
    const levels = levelsByEncounter();
    const tasks = [];
    cells.forEach((cell, cellIndex) => {
        const power = cellPower(cell);
        for (let sample = 0; sample < samples; sample++) {
            const taskSeed = seed * 1_000_003 + cell.size * 10_007 + cell.encounterIndex * 1009 + sample;
            const random = seededRandom(taskSeed);
            tasks.push({
                meta: { cellIndex },
                party: randomParty(cell.size, random),
                encounterIndex: cell.encounterIndex,
                level: levels[cell.encounterIndex],
                faction: random() < 0.5 ? 'rebels' : 'enforcers',
                seed: taskSeed,
                power,
                policy
            });
        }
    });
    return tasks;
}

/** Narrows each cell's range: winning too often means the enemies should be stronger. */
export function updateCalibration(cells, tasks, results) {
    const wins = cells.map(() => ({ won: 0, total: 0 }));
    tasks.forEach((task, i) => {
        const tally = wins[task.meta.cellIndex];
        tally.total += 1;
        if (results[i].outcome === 'win') tally.won += 1;
    });
    cells.forEach((cell, index) => {
        const power = cellPower(cell);
        const winRate = wins[index].won / Math.max(1, wins[index].total);
        cell.history.push({ power, winRate });
        if (winRate > cell.target) cell.low = power;
        else cell.high = power;
    });
}

/**
 * Makes a row never decrease (a bigger party never faces weaker enemies) by averaging any
 * out-of-order neighbours (pool-adjacent-violators). Calibration noise otherwise leaves small dips.
 */
export function smoothRow(row) {
    const blocks = row.map(value => ({ sum: value, count: 1 }));
    for (let i = 0; i < blocks.length - 1;) {
        if (blocks[i].sum / blocks[i].count > blocks[i + 1].sum / blocks[i + 1].count) {
            blocks[i] = { sum: blocks[i].sum + blocks[i + 1].sum, count: blocks[i].count + blocks[i + 1].count };
            blocks.splice(i + 1, 1);
            if (i > 0) i -= 1;
        } else {
            i += 1;
        }
    }
    return blocks.flatMap(block => Array(block.count).fill(Math.round((block.sum / block.count) * 100) / 100));
}

/**
 * The tuned table: rows are fights, columns party sizes 1-6, smoothed so power rises with size.
 * With `base`, only the calibrated cells change (for re-tuning part of the table).
 */
export function calibratedTable(cells, base = null) {
    const table = base ? base.map(row => [...row]) : Array.from({ length: TOTAL_ENCOUNTERS }, () => Array(6).fill(1));
    for (const cell of cells) table[cell.encounterIndex][cell.size - 1] = cellPower(cell);
    return table.map(smoothRow);
}
