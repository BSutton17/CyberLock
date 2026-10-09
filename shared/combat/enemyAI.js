// Enemy decision making: who to hit, where to move, and when to use an ability.
// Pure planning only; the combat engine applies the plan. Units passed in here should already
// carry their effective stats (buffs, debuffs and zones applied).

import { ABILITIES } from './abilities.js';
import { distance, isInsideArea, movementFromSpeed, reachableCells } from './grid.js';

const ROLE_PRIORITY = {
    'Support': 1,
    'DPS': 1.5,
    'Tank': 2
};

const isLiving = (unit) => !!unit && !unit.isDeadBody && (unit.stats?.health || 0) > 0;

// Lower value = attacked first: low health, and supports before tanks.
function calculateAttackPriority(targetId, playerCharacters) {
    const character = playerCharacters[targetId];
    if (!character) return Infinity;
    return character.stats.health * (ROLE_PRIORITY[character.role] || 1);
}

export function getEnemyWeaponAttackStatValue(enemy) {
    const weaponRange = enemy?.weapon?.range || 1;
    if (weaponRange > 1) {
        return Number(enemy?.stats?.ta) || Number(enemy?.stats?.strength) || 0;
    }
    return Number(enemy?.stats?.strength) || Number(enemy?.stats?.ta) || 0;
}

function canKillTarget(enemy, targetId, playerCharacters) {
    const character = playerCharacters[targetId];
    if (!character) return false;
    const damage = (getEnemyWeaponAttackStatValue(enemy) / 10) * enemy.weapon.damage - (character.stats.resistance / 10);
    return character.stats.health <= damage;
}

export function selectAttackTarget(enemy, allies, playerCharacters, positions) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return null;
    const weaponRange = enemy.weapon?.range || 1;

    const targetsInRange = allies.filter(allyId => {
        const allyPos = positions[allyId];
        return !!allyPos && distance(enemyPos, allyPos) <= weaponRange;
    });
    if (targetsInRange.length === 0) return null;

    const pickBest = (candidates) => candidates.reduce((best, current) =>
        calculateAttackPriority(current, playerCharacters) < calculateAttackPriority(best, playerCharacters) ? current : best
    );

    // On an enemy's first turn it goes for the toughest party member it can reach, so fragile
    // supports aren't knocked out before they've had a chance to play.
    if (isFirstTurn(enemy) && targetsInRange.length > 1) return toughest(targetsInRange, playerCharacters);

    const killable = targetsInRange.filter(targetId => canKillTarget(enemy, targetId, playerCharacters));
    return pickBest(killable.length > 0 ? killable : targetsInRange);
}

export const isFirstTurn = (enemy) => !enemy?.turnsTaken;

// The candidate with the highest max health (then the most health left).
function toughest(targetIds, playerCharacters) {
    const toughness = (id) => {
        const stats = playerCharacters[id]?.stats || {};
        return (stats.maxHealth || stats.health || 0) * 1000 + (stats.health || 0);
    };
    return targetIds.reduce((best, id) => (toughness(id) > toughness(best) ? id : best));
}

export function determineBehavior(enemy) {
    return enemy.behavior || 'aggressive';
}

function findClosestTarget(fromPos, targetIds, positions) {
    let closest = null;
    let minDistance = Infinity;
    targetIds.forEach(targetId => {
        const targetPos = positions[targetId];
        if (!targetPos) return;
        const d = distance(fromPos, targetPos);
        if (d < minDistance) {
            minDistance = d;
            closest = targetId;
        }
    });
    return closest ? { targetId: closest, distance: minDistance } : null;
}

function getLivingAlliedEnemyIds(alliedEnemies = [], battlefieldEnemies = [], excludedEnemyId = null, { includeSupport = true } = {}) {
    return (alliedEnemies || []).filter(allyEnemyId => {
        if (!allyEnemyId || allyEnemyId === excludedEnemyId) return false;
        const allyEnemy = battlefieldEnemies.find(candidate => candidate.id === allyEnemyId && isLiving(candidate));
        if (!allyEnemy) return false;
        return includeSupport || allyEnemy.role !== 'Support';
    });
}

