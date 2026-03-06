//This file handles all enemy combat logic including target selection, movement, ability usage, and behavior determination.

import { ABILITIES } from './AbilityStore';

const ROLE_PRIORITY = {
    'Support': 1,
    'DPS': 1.5,
    'Tank': 2
};

const SEWER_SLOW_TILE_KEYS = new Set([
    '3,0', '3,1', '3,2', '3,3', '3,4', '3,5', '3,6', '3,7', '3,8', '3,9',
    '1,4', '1,5', '2,4', '2,5', '4,4', '5,4', '5,5'
]);

const isSewerSlowTile = (sceneKey, position) => {
    if (sceneKey !== 'sewer' || !position) return false;
    return SEWER_SLOW_TILE_KEYS.has(`${position.row},${position.col}`);
};

const getMovementFromSpeed = (speedValue, position, sceneKey) => {
    const normalizedSpeed = Number.isFinite(speedValue) ? speedValue : 0;
    const effectiveSpeed = isSewerSlowTile(sceneKey, position)
        ? Math.floor(normalizedSpeed / 2)
        : normalizedSpeed;

    return Math.floor(effectiveSpeed / 10);
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

function hasAdjacentAlliedEnemy(enemy, alliedEnemies = [], battlefieldEnemies = [], characterPositions = {}) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return false;

    return alliedEnemies.some(allyEnemyId => {
        if (allyEnemyId === enemy.id) return false;

        const allyEnemy = battlefieldEnemies.find(candidate =>
            candidate.id === allyEnemyId &&
            !candidate.isDeadBody &&
            (candidate.stats?.health || 0) > 0
        );

        if (!allyEnemy) return false;

        const allyPos = characterPositions[allyEnemyId];
        if (!allyPos) return false;

        const rowDiff = Math.abs(enemyPos.row - allyPos.row);
        const colDiff = Math.abs(enemyPos.col - allyPos.col);
        return rowDiff <= 1 && colDiff <= 1;
    });
}

function canUseAbilityNow(ability, enemy, allies, alliedEnemies, battlefieldEnemies, playerCharacters, characterPositions) {
    const abilityDef = ABILITIES[ability.id];
    if (!abilityDef) return false;

    const targetType = abilityDef.targetType;
    const abilityRange = abilityDef.range || 1;
    const enemyPos = characterPositions[enemy.id];

    if (!enemyPos) return false;

    if (targetType === 'self') {
        return true;
    }

    if (ability.id === 'stonewall') {
        return hasAdjacentAlliedEnemy(enemy, alliedEnemies, battlefieldEnemies, characterPositions);
    }

    if (targetType === 'all-allies') {
        return (alliedEnemies || []).some(allyEnemyId => {
            if (allyEnemyId === enemy.id) return false;

            const allyEnemy = battlefieldEnemies.find(candidate =>
                candidate.id === allyEnemyId &&
                !candidate.isDeadBody &&
                (candidate.stats?.health || 0) > 0
            );

            return !!allyEnemy;
        });
    }

    if (targetType === 'all-enemies') {
        return (allies || []).some(targetId => {
            const target = playerCharacters[targetId];
            const targetPos = characterPositions[targetId];
            return !!target && (target.stats?.health || 0) > 0 && !!targetPos;
        });
    }

    const targetsToCheck = targetType === 'ally'
        ? (alliedEnemies || []).filter(allyEnemyId => allyEnemyId !== enemy.id)
        : (allies || []);

    return targetsToCheck.some(targetId => {
        const target = targetType === 'ally'
            ? battlefieldEnemies.find(candidate =>
                candidate.id === targetId &&
                !candidate.isDeadBody &&
                (candidate.stats?.health || 0) > 0
            )
            : playerCharacters[targetId];

        if (!target || (target.stats?.health || 0) <= 0) return false;

        const targetPos = characterPositions[targetId];
        if (!targetPos) return false;

        const distance = getDistance(enemyPos, targetPos);
        return distance <= abilityRange;
    });
}

