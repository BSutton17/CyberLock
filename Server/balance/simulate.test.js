import { describe, it, expect } from 'vitest';
import { buildCharacter, runFight, randomParty, seededRandom, abilityPool, levelsByEncounter, runCampaign } from './simulate.js';
import { abilityTasks, summarizeAbilities, partySizeTasks, summarizePartySizes, calibrationCells, calibrationTasks, updateCalibration, calibratedTable, cellPower, TARGET_WIN_RATES, smoothRow } from './experiments.js';
import { LEVEL_UP_POINTS } from '../game/progression.js';
import CharactersData from '../../shared/data/characters.js';

describe('balance simulator', () => {
  it('builds characters the way the level-up screen would', () => {
    const base = CharactersData.characters.find(c => c.id === 'healing_support_1');
    const level3 = buildCharacter('healing_support_1', { level: 3, abilities: { 1: 'humble', 3: 'love', 5: 'blackjack', ult: 'love_galore' } });
    const spent = ['maxHealth', 'speed', 'resistance', 'strength', 'ta'].reduce((total, stat) => total + level3.stats[stat] - base.stats[stat], 0);
    expect(spent).toBe(2 * LEVEL_UP_POINTS);
    expect(level3.stats.health).toBe(level3.stats.maxHealth);
    expect(level3.abilities.map(a => a.id)).toEqual(['humble', 'love']); // the level 5 slot is not open yet
    expect(level3.ultimate).toEqual({ id: 'love_galore' });
  });

  it('only offers abilities of the slot being filled', () => {
    expect(abilityPool('DPS', 1)).toContain('shadow_strike');
    expect(abilityPool('DPS', 1)).not.toContain('fireball');
    expect(abilityPool('Tank', 'ult')).toEqual(['executioners_judgment', 'murus_fictilis', 'white_phospherus']);
  });

  it('levels the party after the fights that grant a level', () => {
    expect(levelsByEncounter()).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5, 5]);
  });

  it('gives the same result for the same seed', () => {
    const party = randomParty(3, seededRandom(4));
    const first = runFight({ party, encounterIndex: 0, level: 1, seed: 11, policy: 'greedy' });
    const second = runFight({ party, encounterIndex: 0, level: 1, seed: 11, policy: 'greedy' });
    expect(second).toEqual(first);
    expect(['win', 'loss']).toContain(first.outcome);
    expect(first.score).toBeGreaterThanOrEqual(0);
  });

  it('stops a campaign at the first loss', () => {
    const party = randomParty(1, seededRandom(2));
    const { won, fights } = runCampaign({ party, seed: 3, policy: 'greedy', upTo: 3 });
    expect(fights.length).toBe(Math.min(3, won + 1));
  });

  it('pairs every ability of a slot against the same scenarios', () => {
    const tasks = abilityTasks({ samples: 2, roles: ['Tank'], tiers: [1], policy: 'greedy' });
    const pool = abilityPool('Tank', 1);
    expect(tasks).toHaveLength(2 * pool.length);
    const firstScenario = tasks.filter(task => task.meta.scenario === 0);
    expect(new Set(firstScenario.map(task => task.seed)).size).toBe(1);
    expect(firstScenario.map(task => task.party[0].loadout[1]).sort()).toEqual(pool);

    // Fake results: the first ability always wins, the rest always lose.
    const results = tasks.map(task => ({ outcome: task.meta.abilityId === pool[0] ? 'win' : 'loss', score: task.meta.abilityId === pool[0] ? 2 : 0, usage: {} }));
    const [summary] = summarizeAbilities(tasks, results);
    expect(summary.rows[0].abilityId).toBe(pool[0]);
    expect(summary.rows[0].edge).toBeCloseTo(2 - 2 / pool.length);
  });

  it('calibration makes enemies stronger when a party wins too often, weaker when it loses', () => {
    const cells = calibrationCells({ sizes: [1] });
    expect(cells).toHaveLength(10);
    expect(cells[2].target).toBe(TARGET_WIN_RATES.boss);
    const before = cells.map(cellPower);
    const tasks = calibrationTasks(cells, { samples: 2, policy: 'greedy' });
    expect(tasks.every(task => task.power === cellPower(cells[task.meta.cellIndex]))).toBe(true);
    // Fight 1 always won, every other fight always lost.
    updateCalibration(cells, tasks, tasks.map(task => ({ outcome: task.encounterIndex === 0 ? 'win' : 'loss' })));
    expect(cellPower(cells[0])).toBeGreaterThan(before[0]);
    expect(cellPower(cells[1])).toBeLessThan(before[1]);
    const table = calibratedTable(cells);
    expect(table).toHaveLength(10);
    expect(table[1][0]).toBeCloseTo(cellPower(cells[1]), 2); // already below the rest of its row
    for (const row of table) row.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(row[i]));
  });

  it('smooths a calibrated row so a bigger party never faces weaker enemies', () => {
    expect(smoothRow([0.5, 0.9, 0.7, 1, 1.2, 1.1])).toEqual([0.5, 0.8, 0.8, 1, 1.15, 1.15]);
    expect(smoothRow([1, 1, 1])).toEqual([1, 1, 1]);
  });

  it('turns per-fight win rates into campaign odds', () => {
    const tasks = partySizeTasks({ sizes: [2], samples: 1, policy: 'greedy' });
    const results = tasks.map(task => ({ outcome: task.encounterIndex < 9 ? 'win' : 'loss', hpLeft: 0.5, rounds: 3 }));
    const summary = summarizePartySizes(tasks, results);
    expect(summary[2].fights).toHaveLength(10);
    expect(summary[2].campaign).toBe(0);
  });
});