function getClosestThreatDistance(position, threatIds = [], positions = {}) {
    return threatIds.reduce((closest, threatId) => {
        const threatPos = positions[threatId];
        return threatPos ? Math.min(closest, distance(position, threatPos)) : closest;
    }, Infinity);
}

const isAdjacent = (a, b) => distance(a, b) === 1;

function isNextToAny(enemyPos, targetIds, positions) {
    return targetIds.some(targetId => positions[targetId] && isAdjacent(enemyPos, positions[targetId]));
}

function hasAdjacentAlliedEnemy(enemy, alliedEnemies = [], battlefieldEnemies = [], positions = {}) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return false;
    return alliedEnemies.some(allyEnemyId => {
        if (allyEnemyId === enemy.id) return false;
        const allyEnemy = battlefieldEnemies.find(candidate => candidate.id === allyEnemyId && isLiving(candidate));
        const allyPos = positions[allyEnemyId];
        return !!allyEnemy && !!allyPos && isInsideArea(allyPos, enemyPos, 1);
    });
}

// Hazards the party placed. Cautious enemies walk around them; aggressive ones charge through.
export function isCellInDangerZone(cell, activeEffects = [], enemy) {
    const behavior = enemy?.behavior || 'aggressive';
    const cautious = behavior === 'defensive' || behavior === 'intelligent' || enemy?.role === 'Support';
    if (!cautious) return false;

    return (activeEffects || []).some(effect =>
        (effect.type === 'blizzard_field' || effect.type === 'toxic_mist_field') &&
        effect.side !== 'enemy' &&
        effect.turnsRemaining > 0 &&
        isInsideArea(cell, effect.center, effect.radius ?? 1)
    );
}

function getReachable(enemy, positions, activeEffects, sceneKey, { ignoreDangerZones = false } = {}) {
    const enemyPos = positions[enemy.id];
    const maxMovement = movementFromSpeed(enemy.stats.speed, enemyPos, sceneKey);
    return reachableCells(enemyPos, maxMovement, {
        positions,
        movingId: enemy.id,
        activeEffects,
        avoid: ignoreDangerZones ? () => false : (cell) => isCellInDangerZone(cell, activeEffects, enemy)
    });
}

function canUseAbilityNow(ability, enemy, allies, alliedEnemies, battlefieldEnemies, playerCharacters, positions) {
    const abilityDef = ABILITIES[ability.id];
    if (!abilityDef) return false;

    const targetType = abilityDef.targetType;
    const abilityRange = abilityDef.range || 1;
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return false;

    if (abilityDef.type === 'heal') {
        const isHurt = (unit) => isLiving(unit) && (unit.stats?.health || 0) < (unit.stats?.maxHealth || unit.stats?.health || 0);
        const livingAllies = (battlefieldEnemies || []).filter(candidate =>
            candidate.id !== enemy.id && (alliedEnemies || []).includes(candidate.id)
        );

        if (targetType === 'self') return isHurt(enemy);
        if (targetType === 'all-allies' || targetType === 'ground-target') {
            return isHurt(enemy) || livingAllies.some(isHurt);
        }
        if (targetType === 'ally') {
            return livingAllies.some(ally => {
                const allyPos = positions[ally.id];
                return isHurt(ally) && !!allyPos && distance(enemyPos, allyPos) <= abilityRange;
            });
        }
    }

    if (targetType === 'self') return true;

    if (ability.id === 'stonewall') {
        return hasAdjacentAlliedEnemy(enemy, alliedEnemies, battlefieldEnemies, positions);
    }

    if (targetType === 'all-allies') {
        return (alliedEnemies || []).some(allyEnemyId =>
            allyEnemyId !== enemy.id && battlefieldEnemies.some(candidate => candidate.id === allyEnemyId && isLiving(candidate))
        );
    }

    if (targetType === 'all-enemies') {
        return (allies || []).some(targetId => isLiving(playerCharacters[targetId]) && !!positions[targetId]);
    }

    const targetsToCheck = targetType === 'ally'
        ? (alliedEnemies || []).filter(allyEnemyId => allyEnemyId !== enemy.id)
        : (allies || []);

    return targetsToCheck.some(targetId => {
        const target = targetType === 'ally'
            ? battlefieldEnemies.find(candidate => candidate.id === targetId && isLiving(candidate))
            : playerCharacters[targetId];
        const targetPos = positions[targetId];
        return isLiving(target) && !!targetPos && distance(enemyPos, targetPos) <= abilityRange;
    });
}