/**
 * Check if a cell is in a danger zone that this enemy should avoid
 * @param {Object} cell - { row, col } position to check
 * @param {Array} activeEffects - Active effects including zone effects
 * @param {Object} enemy - Enemy object (to check behavior/role)
 * @returns {boolean} True if enemy should avoid this cell
 */
function isCellInDangerZone(cell, activeEffects = [], enemy) {
    if (!activeEffects || activeEffects.length === 0) return false;
    
    const behavior = enemy.behavior || 'aggressive';
    const role = enemy.role || 'DPS';
    
    // Check for blizzard zones (selective avoidance)
    const inBlizzardZone = activeEffects.some(effect => {
        if (effect.type !== 'blizzard_field' || effect.turnsRemaining <= 0 || !effect.center) {
            return false;
        }
        const radius = effect.radius ?? 1;
        return Math.abs(effect.center.row - cell.row) <= radius &&
               Math.abs(effect.center.col - cell.col) <= radius;
    });
    
    if (inBlizzardZone) {
        // Aggressive and Support enemies walk through blizzard if needed
        if (behavior === 'aggressive' || role === 'Support') {
            return false; // Don't avoid
        }
        // Defensive and Intelligent enemies avoid blizzard
        if (behavior === 'defensive' || behavior === 'intelligent') {
            return true; // Avoid
        }
    }
    
    return false;
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

function isCellBlockedByBarrier(cell, activeEffects = []) {
    if (!activeEffects || activeEffects.length === 0) return false;

    return activeEffects.some(effect =>
        effect.type === 'blue_barrier' &&
        effect.turnsRemaining > 0 &&
        effect.cell &&
        effect.cell.row === cell.row &&
        effect.cell.col === cell.col
    );
}

/**
 * BFS pathfinding to find reachable cells within movement range
 * Returns all reachable cells with their actual path distance
 */
function getReachableCells(startPos, maxMovement, characterPositions, activeEffects = [], enemy = null, ROWS = 7, COLS = 10, options = {}) {
    const { ignoreDangerZones = false } = options;
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
            const blockedByBarrier = isCellBlockedByBarrier(neighbor, activeEffects);
            
            // Check if in danger zone (and should be avoided)
            const inDangerZone = !ignoreDangerZones && enemy
                ? isCellInDangerZone(neighbor, activeEffects, enemy)
                : false;
            
            if (!isOccupied && !inDangerZone && !blockedByBarrier) {
                visited.add(key);
                queue.push({ pos: neighbor, distance: distance + 1 });
            }
        }
    }
    
    return reachable;
}

//aggressive behavior type movement logic
function calculateAggressiveMovement(enemy, allies, characterPositions, activeEffects = [], sceneKey = null) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    
    if (isInRangeOfAny(enemyPos, allies, characterPositions)) {
        console.log(`[AGGRESSIVE] ${enemy.name} already in range, staying to attack`);
        return null; // Stay in place to attack
    }
    
    // Calculate max movement based on speed
    const maxMovement = getMovementFromSpeed(enemy.stats.speed, enemyPos, sceneKey);
    
    // Find closest ally
    const closest = findClosestTarget(enemyPos, allies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(
        enemyPos,
        maxMovement,
        characterPositions,
        activeEffects,
        enemy,
        7,
        10,
        { ignoreDangerZones: true }
    );
    
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
function calculateDefensiveMovement(enemy, allies, characterPositions, activeEffects = [], sceneKey = null) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    const weaponRange = enemy.weapon?.range || 1;
    
    // Calculate max movement based on speed
    const maxMovement = getMovementFromSpeed(enemy.stats.speed, enemyPos, sceneKey);

    const closest = findClosestTarget(enemyPos, allies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions, activeEffects, enemy);
    
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
function calculateSupportMovement(enemy, alliedEnemies, characterPositions, activeEffects = [], sceneKey = null) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;
    
    //Check if already in range of an ally
    if (isInRangeOfAny(enemyPos, alliedEnemies, characterPositions)) {
        return null;
    }
    
    // Calculate max movement based on speed
    const maxMovement = getMovementFromSpeed(enemy.stats.speed, enemyPos, sceneKey);
    
    //Find closest allied enemy
    const closest = findClosestTarget(enemyPos, alliedEnemies, characterPositions);
    if (!closest || !closest.targetId) return null;
    
    const targetPos = characterPositions[closest.targetId];
    // Use BFS pathfinding to get reachable cells
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions, activeEffects, enemy);
    
    if (reachableCells.length === 0) return null;
    const bestMove = reachableCells.reduce((best, cell) => {
        const distance = getDistance(cell, targetPos);
        const bestDistance = getDistance(best, targetPos);
        return distance < bestDistance ? cell : best;
    });
    
    return bestMove;
}

