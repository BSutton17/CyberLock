//This file handles all enemy combat logic including target selection, movement, ability usage, and behavior determination.

const ROLE_PRIORITY = {
    'Support': 1,
    'DPS': 1.5,
    'Tank': 2
};

/**
 * Calculate attack priority for a target
 * Lower value = higher priority
 * Formula: Health * Role Priority
 */
function calculateAttackPriority(target, playerCharacters) {
    const character = playerCharacters[target.id];
    if (!character) return Infinity;
    
    const rolePriority = ROLE_PRIORITY[character.role] || 1;
    const currentHealth = character.stats.health;
    
    return currentHealth * rolePriority;
}

function canKillTarget(enemy, target, playerCharacters) {
    const character = playerCharacters[target.id];
    if (!character) return false;
    
    const damage = (enemy.stats.strength / 10) * enemy.weapon.damage - (character.stats.resistance / 10);
    return character.stats.health <= damage;
}

export function selectAttackTarget(enemy, allies, playerCharacters, enemyPositions, characterPositions) {
    const enemyPos = enemyPositions[enemy.id];
    if (!enemyPos) return null;
    const weaponRange = enemy.weapon?.range || 1;
    
    // Get allies in weapon range
    const targetsInRange = allies.filter(allyId => {
        const allyPos = characterPositions[allyId];
        if (!allyPos) return false;
        
        return getDistance(enemyPos, allyPos) <= weaponRange;
    });
    
    if (targetsInRange.length === 0) return null;
    
    //Check if we can kill any target
    const killableTargets = targetsInRange.filter(targetId => 
        canKillTarget(enemy, { id: targetId }, playerCharacters)
    );
    
    if (killableTargets.length > 0) {
        //kill enemy with lowest attack priority
        return killableTargets.reduce((best, current) => {
            const currentPriority = calculateAttackPriority({ id: current }, playerCharacters);
            const bestPriority = calculateAttackPriority({ id: best }, playerCharacters);
            return currentPriority < bestPriority ? current : best;
        });
    }
    
    // No killable targets, use priority system
    return targetsInRange.reduce((best, current) => {
        const currentPriority = calculateAttackPriority({ id: current }, playerCharacters);
        const bestPriority = calculateAttackPriority({ id: best }, playerCharacters);
        return currentPriority < bestPriority ? current : best;
    });
}

//enemy behavior
export function determineBehavior(enemy, allies, playerCharacters) {
    const behavior = enemy.behavior || 'aggressive';
    
    if (behavior === 'intelligent') {
        const healthPercent = (enemy.stats.health / enemy.stats.maxHealth) * 100;
        
        // Compare health with closest enemy
        let minEnemyHealth = Infinity;
        allies.forEach(allyId => {
            const character = playerCharacters[allyId];
            if (character) {
                minEnemyHealth = Math.min(minEnemyHealth, character.stats.health);
            }
        });
        
        if (healthPercent > 50 || enemy.stats.health > minEnemyHealth) {
            return 'aggressive';
        } else {
            return 'defensive';
        }
    }
    
    return behavior;
}

function getDistance(pos1, pos2) {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}

function findClosestTarget(enemyPos, targetIds, characterPositions) {
    if (targetIds.length === 0) return null;
    
    let closest = null;
    let minDistance = Infinity;
    
    targetIds.forEach(targetId => {
        const targetPos = characterPositions[targetId];
        if (targetPos) {
            const distance = getDistance(enemyPos, targetPos);
            if (distance < minDistance) {
                minDistance = distance;
                closest = targetId;
            }
        }
    });
    
    return { targetId: closest, distance: minDistance };
}

function isInRangeOfAny(enemyPos, targetIds, characterPositions) {
    return targetIds.some(targetId => {
        const targetPos = characterPositions[targetId];
        if (!targetPos) return false;
        
        const rowDiff = Math.abs(enemyPos.row - targetPos.row);
        const colDiff = Math.abs(enemyPos.col - targetPos.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    });
}

function getValidMovementCells(position, maxMovement, characterPositions, ROWS = 7, COLS = 10) {
    const validCells = [];
    
    // Check all cells within movement range using Manhattan distance
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            // Calculate Manhattan distance
            const distance = Math.abs(row - position.row) + Math.abs(col - position.col);
            
            // Skip current position and cells out of range
            if (distance === 0 || distance > maxMovement) continue;
            
            // Check if occupied
            const isOccupied = Object.values(characterPositions).some(
                pos => pos.row === row && pos.col === col
            );
            
            if (!isOccupied) {
                validCells.push({ row, col, distance });
            }
        }
    }
    
    return validCells;
}