function calculateAggressiveMovement(enemy, allies, positions, activeEffects = [], sceneKey = null) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return null;

    // Already able to hit someone: stay put and attack.
    const weaponRange = enemy?.weapon?.range || 1;
    if (allies.some(allyId => positions[allyId] && distance(enemyPos, positions[allyId]) <= weaponRange)) {
        return null;
    }

    const closest = findClosestTarget(enemyPos, allies, positions);
    if (!closest) return null;
    const targetPos = positions[closest.targetId];

    const reachable = getReachable(enemy, positions, activeEffects, sceneKey, { ignoreDangerZones: true });
    if (reachable.length === 0) return null;

    const best = reachable.reduce((bestCell, cell) =>
        distance(cell, targetPos) < distance(bestCell, targetPos) ? cell : bestCell
    );
    return { row: best.row, col: best.col };
}

// Keeps the closest player right at the edge of weapon range.
function calculateDefensiveMovement(enemy, allies, positions, activeEffects = [], sceneKey = null) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return null;
    const weaponRange = enemy.weapon?.range || 1;

    const closest = findClosestTarget(enemyPos, allies, positions);
    if (!closest) return null;
    if (closest.distance === weaponRange) return null;

    const targetPos = positions[closest.targetId];
    const reachable = getReachable(enemy, positions, activeEffects, sceneKey);
    if (reachable.length === 0) return null;

    const best = reachable.reduce((bestCell, cell) => {
        const d = distance(cell, targetPos);
        const delta = Math.abs(d - weaponRange);
        if (!bestCell || delta < bestCell.delta || (delta === bestCell.delta && d > bestCell.d)) {
            return { row: cell.row, col: cell.col, d, delta };
        }
        return bestCell;
    }, null);

    return best ? { row: best.row, col: best.col } : null;
}

function chooseClosestAnchorMovement(enemy, anchorIds, positions, activeEffects = [], sceneKey = null, threatIds = []) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos || anchorIds.length === 0) return null;

    const closestAnchor = findClosestTarget(enemyPos, anchorIds, positions);
    if (!closestAnchor) return null;
    const anchorPos = positions[closestAnchor.targetId];

    const reachable = getReachable(enemy, positions, activeEffects, sceneKey);
    if (reachable.length === 0) return null;

    const best = reachable.reduce((bestCell, cell) => {
        const toAnchor = distance(cell, anchorPos);
        const threat = getClosestThreatDistance(cell, threatIds, positions);
        if (!bestCell || toAnchor < bestCell.toAnchor || (toAnchor === bestCell.toAnchor && threat > bestCell.threat)) {
            return { row: cell.row, col: cell.col, toAnchor, threat };
        }
        return bestCell;
    }, null);

    return best ? { row: best.row, col: best.col } : null;
}

// Supports stay next to their front line, away from players who can reach them.
function calculateSupportMovement(enemy, allies, alliedEnemies, battlefieldEnemies, positions, activeEffects = [], sceneKey = null) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos) return null;

    const nonSupportAllies = getLivingAlliedEnemyIds(alliedEnemies, battlefieldEnemies, enemy.id, { includeSupport: false });
    const supportAllies = getLivingAlliedEnemyIds(alliedEnemies, battlefieldEnemies, enemy.id)
        .filter(allyEnemyId => battlefieldEnemies.find(candidate => candidate.id === allyEnemyId)?.role === 'Support');
    const anchorIds = nonSupportAllies.length > 0 ? nonSupportAllies : supportAllies;

    if (anchorIds.length === 0 || isNextToAny(enemyPos, anchorIds, positions)) return null;

    const threatRange = enemy.weapon?.range || 1;
    const threatenedBy = (allies || []).filter(playerId => positions[playerId] && distance(enemyPos, positions[playerId]) <= threatRange);
    return chooseClosestAnchorMovement(enemy, anchorIds, positions, activeEffects, sceneKey, threatenedBy);
}

