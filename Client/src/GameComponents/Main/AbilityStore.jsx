/**
 * AbilityStore - Centralized ability logic and execution
 * 
 * UNIVERSAL DAMAGE FORMULAS:
 * Physical Damage = (strength/10) * weaponDamage - (enemyResistance/10)
 * Technical Damage = (ta/10) * abilityDamage - (enemyResistance/10)
 * 
 * STRUCTURE GUIDE:
 * Each ability is defined with:
 * - id: unique identifier
 * - name: display name
 * - description: what it does
 * - cooldown: turns before can use again
 * - targetType: 'self' | 'single-enemy' | 'multi-enemy' | 'ground-target' | 'all-enemies' | 'ally'
 *   Note: 'ground-target' = click a square, affects all 8 adjacent squares (3x3 area)
 * - type: 'buff' | 'debuff' | 'damage' | 'heal' | 'utility'
 * - damageType: 'physical' | 'technical' (for damage abilities)
 * - damageScaling: 'strength' | 'ta' (which stat scales the damage)
 * - execute: function that returns effect data
 * 
 * EXECUTE FUNCTION PATTERN:
 * Input params: { caster, target(s), enemies, allies, ... }
 * Output: { 
 *   success: boolean,
 *   effects: [{ type, target, value, duration, ... }],
 *   damage: [{ target, amount }],
 *   message: string (for combat log)
 * }
 */

export const ABILITIES = {
    ability_boost: {
        id: 'ability_boost',
        name: 'Ability Boost',
        description: 'Grants yourself +5 Speed and +5 Bonus Health for 2 turns',
        cooldown: 3,
        targetType: 'self',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName }) => {
            const result = {
                success: true,
                effects: [
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'speed',
                        value: 5,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'health',
                        value: 5,
                        duration: 2,
                        stackable: false
                    }
                ],
                message: `${caster.name} gains +5 Speed and +5 Health for 2 turns!`
            };
            return result;
        }
    },
    binding_chains: {
        id: 'binding_chains',
        name: 'Binding Chains',
        description: 'Use energy chains to temporarily immobilize 2 enemies for 1 turn',
        cooldown: 2,
        targetType: 'multi-enemy', // Need to select 2 targets
        maxTargets: 2,
        type: 'debuff',
        
        /**
         * @param {Object} params
         * @param {Array<string>} params.targets - Array of enemy IDs (max 2)
         * @param {Object} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ targets, enemies }) => {
            if (!targets || targets.length === 0 || targets.length > 2) {
                return { success: false, message: 'Must select 1-2 enemies' };
            }

            const targetedEnemies = enemies.filter(e => targets.includes(e.id));
            
            return {
                success: true,
                effects: targetedEnemies.map(enemy => ({
                    type: 'status_effect',
                    target: enemy.id,
                    status: 'immobilized',
                    duration: 1, 
                    preventMovement: true,
                    preventActions: true 
                })),
                message: `Chains bind ${targetedEnemies.map(e => e.name).join(' and ')}!`
            };
        }
    },
    shadow_strike: {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        description: 'A devastating strike that deals damage to a single enemy',
        cooldown: 1,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'strength', // Uses strength stat for damage
        abilityDamage: 15, // Base ability damage multiplier
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.target - Enemy ID
         * @param {Object} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            // Physical Damage Formula: (strength/10) * abilityDamage - (enemyResistance/10)
            const abilityDamage = 15;
            const finalDamage = Math.max(1, Math.round(
                (caster.stats.strength / 10) * abilityDamage - (enemy.stats.resistance / 10)
            ));

            return {
                success: true,
                damage: [{
                    target: enemy.id,
                    amount: finalDamage
                }],
                message: `${caster.name} strikes ${enemy.name} for ${finalDamage} damage!`
            };
        }
    },
    executioners_judgment: {
        id: 'executioners_judgment',
        name: "Executioner's Judgment",
        description: 'Enemies with equal/lower Max Health are halved. Higher Max Health enemies lose 20%',
        cooldown: 0, 
        isUltimate: true,
        targetType: 'all-enemies',
        type: 'damage',
        damageScaling: 'none', // Pure % damage, doesn't scale with stats
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ultimate
         * @param {Array} params.enemies - All enemies in combat
         * @returns {Object} Effect data
         */
        execute: ({ caster, enemies }) => {
            const casterMaxHealth = caster.stats.maxHealth;
            const damageResults = [];
            const messages = [];

            enemies.forEach(enemy => {
                let damage;
                
                if (enemy.stats.maxHealth <= casterMaxHealth) {
                    // Equal or lower: cut in half
                    damage = Math.ceil(enemy.stats.health / 2);
                    messages.push(`${enemy.name} health halved!`);
                } else {
                    // Higher: 20% of current health
                    damage = Math.ceil(enemy.stats.health * 0.20);
                    messages.push(`${enemy.name} loses 20% health!`);
                }

                damageResults.push({
                    target: enemy.id,
                    amount: damage
                });
            });

            return {
                success: true,
                damage: damageResults,
                message: `${caster.name} unleashes Executioner's Judgment! ${messages.join(' ')}`
            };
        }
    },
    selfish_sacrifice: {
        id: 'selfish_sacrifice',
        name: 'Selfish Sacrifice',
        description: ' Drain your mp and transfer it elsewhere, giving you -10mp but +5 Spd and +5 Str for two turns',
        cooldown: 4,
        targetType: 'self',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [
                    {
                        type: 'stat_debuff',
                        target: playerName,
                        stat: 'mp',
                        value: -10,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'speed',
                        value: 5,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'strength',
                        value: 5,
                        duration: 2,
                        stackable: false
                    }
                ],
                message: `${caster.name} gains -10 MP but +5 Speed and +5 Strength for 2 turns!`
            };
        }
    }
};