function calculateRetreatToSupportMovement(enemy, supportAllies, characterPositions, activeEffects = [], sceneKey = null) {
    const enemyPos = characterPositions[enemy.id];
    if (!enemyPos) return null;

    if (!Array.isArray(supportAllies) || supportAllies.length === 0) return null;

    if (isInRangeOfAny(enemyPos, supportAllies, characterPositions)) {
        return null;
    }

    const maxMovement = getMovementFromSpeed(enemy.stats.speed, enemyPos, sceneKey);
    const closestSupport = findClosestTarget(enemyPos, supportAllies, characterPositions);
    if (!closestSupport || !closestSupport.targetId) return null;

    const supportPos = characterPositions[closestSupport.targetId];
    const reachableCells = getReachableCells(enemyPos, maxMovement, characterPositions, activeEffects, enemy);

    if (reachableCells.length === 0) return null;

    const bestMove = reachableCells.reduce((best, cell) => {
        const distance = getDistance(cell, supportPos);
        const bestDistance = getDistance(best, supportPos);
        return distance < bestDistance ? cell : best;
    });

    return bestMove;
}


export function calculateEnemyMovement(enemy, allies, alliedEnemies, supportAllies, playerCharacters, characterPositions, activeEffects = [], sceneKey = null) {
    const behavior = determineBehavior(enemy, allies, playerCharacters);
    const role = enemy.role || 'DPS';
    
    if (role === 'Support') {
        return calculateSupportMovement(enemy, alliedEnemies, characterPositions, activeEffects, sceneKey);
    }
    
    if (behavior === 'aggressive') {
        return calculateAggressiveMovement(enemy, allies, characterPositions, activeEffects, sceneKey);
    }
    
    if (behavior === 'defensive') {
        return calculateDefensiveMovement(enemy, allies, characterPositions, activeEffects, sceneKey);
    }

    if (behavior === 'intelligent') {
        const maxHealth = enemy?.stats?.maxHealth || 1;
        const currentHealth = enemy?.stats?.health || 0;
        const healthRatio = currentHealth / Math.max(1, maxHealth);

        if (healthRatio < 0.25 && Array.isArray(supportAllies) && supportAllies.length > 0) {
            const retreatMove = calculateRetreatToSupportMovement(enemy, supportAllies, characterPositions, activeEffects, sceneKey);
            if (retreatMove) {
                return retreatMove;
            }
        }

        return calculateDefensiveMovement(enemy, allies, characterPositions, activeEffects, sceneKey);
    }
    
    return null;
}

