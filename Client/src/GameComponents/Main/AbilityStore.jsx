export const ABILITIES = {
    ability_boost: {
        id: 'ability_boost',
        name: 'Ability Boost',
        description: 'Grants yourself +5 Speed and +5 Bonus Health for 2 turns',
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
        role: "Tank",
        level: 3,
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
    battery_drain: {
        id: 'battery_drain',
        name: 'Battery Drain',
        description: 'Drain energy from an enemy. 25% of damage dealt heals the weakest ally',
        role: "Support",
        level: 1,
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
                    message: `${caster.name} uses Blackjack on ${ally.name}... but it fails! (${successChance.toFixed(0)}% chance)`
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
                message: `${caster.name} uses Blackjack on ${ally.name}! Restored ${healAmount} HP! (${successChance.toFixed(0)}% chance)`
            };
        }
    },
    black_hole: {
        id: 'black_hole',
        name: 'Black Hole',
        description: 'Click on a square, all enemies in a 5x5 area are sucked in and cannot move for 2 turns',
        role: "DPS",
        cooldown: 0,
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
                    effects.push({
                        type: 'status_effect',
                        target: enemy.id,
                        status: 'black_hole_pull',
                        center: { row, col },
                        duration: 2,
                        preventMovement: false,
                        preventActions: false
                    });
                }
            });

            effects.push({
                type: 'black_hole_zone',
                center: { row, col },
                radius: 2,
                duration: 2
            });

            // Pull enemies toward center, up to 2 cells, without passing through occupied cells
            const sortedTargets = enemiesInArea.sort((a, b) => {
                const distA = Math.abs(a.enemyPos.row - row) + Math.abs(a.enemyPos.col - col);
                const distB = Math.abs(b.enemyPos.row - row) + Math.abs(b.enemyPos.col - col);
                return distB - distA;
            });

            sortedTargets.forEach(({ enemy, enemyPos }) => {
                let current = { ...enemyPos };
                const path = [];
                occupied.delete(`${enemyPos.row},${enemyPos.col}`);

                for (let step = 0; step < 2; step++) {
                    const currentDistance = Math.abs(current.row - row) + Math.abs(current.col - col);
                    if (currentDistance === 0) break;

                    const candidateMoves = [
                        { row: current.row - 1, col: current.col },
                        { row: current.row + 1, col: current.col },
                        { row: current.row, col: current.col - 1 },
                        { row: current.row, col: current.col + 1 }
                    ].filter(next => {
                        if (!withinBounds(next.row, next.col)) return false;
                        const key = `${next.row},${next.col}`;
                        if (occupied.has(key)) return false;
                        const nextDistance = Math.abs(next.row - row) + Math.abs(next.col - col);
                        return nextDistance < currentDistance;
                    });

                    if (candidateMoves.length === 0) break;

                    candidateMoves.sort((first, second) => {
                        const firstDistance = Math.abs(first.row - row) + Math.abs(first.col - col);
                        const secondDistance = Math.abs(second.row - row) + Math.abs(second.col - col);
                        if (firstDistance !== secondDistance) return firstDistance - secondDistance;
                        const firstRowDelta = Math.abs(first.row - row);
                        const secondRowDelta = Math.abs(second.row - row);
                        if (firstRowDelta !== secondRowDelta) return firstRowDelta - secondRowDelta;
                        return Math.abs(first.col - col) - Math.abs(second.col - col);
                    });

                    const nextCell = candidateMoves[0];
                    path.push(nextCell);
                    current = nextCell;
                }

                occupied.add(`${current.row},${current.col}`);

                if (path.length > 0) {
                    forcedMovement.push({
                        enemyId: enemy.id,
                        path,
                        to: current
                    });
                }
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
                message: `${caster.name} creates a Black Hole! ${affectedEnemies.join(', ')} are pulled inward and cannot move for 2 turns!`
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
        damageScaling: 'none', 
        
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
    dedicating: {
        id: 'dedicating',
        name: 'Dedicating Everything to You',
        description: 'One ally gains +15 bonus in all stats for one turn',
        role: "Support",
        cooldown: 0,
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
                    value: 15,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'speed',
                    value: 15,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'strength',
                    value: 15,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'resistance',
                    value: 15,
                    duration: 1,
                    stackable: false
                },
                {
                    type: 'stat_buff',
                    target: target,
                    stat: 'ta',
                    value: 15,
                    duration: 1,
                    stackable: false
                },
            ],
                message: `${caster.name} gave ${ally.name} +15 to all stats for 1 turn!`
            };
            
            console.log('[DEDICATING] Returning result with', result.effects.length, 'effects for', ally.name);
            return result;
        }
    },
    diamond_body: {
        id: 'diamond_body',
        name: 'Diamond Body',
        description: 'Tanks in your party receive +5 resistance for 1 turn',
        role: "Support",
        level: 1,
        cooldown: 1,
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
            const tankNames = [];
            
            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                if (character.role === 'Tank') {
                    tankNames.push(character.name);
                    effects.push({
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'resistance',
                        value: 5,
                        duration: 1
                    });
                }
            });
            
            if (tankNames.length === 0) {
                return {
                    success: false,
                    message: 'No tanks in party to buff!'
                };
            }
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Diamond Boy! ${tankNames.join(', ')} gain +5 Resistance for 1 turn!`
            };
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
    emp: {
        id: 'emp',
        name: 'EMP',
        description: 'Remove all abilities from enemies for two turn',
        role: "Support",
        isUltimate: true,
        cooldown: 4,
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
        description: 'Place a healing field that heals allies +10 for two turns',
        role: "Support",
        level: 1,
        cooldown: 2,
        targetType: 'ground-target',
        type: 'heal',
        range: 5,
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
                duration: 2
            });
            
            // Find all allies in 3x3 area
            Object.keys(playerCharacters).forEach(playerName => {
                const allyPos = characterPositions[playerName];
                if (!allyPos) return;
                
                const rowDiff = Math.abs(allyPos.row - row);
                const colDiff = Math.abs(allyPos.col - col);
                
                // Within 1 square in any direction (3x3 grid)
                if (rowDiff <= 1 && colDiff <= 1) {
                    const ally = playerCharacters[playerName];
                    allyNames.push(ally.name);
                    
                    // Add healing effect for 2 turns
                    effects.push({
                        type: 'healing_over_time',
                        target: playerName,
                        amount: 10,
                        duration: 2
                    });
                }
            });
            
            const healingMessage = allyNames.length > 0
                ? `${allyNames.join(', ')} will heal +10 HP for 2 turns!`
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
        description: 'A spell that freezes an enemy, cutting their speed in half for 2 turns and does light damage',
        role: "Support",
        level: 3,
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
    flash_step: {
        id: 'flash_step',
        name: 'Flash Step',
        description: 'Double your speed for one turn',
        role: "DPS",
        level: 1,
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
    humble: {
        id: 'humble',
        name: 'Humble',
        description: 'Grants yourself +10 ta for 1 turn',
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
                        duration: 1,
                        stackable: false
                    }
                ],
                message: `${caster.name} gains +10 TA for 1 turn!`
            };
            return result;
        }
    },
    here_we_go_again: {
        id: 'here_we_go_again',
        name: 'Here We Go Again',
        description: 'All allies have all of their cooldowns set to 0',
        role: "Support",
        isUltimate: true,
        cooldown: 5,
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
            const allyNames = [];
            
            // Create cooldown reset effects for all allies
            Object.keys(playerCharacters).forEach(playerName => {
                allyNames.push(playerCharacters[playerName].name);
                effects.push({
                    type: 'cooldown_reset',
                    target: playerName,
                    duration: 0 // Instant effect
                });
            });
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Here We Go Again! All cooldowns reset for ${allyNames.join(', ')}!`
            };
        }
    },
    hurry_up: {
        id: 'hurry_up',
        name: 'Hurry Up!',
        description: 'Add +10 speed to one ally for 1 turns',
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
        description: 'DPS in your party receive +5 Strength for 1 turn',
        role: "Support",
        level: 3,
        cooldown: 1,
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
            const dpsNames = [];
            
            Object.keys(playerCharacters).forEach(playerName => {
                const character = playerCharacters[playerName];
                if (character.role === 'DPS') {
                    dpsNames.push(character.name);
                    effects.push({
                        type: 'stat_buff',
                        target: playerName,
                        stat: 'strength',
                        value: 5,
                        duration: 1
                    });
                }
            });
            
            if (dpsNames.length === 0) {
                return {
                    success: false,
                    message: 'No DPS in party to buff!'
                };
            }
            
            return {
                success: true,
                effects: effects,
                message: `${caster.name} uses Iron Sharpens Iron! ${dpsNames.join(', ')} gain +5 Strength for 1 turn!`
            };
        }
    },
    love_galore: {
        id: 'love_galore',
        name: "Love Galore",
        description: 'All party members are restore 50% hp',
        role: "Support",
        cooldown: 0, 
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
        description: 'Grants all members of the party +25 Bonus Health and +20 Res for 2 turns',
        role: "Tank",
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
                    value: 25,
                    duration: 2,
                    stackable: false
                });
                
                effects.push({
                    type: 'stat_buff',
                    target: playerName,
                    stat: 'resistance',
                    value: 20,
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
    poison_apple: {
        id: 'poison_apple',
        name: 'Poison Apple',
        description: 'A spell that prevents enemies from healing for 1 turn',
        role: "DPS",
        level: 5,
        cooldown: 2,
        targetType: 'single-enemy',
        type: 'debuff',
        
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
                effects: [{
                    type: 'healing_prevented',
                    target: target,
                    duration: 1
                }],
                message: `${caster.name} casts Poison Apple on ${enemy.name}! Healing prevented for 1 turn!`
            };
        }
    },
    selfish_sacrifice: {
        id: 'selfish_sacrifice',
        name: 'Selfish Sacrifice',
        description: ' Drain your ta and transfer it elsewhere, giving you -10ta but +10 Spd and +5 Str for two turns',
        role: "DPS",
        level: 3,
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
        damageScaling: 'strength', // Uses strength stat for damage
        abilityDamage: 15, // Base ability damage multiplier
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
    starward_sword: {
        id: 'starward_sword',
        name: 'Starward Sword',
        description: 'Allows you to use your weapon 3 times in one turn',
        role: "Tank",
        cooldown: 0,
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
                message: `${caster.name} activates Starward Sword! Can use weapon 3 times this turn!`
            };
        }
    },
    sword_slash: {
        id: 'sword_slash',
        name: 'Sword Slash',
        description: 'Deal high AOE damage to enemies in front and to the sides',
        role: "DPS",
        level: 3,
        cooldown: 1,
        targetType: 'ground-target',
        type: 'damage',
        damageType: 'physical',
        damageScaling: 'strength',
        abilityDamage: 20, // 1.25x multiplier applied
        range: 1,
        
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
                (caster.stats.strength / 10) * 20
            ));
            const totalDamage = Math.floor(baseDamage * 1.25);
            const damagePerEnemy = Math.floor(totalDamage / affectedEnemies.length);
            
            const damageResults = affectedEnemies.map(enemy => ({
                target: enemy.id,
                amount: damagePerEnemy
            }));
            
            return {
                success: true,
                damage: damageResults,
                aoePosition: targetPosition,
                message: `${caster.name} slashes with their sword! ${affectedEnemies.length} enemies hit for ${damagePerEnemy} damage each!`
            };
        }
    },
    zen: {
        id: 'zen',
        name: 'Zen',
        description: 'All support receive +10 ta for one turn',
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
                message: `${caster.name} uses Zen! ${supportNames.join(', ')} gain +10 Technical Ability for 1 turn!`
            };
        }
    }
};