function calculateRetreatToSupportMovement(enemy, supportAllies, positions, activeEffects = [], sceneKey = null) {
    const enemyPos = positions[enemy.id];
    if (!enemyPos || supportAllies.length === 0 || isNextToAny(enemyPos, supportAllies, positions)) return null;

    const closestSupport = findClosestTarget(enemyPos, supportAllies, positions);
    if (!closestSupport) return null;
    const supportPos = positions[closestSupport.targetId];

    const reachable = getReachable(enemy, positions, activeEffects, sceneKey);
    if (reachable.length === 0) return null;

    const best = reachable.reduce((bestCell, cell) =>
        distance(cell, supportPos) < distance(bestCell, supportPos) ? cell : bestCell
    );
    return { row: best.row, col: best.col };
}

export function calculateEnemyMovement(enemy, allies, alliedEnemies, supportAllies, battlefieldEnemies, playerCharacters, positions, activeEffects = [], sceneKey = null) {
    const behavior = determineBehavior(enemy);

    if ((enemy.role || 'DPS') === 'Support') {
        return calculateSupportMovement(enemy, allies, alliedEnemies, battlefieldEnemies, positions, activeEffects, sceneKey);
    }

    if (behavior === 'aggressive') {
        return calculateAggressiveMovement(enemy, allies, positions, activeEffects, sceneKey);
    }

    if (behavior === 'defensive' || behavior === 'intelligent') {
        if (behavior === 'intelligent') {
            const healthRatio = (enemy?.stats?.health || 0) / Math.max(1, enemy?.stats?.maxHealth || 1);
            if (healthRatio < 0.25 && supportAllies.length > 0) {
                const retreat = calculateRetreatToSupportMovement(enemy, supportAllies, positions, activeEffects, sceneKey);
                if (retreat) return retreat;
            }
        }

        const holdRange = calculateDefensiveMovement(enemy, allies, positions, activeEffects, sceneKey);
        if (holdRange) return holdRange;

        // Nothing to shoot from here and nowhere better at range: close in.
        if (!selectAttackTarget(enemy, allies, playerCharacters, positions)) {
            return calculateAggressiveMovement(enemy, allies, positions, activeEffects, sceneKey);
        }
    }

    return null;
}

const NO_TARGET_TYPES = new Set(['self', 'all-enemies', 'all-allies']);

/**
 * Decides one enemy's turn.
 * @param enemy - the acting enemy (effective stats)
 * @param targetablePlayers - ids of players it may attack
 * @param alliedEnemies - ids of the other living enemies
 * @param battlefieldEnemies - every enemy (effective stats)
 * @param playerCharacters - players by id (effective stats)
 * @param positions - every unit's tile
 * @returns {{ enemyId, movement, target, useWeapon, abilityToUse, immobilized, skipTurn }}
 */