/**
 * BFS pathfinding to find reachable cells within movement range
 * Returns all reachable cells with their actual path distance
 */
function getReachableCells(startPos, maxMovement, characterPositions, ROWS = 7, COLS = 10) {
    const visited = new Set();
    const queue = [{ pos: startPos, distance: 0 }];
    const reachable = [];
    
    visited.add(`${startPos.row},${startPos.col}`);
    
    while (queue.length > 0) {
        const { pos, distance } = queue.shift();
        
        // Add to reachable cells (except starting position)
        if (distance > 0) {
            reachable.push({ row: pos.row, col: pos.col, distance });
        }
        
        // Stop expanding if we've reached max movement
        if (distance >= maxMovement) continue;
        
        // Check all 4 adjacent cells (up, down, left, right)
        const neighbors = [
            { row: pos.row - 1, col: pos.col },
            { row: pos.row + 1, col: pos.col },
            { row: pos.row, col: pos.col - 1 },
            { row: pos.row, col: pos.col + 1 }
        ];
        
        for (const neighbor of neighbors) {
            // Check bounds
            if (neighbor.row < 0 || neighbor.row >= ROWS || neighbor.col < 0 || neighbor.col >= COLS) {
                continue;
            }
            
            const key = `${neighbor.row},${neighbor.col}`;
            if (visited.has(key)) continue;
            
            // Check if occupied
            const isOccupied = Object.values(characterPositions).some(
                p => p.row === neighbor.row && p.col === neighbor.col
            );
            
            if (!isOccupied) {
                visited.add(key);
                queue.push({ pos: neighbor, distance: distance + 1 });
            }
        }
    }
    
    return reachable;
}

//aggressive behavior type movement logic
function calculateAggressiveMovement(enemy, allies, characterPositions) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    
    if (isInRangeOfAny(enemyPos, allies, characterPositions)) {
        console.log(`[AGGRESSIVE] ${enemy.name} already in range, staying to attack`);
        return null; // Stay in place to attack
    }
    
    // Calculate max movement based on speed
    const maxMovement = Math.floor(enemy.stats.speed / 10);
    
    // Find closest ally
    const closest = findClosestTarget(enemyPos, allies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions);
    
    if (reachableCells.length === 0) return null;
    
    // Move toward closest ally (try to get in attack range)
    const bestMove = reachableCells.reduce((best, cell) => {
        const distance = getDistance(cell, targetPos);
        const bestDistance = getDistance(best, targetPos);
        return distance < bestDistance ? cell : best;
    });
    
    return bestMove;
}

//defensive behavior type movement logic
function calculateDefensiveMovement(enemy, allies, characterPositions) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    const weaponRange = enemy.weapon?.range || 1;
    
    // Calculate max movement based on speed
    const maxMovement = Math.floor(enemy.stats.speed / 10);

    const closest = findClosestTarget(enemyPos, allies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions);
    
    if (reachableCells.length === 0) return null;

    const currentDistance = closest.distance;

    // Already at edge of weapon range, hold position.
    if (currentDistance === weaponRange) {
        return null;
    }

    // Choose cell that gets us closest to desired edge distance.
    // - If too far: move in until reaching range edge.
    // - If too close: back up until reaching range edge.
    const bestMove = reachableCells.reduce((best, cell) => {
        const distance = getDistance(cell, targetPos);
        const distanceDelta = Math.abs(distance - weaponRange);

        if (!best) {
            return { ...cell, targetDistance: distance, distanceDelta };
        }

        if (distanceDelta < best.distanceDelta) {
            return { ...cell, targetDistance: distance, distanceDelta };
        }

        if (distanceDelta === best.distanceDelta) {
            // Tie-break toward staying farther when moving inward (hold edge),
            // and farther when backing up too (maximize spacing safety).
            if (distance > best.targetDistance) {
                return { ...cell, targetDistance: distance, distanceDelta };
            }
        }

        return best;
    }, null);
    
    return bestMove ? { row: bestMove.row, col: bestMove.col } : null;
}

