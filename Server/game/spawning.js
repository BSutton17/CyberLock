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

export function generatePlayerSpawnPositions(players = [], characterSelections = {}, sceneKey = null) {
  const positions = {};
  const usedCells = new Set();

  const getPlayerSpawnRow = (playerName) => {
    const role = (characterSelections?.[playerName]?.role || '').toLowerCase();

    if (role === 'tank') {
      return 5;
    }

    return 6;
  };

  const findPlayerSpawnCell = (preferredRow, preferredCol) => {
    const candidateRows = [preferredRow, preferredRow === 5 ? 6 : 5];

    for (let offset = 0; offset < 10; offset++) {
      const candidateCols = offset === 0
        ? [preferredCol]
        : [preferredCol - offset, preferredCol + offset];

      for (const row of candidateRows) {
        for (const col of candidateCols) {
          if (col < 0 || col >= GRID_COLS) continue;
          if (isSewerSpawnBlockedTile(sceneKey, row, col)) continue;

          const key = `${row},${col}`;
          if (!usedCells.has(key)) {
            usedCells.add(key);
            return { row, col };
          }
        }
      }
    }

    for (const row of candidateRows) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isSewerSpawnBlockedTile(sceneKey, row, col)) continue;

        const key = `${row},${col}`;
        if (!usedCells.has(key)) {
          usedCells.add(key);
          return { row, col };
        }
      }
    }

    return { row: preferredRow, col: preferredCol };
  };

  players.forEach((player, index) => {
    const preferredRow = getPlayerSpawnRow(player);
    const preferredCol = index + 3;
    positions[player] = findPlayerSpawnCell(preferredRow, preferredCol);
  });
  return positions;
}

// Accepts the positions players stood on before the fight, but only if every one is a free tile
// on the players' side of the board. Otherwise returns null and fresh spawns are used.
export function sanitizeProposedPlayerPositions(players = [], proposedPlayerPositions = {}, sceneKey = null, minRow = PLAYER_ZONE_MIN_ROW) {
  if (!proposedPlayerPositions || typeof proposedPlayerPositions !== 'object') return null;

  const sanitized = {};
  const usedCells = new Set();

  for (const player of players) {
    const position = proposedPlayerPositions[player];
    if (!position) return null;

    const row = Number(position.row);
    const col = Number(position.col);

    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    if (row < minRow || row > GRID_ROWS - 1 || col < 0 || col > GRID_COLS - 1) return null;
    if (isSewerSpawnBlockedTile(sceneKey, row, col)) return null;

    const key = `${row},${col}`;
    if (usedCells.has(key)) return null;

    usedCells.add(key);
    sanitized[player] = { row, col };
  }

  return Object.keys(sanitized).length === players.length ? sanitized : null;
}