export function planEnemyTurn(enemy, targetablePlayers, alliedEnemies, battlefieldEnemies = [], playerCharacters, positions, activeEffects = [], sceneKey = null) {
    // Only living players are targets (corpses used to look like the easiest kill).
    const allies = (targetablePlayers || []).filter(allyId => isLiving(playerCharacters?.[allyId]));

    const enemyEffects = activeEffects.filter(effect => effect.target === enemy.id && effect.turnsRemaining > 0);
    const immobilizeEffects = enemyEffects.filter(effect => effect.type === 'status_effect' && effect.status === 'immobilized');
    const movementPrevented = immobilizeEffects.some(effect => effect.preventMovement !== false);
    const actionsPrevented = immobilizeEffects.some(effect => effect.preventActions === true);
    const abilitiesDisabled = enemyEffects.some(effect => effect.type === 'abilities_disabled');

    if (actionsPrevented && movementPrevented) {
        return { enemyId: enemy.id, movement: null, target: null, useWeapon: false, abilityToUse: null, immobilized: true, skipTurn: true };
    }

    const supportAllies = (alliedEnemies || []).filter(allyId =>
        battlefieldEnemies.some(allyEnemy => allyEnemy.id === allyId && allyEnemy.role === 'Support' && isLiving(allyEnemy))
    );

    const newPosition = movementPrevented
        ? null
        : calculateEnemyMovement(enemy, allies, alliedEnemies, supportAllies, battlefieldEnemies, playerCharacters, positions, activeEffects, sceneKey);

    if (actionsPrevented) {
        return { enemyId: enemy.id, movement: newPosition, target: null, useWeapon: false, abilityToUse: null, immobilized: false, skipTurn: false };
    }

    const positionsAfterMove = newPosition ? { ...positions, [enemy.id]: newPosition } : positions;
    const weaponTargetAfterMovement = selectAttackTarget(enemy, allies, playerCharacters, positionsAfterMove);

    // An enemy that used an ability last turn must attack or move this turn.
    let abilityToUse = null;
    let availableAbilities = [];
    if (!abilitiesDisabled && !enemy.usedAbilityLastTurn && enemy.abilities?.length > 0 && enemy.cooldowns) {
        availableAbilities = enemy.abilities.filter(ability =>
            (enemy.cooldowns[ability.id] || 0) === 0 &&
            canUseAbilityNow(ability, enemy, allies, alliedEnemies, battlefieldEnemies, playerCharacters, positions)
        );

        if (availableAbilities.length > 0) {
            // Support, buffs and debuffs first; otherwise the highest-level damage ability.
            const nonDamage = availableAbilities.filter(ability => ABILITIES[ability.id]?.type !== 'damage');
            const pool = nonDamage.length > 0 ? nonDamage : availableAbilities;
            abilityToUse = pool.reduce((best, current) => ((current.level || 1) > (best.level || 1) ? current : best));
        }
    }

    // Stuck with nothing to hit: at least buff up.
    if (!abilityToUse && availableAbilities.length > 0 && !weaponTargetAfterMovement && !newPosition) {
        const buffs = availableAbilities.filter(ability => ABILITIES[ability.id]?.type === 'buff');
        if (buffs.length > 0) {
            abilityToUse = buffs.reduce((best, current) => ((current.level || 1) > (best.level || 1) ? current : best));
        }
    }

    let target = weaponTargetAfterMovement;
    if (abilityToUse) {
        const abilityDef = ABILITIES[abilityToUse.id];
        const targetType = abilityDef?.targetType;
        target = null;

        if (!NO_TARGET_TYPES.has(targetType)) {
            const abilityRange = abilityDef?.range || 1;
            const enemyPos = positions[enemy.id];
            // Ground-placed heals go where this enemy's own side is hurt, not on a player.
            const healsOwnSide = abilityDef?.type === 'heal' && targetType === 'ground-target';
            const ownSideTarget = targetType === 'ally' || healsOwnSide;
            const pool = targetType === 'ally'
                ? (alliedEnemies || []).filter(id => id !== enemy.id)
                : healsOwnSide
                    ? [enemy.id, ...(alliedEnemies || []).filter(id => id !== enemy.id)]
                    : allies;

            const validTargets = pool.filter(targetId => {
                const unit = ownSideTarget
                    ? battlefieldEnemies.find(candidate => candidate.id === targetId)
                    : playerCharacters[targetId];
                const targetPos = positions[targetId];
                return isLiving(unit) && !!targetPos && distance(enemyPos, targetPos) <= abilityRange;
            });

            if (validTargets.length > 0) {
                target = !ownSideTarget && isFirstTurn(enemy) && validTargets.length > 1
                    ? toughest(validTargets, playerCharacters)
                    : validTargets.reduce((closest, targetId) =>
                        distance(enemyPos, positions[targetId]) < distance(enemyPos, positions[closest]) ? targetId : closest
                    );
            } else {
                // Nothing in range for the ability: fall back to the weapon.
                abilityToUse = null;
                target = weaponTargetAfterMovement;
            }
        }
    }

    return {
        enemyId: enemy.id,
        movement: newPosition,
        target,
        useWeapon: !abilityToUse && !!target,
        abilityToUse,
        immobilized: movementPrevented,
        skipTurn: false
    };
}
