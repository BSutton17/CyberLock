// Spawn placement on the 7-row x 10-column combat grid.
// Enemies spawn at the top (rows 0-1), players at the bottom (rows 5-6).

export const GRID_ROWS = 7;
export const GRID_COLS = 10;
// Players start a fight on their side of the board (rows 4-6).
export const PLAYER_ZONE_MIN_ROW = 4;

export const SEWER_SLOW_TILE_KEYS = new Set([
  '3,0', '3,1', '3,2', '3,3', '3,4', '3,5', '3,6', '3,7', '3,8', '3,9',
  '1,4', '1,5', '2,4', '2,5', '4,4', '5,4', '5,5'
]);

const SEWER_SPAWN_BLOCKED_TILE_KEYS = new Set([
  ...SEWER_SLOW_TILE_KEYS,
  '0,4', '0,5', '6,4', '6,5'
]);

export function isSewerSpawnBlockedTile(sceneKey, row, col) {
  if (sceneKey !== 'sewer') return false;
  return SEWER_SPAWN_BLOCKED_TILE_KEYS.has(`${row},${col}`);
}

export function getEnemySpawnDepth(enemy) {
  const behavior = enemy?.behavior || 'aggressive';
  const role = enemy?.role || 'DPS';

  if (role === 'Support') return 0;
  if (behavior === 'defensive') return 0;
  if (behavior === 'aggressive') return 1;
  if (behavior === 'intelligent') return 1;
  return 1;
}

export function getEnemySpawnColumnOrder(preferredRow, totalCols = GRID_COLS) {
  const center = (totalCols - 1) / 2;
  const sortByCenterDistance = (firstCol, secondCol) => {
    const firstDistance = Math.abs(firstCol - center);
    const secondDistance = Math.abs(secondCol - center);

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    return firstCol - secondCol;
  };

  // Keep early spawns near center lanes to avoid edge-heavy openings.
  const centerFirstOrder = preferredRow === 0
    ? [5, 4, 6, 3, 7, 2, 8, 1, 9, 0]
    : preferredRow === 1
      ? [4, 5, 3, 6, 2, 7, 1, 8, 0, 9]
      : [4, 5, 3, 6, 2, 7, 1, 8, 0, 9];

  const orderedColumns = centerFirstOrder.filter(col => col >= 0 && col < totalCols);
  const usedColumns = new Set(orderedColumns);

  const remainingColumns = Array.from({ length: totalCols }, (_, col) => col)
    .filter(col => !usedColumns.has(col))
    .sort(sortByCenterDistance);

  return [...orderedColumns, ...remainingColumns];
}

// `occupiedCells` are tiles already taken (player spawns) that enemies must not land on.
export function generateEnemySpawnPositions(enemies = [], sceneKey = null, occupiedCells = []) {
  const sortedEnemies = [...enemies].sort((firstEnemy, secondEnemy) =>
    getEnemySpawnDepth(secondEnemy) - getEnemySpawnDepth(firstEnemy)
  );

  const positions = {};
  const usedCells = new Set(occupiedCells.map(cell => `${cell.row},${cell.col}`));

  const findOpenCell = (preferredRow, preferredCol) => {
    const withinBounds = (row, col) => row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
    const isOpen = (row, col) => {
      if (isSewerSpawnBlockedTile(sceneKey, row, col)) return false;
      return !usedCells.has(`${row},${col}`);
    };

    if (withinBounds(preferredRow, preferredCol) && isOpen(preferredRow, preferredCol)) {
      return { row: preferredRow, col: preferredCol };
    }

    for (let radius = 1; radius <= 10; radius++) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        const colOffset = radius - Math.abs(rowOffset);
        const candidates = [
          { row: preferredRow + rowOffset, col: preferredCol + colOffset },
          { row: preferredRow + rowOffset, col: preferredCol - colOffset }
        ];

        for (const candidate of candidates) {
          if (!withinBounds(candidate.row, candidate.col)) continue;
          if (isOpen(candidate.row, candidate.col)) {
            return candidate;
          }
        }
      }
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isOpen(row, col)) {
          return { row, col };
        }
      }
    }

    return { row: preferredRow, col: preferredCol };
  };

  const enemiesByRow = sortedEnemies.reduce((rowsMap, enemy) => {
    const preferredRow = getEnemySpawnDepth(enemy);
    if (!rowsMap.has(preferredRow)) {
      rowsMap.set(preferredRow, []);
    }

    rowsMap.get(preferredRow).push(enemy);
    return rowsMap;
  }, new Map());

  [...enemiesByRow.keys()].sort((firstRow, secondRow) => firstRow - secondRow).forEach((preferredRow) => {
    const rowEnemies = enemiesByRow.get(preferredRow) || [];
    const rowColumns = getEnemySpawnColumnOrder(preferredRow, GRID_COLS);

    rowEnemies.forEach((enemy, index) => {
      const preferredCol = rowColumns[index] ?? rowColumns[rowColumns.length - 1] ?? 0;
      const spawnCell = findOpenCell(preferredRow, preferredCol);
      positions[enemy.id] = spawnCell;
      usedCells.add(`${spawnCell.row},${spawnCell.col}`);
    });
  });

  return positions;
}

// Players spawn with tanks one row in front (row 5) and everyone else on the bottom row (row 6), in
// columns shuffled every fight. The outer columns are never used, so nobody starts against a wall.
export const TANK_SPAWN_ROW = 5;
export const PLAYER_SPAWN_ROW = 6;
const SPAWN_COLUMNS = Array.from({ length: GRID_COLS - 2 }, (_, i) => i + 1);

export function generatePlayerSpawnPositions(players = [], characterSelections = {}, sceneKey = null, random = Math.random) {
  const positions = {};
  const usedCells = new Set();
  const shuffled = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const isFree = (row, col) => !usedCells.has(`${row},${col}`) && !isSewerSpawnBlockedTile(sceneKey, row, col);

  // A random free column in `row` (away from the walls); if the row is full, the other player row.
  const takeCell = (row) => {
    for (const candidateRow of [row, row === TANK_SPAWN_ROW ? PLAYER_SPAWN_ROW : TANK_SPAWN_ROW]) {
      const col = shuffled(SPAWN_COLUMNS).find(candidate => isFree(candidateRow, candidate));
      if (col !== undefined) {
        usedCells.add(`${candidateRow},${col}`);
        return { row: candidateRow, col };
      }
    }
    // Only reachable on a board too crowded for the rules above: any free tile in the bottom rows.
    for (const candidateRow of [PLAYER_SPAWN_ROW, TANK_SPAWN_ROW, PLAYER_ZONE_MIN_ROW]) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isFree(candidateRow, col)) {
          usedCells.add(`${candidateRow},${col}`);
          return { row: candidateRow, col };
        }
      }
    }
    return { row, col: 1 };
  };

  // Tanks first so they get the front row.
  const isTank = (player) => (characterSelections?.[player]?.role || '').toLowerCase() === 'tank';
  for (const player of [...players.filter(isTank), ...players.filter(player => !isTank(player))]) {
    positions[player] = takeCell(isTank(player) ? TANK_SPAWN_ROW : PLAYER_SPAWN_ROW);
  }
  return positions;
}
