import { describe, it, expect } from 'vitest';
import {
  GRID_ROWS,
  GRID_COLS,
  isSewerSpawnBlockedTile,
  getEnemySpawnDepth,
  getEnemySpawnColumnOrder,
  generateEnemySpawnPositions,
  generatePlayerSpawnPositions
} from './spawning.js';

const cellKey = ({ row, col }) => `${row},${col}`;
const inBounds = ({ row, col }) => row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;

const makeEnemies = (count, extra = {}) =>
  Array.from({ length: count }, (_, i) => ({ id: `e${i}`, role: 'DPS', behavior: 'aggressive', ...extra }));

describe('getEnemySpawnDepth', () => {
  it('puts supports and defensive enemies in the back row', () => {
    expect(getEnemySpawnDepth({ role: 'Support' })).toBe(0);
    expect(getEnemySpawnDepth({ behavior: 'defensive' })).toBe(0);
  });

  it('puts aggressive and intelligent enemies one row forward', () => {
    expect(getEnemySpawnDepth({ behavior: 'aggressive' })).toBe(1);
    expect(getEnemySpawnDepth({ behavior: 'intelligent' })).toBe(1);
    expect(getEnemySpawnDepth({})).toBe(1);
  });
});

describe('getEnemySpawnColumnOrder', () => {
  it('lists every column exactly once, center first', () => {
    for (const row of [0, 1, 2]) {
      const order = getEnemySpawnColumnOrder(row);
      expect([...order].sort((a, b) => a - b)).toEqual([...Array(GRID_COLS).keys()]);
      expect([4, 5]).toContain(order[0]);
    }
  });
});

describe('generateEnemySpawnPositions', () => {
  it('gives every enemy a unique in-bounds cell, even for a full 18-enemy fight', () => {
    const enemies = makeEnemies(18);
    const positions = generateEnemySpawnPositions(enemies);
    const cells = Object.values(positions);

    expect(Object.keys(positions).sort()).toEqual(enemies.map(e => e.id).sort());
    expect(cells.every(inBounds)).toBe(true);
    expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
  });

  it('places back-line and front-line enemies in their preferred rows', () => {
    const positions = generateEnemySpawnPositions([
      { id: 'healer', role: 'Support' },
      { id: 'brute', behavior: 'aggressive' }
    ]);
    expect(positions.healer.row).toBe(0);
    expect(positions.brute.row).toBe(1);
  });

  it('keeps enemies in the top rows so they never overlap player spawns', () => {
    const cells = Object.values(generateEnemySpawnPositions(makeEnemies(10)));
    expect(cells.every(cell => cell.row <= 2)).toBe(true);
  });

  it('never spawns an enemy on a tile a player already holds', () => {
    const occupied = [{ row: 1, col: 4 }, { row: 0, col: 5 }];
    const cells = Object.values(generateEnemySpawnPositions(makeEnemies(12), null, occupied));
    expect(cells.some(cell => occupied.some(taken => taken.row === cell.row && taken.col === cell.col))).toBe(false);
  });

  it('never spawns enemies on blocked sewer tiles', () => {
    const cells = Object.values(generateEnemySpawnPositions(makeEnemies(14), 'sewer'));
    expect(cells.some(cell => isSewerSpawnBlockedTile('sewer', cell.row, cell.col))).toBe(false);
    expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
  });
});

describe('generatePlayerSpawnPositions', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const selections = {
    p1: { role: 'Tank' },
    p2: { role: 'DPS' },
    p3: { role: 'Support' },
    p4: { role: 'tank' },
    p5: { role: 'DPS' },
    p6: {}
  };
  const seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  it('gives a full party of six unique cells in the bottom two rows', () => {
    const cells = Object.values(generatePlayerSpawnPositions(players, selections));
    expect(cells).toHaveLength(6);
    expect(cells.every(cell => cell.row >= 5 && inBounds(cell))).toBe(true);
    expect(new Set(cells.map(cellKey)).size).toBe(6);
  });

  it('puts tanks on the second row from the bottom and everyone else on the bottom row', () => {
    for (let seed = 1; seed < 30; seed++) {
      const positions = generatePlayerSpawnPositions(players, selections, 'street', seeded(seed));
      expect(positions.p1.row).toBe(5);
      expect(positions.p4.row).toBe(5);
      for (const player of ['p2', 'p3', 'p5', 'p6']) expect(positions[player].row).toBe(6);
    }
  });

  it('never puts anyone against a side wall', () => {
    for (let seed = 1; seed < 50; seed++) {
      for (const scene of ['street', 'sewer']) {
        const cells = Object.values(generatePlayerSpawnPositions(players, selections, scene, seeded(seed)));
        expect(cells.every(cell => cell.col > 0 && cell.col < 9), `seed ${seed} ${scene}`).toBe(true);
      }
    }
  });

  it('mixes up the columns from fight to fight', () => {
    const layouts = new Set();
    for (let seed = 1; seed < 20; seed++) {
      layouts.add(JSON.stringify(generatePlayerSpawnPositions(players, selections, 'street', seeded(seed))));
    }
    expect(layouts.size).toBeGreaterThan(10);
  });

  it('avoids blocked sewer tiles', () => {
    for (let seed = 1; seed < 30; seed++) {
      const cells = Object.values(generatePlayerSpawnPositions(players, selections, 'sewer', seeded(seed)));
      expect(cells.some(cell => isSewerSpawnBlockedTile('sewer', cell.row, cell.col))).toBe(false);
      expect(new Set(cells.map(cellKey)).size).toBe(6);
    }
  });
});