export function executeEnemyTurn(enemy, allies, alliedEnemies, battlefieldEnemies = [], playerCharacters, characterPositions, activeEffects = [], sceneKey = null) {
    console.log(`[ENEMY TURN] ${enemy.name} (${enemy.id}) starting turn`);
    console.log(`[ENEMY TURN] Enemy abilities:`, enemy.abilities);
    console.log(`[ENEMY TURN] Enemy cooldowns:`, enemy.cooldowns);
    
    // Check for status effects on this enemy
    const enemyEffects = activeEffects.filter(effect => effect.target === enemy.id);
    const immobilizeEffects = enemyEffects.filter(effect =>
        effect.type === 'status_effect' && 
        effect.status === 'immobilized' && 
        effect.turnsRemaining > 0
    );
    const isImmobilized = immobilizeEffects.length > 0;
    const movementPrevented = immobilizeEffects.some(effect => effect.preventMovement !== false);
    const actionsPrevented = immobilizeEffects.some(effect => effect.preventActions === true);
    
    // Check if abilities are disabled (EMP effect)
    const abilitiesDisabled = enemyEffects.some(effect => 
        effect.type === 'abilities_disabled' && effect.turnsRemaining > 0
    );
    
    if (abilitiesDisabled) {
        console.log(`[ENEMY ABILITIES] ${enemy.name}'s abilities are disabled!`);
    }
    
    if (isImmobilized && actionsPrevented) {
        return {
            enemyId: enemy.id,
            movement: null,
            target: null,
            useWeapon: false,
            immobilized: true
        };
    }
    
    const supportAllies = Array.isArray(alliedEnemies)
        ? alliedEnemies.filter(allyId =>
            battlefieldEnemies.some(allyEnemy =>
                allyEnemy.id === allyId &&
                allyEnemy.role === 'Support' &&
                !allyEnemy.isDeadBody &&
                (allyEnemy.stats?.health || 0) > 0
            )
        )
        : [];

    const enemyRole = enemy.role || 'DPS';
    const canUseConsecutiveAbilities = enemyRole === 'Support';
    const blockedByRecentAbilityUse = !canUseConsecutiveAbilities && enemy.usedAbilityLastTurn === true;
    if (blockedByRecentAbilityUse) {
        console.log(`[ENEMY ABILITIES] ${enemy.name} used an ability last turn and must weapon/move this turn.`);
    }
    
    // Calculate movement
    const newPosition = movementPrevented
        ? null
        : calculateEnemyMovement(enemy, allies, alliedEnemies, supportAllies, playerCharacters, characterPositions, activeEffects, sceneKey);
    
    // Create updated positions to check attack range AFTER moving
    const updatedPositions = newPosition ? {
        ...characterPositions,
        [enemy.id]: newPosition
    } : characterPositions;

    const weaponTargetAfterMovement = selectAttackTarget(enemy, allies, playerCharacters, updatedPositions, updatedPositions);
    
    // Check if enemy should use an ability instead of weapon
    let abilityToUse = null;
    let abilityRequiresTarget = false;
    let availableAbilities = [];
    if (!abilitiesDisabled && !blockedByRecentAbilityUse && enemy.abilities && enemy.abilities.length > 0 && enemy.cooldowns) {
        console.log(`[ENEMY ABILITIES] ${enemy.name} (${enemy.id}) checking abilities...`);
        
        // Find all abilities that are off cooldown and currently usable
        availableAbilities = enemy.abilities.filter(ability => {
            const currentCooldown = enemy.cooldowns[ability.id] || 0;
            if (currentCooldown !== 0) {
                console.log(`[ENEMY ABILITIES]   - ${ability.name} (level ${ability.level}): cooldown ${currentCooldown}`);
                return false;
            }

            const abilityDef = ABILITIES[ability.id];
            const abilityType = abilityDef?.type;
            const usableNow = canUseAbilityNow(
                ability,
                enemy,
                allies,
                alliedEnemies,
                battlefieldEnemies,
                playerCharacters,
                characterPositions
            );

            // Non-damage abilities should be used immediately when ready
            if (abilityType !== 'damage') {
                console.log(`[ENEMY ABILITIES]   - ${ability.name} (level ${ability.level}): cooldown ${currentCooldown}, non-damage ready=${usableNow}`);
                return usableNow;
            }

            console.log(`[ENEMY ABILITIES]   - ${ability.name} (level ${ability.level}): cooldown ${currentCooldown}, usableNow ${usableNow}`);
            return usableNow;
        });
        
        // If there is a ready non-damage ability, use it immediately (highest level among them)
        if (availableAbilities.length > 0) {
            const nonDamageAbilities = availableAbilities.filter(ability => {
                const abilityDef = ABILITIES[ability.id];
                return abilityDef?.type !== 'damage';
            });

            const abilityPool = nonDamageAbilities.length > 0 ? nonDamageAbilities : availableAbilities;
            abilityToUse = abilityPool.reduce((best, current) => {
                return (current.level || 1) > (best.level || 1) ? current : best;
            });
            console.log(`[ENEMY ABILITIES] ${enemy.name} (${enemy.id}) will use ${abilityToUse.name} (level ${abilityToUse.level || 1})!`);

            const selectedAbilityDef = ABILITIES[abilityToUse.id];
            const selectedTargetType = selectedAbilityDef?.targetType;
            abilityRequiresTarget = !['self', 'all-enemies', 'all-allies'].includes(selectedTargetType);
        }
    }

    const hasNoAttackOption = !weaponTargetAfterMovement;
    const hasNoMovementOption = !newPosition;
    if (!abilityToUse && availableAbilities.length > 0 && hasNoAttackOption && hasNoMovementOption) {
        const statBuffAbilities = availableAbilities.filter(ability => {
            const abilityDef = ABILITIES[ability.id];
            return abilityDef?.type === 'buff';
        });

        if (statBuffAbilities.length > 0) {
            abilityToUse = statBuffAbilities.reduce((best, current) => {
                return (current.level || 1) > (best.level || 1) ? current : best;
            });

            const selectedAbilityDef = ABILITIES[abilityToUse.id];
            const selectedTargetType = selectedAbilityDef?.targetType;
            abilityRequiresTarget = !['self', 'all-enemies', 'all-allies'].includes(selectedTargetType);

            console.log(`[ENEMY ABILITIES] ${enemy.name} cannot move/attack and will use stat buff ${abilityToUse.name}.`);
        }
    }
    
    // Select target based on whether we're using an ability or weapon
    let target;
    if (abilityToUse) {
        // For abilities, find the closest valid target in ability range
        const abilityDef = ABILITIES[abilityToUse.id];
        const targetType = abilityDef?.targetType;

        if (targetType === 'self' || targetType === 'all-enemies' || targetType === 'all-allies') {
            target = null;
            console.log(`[ENEMY ABILITIES] ${abilityToUse.name} does not require a direct target.`);
        } else {
        const abilityRange = abilityDef?.range || 1;
        const enemyPos = characterPositions[enemy.id];
        
        const validTargetPool = targetType === 'ally'
            ? (alliedEnemies || []).filter(allyEnemyId => allyEnemyId !== enemy.id)
            : allies;

        const validTargets = validTargetPool.filter(targetId => {
            const targetCharacter = targetType === 'ally'
                ? battlefieldEnemies.find(candidate =>
                    candidate.id === targetId &&
                    !candidate.isDeadBody &&
                    (candidate.stats?.health || 0) > 0
                )
                : playerCharacters[targetId];

            if (!targetCharacter || (targetCharacter.stats?.health || 0) <= 0) return false;
            
            const targetPos = characterPositions[targetId];
            if (!targetPos) return false;
            
            const distance = getDistance(enemyPos, targetPos);
            return distance <= abilityRange;
        });
        
        if (validTargets.length > 0) {
            // Pick closest target
            target = validTargets.reduce((closest, targetId) => {
                const allyPos = characterPositions[targetId];
                const closestPos = characterPositions[closest];
                const allyDistance = getDistance(enemyPos, allyPos);
                const closestDistance = getDistance(enemyPos, closestPos);
                return allyDistance < closestDistance ? targetId : closest;
            });
        }
        }
        
        console.log(`[ENEMY ABILITIES] Target for ${abilityToUse.name} by ${enemy.name} (${enemy.id}):`, target);
    } else {
        // For weapon attacks, use normal range-based targeting
        target = weaponTargetAfterMovement;
    }
    
    // Fallback: if ability needs a target but none found, use weapon attack instead
    if (abilityToUse && abilityRequiresTarget && !target) {
        console.log(`[ENEMY ABILITIES] ${enemy.name} (${enemy.id}) selected ${abilityToUse.name} but no target in range - falling back to weapon attack`);
        abilityToUse = null;
        target = selectAttackTarget(enemy, allies, playerCharacters, updatedPositions, updatedPositions);
    }
    
    return {
        enemyId: enemy.id,
        movement: newPosition,
        target: target,
        useWeapon: !abilityToUse && target ? true : false,
        abilityToUse: abilityToUse,
        immobilized: movementPrevented
    };
}
