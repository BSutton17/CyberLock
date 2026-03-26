export const ABILITIES = {
    ability_boost: {
        id: 'ability_boost',
        name: 'Ability Boost',
        description: 'Grants yourself +5 in all stats for 2 turns',
        role: "Tank",
        level: 1,
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
                        stat: 'resistance',
                        value: 5,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'ta',
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
                message: `${caster.name} gains +5 in all stats for 2 turns!`
            };
            return result;
        }
    },
    binding_chains: {
        id: 'binding_chains',
        name: 'Binding Chains',
        description: 'Use energy chains to temporarily immobilize 2 enemies for 1 turn',
        role: "Tank",
        level: 3,
        cooldown: 2,
        targetType: 'multi-enemy', 
        maxTargets: 2,
        range: 4,
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
    battery_drain: {
        id: 'battery_drain',
        name: 'Battery Drain',
        description: 'Drain energy from an enemy. 25% of damage dealt heals the weakest ally',
        role: "Support",
        level: 3,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'technical',
        damageScaling: 'ta',
        abilityDamage: 10,
        range: 4,
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.target - Enemy ID
         * @param {Array} params.enemies - All enemies
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies, playerCharacters }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            // Technical Damage Formula: (ta/10) * abilityDamage - (resistance/10)
            const finalDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 10 - (enemy.stats.resistance / 10)
            ));
            
            // Find weakest ally (lowest current HP)
            let weakestAlly = null;
            let lowestHP = Infinity;
            let weakestPlayerName = null;
            
            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                if (character.stats.health < lowestHP) {
                    lowestHP = character.stats.health;
                    weakestAlly = character;
                    weakestPlayerName = playerName;
                }
            });
            
            // Convert 25% of damage to healing
            const healAmount = Math.floor(finalDamage * 0.25);
            
            return {
                success: true,
                damage: [{
                    target: enemy.id,
                    amount: finalDamage
                }],
                healing: [{
                    target: weakestPlayerName,
                    amount: healAmount
                }],
                message: `${caster.name} drains ${enemy.name} for ${finalDamage} damage! ${weakestAlly.name} is healed for ${healAmount} HP!`
            };
        }
    },
    blackjack: {
        id: 'blackjack',
        name: 'Blackjack',
        description: '50% chance to restore one ally 50% HP. Every 5 TA above 30 grants +1% chance',
        role: "Support",
        level: 5,
        cooldown: 3,
        targetType: 'ally',
        type: 'heal',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {string} params.target - The ally player name
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, playerCharacters }) => {
            const ally = playerCharacters[target];
            
            if (!ally) {
                return { success: false, message: 'Target not found' };
            }
            
            // Calculate success chance: 50% base + 1% per 5 TA above 30
            const baseChance = 50;
            const taBonus = Math.max(0, Math.floor((caster.stats.ta - 30) / 5));
            const successChance = Math.min(100, baseChance + taBonus);
            
            const roll = Math.random() * 100;
            
            if (roll >= successChance) {
                return {
                    success: true,
                    message: `${caster.name} uses Blackjack on ${ally.name}... but it fails!`
                };
            }
            
            // Success! Heal 50% of max HP
            const healAmount = Math.floor(ally.stats.maxHealth * 0.5);
            
            return {
                success: true,
                healing: [{
                    target: target,
                    amount: healAmount
                }],
                message: `${caster.name} uses Blackjack on ${ally.name}! Restored ${healAmount} HP!`
            };
        }
    },
    blizzard: {
        id: 'blizzard',
        name: 'Blizzard',
        description: 'Create a blizzard that halves enemy speed for 3 turns',
        role: "DPS",
        level: 3,
        cooldown: 5,
        targetType: 'ground-target',
        type: 'debuff',
        range: 4,
        aoeSize: 3, // 3x3 area
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square
         * @param {Array} params.enemies - All enemies
         * @param {Object} params.characterPositions - Positions of all characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, enemies, characterPositions }) => {
            const { row, col } = targetPosition;
            const effects = [];
            const affectedEnemies = [];

            // Create the blizzard field effect
            effects.push({
                type: 'blizzard_field',
                center: { row, col },
                radius: 1, // 3x3 area (1 square in each direction)
                duration: 3
            });
            
            // Find all enemies currently in the 3x3 area and apply speed debuff
            enemies.forEach(enemy => {
                const enemyPos = characterPositions[enemy.id];
                if (!enemyPos) return;
                
                const rowDiff = Math.abs(enemyPos.row - row);
                const colDiff = Math.abs(enemyPos.col - col);
                
                // Within 1 square in any direction (3x3 grid)
                if (rowDiff <= 1 && colDiff <= 1) {
                    affectedEnemies.push(enemy.name);
                    
                    // Apply speed debuff (half their current speed)
                    const speedDebuff = -(Math.floor(enemy.stats.speed / 2));
                    effects.push({
                        type: 'stat_debuff',
                        target: enemy.id,
                        stat: 'speed',
                        value: speedDebuff,
                        duration: 3,
                        stackable: false,
                        source: 'blizzard' // Track that this is from blizzard field
                    });
                }
            });
            
            const affectedMessage = affectedEnemies.length > 0
                ? `${affectedEnemies.join(', ')} caught in the blizzard!`
                : 'The blizzard awaits its victims...';

            return {
                success: true,
                effects: effects,
                aoePosition: targetPosition,
                message: `${caster.name} summons a Blizzard! ${affectedMessage}`
            };
        }
    },
    black_hole: {
        id: 'black_hole',
        name: 'Black Hole',
        description: 'Click on a square to instantly teleport enemies in a 5x5 area into the center spiral and immobilize them for 2 turns',
        role: "DPS",
        cooldown: 16,
        isUltimate: true,
        targetType: 'ground-target',
        type: 'debuff',
        range: 6,
        aoeSize: 5, // 5x5 area
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square
         * @param {Array} params.enemies - All enemies
         * @param {Object} params.characterPositions - Positions of all characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, enemies, characterPositions }) => {
            const { row, col } = targetPosition;
            const effects = [];
            const affectedEnemies = [];
            const forcedMovement = [];
            const occupied = new Set(
                Object.values(characterPositions || {}).map(pos => `${pos.row},${pos.col}`)
            );
            const withinBounds = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 10;

            const buildSpiralPositions = (centerRow, centerCol, maxCells = 70) => {
                const positions = [];
                const seen = new Set();

                const pushIfValid = (r, c) => {
                    if (!withinBounds(r, c)) return;
                    const key = `${r},${c}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    positions.push({ row: r, col: c });
                };

                pushIfValid(centerRow, centerCol);

                let currentRow = centerRow;
                let currentCol = centerCol;
                let stepLength = 1;
                const directions = [
                    { row: -1, col: 0 }, // up
                    { row: 0, col: -1 }, // left
                    { row: 1, col: 0 },  // down
                    { row: 0, col: 1 }   // right
                ];

                while (positions.length < maxCells && stepLength < 20) {
                    for (let directionIndex = 0; directionIndex < directions.length; directionIndex++) {
                        const direction = directions[directionIndex];
                        for (let step = 0; step < stepLength; step++) {
                            currentRow += direction.row;
                            currentCol += direction.col;
                            pushIfValid(currentRow, currentCol);
                            if (positions.length >= maxCells) break;
                        }
                        if (positions.length >= maxCells) break;
                        if (directionIndex % 2 === 1) {
                            stepLength++;
                        }
                    }
                }

                return positions;
            };
            
            // Find all enemies in 5x5 area (2 squares in each direction)
            const enemiesInArea = [];
            enemies.forEach(enemy => {
                const enemyPos = characterPositions[enemy.id];
                if (!enemyPos) return;
                
                const rowDiff = Math.abs(enemyPos.row - row);
                const colDiff = Math.abs(enemyPos.col - col);
                
                // Within 2 squares in any direction (5x5 grid)
                if (rowDiff <= 2 && colDiff <= 2) {
                    affectedEnemies.push(enemy.name);
                    enemiesInArea.push({ enemy, enemyPos });
                }
            });

            effects.push({
                type: 'black_hole_zone',
                center: { row, col },
                radius: 2,
                duration: 2
            });

            // Remove affected enemies from occupied map so they can be reassigned into the spiral
            enemiesInArea.forEach(({ enemyPos }) => {
                occupied.delete(`${enemyPos.row},${enemyPos.col}`);
            });

            // Deterministic enemy ordering for tie-breaks
            const sortedTargets = enemiesInArea.sort((a, b) => {
                const distA = Math.abs(a.enemyPos.row - row) + Math.abs(a.enemyPos.col - col);
                const distB = Math.abs(b.enemyPos.row - row) + Math.abs(b.enemyPos.col - col);
                if (distA !== distB) return distB - distA;
                return a.enemy.id.localeCompare(b.enemy.id);
            });

            const spiralSlots = buildSpiralPositions(row, col).filter(pos => {
                const key = `${pos.row},${pos.col}`;
                return !occupied.has(key);
            });

            sortedTargets.forEach(({ enemy }, index) => {
                const destination = spiralSlots[index];
                if (!destination) return;

                const source = characterPositions?.[enemy.id] || null;
                console.log('[BLACK HOLE TELEPORT] Before teleport:', {
                    enemyId: enemy.id,
                    enemyName: enemy.name,
                    from: source,
                    to: destination
                });

                occupied.add(`${destination.row},${destination.col}`);
                effects.push({
                    type: 'status_effect',
                    target: enemy.id,
                    status: 'immobilized',
                    duration: 2,
                    preventMovement: true,
                    preventActions: false
                });

                if (characterPositions?.[enemy.id]) {
                    forcedMovement.push({
                        enemyId: enemy.id,
                        path: [destination],
                        to: destination
                    });
                }

                console.log('[BLACK HOLE TELEPORT] After teleport assignment:', {
                    enemyId: enemy.id,
                    enemyName: enemy.name,
                    finalTile: destination
                });
            });
            
            if (affectedEnemies.length === 0) {
                return {
                    success: false,
                    message: 'No enemies in target area!'
                };
            }
            
            return {
                success: true,
                effects: effects,
                forcedMovement,
                aoePosition: targetPosition,
                message: `${caster.name} creates a Black Hole! ${affectedEnemies.join(', ')} are teleported into the center spiral and immobilized for 2 turns!`
            };
        }
    },
    butterfly_effect: {
        id: 'butterfly_effect',
        name: 'Butterfly Effect',
        description: 'Add one turn of cooldown to enemies abilities',
        role: "Support",
        level: 3,
        cooldown: 2,
        targetType: 'all-enemies',
        type: 'debuff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Array} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, enemies }) => {
            const effects = [];
            const enemyNames = [];
            
            enemies.forEach(enemy => {
                enemyNames.push(enemy.name);
                effects.push({
                    type: 'cooldown_increase',
                    target: enemy.id,
                    value: 1,
                    duration: 0 // Instant effect
                });
            });
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Butterfly Effect! ${enemyNames.join(', ')} have increased ability cooldowns!`
            };
        }
    },
    calm_under_pressure: {
        id: 'calm_under_pressure',
        name: 'Calm Under Pressure',
        description: 'Heal yourself for 15 hp',
        role: "DPS",
        level: 3,
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
    charge: {
        id: 'charge',
        name: "Charge!",
        description: 'A move that completely takes down an enemy with a lower strength stat',
        role: "Tank",
        level: 5,
        cooldown: 3, 
        targetType: 'single-enemy',
        type: 'damage',
        range: 1,
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ultimate
         * @param {string} params.target - Target enemy ID
         * @param {Array} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }
            
            const casterStrength = caster.stats.strength;
            const damageResults = [];
            const messages = [];

            let damage = 0;
            
            if (enemy.stats.strength < casterStrength) {
                damage = enemy.stats.health;
                messages.push(`${enemy.name} is completely taken down!`);
            } else {
                messages.push(`${enemy.name} was too strong, charge failed!`);
            }

            damageResults.push({
                target: enemy.id,
                amount: damage
            });

            return {
                success: true,
                damage: damageResults,
                message: `${caster.name} unleashes Charge! ${messages.join(' ')}`
            };
        }
    },
    counter: {
        id: 'counter',
        name: 'Counter',
        description: 'Deflect all incoming damage back to attackers for 1 turn',
        role: "DPS",
        level: 5,
        cooldown: 3,
        targetType: 'self',
        type: 'buff',

        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [{
                    type: 'damage_reflection',
                    target: playerName,
                    duration: 1,
                    tickOnCastTurn: true
                }],
                message: `${caster.name} activates Counter! All incoming damage will be reflected for 1 turn!`
            };
        }
    },
    count_me_out: {
        id: 'count_me_out',
        name: 'Count me Out',
        description: 'Remove one turn of CD for one of your allies',
        role: "Support",
        level: 3,
        cooldown: 3,
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
            const ally = playerCharacters[target];
            
            if (!ally) {
                return { success: false, message: 'Target not found' };
            }
            
            return {
                success: true,
                effects: [{
                    type: 'cooldown_reduction',
                    target: target,
                    value: 1
                }],
                message: `${caster.name} uses Count me Out! ${ally.name}'s cooldowns reduced by 1 turn!`
            };
        }
    },
    cursed: {
        id: 'cursed',
        name: 'Cursed',
        description: 'Mark an enemy as cursed. Enemy takes extra 30% damage from all sources for 2 turns',
        role: "Tank",
        level: 3,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'debuff',
        range: 3,

        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.target - Enemy ID
         * @param {Array} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);

            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            return {
                success: true,
                effects: [{
                    type: 'damage_taken_multiplier',
                    target: enemy.id,
                    value: 1.3,
                    duration: 2,
                    stackable: false
                }],
                message: `${caster.name} curses ${enemy.name}! All incoming damage is amplified by 30% for 2 turns!`
            };
        }
    },
    dead_calm: {
        id: 'dead_calm',
        name: 'Dead Calm',
        description: 'Gain +50 Strength but your Speed becomes 0 for 1 turn',
        role: "DPS",
        isUltimate: true,
        cooldown: 15,
        targetType: 'self',
        type: 'buff',

        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'strength',
                        value: 50,
                        duration: 1,
                        stackable: false,
                        source: 'dead_calm',
                        ownerTurnId: playerName,
                        tickOnCastTurn: false
                    },
                    {
                        type: 'stat_debuff',
                        target: playerName,
                        stat: 'speed',
                        value: -(caster.stats.speed || 0),
                        duration: 1,
                        stackable: false,
                        source: 'dead_calm',
                        ownerTurnId: playerName,
                        tickOnCastTurn: false
                    }
                ],
                message: `${caster.name} activates Dead Calm! +50 Strength, but Speed drops to 0 for 1 turn!`
            };
        }
    },
    defensive_jab: {
        id: 'defensive_jab',
        name: 'Defensive Jab',
        description: 'A strike that deals light damage and lowers enemy resistance by 10 for 1 turn',
        role: "Tank",
        level: 1,
        cooldown: 1,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'strength',
        abilityDamage: 6,
        range: 1,

        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            const finalDamage = Math.max(1, Math.round(
                (caster.stats.strength / 10) * 6 - (enemy.stats.resistance / 10)
            ));

            return {
                success: true,
                damage: [{ target: enemy.id, amount: finalDamage }],
                effects: [{
                    type: 'stat_debuff',
                    target: enemy.id,
                    stat: 'resistance',
                    value: -10,
                    duration: 1,
                    stackable: false
                }],
                message: `${caster.name} uses Defensive Jab on ${enemy.name} for ${finalDamage} damage and lowers Resistance by 10!`
            };
        }
    },
    dedicating: {
        id: 'dedicating',
        name: 'Dedicating Everything to You',
        description: 'One ally gains +20 bonus in all stats for one turn',
        role: "Support",
        cooldown: 17,
        isUltimate: true,
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
            console.log('[DEDICATING] Execute params:', {
                casterName: caster?.name,
                target,
                playerCharacterKeys: Object.keys(playerCharacters || {})
            });
            
            const ally = playerCharacters[target];
            
            console.log('[DEDICATING] Ally lookup:', {
                target,
                allyFound: !!ally,
                allyName: ally?.name,
                allyStats: ally?.stats
            });
            
            if (!ally) {
                console.log('[DEDICATING] Target not found!');
                return { success: false, message: 'Target not found' };
            }

            const result = {
                success: true,
                effects: [
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'health',
                    value: 20,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'speed',
                    value: 20,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'strength',
                    value: 20,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'resistance',
                    value: 20,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'ta',
                    value: 20,
                    duration: 1,
                    stackable: false
                },
            ],
                message: `${caster.name} gave ${ally.name} +20 to all stats for 1 turn!`
            };
            
            console.log('[DEDICATING] Returning result with', result.effects.length, 'effects for', ally.name);
            return result;
        }
    },
    eagle_eye: {
        id: 'eagle_eye',
        name: 'Eagle Eye',
        description: 'See the health of all enemies for one turn',
        role: "Support",
        level: 5,
        cooldown: 2,
        targetType: 'self',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.playerName - Player using the ability
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [{
                    type: 'vision_enhanced',
                    target: playerName,
                    duration: 1
                }],
                message: `${caster.name} uses Eagle Eye! Enemy health visible for 1 turn!`
            };
        }
    },
    executioners_judgment: {
        id: 'executioners_judgment',
        name: "Executioner's Judgment",
        description: 'Enemies with lower Max Health lose half their HP, enemies with higher Max Health than you lose 20% of their current health',
        role: "Tank",
        cooldown: 18, 
        isUltimate: true,
        targetType: 'all-enemies',
        type: 'damage',
        
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
    emp: {
        id: 'emp',
        name: 'EMP',
        description: 'Remove all abilities from enemies for two turn',
        role: "Support",
        isUltimate: true,
        cooldown: 16,
        targetType: 'all-enemies',
        type: 'debuff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Array} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, enemies }) => {
            const effects = [];
            const enemyNames = [];
            
            enemies.forEach(enemy => {
                enemyNames.push(enemy.name);
                effects.push({
                    type: 'abilities_disabled',
                    target: enemy.id,
                    duration: 2
                });
            });
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses EMP! ${enemyNames.join(', ')} cannot use abilities for 1 turn!`
            };
        }
    },
    feels_like_home: {
        id: 'feels_like_home',
        name: 'Feels Like Home',
        description: 'Place a healing field that heals allies for two turns',
        role: "Support",
        level: 1,
        cooldown: 3,
        targetType: 'ground-target',
        type: 'heal',
        range: 3,
        aoeSize: 3, // 3x3 area
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square
         * @param {Object} params.playerCharacters - All player characters
         * @param {Object} params.characterPositions - Positions of all characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, playerCharacters, characterPositions }) => {
            const { row, col } = targetPosition;
            const effects = [];
            const allyNames = [];

            effects.push({
                type: 'healing_field',
                center: { row, col },
                radius: 1,
                duration: 2,
                tickOnCastTurn: true
            });

             const finalHealing = Math.max(1, Math.round(
                (caster.stats.ta / 8)
            ));
            
            // Find all allies in 3x3 area
            Object.keys(playerCharacters).forEach(playerName => {
                const ally = playerCharacters[playerName];
                const allyPos = characterPositions[playerName] || characterPositions[ally?.name];
                if (!allyPos) return;
                
                const rowDiff = Math.abs(allyPos.row - row);
                const colDiff = Math.abs(allyPos.col - col);
                
                // Within 1 square in any direction (3x3 grid)
                if (rowDiff <= 1 && colDiff <= 1) {
                    allyNames.push(ally.name);
                    
                    // Add healing effect for 2 turns
                    effects.push({
                        type: 'healing_over_time',
                        target: playerName,
                        amount: finalHealing,
                        duration: 2,
                        tickOnCastTurn: true
                    });
                }
            });
            
            const healingMessage = allyNames.length > 0
                ? `${allyNames.join(', ')} will heal +${finalHealing} HP for 2 turns!`
                : 'No allies are currently in the field.';

            return {
                success: true,
                effects: effects,
                aoePosition: targetPosition,
                message: `${caster.name} places a healing field! ${healingMessage}`
            };
        }
    },
    flood_of_frost: {
        id: 'flood_of_frost',
        name: 'Flood of Frost',
        description: 'A spell that freezes an enemy, cutting their speed in half for 2 turns and does frost damage',
        role: "DPS",
        level: 3,
        cooldown: 2,
        targetType: 'single-enemy', 
        damageType: 'technical',
        damageScaling: 'ta', 
        abilityDamage: 10,
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
    flash_step: {
        id: 'flash_step',
        name: 'Flash Step',
        description: 'Double your speed for one turn',
        role: "DPS",
        level: 3,
        cooldown: 3,
        targetType: 'self',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {string} params.playerName - The player's name/ID
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName }) => {
            const speedBonus = caster.stats.speed; // Double speed = add current speed as bonus
            
            return {
                success: true,
                effects: [{
                    type: 'stat_buff',
                    target: playerName,
                    stat: 'speed',
                    value: speedBonus,
                    duration: 1
                }],
                message: `${caster.name} uses Flash Step! Speed doubled for 1 turn!`
            };
        }
    },
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        description: 'A move that does AOE damage with 20% chance to burn',
        role: "DPS",
        level: 5,
        cooldown: 1,
        targetType: 'ground-target',
        type: 'damage',
        damageType: 'technical',
        damageScaling: 'ta',
        abilityDamage: 15,
        range: 3,
        aoeSize: 3, // 3x3 area
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square
         * @param {Array} params.enemies - All enemies
         * @param {Object} params.characterPositions - Positions of all characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, enemies, characterPositions }) => {
            const { row, col } = targetPosition;
            
            // Find all enemies in 3x3 area
            const affectedEnemies = enemies.filter(enemy => {
                const enemyPos = characterPositions[enemy.id];
                if (!enemyPos) return false;
                
                const rowDiff = Math.abs(enemyPos.row - row);
                const colDiff = Math.abs(enemyPos.col - col);
                
                // Within 1 square in any direction (3x3 grid)
                return rowDiff <= 1 && colDiff <= 1;
            });
            
            if (affectedEnemies.length === 0) {
                return {
                    success: false,
                    message: 'No enemies in target area!'
                };
            }
            
            // Calculate total damage and divide equally
            const totalDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 10  - (affectedEnemies.reduce((maxRes, enemy) => Math.max(maxRes, enemy.stats.resistance), 0) / 10)
            ));
            const damagePerEnemy = Math.floor(totalDamage / affectedEnemies.length);
            
            const damageResults = [];
            const effects = [
                {
                    type: 'fireball_zone',
                    center: { row, col },
                    radius: 1,
                    duration: 1,
                    tickOnCastTurn: true
                }
            ];
            
            affectedEnemies.forEach(enemy => {
                // Apply damage
                damageResults.push({
                    target: enemy.id,
                    amount: damagePerEnemy
                });
                
                // 20% chance to apply burn
                if (Math.random() < 0.2) {
                    effects.push({
                        type: 'burn',
                        target: enemy.id,
                        duration: 1,
                        damagePercent: 0.10 // 10% of current health
                    });
                }
            });
            
            const burnedEnemies = effects.filter(e => e.type === 'burn');
            const burnMessage = burnedEnemies.length > 0 
                ? ` ${burnedEnemies.length} enemies are burning!` 
                : '';
            
            return {
                success: true,
                damage: damageResults,
                effects: effects,
                aoePosition: targetPosition,
                message: `${caster.name} casts Fireball! ${affectedEnemies.length} enemies hit for ${damagePerEnemy} damage each!${burnMessage}`
            };
        }
    },
    greater_ability_boost: {
        id: 'greater_ability_boost',
        name: 'Greater Ability Boost',
        description: 'Grants yourself +15 Speed, +15 Bonus Health, and +10 Strength for 2 turns',
        role: "Tank",
        level: 5,
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
                        value: 15,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'health',
                        value: 15,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'strength',
                        value: 10,
                        duration: 2,
                        stackable: false
                    }
                ],
                message: `${caster.name} gains +15 Speed, +10 Strength, and +15 Health for 2 turns!`
            };
            return result;
        }
    },
    guarded_breath: {
        id: 'guarded_breath',
        name: 'Guarded Breath',
        description: 'Guard one ally, doubling their resistance for one turn',
        role: "Tank",
        level: 1,
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
            console.log('[GUARDED BREATH] Execute params:', {
                casterName: caster?.name,
                target,
                playerCharacterKeys: Object.keys(playerCharacters || {})
            });
            
            const ally = playerCharacters[target];

            
            if (!ally) {
                console.log('[GUARDED BREATH] Target not found!');
                return { success: false, message: 'Target not found' };
            }

            const result = {
                success: true,
                effects: [
                {
                    type: 'stat_buff',
                    target: target,
                    source: 'guarded_breath',
                    stat: 'resistance',
                    value: ally.stats.resistance, 
                    duration: 1,
                    stackable: false
                }],
                message: `${caster.name} gave ${ally.name} doubled resistance for 1 turn!`
            };
            
            console.log('[GUARDED BREATH] Returning result:', result);
            return result;
            }
    },
    gtg: {
        id: 'gtg',
        name: 'G.T.G.',
        description: 'Deploy a Grid-Transportation-Gate that teleports an ally or enemy to a vacant location on the battlefield',
        role: 'Tank',
        level: 5,
        cooldown: 6,
        targetType: 'relocate',
        type: 'utility',
        range: 1,

        execute: ({ caster, playerName, target, targetPosition, playerCharacters, enemies, characterPositions }) => {
            const casterPos = characterPositions?.[playerName];
            const targetPos = characterPositions?.[target];

            if (!casterPos || !targetPos || !targetPosition) {
                return { success: false, message: 'Missing target or destination' };
            }

            const targetEnemy = enemies?.find(enemy => enemy.id === target && !enemy.isDeadBody && (enemy.stats?.health || 0) > 0);
            const targetAlly = playerCharacters?.[target];
            const targetName = targetEnemy?.name || targetAlly?.name;

            if (!targetName) {
                return { success: false, message: 'Target not found' };
            }

            const distanceToTarget = Math.abs(casterPos.row - targetPos.row) + Math.abs(casterPos.col - targetPos.col);
            if (distanceToTarget > 2) {
                return { success: false, message: 'Target is out of range' };
            }

            const isSameTile = targetPosition.row === targetPos.row && targetPosition.col === targetPos.col;
            if (isSameTile) {
                return { success: false, message: 'Choose a different destination tile' };
            }

            const isOccupied = Object.entries(characterPositions || {}).some(([id, pos]) => {
                if (id === target) return false;
                return pos.row === targetPosition.row && pos.col === targetPosition.col;
            });

            if (isOccupied) {
                return { success: false, message: 'Destination tile is occupied' };
            }

            return {
                success: true,
                effects: [
                    {
                        type: 'gtg_origin_marker',
                        target,
                        cell: { row: targetPos.row, col: targetPos.col },
                        duration: 1
                    },
                    {
                        type: 'gtg_target_marker',
                        target,
                        duration: 1
                    }
                ],
                forcedMovement: [
                    {
                        enemyId: target,
                        path: [targetPosition],
                        to: targetPosition
                    }
                ],
                message: `${caster.name} uses G.T.G.! ${targetName} is teleported.`
            };
        }
    },
    humble: {
        id: 'humble',
        name: 'Humble',
        description: 'Grants yourself +10 ta for 2 turns',
        role: "Support",
        level: 1,
        cooldown: 1,
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
                        stat: 'ta',
                        value: 10,
                        duration: 2,
                        stackable: false
                    }
                ],
                message: `${caster.name} gains +10 TA for 2 turns!`
            };
            return result;
        }
    },
    here_we_go_again: {
        id: 'here_we_go_again',
        name: 'Here We Go Again',
        description: 'Reset all allies cooldowns',
        role: "Support",
        level: 5,
        cooldown: 5,
        targetType: 'all-allies',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerCharacters, playerName }) => {
            const effects = [];
            const allyNames = [];
            
            // Create cooldown reset effects for all allies
            Object.keys(playerCharacters).forEach(allyPlayerName => {
                if (allyPlayerName === playerName) return;

                allyNames.push(playerCharacters[allyPlayerName].name);
                effects.push({
                    type: 'cooldown_reset',
                    target: allyPlayerName,
                    excludeAbilityIds: ['here_we_go_again'],
                    duration: 0 // Instant effect
                });
            });

            if (effects.length === 0) {
                return {
                    success: false,
                    message: 'No allies available to reset cooldowns.'
                };
            }
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Here We Go Again! Ability cooldowns reset for ${allyNames.join(', ')}.`
            };
        }
    },
    hurry_up: {
        id: 'hurry_up',
        name: 'Hurry Up!',
        description: 'Add +10 speed to one ally for 1 turn',
        role: "Support",
        level: 1,
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
    iron_sharpens_iron: {
        id: 'iron_sharpens_iron',
        name: 'Iron Sharpens Iron',
        description: 'DPS in your party receive +10 Strength for 2 turns',
        role: "Support",
        level: 1,
        cooldown: 3,
        targetType: 'all-allies',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerCharacters }) => {
            const effects = [];
            const DPSNames = [];
            
            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                if (character.role === 'DPS') {
                    DPSNames.push(character.name);
                    effects.push({
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'strength',
                        value: 10,
                        duration: 2
                    });
                }
            });
            
            if (DPSNames.length === 0) {
                return {
                    success: false,
                    message: 'No DPS in party to buff!'
                };
            }
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Iron Sharpens Iron! ${DPSNames.join(', ')} gain +10 Strength for 2 turns!`
            };
        }
    },
    love: {
        id: 'love',
        name: 'Love',
        description: 'Heal all allies for a moderate amount',
        role: "Support",
        level: 3,
        cooldown: 2,
        targetType: 'all-allies',
        type: 'heal',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        
        execute: ({ caster, playerCharacters }) => {
            const healing = [];
            const allyNames = [];
            const finalHealing = Math.max(1, Math.round(
                (caster.stats.ta / 5)
            ));

            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                allyNames.push(character.name);
                
                healing.push({
                    target: playerName,
                    amount: finalHealing
                });
            });

            return {
                success: true,
                healing: healing,
                message: `${caster.name} casts Love! ${allyNames.join(', ')} are healed for ${finalHealing} HP!`
            };
        }
    },
    love_galore: {
        id: 'love_galore',
        name: "Love Galore",
        description: 'All party members restore 50% hp',
        role: "Support",
        cooldown: 17, 
        isUltimate: true,
        targetType: 'all-allies',
        type: 'heal',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ultimate
         * @param {Object} params.playerCharacters - All player characters (keyed by playerName)
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerCharacters }) => {
            const healing = [];
            const allyNames = [];

            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                allyNames.push(character.name);
                
                const healAmount = Math.floor(character.stats.maxHealth * 0.5);
                healing.push({
                    target: playerName,
                    amount: healAmount
                });
            });

            return {
                success: true,
                healing: healing,
                message: `${caster.name} casts Love Galore! ${allyNames.join(', ')} are healed for 50% HP!`
            };
        }
    },
    murus_fictilis: {
        id: 'murus_fictilis',
        name: "Murus Fictilis",
        description: 'Grants all members of the party +35 Bonus Health and +30 Res for 2 turns',
        role: "Tank",
        cooldown: 18, 
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
                    value: 35,
                    duration: 2,
                    stackable: false
                });
                
                effects.push({
                    type: 'stat_buff',
                    target: playerName,
                    stat: 'resistance',
                    value: 30,
                    duration: 2,
                    stackable: false
                });
            });

            return {
                success: true,
                effects: effects,
                message: `${caster.name} casts Murus Fictilis! ${allyNames.join(', ')} gain +25 Health and +20 Resistance for 2 turns!`
            };
        }
    },
    no_limits: {
        id: 'no_limits',
        name: 'No Limits',
        description: 'Allows you to use your weapon 3 times in one turn',
        role: "DPS",
        cooldown: 15,
        isUltimate: true,
        targetType: 'self',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.playerName - Player using the ability
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [{
                    type: 'extra_weapon_attacks',
                    target: playerName,
                    value: 3, // Can attack 3 times total
                    duration: 1 // Lasts this turn only
                }],
                message: `${caster.name} activates No Limits! Can use weapon 3 times this turn!`
            };
        }
    },
    poison_apple: {
        id: 'poison_apple',
        name: 'Poison Apple',
        description: 'A spell that prevents an enemy from receiving healing and poisons them for 3 turns',
        role: "DPS",
        level: 5,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'debuff',
        range: 3,
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - The character using the ability
         * @param {string} params.target - The enemy ID being targeted
         * @param {Array} params.enemies - All enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }
            
            return {
                success: true,
                effects: [
                    {
                        type: 'healing_prevented',
                        target: target,
                        duration: 3
                    },
                    {
                        type: 'poison',
                        target: target,
                        duration: 3,
                        damagePercent: 0.05,
                        tickOnCastTurn: false
                    }
                ],
                message: `${caster.name} casts Poison Apple on ${enemy.name}! Healing prevented and poisoned for 3 turns!`
            };
        }
    },
    quick_jab: {
        id: 'quick_jab',
        name: 'Quick Jab',
        description: 'A fast beginner strike that deals light physical damage and reduces enemy strength for 1 turn',
        role: "DPS",
        level: 1,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'strength',
        abilityDamage: 8,
        range: 1,

        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            const finalDamage = Math.max(1, Math.round(
                (caster.stats.strength / 10) * 8 - (enemy.stats.resistance / 10)
            ));

            // Halve enemy's strength for 1 turn
            const strengthDebuff = -(Math.floor(enemy.stats.strength * 0.25));

            return {
                success: true,
                damage: [{
                    target: enemy.id,
                    amount: finalDamage
                }],
                effects: [{
                    type: 'stat_debuff',
                    target: enemy.id,
                    stat: 'strength',
                    value: strengthDebuff,
                    duration: 1,
                    stackable: false
                }],
                message: `${caster.name} lands a Quick Jab on ${enemy.name} for ${finalDamage} damage and weakens their strength!`
            };
        }
    },
    rallying_guard: {
        id: 'rallying_guard',
        name: 'Rallying Guard',
        description: 'Gain +5 Speed and +15 Resistance for 1 turn',
        role: "Tank",
        level: 1,
        cooldown: 2,
        targetType: 'self',
        type: 'buff',

        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'speed',
                        value: 5,
                        duration: 1,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'resistance',
                        value: 15,
                        duration: 1,
                        stackable: false
                    }
                ],
                message: `${caster.name} uses Rallying Guard and gains +5 Speed and +15 Resistance for 1 turn!`
            };
        }
    },
    selfish_sacrifice: {
        id: 'selfish_sacrifice',
        name: 'Selfish Sacrifice',
        description: 'Drain your ta and transfer it elsewhere, giving you -10ta but +10 Spd and +5 Str for two turns',
        role: "DPS",
        level: 1,
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
                        stat: 'ta',
                        value: -10,
                        duration: 2,
                        stackable: false
                    },
                    {
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'speed',
                        value: 10,
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
                message: `${caster.name} gains -10 TA but +10 Speed and +5 Strength for 2 turns!`
            };
        }
    },
    sparkshot: {
        id: 'sparkshot',
        name: 'Sparkshot',
        description: 'Fire a weak technical blast that can briefly reduce enemy Speed',
        role: "DPS",
        level: 1,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'technical',
        damageScaling: 'ta',
        abilityDamage: 7,
        range: 3,

        execute: ({ caster, target, enemies }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            const finalDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 7 - (enemy.stats.resistance / 10)
            ));

            const effects = [];
            if (Math.random() < 0.35) {
                effects.push({
                    type: 'stat_debuff',
                    target: enemy.id,
                    stat: 'speed',
                    value: -10,
                    duration: 1,
                    stackable: false
                });
            }

            const slowText = effects.length > 0 ? ' Their speed is reduced!' : '';

            return {
                success: true,
                damage: [{ target: enemy.id, amount: finalDamage }],
                effects,
                message: `${caster.name} blasts ${enemy.name} with Sparkshot for ${finalDamage} damage!${slowText}`
            };
        }
    },
    stonewall: {
        id: 'stonewall',
        name: 'Stonewall',
        description: 'Grant adjacent allies +15 bonus health for 2 turns',
        role: "Tank",
        level: 5,
        cooldown: 2,
        targetType: 'all-allies',
        type: 'buff',
        aoeSize: 3, // 3x3 area centered on caster

        execute: ({ caster, playerName, playerCharacters, characterPositions }) => {
            const casterPosition = characterPositions?.[playerName];

            if (!casterPosition) {
                return { success: false, message: 'Caster position not found' };
            }

            const effects = [];
            const protectedAllies = [];

            Object.entries(playerCharacters || {}).forEach(([allyPlayerName, allyCharacter]) => {
                if (allyPlayerName === playerName) return;

                const allyPosition = characterPositions?.[allyPlayerName];
                if (!allyPosition) return;

                const rowDiff = Math.abs(allyPosition.row - casterPosition.row);
                const colDiff = Math.abs(allyPosition.col - casterPosition.col);
                const isInAdjacentArea = rowDiff <= 1 && colDiff <= 1;

                if (!isInAdjacentArea) return;

                protectedAllies.push(allyCharacter.name);
                effects.push({
                    type: 'stat_buff',
                    target: allyPlayerName,
                    stat: 'health',
                    value: 15,
                    duration: 2,
                    stackable: false
                });
            });

            if (effects.length === 0) {
                return {
                    success: false,
                    message: 'No adjacent allies to protect.'
                };
            }

            return {
                success: true,
                effects,
                message: `${caster.name} uses Stonewall! ${protectedAllies.join(', ')} gain +15 bonus health for 2 turns!`
            };
        }
    },
    shadow_strike: {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        description: 'A devastating strike that deals damage to a single enemy',
        role: "DPS",
        level: 1,
        cooldown: 1,
        targetType: 'single-enemy',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'strength', 
        abilityDamage: 15, 
        range: 1,
        
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
    shield_up: {
        id: 'shield_up',
        name: 'Shield Up',
        description: 'Set your Speed to 0, but negate all incoming damage for 1 turn',
        role: "Tank",
        level: 3,
        cooldown: 2,
        targetType: 'self',
        type: 'buff',

        execute: ({ caster, playerName }) => {
            return {
                success: true,
                effects: [
                    {
                        type: 'stat_debuff',
                        target: playerName,
                        stat: 'speed',
                        value: -(caster.stats.speed || 0),
                        duration: 1,
                        stackable: false
                    },
                    {
                        type: 'damage_immunity',
                        target: playerName,
                        duration: 1,
                        stackable: false
                    }
                ],
                message: `${caster.name} put up a shield, negating all damage but setting speed to 0 for 1 turn!`
            };
        }
    },
    the_show_must_go_on: {
        id: 'the_show_must_go_on',
        name: 'The Show Must Go On',
        description: 'Heal one ally',
        role: "Support",
        level: 1,
        cooldown: 2,
        targetType: 'ally',
        type: 'heal',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {string} params.target - Ally player name/ID
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, target, playerCharacters }) => {
            const ally = playerCharacters[target];
            
            if (!ally) {
                return { success: false, message: 'Target not found' };
            }

            const finalHealing = Math.max(1, Math.round(
                (caster.stats.ta / 5)
            ));

            return {
                success: true,
                healing: [{
                    target: target,
                    amount: finalHealing
                }],
                message: `${caster.name} casts The Show Must Go On! ${ally.name} is healed for 10 HP!`
            };
        }
    },
    toxic_mist: {
        id: 'toxic_mist',
        name: 'Toxic Mist',
        description: 'Place a toxic field that deals damage to enemies inside it for 2 turns',
        role: "Tank",
        level: 3,
        cooldown: 2,
        targetType: 'ground-target',
        type: 'damage',
        range: 3,
        aoeSize: 3,

        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square
         * @param {Array} params.enemies - Enemy list for the caster's perspective
         * @param {Object} params.characterPositions - Positions of all characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, enemies, characterPositions }) => {
            const { row, col } = targetPosition;
            const effects = [];
            const affectedNames = [];
            const totalDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 10  - (enemies.reduce((maxRes, enemy) => Math.max(maxRes, enemy.stats.resistance), 0) / 10)
            ));

            effects.push({
                type: 'toxic_mist_field',
                center: { row, col },
                radius: 1,
                duration: 2,
                amount: totalDamage
            });

            enemies.forEach(enemy => {
                const enemyPos = characterPositions?.[enemy.id];
                if (!enemyPos) return;

                const rowDiff = Math.abs(enemyPos.row - row);
                const colDiff = Math.abs(enemyPos.col - col);

                if (rowDiff <= 1 && colDiff <= 1) {
                    affectedNames.push(enemy.name);
                    effects.push({
                        type: 'damage_over_time',
                        target: enemy.id,
                        amount: totalDamage,
                        duration: 2,
                        source: 'toxic_mist_field'
                    });
                }
            });

            const damageMessage = affectedNames.length > 0
                ? `${affectedNames.join(', ')} will take ${totalDamage} damage for 2 turns!`
                : 'No enemies are currently in the toxic field.';

            return {
                success: true,
                effects,
                aoePosition: targetPosition,
                message: `${caster.name} releases Toxic Mist! ${damageMessage}`
            };
        }
    },
    vine_whip: {
        id: 'vine_whip',
        name: 'Vine Whip',
        description: 'Deal AOE damage to enemies in front of you and to the sides',
        role: "DPS",
        level: 1,
        cooldown: 1,
        targetType: 'ground-target',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'ta',
        abilityDamage: 8, 
        range: 2,
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.targetPosition - {row, col} of clicked square (front square)
         * @param {Array} params.enemies - All enemies
         * @param {Object} params.characterPositions - Positions of all characters
         * @param {string} params.playerName - Player using the ability
         * @returns {Object} Effect data
         */
        execute: ({ caster, targetPosition, enemies, characterPositions, playerName }) => {
            const { row, col } = targetPosition;
            const casterPos = characterPositions[playerName];
            
            if (!casterPos) {
                return { success: false, message: 'Caster position not found' };
            }
            
            // Calculate direction from caster to target
            const rowDiff = Math.abs(row - casterPos.row);
            const colDiff = Math.abs(col - casterPos.col);
            
            // Determine if attack is more horizontal or vertical
            // If horizontal (left/right attack), slash vertically (up/down)
            // If vertical (up/down attack), slash horizontally (left/right)
            const affectedSquares = [];
            
            if (colDiff > rowDiff) {
                // Attacking horizontally (left/right), so slash vertically
                affectedSquares.push(
                    { row, col },           // Target square
                    { row: row - 1, col },  // Above
                    { row: row + 1, col }   // Below
                );
            } else {
                // Attacking vertically (up/down), so slash horizontally
                affectedSquares.push(
                    { row, col },           // Target square
                    { row, col: col - 1 },  // Left
                    { row, col: col + 1 }   // Right
                );
            }
            
            // Find all enemies in affected squares
            const affectedEnemies = enemies.filter(enemy => {
                const enemyPos = characterPositions[enemy.id];
                if (!enemyPos) return false;
                
                return affectedSquares.some(square => 
                    square.row === enemyPos.row && square.col === enemyPos.col
                );
            });
            
            if (affectedEnemies.length === 0) {
                return {
                    success: false,
                    message: 'No enemies in target area!'
                };
            }
            
            // Calculate total damage (1.25x) and divide equally
            const baseDamage = Math.max(1, Math.round(
                (caster.stats.ta / 10) * 8 - (Math.max(...affectedEnemies.map(e => e.stats.resistance)) / 10)
            ));
            const damagePerEnemy = Math.floor(baseDamage / affectedEnemies.length);
            
            const damageResults = affectedEnemies.map(enemy => ({
                target: enemy.id,
                amount: damagePerEnemy
            }));
            
            return {
                success: true,
                damage: damageResults,
                aoePosition: targetPosition,
                message: `${caster.name} whips with their vine! ${affectedEnemies.length} enemies hit for ${damagePerEnemy} damage each!`
            };
        }
    },
    white_phospherus: {
        id: 'white_phospherus',
        name: 'White Phospherus',
        description: 'Burns all enemies for 15 damage per turn over 5 turns',
        role: "Tank",
        cooldown: 16,
        isUltimate: true,
        targetType: 'all-enemies',
        type: 'damage',

        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ultimate
         * @param {Array} params.enemies - All current enemies
         * @returns {Object} Effect data
         */
        execute: ({ caster, enemies }) => {
            const effects = [];
            const affectedNames = [];

            enemies.forEach(enemy => {
                if (enemy.isDefeated) return;

                affectedNames.push(enemy.name);
                effects.push({
                    type: 'damage_over_time',
                    target: enemy.id,
                    amount: 15,
                    duration: 5,
                    source: 'white_phospherus'
                });
            });

            return {
                success: true,
                effects,
                message: `${caster.name} unleashes White Phospherus! ${affectedNames.join(', ')} will take 15 damage for 5 turns!`
            };
        }
    },
    way_too_close: {
        id: 'way_too_close',
        name: 'Way Too Close!',
        description: 'Push a nearby enemy away and place a barrier between you for 2 turns',
        role: "Tank",
        level: 1,
        cooldown: 4,
        targetType: 'single-enemy',
        type: 'debuff',
        range: 1,

        execute: ({ caster, playerName, target, enemies, characterPositions }) => {
            const enemy = enemies.find(e => e.id === target);
            if (!enemy) {
                return { success: false, message: 'Target not found' };
            }

            const casterPos = characterPositions?.[playerName];
            const targetPos = characterPositions?.[target];
            if (!casterPos || !targetPos) {
                return { success: false, message: 'Target position unavailable' };
            }

            const currentDistance = Math.abs(targetPos.row - casterPos.row) + Math.abs(targetPos.col - casterPos.col);
            if (currentDistance > 1) {
                return { success: false, message: 'Target is out of range' };
            }

            if (currentDistance !== 1) {
                return { success: false, message: 'Way Too Close requires an adjacent target' };
            }

            const occupied = new Set(
                Object.entries(characterPositions || {})
                    .filter(([id]) => id !== target)
                    .map(([, pos]) => `${pos.row},${pos.col}`)
            );

            const inBounds = (row, col) => row >= 0 && row < 7 && col >= 0 && col < 10;
            const pushDelta = {
                row: targetPos.row - casterPos.row,
                col: targetPos.col - casterPos.col
            };

            const destination = {
                row: targetPos.row + pushDelta.row,
                col: targetPos.col + pushDelta.col
            };

            if (!inBounds(destination.row, destination.col)) {
                return { success: false, message: `${enemy.name} cannot be pushed further in that direction.` };
            }

            if (occupied.has(`${destination.row},${destination.col}`)) {
                return { success: false, message: `${enemy.name} has no space to be pushed.` };
            }

            return {
                success: true,
                forcedMovement: [
                    {
                        enemyId: target,
                        path: [destination],
                        to: destination
                    }
                ],
                effects: [
                    {
                        type: 'blue_barrier',
                        cell: { row: targetPos.row, col: targetPos.col },
                        duration: 2
                    }
                ],
                message: `${caster.name} uses Way Too Close! ${enemy.name} is pushed back and a barrier forms between you.`
            };
        }
    },
    zen: {
        id: 'zen',
        name: 'Zen',
        description: 'All supports heal 25% and receive +10 ta for one turn',
        role: "Support",
        level: 3,
        cooldown: 2,
        targetType: 'all-allies',
        type: 'buff',
        
        /**
         * @param {Object} params
         * @param {Object} params.caster - Character using ability
         * @param {Object} params.playerCharacters - All player characters
         * @returns {Object} Effect data
         */
        execute: ({ caster, playerCharacters }) => {
            const effects = [];
            const supportNames = [];
            
            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                if (character.role === 'Support') {
                    supportNames.push(character.name);
                    effects.push({
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'ta',
                        value: 10,
                        duration: 1
                    });
                    effects.push({
                        type: 'heal',
                        target: playerName,
                        amount: Math.round(character.stats.health * 0.25),
                        duration: 1
                    });
                }
            });
            
            if (supportNames.length === 0) {
                return {
                    success: false,
                    message: 'No support in party to buff!'
                };
            }
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Zen! ${supportNames.join(', ')} heal 25% and gain +10 Technical Ability for 1 turn!`
            };
        }
    }
};
