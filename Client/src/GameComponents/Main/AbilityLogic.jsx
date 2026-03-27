
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

function isEffectActiveNow(effect) {
    return effect?.turnsRemaining > 0 && !effect?.appliedThisTurn;
}

export function hasDamageImmunity(activeEffects = [], targetId) {
    return activeEffects.some(effect =>
        effect.type === 'damage_immunity' &&
        effect.target === targetId &&
        isEffectActiveNow(effect)
    );
}

export function getDamageTakenMultiplier(activeEffects = [], targetId) {
    const multipliers = activeEffects
        .filter(effect =>
            effect.type === 'damage_taken_multiplier' &&
            effect.target === targetId &&
            isEffectActiveNow(effect)
        )
        .map(effect => effect.value || 1);

    return multipliers.reduce((product, value) => product * value, 1);
}

export function hasDamageReflection(activeEffects = [], targetId) {
    return activeEffects.some(effect =>
        effect.type === 'damage_reflection' &&
        effect.target === targetId &&
        isEffectActiveNow(effect)
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
    const { enemies, playerCharacters, activeEffects, effectOwnerTurnId } = gameState;
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
                if ((currentHealth || 0) <= 0) {
                    console.log(`[HEAL] Skipping heal on dead target ${character.name} (${target})`);
                    return;
                }
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
            const normalizedTurnsRemaining = Number.isFinite(effect.duration)
                ? effect.duration
                : (Number.isFinite(effect.turnsRemaining) ? effect.turnsRemaining : 1);

            //Add to active effects list for duration tracking
            const newEffect = {
                ...effect,
                turnsRemaining: Math.max(1, normalizedTurnsRemaining),
                appliedThisTurn: !effect.tickOnCastTurn, // Most effects skip first tick; some visuals should expire on caster end-turn
                ownerTurnId: effect.ownerTurnId ?? effectOwnerTurnId ?? result.ownerTurnId ?? result.casterId ?? null
            };

            if (newEffect.source === 'dead_calm') {
                console.log('[POWER BOOST DEBUG] Added effect:', {
                    target: newEffect.target,
                    stat: newEffect.stat,
                    value: newEffect.value,
                    duration: newEffect.duration,
                    turnsRemaining: newEffect.turnsRemaining,
                    appliedThisTurn: newEffect.appliedThisTurn,
                    ownerTurnId: newEffect.ownerTurnId,
                    tickOnCastTurn: effect.tickOnCastTurn
                });
            }

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
            // Enemy stat buffs/debuffs are applied on owner turn end when appliedThisTurn flips
            else if (effect.type === 'stat_buff' && effect.stat !== 'health') {
                console.log('[APPLY EFFECTS] Enemy stat buff queued for owner turn-end activation:', {
                    target: effect.target,
                    stat: effect.stat,
                    value: effect.value,
                    duration: effect.duration
                });
            }
            // Enemy stat buffs/debuffs are applied on owner turn end when appliedThisTurn flips
            else if (effect.type === 'stat_debuff') {
                console.log('[APPLY EFFECTS] Enemy stat debuff queued for owner turn-end activation:', {
                    target: effect.target,
                    stat: effect.stat,
                    value: effect.value,
                    duration: effect.duration
                });
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

export function tickActiveEffects(activeEffects, playerCharacters, enemies, endingTurnOwnerId = null) {
    const updatedEffects = [];
    const updatedCharacters = { ...playerCharacters };
    const updatedEnemies = enemies ? [...enemies] : [];

    console.log('[TICK EFFECTS] Starting tick with', activeEffects.length, 'active effects');

    activeEffects.forEach((effect, index) => {
        // Create new effect object to avoid mutation
        const updatedEffect = { ...effect };

        if (effect.source === 'dead_calm') {
            console.log('[POWER BOOST DEBUG] Tick start:', {
                index,
                target: effect.target,
                stat: effect.stat,
                turnsRemaining: effect.turnsRemaining,
                appliedThisTurn: effect.appliedThisTurn,
                ownerTurnId: effect.ownerTurnId,
                endingTurnOwnerId
            });
        }

        console.log(`[TICK EFFECTS] Processing effect ${index}:`, {
            type: effect.type,
            target: effect.target,
            stat: effect.stat,
            value: effect.value,
            turnsRemaining: effect.turnsRemaining,
            appliedThisTurn: effect.appliedThisTurn,
            ownerTurnId: effect.ownerTurnId,
            endingTurnOwnerId
        });

        const shouldTickThisTurn = !endingTurnOwnerId || !effect.ownerTurnId || effect.ownerTurnId === endingTurnOwnerId;
        if (!shouldTickThisTurn) {
            if (effect.source === 'dead_calm') {
                console.log('[POWER BOOST DEBUG] Skipping tick (owner mismatch):', {
                    target: effect.target,
                    stat: effect.stat,
                    ownerTurnId: effect.ownerTurnId,
                    endingTurnOwnerId
                });
            }
            updatedEffects.push(updatedEffect);
            return;
        }
        
        // Skip ticking if effect was applied this turn
        if (updatedEffect.appliedThisTurn) {
            if ((effect.type === 'stat_debuff' || (effect.type === 'stat_buff' && effect.stat !== 'health')) && enemies) {
                const enemyIndex = updatedEnemies.findIndex(e => e.id === effect.target);
                if (enemyIndex !== -1) {
                    const enemy = updatedEnemies[enemyIndex];
                    const oldValue = enemy.stats[effect.stat] || 0;
                    const newValue = oldValue + effect.value;
                    updatedEnemies[enemyIndex] = {
                        ...enemy,
                        stats: {
                            ...enemy.stats,
                            [effect.stat]: newValue
                        }
                    };
                    const effectLabel = effect.type === 'stat_debuff' ? 'DEBUFF' : 'BUFF';
                    console.log(`[${effectLabel} APPLIED] ${enemy.name} (${effect.target}):`);
                    console.log(`  - Stat: ${effect.stat}`);
                    console.log(`  - Old value: ${oldValue}`);
                    console.log(`  - Effect amount: ${effect.value}`);
                    console.log(`  - New value: ${newValue}`);
                }
            }
            updatedEffect.appliedThisTurn = false;
            if (effect.source === 'dead_calm') {
                console.log('[POWER BOOST DEBUG] Armed for next owner turn tick:', {
                    target: effect.target,
                    stat: effect.stat,
                    turnsRemaining: updatedEffect.turnsRemaining,
                    ownerTurnId: updatedEffect.ownerTurnId
                });
            }
            updatedEffects.push(updatedEffect);
            return;
        }
        
        // Apply healing_over_time before decrementing
        if (effect.type === 'healing_over_time' && effect.target in updatedCharacters) {
            const character = updatedCharacters[effect.target];
            if ((character.stats.health || 0) <= 0) {
                console.log(`[HEALING OVER TIME] Removing effect on dead target ${effect.target}`);
                updatedEffect.turnsRemaining = 0;
            } else {
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

        // Apply poison damage (% of max HP) before decrementing
        if (effect.type === 'poison' && enemies) {
            const enemyIndex = updatedEnemies.findIndex(e => e.id === effect.target);
            if (enemyIndex !== -1) {
                const enemy = updatedEnemies[enemyIndex];
                const poisonDamage = Math.max(1, Math.floor(enemy.stats.maxHealth * effect.damagePercent));
                const oldHealth = enemy.stats.health;
                const newHealth = Math.max(0, oldHealth - poisonDamage);
                updatedEnemies[enemyIndex] = {
                    ...enemy,
                    stats: {
                        ...enemy.stats,
                        health: newHealth
                    }
                };
                console.log(`[POISON DAMAGE] ${enemy.name} took ${poisonDamage} poison damage (${oldHealth} -> ${newHealth})`);
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
        
        updatedEffect.turnsRemaining = Math.max(0, updatedEffect.turnsRemaining - 1);
        if (effect.source === 'dead_calm') {
            console.log('[POWER BOOST DEBUG] Ticked down:', {
                target: effect.target,
                stat: effect.stat,
                turnsRemaining: updatedEffect.turnsRemaining,
                endingTurnOwnerId
            });
        }
        console.log(`[TICK EFFECTS] Ticked down to ${updatedEffect.turnsRemaining} turns remaining`);

        // If effect expires, bonuses are automatically removed (they were never added to base stats)
        if (updatedEffect.turnsRemaining <= 0) {
            if (effect.source === 'dead_calm') {
                console.log('[POWER BOOST DEBUG] Effect expired:', {
                    target: effect.target,
                    stat: effect.stat,
                    endingTurnOwnerId
                });
            }
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
        if (effect.target === playerName && effect.stat === statName && !effect.appliedThisTurn) {
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
        if (effect.target === playerName && (effect.type === 'stat_buff' || effect.type === 'stat_debuff') && !effect.appliedThisTurn) {
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
    const blizzardFields = activeEffects.filter(e => e.type === 'blizzard_field' && e.turnsRemaining > 0);
    const toxicMistFields = activeEffects.filter(e => e.type === 'toxic_mist_field' && e.turnsRemaining > 0);
    
    if (blizzardFields.length === 0 && toxicMistFields.length === 0) {
        return { updatedEffects: activeEffects, updatedEnemies: enemies, hasChanges: false };
    }
    
    let updatedEffects = [...activeEffects];
    let updatedEnemies = [...enemies];
    let hasChanges = false;

    const isInsideField = (position, field) => {
        if (!position || !field?.center) return false;
        const fieldRadius = Number.isFinite(field.radius) ? field.radius : 1;
        const rowDiff = Math.abs(position.row - field.center.row);
        const colDiff = Math.abs(position.col - field.center.col);
        return rowDiff <= fieldRadius && colDiff <= fieldRadius;
    };

    const getMaxFieldDurationAtPosition = (position, fields) => {
        return fields.reduce((maxDuration, field) => {
            if (!isInsideField(position, field)) return maxDuration;
            return Math.max(maxDuration, Number.isFinite(field.turnsRemaining) ? field.turnsRemaining : 1);
        }, 0);
    };

    const getMaxToxicDamageAtPosition = (position) => {
        return toxicMistFields.reduce((maxDamage, field) => {
            if (!isInsideField(position, field)) return maxDamage;
            const fieldDamage = Number.isFinite(field.amount) ? field.amount : 0;
            return Math.max(maxDamage, fieldDamage);
        }, 0);
    };
    
    // Check each enemy against active hazard fields
    enemies.forEach((enemy, enemyIndex) => {
        const enemyPos = characterPositions[enemy.id];
        if (!enemyPos) return;

        const blizzardDurationAtPosition = getMaxFieldDurationAtPosition(enemyPos, blizzardFields);
        const inAnyBlizzard = blizzardDurationAtPosition > 0;
        const toxicDurationAtPosition = getMaxFieldDurationAtPosition(enemyPos, toxicMistFields);
        const inAnyToxicMist = toxicDurationAtPosition > 0;
        const toxicDamageAtPosition = getMaxToxicDamageAtPosition(enemyPos);
        
        // Check if enemy already has a blizzard speed debuff
        const blizzardDebuffIndex = updatedEffects.findIndex(e =>
            e.type === 'stat_debuff' && 
            e.target === enemy.id && 
            e.stat === 'speed' && 
            e.source === 'blizzard'
        );
        const hasBlizzardDebuff = blizzardDebuffIndex !== -1;

        const toxicDotIndex = updatedEffects.findIndex(e =>
            e.type === 'damage_over_time' &&
            e.target === enemy.id &&
            e.source === 'toxic_mist_field'
        );
        const hasToxicMistDot = toxicDotIndex !== -1;
        
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
            hasChanges = true;
            
            // Apply to enemy stats immediately
            updatedEnemies[enemyIndex] = {
                ...enemy,
                stats: {
                    ...enemy.stats,
                    speed: enemy.stats.speed + speedDebuff
                }
            };
            hasChanges = true;
            
            console.log(`[BLIZZARD] ${enemy.name} entered blizzard - speed halved`);
        } else if (inAnyBlizzard && hasBlizzardDebuff) {
            // Enemy in blizzard - keep debuff alive while area exists
            const nextTurnsRemaining = Math.max(
                updatedEffects[blizzardDebuffIndex].turnsRemaining || 0,
                blizzardDurationAtPosition
            );

            if (nextTurnsRemaining !== updatedEffects[blizzardDebuffIndex].turnsRemaining) {
                updatedEffects[blizzardDebuffIndex] = {
                    ...updatedEffects[blizzardDebuffIndex],
                    turnsRemaining: nextTurnsRemaining
                };
                hasChanges = true;
            }
        }

        if (inAnyToxicMist && !hasToxicMistDot) {
            const dotAmount = toxicDamageAtPosition > 0 ? toxicDamageAtPosition : 1;
            updatedEffects.push({
                type: 'damage_over_time',
                target: enemy.id,
                amount: dotAmount,
                duration: toxicDurationAtPosition,
                turnsRemaining: toxicDurationAtPosition,
                appliedThisTurn: false,
                source: 'toxic_mist_field'
            });
            hasChanges = true;
            console.log(`[TOXIC MIST] ${enemy.name} entered toxic mist - DoT applied`);
        } else if (inAnyToxicMist && hasToxicMistDot) {
            const currentDot = updatedEffects[toxicDotIndex];
            const nextTurnsRemaining = Math.max(currentDot.turnsRemaining || 0, toxicDurationAtPosition);
            const nextAmount = Math.max(currentDot.amount || 0, toxicDamageAtPosition || 0);

            if (nextTurnsRemaining !== currentDot.turnsRemaining || nextAmount !== currentDot.amount) {
                updatedEffects[toxicDotIndex] = {
                    ...currentDot,
                    turnsRemaining: nextTurnsRemaining,
                    amount: nextAmount > 0 ? nextAmount : currentDot.amount
                };
                hasChanges = true;
            }
        }
    });
    
    return { updatedEffects, updatedEnemies, hasChanges };
}