// ============================================================================
// ABILITY EXECUTION & COOLDOWN MANAGEMENT
// ============================================================================


export function getAbility(abilityId) {
    return ABILITIES[abilityId] || null;
}

export function isAbilityReady(abilityId, cooldowns) {
    const ability = getAbility(abilityId);
    if (!ability) return false;
    
    const currentCooldown = cooldowns[abilityId] || 0;
    return currentCooldown === 0;
}

export function executeAbility(abilityId, params) {
    const ability = getAbility(abilityId);
    if (!ability) {
        return { success: false, message: 'Ability not found' };
    }

    // Check cooldown
    if (!isAbilityReady(abilityId, params.cooldowns || {})) {
        return { success: false, message: 'Ability on cooldown' };
    }

    const result = ability.execute(params);
    if (result.success) {
        // Cooldown is +1 to account for current turn
        // E.g., if cooldown is 1, you can't use it this turn or next turn (2 turns total)
        result.newCooldown = ability.cooldown + 1;
    }

    return result;
}

export function tickCooldowns(cooldowns) {
    const newCooldowns = { ...cooldowns };
    
    Object.keys(newCooldowns).forEach(abilityId => {
        if (newCooldowns[abilityId] > 0) {
            newCooldowns[abilityId]--;
        }
    });
    
    return newCooldowns;
}

/**
 * Apply ability effects to game state
 * This is called by Main.jsx to actually modify health, stats, etc.
 */
export function applyAbilityEffects(result, gameState) {
    const { enemies, playerCharacters, activeEffects } = gameState;
    const updates = {
        enemies: [...enemies],
        playerCharacters: { ...playerCharacters },
        activeEffects: [...(activeEffects || [])]
    };

    //Apply damage
    if (result.damage) {
        result.damage.forEach(({ target, amount }) => {
            //Check if target is enemy
            const enemyIndex = updates.enemies.findIndex(e => e.id === target);
            if (enemyIndex !== -1) {
                updates.enemies[enemyIndex] = {
                    ...updates.enemies[enemyIndex],
                    stats: {
                        ...updates.enemies[enemyIndex].stats,
                        health: Math.max(0, updates.enemies[enemyIndex].stats.health - amount)
                    }
                };
            }
        });
    }

    // Apply effects (buffs, debuffs, status effects)
    if (result.effects) {
        result.effects.forEach(effect => {
            //Add to active effects list for duration tracking
            const newEffect = {
                ...effect,
                turnsRemaining: effect.duration,
                appliedThisTurn: true // Mark so we don't tick it down immediately
            };
            updates.activeEffects.push(newEffect);

            // Apply stat buffs immediately (except health which is temp HP)
            if (effect.type === 'stat_buff' && effect.stat !== 'health' && effect.target in updates.playerCharacters) {
                const character = updates.playerCharacters[effect.target];
                updates.playerCharacters[effect.target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        [effect.stat]: character.stats[effect.stat] + effect.value
                    }
                };
            }
            // Health buffs are NOT applied to base stats - they act as consumable temp HP
        });
    }

    return updates;
}

