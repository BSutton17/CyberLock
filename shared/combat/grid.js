// Board geometry for the 7-row x 10-column combat grid: distances, paths, terrain and zone areas.
// Row 0 is the enemy side (top), row 6 the party side (bottom).

export const GRID_ROWS = 7;
export const GRID_COLS = 10;

// In the sewer, the water channel halves the speed of whoever starts a move in it.
export const SEWER_SLOW_TILE_KEYS = new Set([
  '3,0', '3,1', '3,2', '3,3', '3,4', '3,5', '3,6', '3,7', '3,8', '3,9',
  '1,4', '1,5', '2,4', '2,5', '4,4', '5,4', '5,5'
]);

export const tileKey = (row, col) => `${row},${col}`;

export function isCell(cell) {
  return !!cell && Number.isInteger(cell.row) && Number.isInteger(cell.col);
}

export function isInBounds(cell) {
  return isCell(cell) && cell.row >= 0 && cell.row < GRID_ROWS && cell.col >= 0 && cell.col < GRID_COLS;
}

export const samePosition = (a, b) => !!a && !!b && a.row === b.row && a.col === b.col;

// Grid distance used for movement, weapon range and ability range.
export const distance = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

// Square areas (a 3x3 field has radius 1, a 5x5 field radius 2).
export function isInsideArea(position, center, radius = 1) {
  if (!position || !center) return false;
  return Math.abs(position.row - center.row) <= radius && Math.abs(position.col - center.col) <= radius;
}

export function isSewerSlowTile(sceneKey, position) {
  if (sceneKey !== 'sewer' || !position) return false;
  return SEWER_SLOW_TILE_KEYS.has(tileKey(position.row, position.col));
}

export function speedOnTile(speed, position, sceneKey) {
  const value = Number.isFinite(speed) ? speed : 0;
  return isSewerSlowTile(sceneKey, position) ? Math.floor(value / 2) : value;
}

// Tiles a unit can walk this turn: every 10 speed is one tile.
export function movementFromSpeed(speed, position, sceneKey) {
  return Math.max(0, Math.floor(speedOnTile(speed, position, sceneKey) / 10));
}

// Tiles blocked by "Way Too Close!" barriers.
export function barrierCells(activeEffects = []) {
  return new Set(
    (activeEffects || [])
      .filter(effect => effect?.type === 'blue_barrier' && effect.turnsRemaining > 0 && effect.cell)
      .map(effect => tileKey(effect.cell.row, effect.cell.col))
  );
}

// Tiles taken by any unit on the board other than `exceptId`.
export function occupiedCells(positions = {}, exceptId = null) {
  return new Set(
    Object.entries(positions || {})
      .filter(([id, pos]) => id !== exceptId && isCell(pos))
      .map(([, pos]) => tileKey(pos.row, pos.col))
  );
}

const STEPS = [
  { row: 1, col: 0 },
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: -1 }
];

// Tiles held by units the mover may walk through (its own side) but not stop on.
function passableCells(positions, passThrough) {
  return new Set((passThrough || []).map(id => positions?.[id]).filter(isCell).map(pos => tileKey(pos.row, pos.col)));
}

// Shortest walk from `start` to `end` around units and barriers, as the list of tiles stepped on
// (excluding `start`). Units listed in `passThrough` (teammates) can be walked through but never
// ended on. Returns [] when already there and null when there is no way through.
export function findPath(start, end, { positions = {}, movingId = null, activeEffects = [], passThrough = [] } = {}) {
  if (!isInBounds(start) || !isInBounds(end)) return null;
  if (samePosition(start, end)) return [];

  const occupied = occupiedCells(positions, movingId);
  for (const key of barrierCells(activeEffects)) occupied.add(key);
  if (occupied.has(tileKey(end.row, end.col))) return null;
  const blocked = new Set(occupied);
  for (const key of passableCells(positions, passThrough)) blocked.delete(key);

  const queue = [{ row: start.row, col: start.col, path: [] }];
  const visited = new Set([tileKey(start.row, start.col)]);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const step of STEPS) {
      const next = { row: current.row + step.row, col: current.col + step.col };
      const key = tileKey(next.row, next.col);
      if (!isInBounds(next) || visited.has(key) || blocked.has(key)) continue;

      const path = [...current.path, next];
      if (next.row === end.row && next.col === end.col) return path;

      visited.add(key);
      queue.push({ ...next, path });
    }
  }

  return null;
}

// Every tile reachable within `maxSteps`, with its walking distance. Teammates in `passThrough`
// can be walked through, but their tiles are never a place to stop.
export function reachableCells(start, maxSteps, { positions = {}, movingId = null, activeEffects = [], avoid = () => false, passThrough = [] } = {}) {
  if (!isInBounds(start)) return [];
  const blocked = occupiedCells(positions, movingId);
  for (const key of barrierCells(activeEffects)) blocked.add(key);
  const throughOnly = passableCells(positions, passThrough);
  for (const key of throughOnly) blocked.delete(key);

  const queue = [{ row: start.row, col: start.col, steps: 0 }];
  const visited = new Set([tileKey(start.row, start.col)]);
  const reachable = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.steps > 0 && !throughOnly.has(tileKey(current.row, current.col))) {
      reachable.push({ row: current.row, col: current.col, distance: current.steps });
    }
    if (current.steps >= maxSteps) continue;

    for (const step of STEPS) {
      const next = { row: current.row + step.row, col: current.col + step.col };
      const key = tileKey(next.row, next.col);
      if (!isInBounds(next) || visited.has(key) || blocked.has(key) || avoid(next)) continue;
      visited.add(key);
      queue.push({ ...next, steps: current.steps + 1 });
    }
  }

  return reachable;
}
