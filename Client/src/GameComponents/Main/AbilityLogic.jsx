
import { ABILITIES } from './AbilityStore';

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
                appliedThisTurn: !effect.tickOnCastTurn // Most effects skip first tick; some visuals should expire on caster end-turn
            };
            updates.activeEffects.push(newEffect);
            console.log('[APPLY EFFECTS] Added to activeEffects:', newEffect);

            // Stat buffs are tracked in activeEffects only - NOT applied to base stats
            // Base stats remain unchanged, bonuses are calculated dynamically from activeEffects
            if (effect.type === 'stat_buff' && effect.stat !== 'health' && effect.target in updates.playerCharacters) {
                const character = updates.playerCharacters[effect.target];
                console.log('[APPLY EFFECTS] Stat buff tracked in activeEffects (not modifying base stat):', {
                    target: effect.target,
                    characterName: character.name,
                    stat: effect.stat,
                    baseStat: character.stats[effect.stat],
                    buffAmount: effect.value,
                    duration: effect.duration
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
            updatedEffect.appliedThisTurn = false;
            updatedEffects.push(updatedEffect);
            return;
        }
        
        // Apply healing_over_time before decrementing
        if (effect.type === 'healing_over_time' && effect.target in updatedCharacters) {
            const character = updatedCharacters[effect.target];
            const oldHealth = character.stats.health;
            const maxHealth = character.stats.maxHealth || character.stats.max_health;
            const newHealth = Math.min(maxHealth, oldHealth + effect.amount);
            updatedCharacters[effect.target] = {
                ...character,
                stats: {
                    ...character.stats,
                    health: newHealth
                }
            };
            console.log(`[HEALING OVER TIME] ${character.name} healed for ${effect.amount} HP (${oldHealth} -> ${newHealth})`);
        }
        
        // Apply burn damage before decrementing
        if (effect.type === 'burn' && enemies) {
            const enemyIndex = updatedEnemies.findIndex(e => e.id === effect.target);
            if (enemyIndex !== -1) {
                const enemy = updatedEnemies[enemyIndex];
                const burnDamage = Math.floor(enemy.stats.health * effect.damagePercent);
                const oldHealth = enemy.stats.health;
                const newHealth = Math.max(0, oldHealth - burnDamage);
                updatedEnemies[enemyIndex] = {
                    ...enemy,
                    stats: {
                        ...enemy.stats,
                        health: newHealth
                    }
                };
                console.log(`[BURN DAMAGE] ${enemy.name} took ${burnDamage} burn damage (${oldHealth} -> ${newHealth})`);
            }
        }
        
        updatedEffect.turnsRemaining--;
        console.log(`[TICK EFFECTS] Ticked down to ${updatedEffect.turnsRemaining} turns remaining`);

        // If effect expires, bonuses are automatically removed (they were never added to base stats)
        if (updatedEffect.turnsRemaining <= 0) {
            console.log(`[TICK EFFECTS] Effect expired - removing from activeEffects`);
            // Stat buffs don't need to be removed from stats since they were never added to base stats
            // Debuffs on enemies DO need to be removed since they modify enemy stats directly
            if (effect.type === 'stat_debuff' && enemies) {
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

/**
 * Calculate total stat value for a character including bonuses from active effects
 * @param {Object} character - The character object with base stats
 * @param {string} playerName - The player name/ID
 * @param {string} statName - The stat to calculate ('speed', 'strength', etc.)
 * @param {Array} activeEffects - Array of active effects
 * @returns {number} Total stat value (base + bonuses - debuffs)
 */
export function calculateTotalStat(character, playerName, statName, activeEffects) {
    let total = character.stats[statName] || 0;
    
    // Add bonuses from active effects
    activeEffects.forEach(effect => {
        if (effect.target === playerName && effect.stat === statName) {
            if (effect.type === 'stat_buff') {
                total += effect.value;
            } else if (effect.type === 'stat_debuff') {
                total += effect.value; // value is already negative for debuffs
            }
        }
    });
    
    return total;
}

/**
 * Get all stat bonuses for a character (for UI display)
 * @param {string} playerName - The player name/ID
 * @param {Array} activeEffects - Array of active effects
 * @returns {Object} Object with stat bonuses { speed: 15, strength: 10, ... }
 */
export function getStatBonuses(playerName, activeEffects) {
    const bonuses = {};
    
    activeEffects.forEach(effect => {
        if (effect.target === playerName && (effect.type === 'stat_buff' || effect.type === 'stat_debuff')) {
            const statName = effect.stat;
            bonuses[statName] = (bonuses[statName] || 0) + effect.value;
        }
    });
    
    return bonuses;
}