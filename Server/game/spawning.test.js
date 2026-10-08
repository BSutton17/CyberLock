import { describe, it, expect } from 'vitest';
import {
  GRID_ROWS,
  GRID_COLS,
  isSewerSpawnBlockedTile,
  getEnemySpawnDepth,
  getEnemySpawnColumnOrder,
  generateEnemySpawnPositions,
  generatePlayerSpawnPositions,
  sanitizeProposedPlayerPositions
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

  it('gives a full party of six unique cells in the bottom two rows', () => {
    const cells = Object.values(generatePlayerSpawnPositions(players, selections));
    expect(cells).toHaveLength(6);
    expect(cells.every(cell => cell.row >= 5 && inBounds(cell))).toBe(true);
    expect(new Set(cells.map(cellKey)).size).toBe(6);
  });

  it('puts tanks in front (row 5) and everyone else behind (row 6)', () => {
    const positions = generatePlayerSpawnPositions(players, selections);
    expect(positions.p1.row).toBe(5);
    expect(positions.p4.row).toBe(5);
    expect(positions.p2.row).toBe(6);
    expect(positions.p6.row).toBe(6);
  });

  it('avoids blocked sewer tiles', () => {
    const cells = Object.values(generatePlayerSpawnPositions(players, selections, 'sewer'));
    expect(cells.some(cell => isSewerSpawnBlockedTile('sewer', cell.row, cell.col))).toBe(false);
    expect(new Set(cells.map(cellKey)).size).toBe(6);
  });
});

describe('sanitizeProposedPlayerPositions', () => {
  const players = ['p1', 'p2'];

  it('accepts valid, distinct positions and coerces numeric strings', () => {
    expect(sanitizeProposedPlayerPositions(players, {
      p1: { row: '6', col: '3' },
      p2: { row: 5, col: 4 }
    })).toEqual({ p1: { row: 6, col: 3 }, p2: { row: 5, col: 4 } });
  });

  it.each([
    ['a player is missing', { p1: { row: 6, col: 3 } }],
    ['two players share a cell', { p1: { row: 6, col: 3 }, p2: { row: 6, col: 3 } }],
    ['a position is off the grid', { p1: { row: 7, col: 3 }, p2: { row: 6, col: 4 } }],
    ['a coordinate is not an integer', { p1: { row: 6.5, col: 3 }, p2: { row: 6, col: 4 } }],
    ['the payload is not an object', 'nope']
  ])('rejects the proposal when %s', (_label, proposal) => {
    expect(sanitizeProposedPlayerPositions(players, proposal)).toBeNull();
  });

  it('rejects positions on blocked sewer tiles', () => {
    expect(sanitizeProposedPlayerPositions(players, {
      p1: { row: 6, col: 4 },
      p2: { row: 6, col: 7 }
    }, 'sewer')).toBeNull();
  });
});