export function tickActiveEffects(activeEffects, playerCharacters) {
    const updatedEffects = [];
    const updatedCharacters = { ...playerCharacters };

    activeEffects.forEach(effect => {
        // Create new effect object to avoid mutation
        const updatedEffect = { ...effect };
        
        // Skip ticking if effect was applied this turn
        if (updatedEffect.appliedThisTurn) {
            updatedEffect.appliedThisTurn = false;
            updatedEffects.push(updatedEffect);
            return;
        }
        
        updatedEffect.turnsRemaining--;

        // If effect expires, remove stat bonuses/debuffs
        if (updatedEffect.turnsRemaining <= 0) {
            // Remove stat buffs (except health which is consumed on damage)
            if (effect.type === 'stat_buff' && effect.stat !== 'health' && effect.target in updatedCharacters) {
                const character = updatedCharacters[effect.target];
                updatedCharacters[effect.target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        [effect.stat]: character.stats[effect.stat] - effect.value
                    }
                };
            }
            // Health buffs expire naturally or get consumed by damage - no restoration needed
        } else {
            // Keep effect active
            updatedEffects.push(updatedEffect);
        }
    });

    return { updatedEffects, updatedCharacters };
}

// ============================================================================
// PATTERN TEMPLATES FOR ADDING NEW ABILITIES
// ============================================================================

/*
// TEMPLATE: HEAL ABILITY
heal_template: {
    id: 'heal_template',
    name: 'Healing Touch',
    description: 'Restore health to an ally',
    cooldown: 2,
    targetType: 'ally', // or 'self'
    type: 'heal',
    
    execute: ({ target, playerCharacters }) => {
        const healAmount = 30;
        
        return {
            success: true,
            healing: [{
                target: target,
                amount: healAmount
            }],
            message: `${target} restored ${healAmount} health!`
        };
    }
},

// TEMPLATE: AOE DAMAGE
aoe_damage_template: {
    id: 'aoe_damage_template',
    name: 'Fireball',
    description: 'Deal technical damage to all enemies in a 3x3 area',
    cooldown: 3,
    targetType: 'ground-target', // Click a square, affects 3x3 area (8 adjacent squares)
    type: 'damage',
    damageType: 'technical',
    damageScaling: 'ta', // Uses technical ability stat for damage
    abilityDamage: 20, // Base ability damage
    
    execute: ({ caster, targetPosition, enemies, characterPositions }) => {
        const abilityDamage = 20;
        const { row, col } = targetPosition; // The clicked square
        
        // Find all enemies in 3x3 area (8 adjacent squares + center)
        const affectedEnemies = enemies.filter(enemy => {
            const enemyPos = characterPositions[enemy.id];
            if (!enemyPos) return false;
            
            const rowDiff = Math.abs(enemyPos.row - row);
            const colDiff = Math.abs(enemyPos.col - col);
            
            // Within 1 square in any direction (3x3 grid)
            return rowDiff <= 1 && colDiff <= 1;
        });
        
        return {
            success: true,
            damage: affectedEnemies.map(enemy => ({
                target: enemy.id,
                // Technical Damage Formula: (ta/10) * abilityDamage - (enemyResistance/10)
                amount: Math.max(1, Math.round(
                    (caster.stats.ta / 10) * abilityDamage - (enemy.stats.resistance / 10)
                ))
            })),
            aoePosition: targetPosition, // For visual effect display
            message: `${caster.name} unleashes a fireball! ${affectedEnemies.length} enemies hit!`
        };
    }
},

// TEMPLATE: DEBUFF
debuff_template: {
    id: 'debuff_template',
    name: 'Weaken',
    description: 'Reduce enemy strength',
    cooldown: 2,
    targetType: 'single-enemy',
    type: 'debuff',
    
    execute: ({ target, enemies }) => {
        return {
            success: true,
            effects: [{
                type: 'stat_debuff',
                target: target,
                stat: 'strength',
                value: -10,
                duration: 2
            }],
            message: `${target} weakened!`
        };
    }
}
*/
