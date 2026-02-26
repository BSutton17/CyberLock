
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

export function hasDamageImmunity(activeEffects = [], targetId) {
    return activeEffects.some(effect =>
        effect.type === 'damage_immunity' &&
        effect.target === targetId &&
        effect.turnsRemaining > 0
    );
}

export function getDamageTakenMultiplier(activeEffects = [], targetId) {
    const multipliers = activeEffects
        .filter(effect =>
            effect.type === 'damage_taken_multiplier' &&
            effect.target === targetId &&
            effect.turnsRemaining > 0
        )
        .map(effect => effect.value || 1);

    return multipliers.reduce((product, value) => product * value, 1);
}

export function hasDamageReflection(activeEffects = [], targetId) {
    return activeEffects.some(effect =>
        effect.type === 'damage_reflection' &&
        effect.target === targetId &&
        effect.turnsRemaining > 0
    );
}

export function applyDamageKeywords(amount, activeEffects = [], targetId, { minimumDamage = 0 } = {}) {
    if (hasDamageImmunity(activeEffects, targetId)) {
        return 0;
    }

    const multiplier = getDamageTakenMultiplier(activeEffects, targetId);
    const scaledDamage = Math.round(Math.max(0, amount || 0) * multiplier);
    return Math.max(minimumDamage, scaledDamage);
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
                const incomingDamage = Math.max(0, amount || 0);
                const totalMultiplier = getDamageTakenMultiplier(updates.activeEffects, target);
                const finalDamage = applyDamageKeywords(incomingDamage, updates.activeEffects, target, { minimumDamage: 1 });

                updates.enemies[enemyIndex] = {
                    ...updates.enemies[enemyIndex],
                    stats: {
                        ...updates.enemies[enemyIndex].stats,
                        health: Math.max(0, updates.enemies[enemyIndex].stats.health - finalDamage)
                    }
                };

                if (totalMultiplier > 1) {
                    console.log('[CURSED MULTIPLIER] Applied to ability damage:', {
                        target,
                        baseDamage: incomingDamage,
                        totalMultiplier,
                        finalDamage
                    });
                }
            } else if (target in updates.playerCharacters) {
                const incomingDamage = Math.max(0, amount || 0);
                const finalDamage = applyDamageKeywords(incomingDamage, updates.activeEffects, target, { minimumDamage: 1 });
                const character = updates.playerCharacters[target];
                const currentHealth = character.stats.health;
                const newHealth = Math.max(0, currentHealth - finalDamage);

                updates.playerCharacters[target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        health: newHealth
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

            // Stat buffs for players are tracked in activeEffects only - NOT applied to base stats
            // Base player stats remain unchanged, bonuses are calculated dynamically from activeEffects
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
            // Apply stat buffs immediately to enemies
            else if (effect.type === 'stat_buff' && effect.stat !== 'health') {
                const enemyIndex = updates.enemies.findIndex(e => e.id === effect.target);
                if (enemyIndex !== -1) {
                    const enemy = updates.enemies[enemyIndex];
                    const oldValue = enemy.stats[effect.stat] || 0;
                    const newValue = oldValue + effect.value;
                    updates.enemies[enemyIndex] = {
                        ...enemy,
                        stats: {
                            ...enemy.stats,
                            [effect.stat]: newValue
                        }
                    };
                    console.log(`[BUFF APPLIED] ${enemy.name} (${effect.target}):`);
                    console.log(`  - Stat: ${effect.stat}`);
                    console.log(`  - Old value: ${oldValue}`);
                    console.log(`  - Buff amount: ${effect.value}`);
                    console.log(`  - New value: ${newValue}`);
                    console.log(`  - Duration: ${effect.duration} turns`);
                }
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
                const baseBurnDamage = Math.floor(enemy.stats.health * effect.damagePercent);
                const totalMultiplier = getDamageTakenMultiplier(activeEffects, effect.target);
                const burnDamage = applyDamageKeywords(baseBurnDamage, activeEffects, effect.target, { minimumDamage: 1 });
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
                if (totalMultiplier > 1) {
                    console.log('[CURSED MULTIPLIER] Applied to burn damage:', {
                        target: effect.target,
                        baseBurnDamage,
                        totalMultiplier,
                        finalBurnDamage: burnDamage
                    });
                }
            }
        }

        // Apply fixed damage over time before decrementing
        if (effect.type === 'damage_over_time') {
            if (effect.target in updatedCharacters) {
                const character = updatedCharacters[effect.target];
                if ((character.stats.health || 0) <= 0) {
                    console.log(`[DAMAGE OVER TIME] Removing expired DoT on dead character target ${effect.target}`);
                    updatedEffect.turnsRemaining = 0;
                } else {
                const oldHealth = character.stats.health;
                const dotDamage = applyDamageKeywords(effect.amount || 0, activeEffects, effect.target, { minimumDamage: 1 });
                const newHealth = Math.max(0, oldHealth - dotDamage);
                updatedCharacters[effect.target] = {
                    ...character,
                    stats: {
                        ...character.stats,
                        health: newHealth
                    }
                };
                console.log(`[DAMAGE OVER TIME] ${character.name} took ${dotDamage} damage (${oldHealth} -> ${newHealth})`);
                }
            } else if (enemies) {
                const enemyIndex = updatedEnemies.findIndex(e => e.id === effect.target);
                if (enemyIndex !== -1) {
                    const enemy = updatedEnemies[enemyIndex];
                    if (enemy.isDeadBody || (enemy.stats.health || 0) <= 0) {
                        console.log(`[DAMAGE OVER TIME] Removing expired DoT on dead enemy target ${effect.target}`);
                        updatedEffect.turnsRemaining = 0;
                    } else {
                        const oldHealth = enemy.stats.health;
                        const dotDamage = applyDamageKeywords(effect.amount || 0, activeEffects, effect.target, { minimumDamage: 1 });
                        const newHealth = Math.max(0, oldHealth - dotDamage);
                        updatedEnemies[enemyIndex] = {
                            ...enemy,
                            stats: {
                                ...enemy.stats,
                                health: newHealth
                            }
                        };
                        console.log(`[DAMAGE OVER TIME] ${enemy.name} took ${dotDamage} damage (${oldHealth} -> ${newHealth})`);
                    }
                } else {
                    console.log(`[DAMAGE OVER TIME] Removing orphaned DoT effect for missing target ${effect.target}`);
                    updatedEffect.turnsRemaining = 0;
                }
            } else {
                updatedEffect.turnsRemaining = 0;
            }
        }
        
        updatedEffect.turnsRemaining--;
        console.log(`[TICK EFFECTS] Ticked down to ${updatedEffect.turnsRemaining} turns remaining`);

        // If effect expires, bonuses are automatically removed (they were never added to base stats)
        if (updatedEffect.turnsRemaining <= 0) {
            console.log(`[TICK EFFECTS] Effect expired - removing from activeEffects`);
            // Player stat buffs don't need to be removed from stats since they were never added to base stats
            // Enemy stat buffs/debuffs DO need to be removed since they modify enemy stats directly
            if ((effect.type === 'stat_debuff' || (effect.type === 'stat_buff' && effect.stat !== 'health')) && enemies) {
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
                    const effectLabel = effect.type === 'stat_debuff' ? 'DEBUFF' : 'BUFF';
                    console.log(`[${effectLabel} EXPIRED] ${enemy.name} (${effect.target}):`);
                    console.log(`  - Stat: ${effect.stat}`);
                    console.log(`  - Old value: ${oldValue}`);
                    console.log(`  - Effect amount removed: ${effect.value}`);
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

/**
 * Update blizzard field effects - apply/remove speed debuffs based on enemy positions
 * @param {Array} activeEffects - Current active effects
 * @param {Array} enemies - All enemies
 * @param {Object} characterPositions - Position data for all characters/enemies
 * @returns {Object} { updatedEffects, updatedEnemies }
 */
export function updateBlizzardFieldEffects(activeEffects, enemies, characterPositions) {
    const blizzardFields = activeEffects.filter(e => e.type === 'blizzard_field');
    
    if (blizzardFields.length === 0) {
        return { updatedEffects: activeEffects, updatedEnemies: enemies };
    }
    
    let updatedEffects = [...activeEffects];
    let updatedEnemies = [...enemies];
    
    // Check each enemy against each blizzard field
    enemies.forEach((enemy, enemyIndex) => {
        const enemyPos = characterPositions[enemy.id];
        if (!enemyPos) return;
        
        let inAnyBlizzard = false;
        
        // Check if enemy is in any active blizzard field
        for (const field of blizzardFields) {
            const rowDiff = Math.abs(enemyPos.row - field.center.row);
            const colDiff = Math.abs(enemyPos.col - field.center.col);
            
            if (rowDiff <= field.radius && colDiff <= field.radius) {
                inAnyBlizzard = true;
                break;
            }
        }
        
        // Check if enemy already has a blizzard speed debuff
        const hasBlizzardDebuff = updatedEffects.some(e => 
            e.type === 'stat_debuff' && 
            e.target === enemy.id && 
            e.stat === 'speed' && 
            e.source === 'blizzard'
        );
        
        if (inAnyBlizzard && !hasBlizzardDebuff) {
            // Enemy entered blizzard - apply speed debuff
            const speedDebuff = -(Math.floor(enemy.stats.speed / 2));
            updatedEffects.push({
                type: 'stat_debuff',
                target: enemy.id,
                stat: 'speed',
                value: speedDebuff,
                duration: 1, // Will be refreshed each turn while in blizzard
                stackable: false,
                source: 'blizzard',
                turnsRemaining: 1,
                appliedThisTurn: true
            });
            
            // Apply to enemy stats immediately
            updatedEnemies[enemyIndex] = {
                ...enemy,
                stats: {
                    ...enemy.stats,
                    speed: enemy.stats.speed + speedDebuff
                }
            };
            
            console.log(`[BLIZZARD] ${enemy.name} entered blizzard - speed halved`);
        } else if (!inAnyBlizzard && hasBlizzardDebuff) {
            // Enemy left blizzard - remove speed debuff
            const debuffIndex = updatedEffects.findIndex(e =>
                e.type === 'stat_debuff' &&
                e.target === enemy.id &&
                e.stat === 'speed' &&
                e.source === 'blizzard'
            );
            
            if (debuffIndex !== -1) {
                const debuff = updatedEffects[debuffIndex];
                updatedEnemies[enemyIndex] = {
                    ...enemy,
                    stats: {
                        ...enemy.stats,
                        speed: enemy.stats.speed - debuff.value // Remove the negative debuff
                    }
                };
                updatedEffects.splice(debuffIndex, 1);
                console.log(`[BLIZZARD] ${enemy.name} left blizzard - speed restored`);
            }
        } else if (inAnyBlizzard && hasBlizzardDebuff) {
            // Enemy still in blizzard - refresh debuff duration
            const debuffIndex = updatedEffects.findIndex(e =>
                e.type === 'stat_debuff' &&
                e.target === enemy.id &&
                e.stat === 'speed' &&
                e.source === 'blizzard'
            );
            
            if (debuffIndex !== -1) {
                updatedEffects[debuffIndex] = {
                    ...updatedEffects[debuffIndex],
                    turnsRemaining: 1 // Keep it active for one more turn
                };
            }
        }
    });
    
    return { updatedEffects, updatedEnemies };
}