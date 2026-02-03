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
        targetType: 'multi-enemy', 
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
    calm_under_pressure: {
        id: 'calm_under_pressure',
        name: 'Calm Under Pressure',
        description: 'Heal yourself for 15 hp',
        cooldown: 3,
        targetType: 'self',
        type: 'heal',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName, playerCharacters }) => {
            const healAmount = 15;
            const currentHealth = caster.stats.health;
            const maxHealth = caster.stats.maxHealth;
            const actualHeal = Math.min(healAmount, maxHealth - currentHealth);
            
            const result = {
                success: true,
                healing: [{
                    target: playerName,
                    amount: healAmount
                }],
                message: `${caster.name} heals for ${actualHeal} HP!`
            };
            return result;
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
    flood_of_frost: {
        id: 'flood_of_frost',
        name: 'Flood of Frost',
        description: 'A spell that freezes an enemy, cutting their speed in half for 2 turns and does light damage',
        cooldown: 2,
        targetType: 'single-enemy', 
        damageType: 'technical',
        damageScaling: 'ta', 
        abilityDamage: 5,
        range: 3, 
        
        /**
         * @param {Object} params
         * @param {Array<string>} params.targets - Array of enemy IDs (max 2)
         * @param {Object} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            // Technical Damage Formula: (ta/10) * abilityDamage - (resistance/10)
            const finalDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 5 - (enemy.stats.resistance / 10)
            ));
            
            return {
                success: true,
                damage: [{
                    target: enemy.id,
                    amount: finalDamage
                }],
                effects: [
                    { 
                        type: 'stat_debuff',
                        target: enemy.id,
                        stat: 'speed',
                        value: -Math.floor(enemy.stats.speed / 2),
                        duration: 2,
                        stackable: false
                    }
                ],
                message: `${caster.name} freezes ${enemy.name} for ${finalDamage} damage and reduces speed by ${Math.floor(enemy.stats.speed / 2)}!`
            };
        }
    },
    hurry_up: {
        id: 'hurry_up',
        name: 'Hurry Up!',
        description: 'Add +10 speed to one ally for 1 turns',
        cooldown: 2,
        targetType: 'ally',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.target - Ally player name/ID
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, playerCharacters }) => {
            console.log('[HURRY UP] Execute params:', {
                casterName: caster?.name,
                target,
                playerCharacterKeys: Object.keys(playerCharacters || {})
            });
            
            const ally = playerCharacters[target];
            
            console.log('[HURRY UP] Ally lookup:', {
                target,
                allyFound: !!ally,
                allyName: ally?.name
            });
            
            if (!ally) {
                console.log('[HURRY UP] Target not found!');
                return { success: false, message: 'Target not found' };
            }

            const result = {
                success: true,
                effects: [
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'speed',
                    value: 10,
                    duration: 1,
                    stackable: false
                }],
                message: `${caster.name} gave ${ally.name} +10 speed for 1 turn!`
            };
            
            console.log('[HURRY UP] Returning result:', result);
            return result;
        }
    },
    murus_fictilis: {
        id: 'murus_fictilis',
        name: "Murus Fictilis",
        description: 'Grants all members of the party +15 Bonus Health and +10 Res for 2 turns',
        cooldown: 0, 
        isUltimate: true,
        targetType: 'all-allies',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ultimate
         * @param {Object} params.playerCharacters - All player characters (keyed by playerName)
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerCharacters }) => {
            const effects = [];
            const allyNames = [];

            Object.keys(playerCharacters).forEach(playerName => {
                allyNames.push(playerCharacters[playerName].name);

                effects.push({
                    type: 'stat_buff',
                    target: playerName,
                    stat: 'health',
                    value: 15,
                    duration: 2,
                    stackable: false
                });
                
                effects.push({
                    type: 'stat_buff',
                    target: playerName,
                    stat: 'resistance',
                    value: 10,
                    duration: 2,
                    stackable: false
                });
            });

            return {
                success: true,
                effects: effects,
                message: `${caster.name} casts Murus Fictilis! ${allyNames.join(', ')} gain +15 Health and +10 Resistance for 2 turns!`
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

    // Apply healing (restores actual HP, cannot exceed maxHealth)
    if (result.healing) {
        result.healing.forEach(({ target, amount }) => {
            // Check if target is a player
            if (target in updates.playerCharacters) {
                const character = updates.playerCharacters[target];
                const currentHealth = character.stats.health;
                const maxHealth = character.stats.maxHealth;
                const newHealth = Math.min(maxHealth, currentHealth + amount);
                
                updates.playerCharacters[target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        health: newHealth
                    }
                };
                
                console.log(`${character.name} healed: ${currentHealth} → ${newHealth} (capped at ${maxHealth})`);
            }
        });
    }

    // Apply effects (buffs, debuffs, status effects)
    if (result.effects) {
        console.log('[APPLY EFFECTS] Processing effects:', result.effects);
        result.effects.forEach(effect => {
            //Add to active effects list for duration tracking
            const newEffect = {
                ...effect,
                turnsRemaining: effect.duration,
                appliedThisTurn: true // Mark so we don't tick it down immediately
            };
            updates.activeEffects.push(newEffect);
            console.log('[APPLY EFFECTS] Added to activeEffects:', newEffect);

            // Apply stat buffs immediately to player characters (except health which is temp HP)
            if (effect.type === 'stat_buff' && effect.stat !== 'health' && effect.target in updates.playerCharacters) {
                const character = updates.playerCharacters[effect.target];
                const oldValue = character.stats[effect.stat];
                updates.playerCharacters[effect.target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        [effect.stat]: character.stats[effect.stat] + effect.value
                    }
                };
                console.log('[APPLY EFFECTS] Applied stat buff:', {
                    target: effect.target,
                    stat: effect.stat,
                    oldValue,
                    newValue: oldValue + effect.value,
                    value: effect.value
                });
            } 
            // Apply stat debuffs immediately to enemies
            else if (effect.type === 'stat_debuff') {
                const enemyIndex = updates.enemies.findIndex(e => e.id === effect.target);
                if (enemyIndex !== -1) {
                    const enemy = updates.enemies[enemyIndex];
                    const oldValue = enemy.stats[effect.stat];
                    const newValue = oldValue + effect.value;
                    updates.enemies[enemyIndex] = {
                        ...enemy,
                        stats: {
                            ...enemy.stats,
                            [effect.stat]: newValue
                        }
                    };
                    console.log(`[DEBUFF APPLIED] ${enemy.name} (${effect.target}):`);
                    console.log(`  - Stat: ${effect.stat}`);
                    console.log(`  - Old value: ${oldValue}`);
                    console.log(`  - Debuff amount: ${effect.value}`);
                    console.log(`  - New value: ${newValue}`);
                    console.log(`  - Duration: ${effect.duration} turns`);
                }
            }
            else {
                console.log('[APPLY EFFECTS] Skipping immediate application:', {
                    type: effect.type,
                    stat: effect.stat,
                    isHealth: effect.stat === 'health',
                    targetExists: effect.target in updates.playerCharacters
                });
            }
            // Health buffs are NOT applied to base stats - they act as consumable temp HP
        });
    }

    return updates;
}

export function tickActiveEffects(activeEffects, playerCharacters, enemies) {
    const updatedEffects = [];
    const updatedCharacters = { ...playerCharacters };
    const updatedEnemies = enemies ? [...enemies] : [];

    console.log('[TICK EFFECTS] Starting tick with', activeEffects.length, 'active effects');

    activeEffects.forEach((effect, index) => {
        // Create new effect object to avoid mutation
        const updatedEffect = { ...effect };
        
        console.log(`[TICK EFFECTS] Processing effect ${index}:`, {
            type: effect.type,
            target: effect.target,
            stat: effect.stat,
            value: effect.value,
            turnsRemaining: effect.turnsRemaining,
            appliedThisTurn: effect.appliedThisTurn
        });
        
        // Skip ticking if effect was applied this turn
        if (updatedEffect.appliedThisTurn) {
            console.log(`[TICK EFFECTS] Skipping tick - effect was applied this turn`);
            updatedEffect.appliedThisTurn = false;
            updatedEffects.push(updatedEffect);
            return;
        }
        
        updatedEffect.turnsRemaining--;
        console.log(`[TICK EFFECTS] Ticked down to ${updatedEffect.turnsRemaining} turns remaining`);

        // If effect expires, remove stat bonuses/debuffs
        if (updatedEffect.turnsRemaining <= 0) {
            console.log(`[TICK EFFECTS] Effect expired, removing...`);
            // Remove stat buffs from player characters (except health which is consumed on damage)
            if (effect.type === 'stat_buff' && effect.stat !== 'health' && effect.target in updatedCharacters) {
                const character = updatedCharacters[effect.target];
                updatedCharacters[effect.target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        [effect.stat]: character.stats[effect.stat] - effect.value
                    }
                };
                console.log(`[TICK EFFECTS] Removed stat buff from ${effect.target}: ${effect.stat} ${effect.value}`);
            }
            // Remove stat debuffs from enemies
            else if (effect.type === 'stat_debuff' && enemies) {
                const enemyIndex = updatedEnemies.findIndex(e => e.id === effect.target);
                if (enemyIndex !== -1) {
                    const enemy = updatedEnemies[enemyIndex];
                    const oldValue = enemy.stats[effect.stat];
                    const newValue = oldValue - effect.value;
                    updatedEnemies[enemyIndex] = {
                        ...enemy,
                        stats: {
                            ...enemy.stats,
                            [effect.stat]: newValue
                        }
                    };
                    console.log(`[DEBUFF EXPIRED] ${enemy.name} (${effect.target}):`);
                    console.log(`  - Stat: ${effect.stat}`);
                    console.log(`  - Old value: ${oldValue}`);
                    console.log(`  - Debuff amount removed: ${effect.value}`);
                    console.log(`  - New value: ${newValue}`);
                    console.log(`  - Effect lasted: ${effect.duration} turns`);
                }
            }
            // Effect expired - don't add to updatedEffects
        } else {
            // Keep effect active
            console.log(`[TICK EFFECTS] Keeping effect active with ${updatedEffect.turnsRemaining} turns remaining`);
            updatedEffects.push(updatedEffect);
        }
    });

    console.log('[TICK EFFECTS] Finished tick:', {
        startedWith: activeEffects.length,
        endedWith: updatedEffects.length,
        removed: activeEffects.length - updatedEffects.length
    });

    return { updatedEffects, updatedCharacters, updatedEnemies };
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
    range: 6, // Maximum distance from caster to target square
    
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