//supports
function calculateSupportMovement(enemy, alliedEnemies, characterPositions) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    
    //Check if already in range of an ally
    if (isInRangeOfAny(enemyPos, alliedEnemies, characterPositions)) {
        return null;
    }
    
    // Calculate max movement based on speed
    const maxMovement = Math.floor(enemy.stats.speed / 10);
    
    //Find closest allied enemy
    const closest = findClosestTarget(enemyPos, alliedEnemies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions);
    
    if (reachableCells.length === 0) return null;
    const bestMove = reachableCells.reduce((best, cell) => {
        const distance = getDistance(cell, targetPos);
        const bestDistance = getDistance(best, targetPos);
        return distance < bestDistance ? cell : best;
    });
    
    return bestMove;
}


export function calculateEnemyMovement(enemy, allies, alliedEnemies, playerCharacters, characterPositions) {
    const behavior = determineBehavior(enemy, allies, playerCharacters);
    const role = enemy.role || 'DPS';
    
    if (role === 'Support') {
        return calculateSupportMovement(enemy, alliedEnemies, characterPositions);
    }
    
    if (behavior === 'aggressive') {
        return calculateAggressiveMovement(enemy, allies, characterPositions);
    }
    
    if (behavior === 'defensive') {
        return calculateDefensiveMovement(enemy, allies, characterPositions);
    }
    
    return null;
}

function calculatePullMovementToCenter(enemy, center, characterPositions) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos || !center) return null;

    const maxMovement = Math.floor(enemy.stats.speed / 10);
    if (maxMovement <= 0) return null;

    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions);
    if (reachableCells.length === 0) return null;

    const currentDistance = getDistance(enemyPos, center);
    const closerCells = reachableCells.filter(cell => getDistance(cell, center) < currentDistance);

    if (closerCells.length === 0) {
        return null;
    }

    const bestMove = closerCells.reduce((best, cell) => {
        const distance = getDistance(cell, center);
        const bestDistance = getDistance(best, center);
        return distance < bestDistance ? cell : best;
    });

    return { row: bestMove.row, col: bestMove.col };
}


export function executeEnemyTurn(enemy, allies, alliedEnemies, playerCharacters, characterPositions, activeEffects = []) {
    // Check for status effects on this enemy
    const enemyEffects = activeEffects.filter(effect => effect.target === enemy.id);
    const blackHolePullEffect = enemyEffects.find(effect =>
        effect.type === 'status_effect' &&
        effect.status === 'black_hole_pull' &&
        effect.turnsRemaining > 0 &&
        effect.center
    );
    const immobilizeEffects = enemyEffects.filter(effect =>
        effect.type === 'status_effect' && 
        effect.status === 'immobilized' && 
        effect.turnsRemaining > 0
    );
    const isImmobilized = immobilizeEffects.length > 0;
    const movementPrevented = immobilizeEffects.some(effect => effect.preventMovement !== false);
    const actionsPrevented = immobilizeEffects.some(effect => effect.preventActions === true);
    
    if (isImmobilized && actionsPrevented) {
        return {
            enemyId: enemy.id,
            movement: null,
            target: null,
            useWeapon: false,
            immobilized: true
        };
    }
    
    const behavior = determineBehavior(enemy, allies, playerCharacters);
    const role = enemy.role || 'DPS';
    
    // Calculate movement
    const newPosition = movementPrevented
        ? null
        : blackHolePullEffect
            ? calculatePullMovementToCenter(enemy, blackHolePullEffect.center, characterPositions)
            : calculateEnemyMovement(enemy, allies, alliedEnemies, playerCharacters, characterPositions);
    
    // Create updated positions to check attack range AFTER moving
    const updatedPositions = newPosition ? {
        ...characterPositions,
        [enemy.id]: newPosition
    } : characterPositions;
    
    // Check for attack target from the new position (or current if no movement)
    const target = selectAttackTarget(enemy, allies, playerCharacters, updatedPositions, updatedPositions);
    
    return {
        enemyId: enemy.id,
        movement: newPosition,
        target: target,
        useWeapon: target ? true : false,
        immobilized: movementPrevented
    };
}
