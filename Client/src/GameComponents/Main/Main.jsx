import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../../Components/Context';
import EnemiesData from '../../Components/Enemies.json';
import { executeEnemyTurn } from './EnemyCombat';
import { getAbility, executeAbility, applyAbilityEffects, tickCooldowns, tickActiveEffects, calculateTotalStat, getStatBonuses } from './AbilityLogic';
import './Main.css';

function Main() {
    const { players, playerCharacters, setPlayerCharacters, playerName, room, socket, attributeAllocations, setGamePhase, isMyTurn, currentTurn, enemies, setEnemies, turnOrder, setTurnOrder } = useGameContext();
    const [currentPlayerCharacter, setCurrentPlayerCharacter] = useState(null);
    const [ultimateReady, setUltimateReady] = useState(false);
    const [characterPositions, setCharacterPositions] = useState({});
    const [weaponSelected, setWeaponSelected] = useState(false);
    const [selectedAbility, setSelectedAbility] = useState(null);
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [cooldowns, setCooldowns] = useState({});
    const [activeEffects, setActiveEffects] = useState([]);
    const [turnStartPosition, setTurnStartPosition] = useState(null);
    const [movementUsed, setMovementUsed] = useState(0);
    const [actionUsed, setActionUsed] = useState(false);

    // Refs to track latest state values for handleEndTurn
    const activeEffectsRef = useRef(activeEffects);
    const playerCharactersRef = useRef(playerCharacters);
    const enemiesRef = useRef(enemies);

    // Update refs whenever state changes
    useEffect(() => {
        activeEffectsRef.current = activeEffects;
    }, [activeEffects]);

    useEffect(() => {
        playerCharactersRef.current = playerCharacters;
    }, [playerCharacters]);

    useEffect(() => {
        enemiesRef.current = enemies;
    }, [enemies]);

    useEffect(() => {
        if (playerCharacters[playerName]) {
            setCurrentPlayerCharacter(playerCharacters[playerName]);
            console.log('[CHARACTER LOADED]', playerName, ':', playerCharacters[playerName]?.name);
        } else {
            console.warn('[CHARACTER MISSING] No character data for', playerName);
            console.warn('[CHARACTER MISSING] Available characters:', Object.keys(playerCharacters));
        }
    }, [playerCharacters, playerName]);

    // Reset movement tracking when turn starts
    useEffect(() => {
        if (isMyTurn && characterPositions[playerName]) {
            setTurnStartPosition(characterPositions[playerName]);
            setMovementUsed(0);
            setActionUsed(false);
            console.log('Turn started - movement reset');
            console.log('[TURN DEBUG] Player:', playerName);
            console.log('[TURN DEBUG] Current character:', currentPlayerCharacter?.name);
            console.log('[TURN DEBUG] Character position:', characterPositions[playerName]);
            console.log('[TURN DEBUG] Character stats:', currentPlayerCharacter?.stats);
        } else if (isMyTurn && !characterPositions[playerName]) {
            console.error('[TURN DEBUG] ITS MY TURN BUT NO POSITION!');
            console.error('[TURN DEBUG] Player:', playerName);
            console.error('[TURN DEBUG] All positions:', characterPositions);
        }
    }, [isMyTurn, playerName]);

    const generateEnemies = () => {
        const genericEnemies = EnemiesData.enemies.filter(e => e.tier === 'generic');
        const selectedEnemies = [];
            
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * genericEnemies.length);
            const enemy = { ...genericEnemies[randomIndex] };
            enemy.id = `${enemy.id}_${i + 1}`;
            selectedEnemies.push(enemy);
        }
            
        return selectedEnemies;
    };

    // Initialize character positions at bottom of grid
    useEffect(() => {
        const newPositions = {};
        const bottomRow = 6; 
        players.forEach((player, index) => {
            if (!characterPositions[player]) {
                newPositions[player] = { row: bottomRow, col: index + 3 };
            }
        });
        if (Object.keys(newPositions).length > 0) {
            setCharacterPositions(prev => ({ ...prev, ...newPositions }));
        }
    }, [players]);

    useEffect(() => {
        if (enemies && enemies.length > 0) {
            // Check if server provided positions
            const storedPositions = sessionStorage.getItem(`enemyPositions_${room}`);
            
            if (storedPositions) {
                // Use server-provided positions
                const serverPositions = JSON.parse(storedPositions);
                const enemyPositions = {};
                
                enemies.forEach((enemy) => {
                    // Only set position if enemy doesn't already have one
                    if (!characterPositions[enemy.id] && serverPositions[enemy.id]) {
                        enemyPositions[enemy.id] = serverPositions[enemy.id];
                    }
                });
                
                if (Object.keys(enemyPositions).length > 0) {
                    setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
                }
            } else {
                // Fallback to client-side generation (shouldn't happen in multiplayer)
                const enemyPositions = {};
                const topRow = Math.floor(Math.random() * 2);
                enemies.forEach((enemy, index) => {
                    if (!characterPositions[enemy.id]) {
                        enemyPositions[enemy.id] = { row: topRow, col: index + 3 };
                    }
                });
                if (Object.keys(enemyPositions).length > 0) {
                    setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
                }
            }
        }
    }, [enemies]);

    // Helper function to calculate path between two positions
    const calculatePath = (start, end) => {
        const path = [];
        let current = { ...start };
        
        // Move row-wise first, then column-wise
        while (current.row !== end.row) {
            current = { ...current, row: current.row + (end.row > current.row ? 1 : -1) };
            path.push({ ...current });
        }
        
        while (current.col !== end.col) {
            current = { ...current, col: current.col + (end.col > current.col ? 1 : -1) };
            path.push({ ...current });
        }
        
        return path;
    };

    // Listen for enemy turn execution
    useEffect(() => {
        const handleExecuteEnemyTurn = ({ enemyId, allies, alliedEnemies }) => {
            console.log('EXECUTE_ENEMY_TURN EVENT RECEIVED');
            console.log('Enemy ID:', enemyId);
            console.log('Player Name:', playerName);
            console.log('Allies list:', allies);
            
            // Only the first player in the allies list handles enemy turns
            if (allies[0] !== playerName) {
                console.log('[ENEMY TURN] Not the designated handler, skipping');
                return;
            }
            
            console.log('[ENEMY TURN] This player will handle the enemy turn');
            console.log('Allied Enemies:', alliedEnemies);
            
            const enemy = enemies.find(e => e.id === enemyId);
            if (!enemy) {
                console.error('Enemy not found:', enemyId);
                console.log('Available enemies:', enemies.map(e => e.id));
                return;
            }

            console.log(`\nExecuting AI turn for: ${enemy.name}`);

            const turnAction = executeEnemyTurn(
                enemy,
                allies,
                alliedEnemies,
                playerCharacters,
                characterPositions,
                activeEffects
            );

            console.log('Turn Action:', turnAction);

            // Calculate movement path and total animation time
            let movementDelay = 0;
            if (turnAction.movement) {
                const startPos = characterPositions[enemyId];
                const endPos = { row: turnAction.movement.row, col: turnAction.movement.col };
                const path = calculatePath(startPos, endPos);
                const stepDelay = 10000 / enemy.stats.speed;
                movementDelay = path.length * stepDelay;
                
                // Emit the path for animation
                socket.emit('enemy_moved', {
                    room,
                    enemyId,
                    path: path,
                    stepDelay: stepDelay
                });
            }

            // Apply damage after movement delay
            if (turnAction.target && turnAction.useWeapon) {
                setTimeout(() => {
                    const target = playerCharacters[turnAction.target];
                if (target) {
                    let damageAmount = Math.max(1, (enemy.stats.strength / 10) * enemy.weapon.damage - (target.stats.resistance / 10));
                    console.log(`${enemy.name} attacks ${turnAction.target} for ${damageAmount.toFixed(1)} damage!`);
                    
                    // Check for health buffs (bonus health) - consume them first
                    const healthBuffs = activeEffects.filter(e => 
                        e.target === turnAction.target && 
                        e.stat === 'health' && 
                        e.type === 'stat_buff' && 
                        e.turnsRemaining > 0
                    );
                    
                    let remainingDamage = damageAmount;
                    const updatedEffects = [...activeEffects];
                    
                    // Consume health buffs first
                    healthBuffs.forEach(buff => {
                        if (remainingDamage > 0) {
                            const buffIndex = updatedEffects.findIndex(e => 
                                e.target === buff.target && 
                                e.stat === buff.stat && 
                                e.type === buff.type &&
                                e.turnsRemaining === buff.turnsRemaining
                            );
                            if (buffIndex !== -1) {
                                if (buff.value <= remainingDamage) {
                                    // Buff completely consumed
                                    remainingDamage -= buff.value;
                                    updatedEffects.splice(buffIndex, 1);
                                } else {
                                    // Buff partially consumed
                                    updatedEffects[buffIndex] = { ...buff, value: buff.value - remainingDamage };
                                    remainingDamage = 0;
                                }
                            }
                        }
                    });
                    
                    // Remove health buffs that have been completely consumed (value <= 0)
                    const filteredEffects = updatedEffects.filter(effect => {
                        if (effect.stat === 'health' && effect.type === 'stat_buff') {
                            return effect.value > 0;
                        }
                        return true;
                    });
                    
                    setActiveEffects(filteredEffects);
                    
                    // Apply remaining damage to base health
                    const newHealth = target.stats.health - remainingDamage;
                    const updatedPlayerCharacters = {
                        ...playerCharacters,
                        [turnAction.target]: {
                            ...target,
                            stats: { ...target.stats, health: Math.max(0, newHealth) }
                        }
                    };
                    setPlayerCharacters(updatedPlayerCharacters);
                    
                    // Remove dead player from turn order
                    if (newHealth <= 0) {
                        console.log(`Player ${turnAction.target} has died! Removing from turn order.`);
                        setTurnOrder(prevOrder => prevOrder.filter(turn => turn.id !== turnAction.target));
                    }
                    
                    // Emit to server to sync player health and active effects
                    socket.emit('player_damaged', { 
                        room, 
                        playerName: turnAction.target, 
                        damage: damageAmount, 
                        newHealth: Math.max(0, newHealth),
                        bonusHealthConsumed: damageAmount - remainingDamage,
                        updatedActiveEffects: filteredEffects
                    });
                    
                    console.log(`${turnAction.target} health: ${target.stats.health} → ${Math.max(0, newHealth)} (${damageAmount - remainingDamage} absorbed by bonus health)`);

                    }
                }, movementDelay); // Apply attack after movement completes
            }

            // Delay before completing turn (movement + attack + visual feedback)
            const totalDelay = movementDelay + (turnAction.target ? 500 : 0) + 1000;
            setTimeout(() => {
                console.log('[ENEMY TURN] Completing turn for', enemyId);
                socket.emit('enemy_turn_complete', { room });
            }, totalDelay);
        };

        const handleEnemiesUpdated = ({ enemies: updatedEnemies }) => {
            console.log('Enemies updated:', updatedEnemies);
            if (updatedEnemies && Array.isArray(updatedEnemies)) {
                setEnemies(updatedEnemies);
            } else {
                console.error('[ENEMIES UPDATED] Received invalid enemies data:', updatedEnemies);
            }
        };

        const handleCharactersUpdated = (updatedCharacters) => {
            console.log('[CHARACTERS UPDATED] Received from server:', updatedCharacters);
            setPlayerCharacters(prevChars => ({
                ...prevChars,
                ...updatedCharacters
            }));
        };

        const handleActiveEffectsUpdated = (updatedEffects) => {
            console.log('[ACTIVE EFFECTS UPDATED] Received from server:', updatedEffects);
            setActiveEffects(updatedEffects);
        };

        const handleEnemyMoved = ({ enemyId, path, stepDelay }) => {
            if (!path || path.length === 0) return;
            
            // Animate through each step in the path
            path.forEach((position, index) => {
                setTimeout(() => {
                    setCharacterPositions(prev => ({
                        ...prev,
                        [enemyId]: position
                    }));
                }, stepDelay * index);
            });
        };

        const handlePlayerMoved = ({ playerName: movedPlayer, position }) => {
            console.log('[PLAYER MOVED] Received:', movedPlayer, 'to', position);
            setCharacterPositions(prev => ({
                ...prev,
                [movedPlayer]: position
            }));
        };

        const handleCooldownReduced = ({ targetPlayer, value }) => {
            console.log('[COOLDOWN REDUCED] Received for player:', targetPlayer, 'value:', value);
            // Only apply if this is the target player
            if (targetPlayer === playerName) {
                console.log('[COOLDOWN REDUCED] Applying to my cooldowns');
                setCooldowns(prev => {
                    const updated = { ...prev };
                    const myCharacter = playerCharacters[playerName];
                    
                    if (myCharacter) {
                        // Reduce cooldown for each ability
                        myCharacter.abilities.forEach(ability => {
                            if (updated[ability.id] > 0) {
                                const oldValue = updated[ability.id];
                                updated[ability.id] = Math.max(0, updated[ability.id] - value);
                                console.log(`  - ${ability.name}: ${oldValue} → ${updated[ability.id]}`);
                            }
                        });
                        
                        // Also check ultimate
                        if (myCharacter.ultimate && updated[myCharacter.ultimate.id] > 0) {
                            const oldValue = updated[myCharacter.ultimate.id];
                            updated[myCharacter.ultimate.id] = Math.max(0, updated[myCharacter.ultimate.id] - value);
                            console.log(`  - ${myCharacter.ultimate.name} (Ultimate): ${oldValue} → ${updated[myCharacter.ultimate.id]}`);
                        }
                    }
                    
                    return updated;
                });
            }
        };

        const handleCooldownsReset = ({ targetPlayer }) => {
            console.log('[COOLDOWNS RESET] Received for player:', targetPlayer);
            // Only apply if this is the target player
            if (targetPlayer === playerName) {
                console.log('[COOLDOWNS RESET] Resetting all my cooldowns to 0');
                setCooldowns(prev => {
                    const updated = { ...prev };
                    const myCharacter = playerCharacters[playerName];
                    
                    if (myCharacter) {
                        // Reset cooldown for each ability
                        myCharacter.abilities.forEach(ability => {
                            if (updated[ability.id] > 0) {
                                console.log(`  - ${ability.name}: ${updated[ability.id]} → 0`);
                                updated[ability.id] = 0;
                            }
                        });
                        
                        // Also reset ultimate (but it stays at 0 since ultimates don't have cooldowns)
                        if (myCharacter.ultimate && updated[myCharacter.ultimate.id] > 0) {
                            console.log(`  - ${myCharacter.ultimate.name} (Ultimate): ${updated[myCharacter.ultimate.id]} → 0`);
                            updated[myCharacter.ultimate.id] = 0;
                        }
                    }
                    
                    return updated;
                });
            }
        };

        socket.on("execute_enemy_turn", handleExecuteEnemyTurn);
        socket.on("enemies_updated", handleEnemiesUpdated);
        socket.on("characters_updated", handleCharactersUpdated);
        socket.on("active_effects_updated", handleActiveEffectsUpdated);
        socket.on("enemy_moved", handleEnemyMoved);
        socket.on("player_moved", handlePlayerMoved);
        socket.on("cooldown_reduced", handleCooldownReduced);
        socket.on("cooldowns_reset", handleCooldownsReset);

        return () => {
            socket.off("execute_enemy_turn", handleExecuteEnemyTurn);
            socket.off("enemies_updated", handleEnemiesUpdated);
            socket.off("characters_updated", handleCharactersUpdated);
            socket.off("active_effects_updated", handleActiveEffectsUpdated);
            socket.off("enemy_moved", handleEnemyMoved);
            socket.off("player_moved", handlePlayerMoved);
            socket.off("cooldown_reduced", handleCooldownReduced);
            socket.off("cooldowns_reset", handleCooldownsReset);
        };
    }, [socket, enemies, playerCharacters, setPlayerCharacters, characterPositions, room, turnOrder, setTurnOrder]);

    const handleGridClick = (row, col) => {
        console.log('[GRID CLICK]', { row, col, isMyTurn, playerName, hasCharacter: !!currentPlayerCharacter });
        
        if (!isMyTurn) {
            console.log('[GRID CLICK] Blocked - not my turn');
            return;
        }
        
        // Handle ground-target abilities
        if (selectedAbility) {
            const abilityData = getAbility(selectedAbility);
            
            if (abilityData?.targetType === 'ground-target') {
                console.log('[GROUND TARGET] Executing ground-target ability at:', { row, col });
                
                // Check range from caster position
                const currentPos = characterPositions[playerName];
                if (currentPos && abilityData.range) {
                    const distance = Math.abs(currentPos.row - row) + Math.abs(currentPos.col - col);
                    
                    if (distance > abilityData.range) {
                        console.log(`[GROUND TARGET] Target out of range! Distance: ${distance}, Max Range: ${abilityData.range}`);
                        setSelectedAbility(null);
                        return;
                    }
                }
                
                // Execute ground-target ability
                executeAbilityOnGroundTarget(selectedAbility, { row, col });
                return;
            }
        }
        
        // Check if clicking on an enemy with weapon selected
        const characterOnCell = Object.entries(characterPositions).find(
            ([id, pos]) => pos.row === row && pos.col === col
        );
        
        // Handle ability targeting
        if (selectedAbility && characterOnCell) {
            const targetId = characterOnCell[0];
            const abilityData = getAbility(selectedAbility);
            
            console.log('[ABILITY TARGET] Checking target:', {
                targetId,
                abilityId: selectedAbility,
                targetType: abilityData?.targetType,
                characterOnCell
            });
            
            // Check if targeting an ally
            const isAlly = playerCharacters[targetId];
            const enemy = enemies.find(e => e.id === targetId);
            
            console.log('[ABILITY TARGET] Target validation:', {
                isAlly: !!isAlly,
                isEnemy: !!enemy,
                allyName: isAlly?.name,
                enemyName: enemy?.name,
                playerCharacterKeys: Object.keys(playerCharacters)
            });
            
            // Handle ally-targeted abilities
            if (abilityData.targetType === 'ally') {
                if (isAlly) {
                    console.log('[ALLY TARGET] Executing ally-targeted ability on:', targetId, isAlly.name);
                    executeAbilityOnTarget(selectedAbility, targetId);
                } else {
                    console.log('[ALLY TARGET] Target is not an ally, cannot use this ability');
                    setSelectedAbility(null);
                }
                return;
            }
            
            // Handle enemy-targeted abilities
            if (enemy) {
                // Check range for abilities with range requirement
                if (abilityData.range) {
                    const currentPos = characterPositions[playerName];
                    const targetPos = characterPositions[targetId];
                    
                    if (currentPos && targetPos) {
                        const distance = Math.abs(currentPos.row - targetPos.row) + Math.abs(currentPos.col - targetPos.col);
                        
                        if (distance > abilityData.range) {
                            console.log(`[ABILITY RANGE] Target out of range! Distance: ${distance}, Max Range: ${abilityData.range}`);
                            setSelectedAbility(null);
                            return;
                        }
                    }
                }
                
                // Check if it's a multi-target ability
                if (abilityData.targetType === 'multi-enemy') {
                    // Add to selected targets
                    if (!selectedTargets.includes(targetId)) {
                        const newTargets = [...selectedTargets, targetId];
                        setSelectedTargets(newTargets);
                        
                        console.log(`Selected target ${enemy.name}. Total: ${newTargets.length}/${abilityData.maxTargets || 2}`);
                        
                        // If we have enough targets, execute
                        if (newTargets.length >= (abilityData.maxTargets || 2)) {
                            executeAbilityMultiTarget(selectedAbility, newTargets);
                        }
                    }
                } else {
                    // Single target ability
                    executeAbilityOnTarget(selectedAbility, targetId);
                }
                return;
            }
        }
        
        if (weaponSelected && characterOnCell) {
            const enemyId = characterOnCell[0];
            const enemy = enemies.find(e => e.id === enemyId);
            
            if (enemy && currentPlayerCharacter) {
                // Check weapon range
                const currentPos = characterPositions[playerName];
                const enemyPos = characterPositions[enemyId];
                
                if (!currentPos || !enemyPos) return;
                
                // Calculate distance (Manhattan distance for grid-based movement)
                const distance = Math.abs(currentPos.row - enemyPos.row) + Math.abs(currentPos.col - enemyPos.col);
                const weaponRange = currentPlayerCharacter.weapon.range || 1;
                
                if (distance > weaponRange) {
                    console.log('Target out of range:', {
                        weapon: currentPlayerCharacter.weapon.name,
                        range: weaponRange,
                        distance: distance,
                        message: `Move closer to attack! (Range: ${weaponRange}, Distance: ${distance})`
                    });
                    setWeaponSelected(false);
                    return;
                }
                
                const damage = (currentPlayerCharacter.stats.strength/10) * currentPlayerCharacter.weapon.damage - (enemy.stats.resistance/10);
                const newHealth = enemy.stats.health - damage;
                
                console.log('Weapon Attack:', {
                    attacker: currentPlayerCharacter.name,
                    target: enemy.name,
                    weapon: currentPlayerCharacter.weapon.name,
                    range: weaponRange,
                    distance: distance,
                    damage: damage.toFixed(1),
                    newHealth: Math.max(0, newHealth).toFixed(1)
                });
                
                // Update enemy health
                const updatedEnemies = enemies.map(e => 
                    e.id === enemyId ? { ...e, stats: { ...e.stats, health: Math.max(0, newHealth) } } : e
                ).filter(e => e.stats.health > 0); // Remove dead enemies
                
                setEnemies(updatedEnemies);
                
                // Update turn order to remove dead enemy
                if (newHealth <= 0) {
                    const updatedTurnOrder = turnOrder.filter(turn => turn.id !== enemyId);
                    setTurnOrder(updatedTurnOrder);
                }
                
                socket.emit('enemy_damaged', { room, enemyId, damage, newHealth: Math.max(0, newHealth) });
                setWeaponSelected(false);
                setActionUsed(true);
                
                // Auto-end turn after 1.5 seconds
                setTimeout(() => {
                    handleEndTurn();
                }, 1500);
                return;
            }
        }
        
        const currentPos = characterPositions[playerName];
        if (!currentPos) return;

        // Calculate max movement based on speed (including buffs from activeEffects)
        const totalSpeed = calculateTotalStat(currentPlayerCharacter, playerName, 'speed', activeEffects);
        const maxMovement = Math.floor(totalSpeed / 10);
        
        console.log('[MOVEMENT CALC]', {
            baseSpeed: currentPlayerCharacter.stats.speed,
            totalSpeed,
            maxMovement
        });
        
        // Calculate distance from current position to target
        const movementThisStep = Math.abs(row - currentPos.row) + Math.abs(col - currentPos.col);
        
        // Check if we have enough movement remaining
        const movementRemaining = maxMovement - movementUsed;

        const isOccupied = Object.values(characterPositions).some(
            pos => pos.row === row && pos.col === col
        );

        if (movementThisStep <= movementRemaining && movementThisStep > 0 && !isOccupied) {
            console.log('Movement:', {
                character: currentPlayerCharacter.name,
                speed: currentPlayerCharacter.stats.speed,
                maxMovement: maxMovement,
                movementUsed: movementUsed,
                movementThisStep: movementThisStep,
                movementRemaining: movementRemaining - movementThisStep,
                from: currentPos,
                to: { row, col }
            });
            
            const newPosition = { row, col };
            setCharacterPositions(prev => ({
                ...prev,
                [playerName]: newPosition
            }));
            setMovementUsed(movementUsed + movementThisStep);
            
            // Broadcast player movement to all players
            socket.emit('player_moved', {
                room,
                playerName,
                position: newPosition
            });
        } else if (movementThisStep > movementRemaining) {
            console.log('Not enough movement remaining:', {
                movementThisStep: movementThisStep,
                movementRemaining: movementRemaining,
                movementUsed: movementUsed,
                maxMovement: maxMovement
            });
        }
    };

    const renderGrid = () => {
        const grid = [];
        const ROWS = 7;
        const COLS = 10;
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const characterOnCell = Object.entries(characterPositions).find(
                    ([id, pos]) => pos.row === row && pos.col === col
                );
                
                const isEnemy = enemies.some(e => e.id === characterOnCell?.[0]);
                const isPlayerCharacter = characterOnCell && characterOnCell[0] === playerName;

                grid.push(
                    <div
                        key={`${row}-${col}`}
                        className={`grid-cell ${
                            characterOnCell ? 'occupied' : ''
                        } ${isPlayerCharacter ? 'player-controlled' : ''} ${isEnemy ? 'enemy-cell' : ''}`}
                        onClick={() => handleGridClick(row, col)}
                    >
                        {characterOnCell && (
                            <div className="grid-character">
                                {isEnemy ? (
                                    <>
                                        <div className="enemy-health">
                                            {enemies.find(e => e.id === characterOnCell[0])?.stats.health || 0}
                                            {enemies.find(e => e.id === characterOnCell[0])?.stats.speed || 0}
                                        </div>
                                        <div className="enemy-name">
                                            {enemies.find(e => e.id === characterOnCell[0])?.name || 'E'}
                                        </div>
                                    </>
                                ) : (
                                    playerCharacters[characterOnCell[0]]?.name || '?'
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        }
        return grid;
    };

    function handleStoryComplete() {
        const generatedEnemies = generateEnemies();
        setEnemies(generatedEnemies);
        setGamePhase('combat');
        socket.emit('start_combat', { room, generatedEnemies });
    }

    function handleCombatComplete(rewards) {
        socket.emit('combat_complete', { room, rewards });    
    }

    const handleAbilityClick = (ability) => {
        console.log('[ABILITY CLICK] Ability clicked:', ability.name, 'ID:', ability.id);
        
        if (!isMyTurn || actionUsed) {
            console.log('[ABILITY CLICK] Blocked - isMyTurn:', isMyTurn, 'actionUsed:', actionUsed);
            return;
        }
        
        const abilityData = getAbility(ability.id);
        console.log('[ABILITY CLICK] Ability data:', abilityData);
        
        if (!abilityData) {
            console.log('[ABILITY CLICK] No ability data found!');
            return;
        }
        
        // Check cooldown
        if (cooldowns[ability.id] > 0) {
            console.log(`Ability ${ability.name} on cooldown: ${cooldowns[ability.id]} turns remaining`);
            return;
        }
        
        // Handle abilities that don't need target selection
        console.log('[ABILITY CLICK] Target type:', abilityData.targetType);
        if (abilityData.targetType === 'self' || abilityData.targetType === 'all-allies' || abilityData.targetType === 'all-enemies') {
            console.log('[ABILITY CLICK] Executing immediately - no target needed');
            executeAbilityOnTarget(ability.id, null);
        } else {
            // For other abilities, select and wait for target
            setSelectedAbility(ability.id);
            setSelectedTargets([]);
            setWeaponSelected(false);
            console.log(`Selected ability: ${ability.name}. Click a target.`);
        }
    };

    const executeAbilityOnTarget = (abilityId, target) => {
        const abilityData = getAbility(abilityId);
        
        console.log('[EXECUTE ABILITY] Starting execution:', {
            abilityId,
            target,
            targetType: abilityData?.targetType,
            caster: currentPlayerCharacter?.name,
            playerCharacters: Object.keys(playerCharacters)
        });
        
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            target: target,
            targets: target ? [target] : undefined, // For multi-target abilities
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
        console.log('[EXECUTE ABILITY] Result:', result);
        
        if (!result.success) {
            console.log('Ability failed:', result.message);
            return;
        }
        
        console.log('✨ Ability executed:', result.message);
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects
        });
        
        setEnemies(updates.enemies);
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);
        
        console.log('[ABILITY COMPLETE] Updated enemies:', updates.enemies);
        console.log('[ABILITY COMPLETE] Updated playerCharacters:', updates.playerCharacters);
        
        // Check if target was an enemy
        const targetEnemy = updates.enemies.find(e => e.id === target);
        if (targetEnemy) {
            console.log(`[ABILITY COMPLETE] Enemy ${targetEnemy.name} stats:`, targetEnemy.stats);
        }
        
        // Handle cooldown modification effects (cooldown_reduction, cooldown_increase, cooldown_reset)
        if (result.effects) {
            result.effects.forEach(effect => {
                if (effect.type === 'cooldown_reduction') {
                    // Emit cooldown reduction to target player via socket
                    console.log(`[COOLDOWN REDUCTION] Emitting to ${effect.target} to reduce by ${effect.value}`);
                    socket.emit('reduce_cooldown', {
                        room,
                        targetPlayer: effect.target,
                        value: effect.value
                    });
                } else if (effect.type === 'cooldown_reset') {
                    // Reset all cooldowns for target player
                    console.log(`[COOLDOWN RESET] Resetting cooldowns for ${effect.target}`);
                    socket.emit('reset_cooldowns', {
                        room,
                        targetPlayer: effect.target
                    });
                } else if (effect.type === 'cooldown_increase') {
                    // Increase cooldowns for target enemy (currently enemies don't have cooldowns tracked, but structure is here for future)
                    console.log(`[COOLDOWN INCREASE] Increasing cooldowns for enemy ${effect.target} by ${effect.value}`);
                    // Note: Enemy cooldown tracking would need to be implemented for this to work
                }
            });
        }
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters,
            updatedEnemies: updates.enemies,
            updatedActiveEffects: updates.activeEffects
        });
        
        console.log('[ABILITY SYNC] Emitting updated playerCharacters and enemies to server');
        
        setSelectedAbility(null);
        setSelectedTargets([]);
        setActionUsed(true);
        
        // Auto-end turn after 1.5 seconds - but only if it's still our turn
        setTimeout(() => {
            if (isMyTurn) {
                console.log('[AUTO END TURN] Executing after ability use');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN] CANCELLED - No longer our turn');
            }
        }, 1500);
    };

    const executeAbilityMultiTarget = (abilityId, targets) => {
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            targets: targets,
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
        if (!result.success) {
            console.log('Ability failed:', result.message);
            setSelectedTargets([]);
            return;
        }
        
        console.log('Ability executed:', result.message);
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects
        });
        
        setEnemies(updates.enemies);
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters
        });
        
        console.log('[ABILITY SYNC] Emitting updated playerCharacters to server (multi-target)');
        
        setSelectedAbility(null);
        setSelectedTargets([]);
        setActionUsed(true);
        
        // Auto-end turn after 1.5 seconds - but only if it's still our turn
        setTimeout(() => {
            if (isMyTurn) {
                console.log('[AUTO END TURN MULTI] Executing after ability use');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN MULTI] CANCELLED - No longer our turn');
            }
        }, 1500);
    };

    const executeAbilityOnGroundTarget = (abilityId, targetPosition) => {
        const abilityData = getAbility(abilityId);
        
        console.log('[EXECUTE GROUND TARGET] Starting execution:', {
            abilityId,
            targetPosition,
            caster: currentPlayerCharacter?.name
        });
        
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            targetPosition: targetPosition,
            characterPositions: characterPositions,
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
        console.log('[EXECUTE GROUND TARGET] Result:', result);
        
        if (!result.success) {
            console.log('Ground-target ability failed:', result.message);
            setSelectedAbility(null);
            return;
        }
        
        console.log('✨ Ground-target ability executed:', result.message);
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects
        });
        
        setEnemies(updates.enemies);
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);
        
        console.log('[GROUND TARGET COMPLETE] Updated enemies:', updates.enemies);
        console.log('[GROUND TARGET COMPLETE] Updated playerCharacters:', updates.playerCharacters);
        console.log('[GROUND TARGET COMPLETE] Updated activeEffects:', updates.activeEffects);
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters,
            updatedEnemies: updates.enemies,
            updatedActiveEffects: updates.activeEffects
        });
        
        console.log('[GROUND TARGET SYNC] Emitting updated game state to server');
        
        setSelectedAbility(null);
        setActionUsed(true);
        
        // Auto-end turn after 1.5 seconds
        setTimeout(() => {
            if (isMyTurn) {
                console.log('[AUTO END TURN GROUND] Executing after ability use');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN GROUND] CANCELLED - No longer our turn');
            }
        }, 1500);
    };

    const handleEndTurn = () => {
        if (!isMyTurn) return;
        console.log('END TURN clicked');
        console.log('Player Name:', playerName);
        console.log('Room:', room);
        
        // Tick down cooldowns
        setCooldowns(prevCooldowns => tickCooldowns(prevCooldowns));
        
        // Use refs to get latest state values (avoids closure issues)
        const { updatedEffects, updatedCharacters, updatedEnemies } = tickActiveEffects(
            activeEffectsRef.current, 
            playerCharactersRef.current, 
            enemiesRef.current
        );
        
        console.log('Effects ticked:', {
            remainingEffects: updatedEffects.length,
            expiredEffects: activeEffectsRef.current.length - updatedEffects.length
        });
        
        // Update all states independently
        setActiveEffects(updatedEffects);
        setPlayerCharacters(updatedCharacters);
        setEnemies(updatedEnemies);
        
        // Emit updated enemy states to server to maintain sync
        socket.emit('end_turn', { room, playerName, updatedEnemies });
    };
  
    return (
        <div className="main-game-container">
        <div className="scene-name">
            <h2>Location</h2>
            <h2>
                {isMyTurn ? (
                    <div className="turn">YOUR TURN</div>
                ) : (
                    <div className="turn">
                    {currentTurn?.type === 'ally' 
                        ? `${currentTurn.id}'s Turn` 
                        : `${currentTurn?.id || 'Enemy'}'s Turn`}
                    </div>
                )}
            </h2>
        </div>
        <div className="party">
            <h3>Party</h3>
            {players
                .sort((a, b) => {
                    const speedA = playerCharacters[a]?.stats.speed || 0;
                    const speedB = playerCharacters[b]?.stats.speed || 0;
                    return speedB - speedA;
                })
                .map((player, index) => {
                    const character = playerCharacters[player];
                    const isPlayerChar = player === playerName;
                    return (
                        <div 
                            key={index} 
                            className={`party-member ${isPlayerChar ? 'party-selected player-char' : ''}`}
                        >
                            {character ? (
                                <>
                                    <div className="character-icon"></div>
                                    <div className="character-info">
                                        <div className="character-name">{character.name}</div>
                                        <div className="character-stats">
                                            <span className="stat-speed">SPD: {character.stats.speed}</span>
                                            <span className="stat-hp">HP: {character.stats.health}/{character.stats.maxHealth}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="character-name">No Character</div>
                            )}
                        </div>
                    );
                })}
        </div>

        <div className="main-game">
            <div className="game-area">
                <div className="battle-grid">
                    {renderGrid()}
                </div>
            </div>
        </div>

        <div className="AI-script">
            <h3>AI Log goes here</h3>
            {/* <button onClick={handleStoryComplete}>Combat</button> */}
        </div>
        <div className="inventory">
            {currentPlayerCharacter ? (
                <>
                    <div className="character-sheet-header">
                        <div className="character-portrait">
                            <div className="portrait-icon"></div>
                            <div className="character-title">
                                <div className="char-name">{currentPlayerCharacter.name}</div>
                                <div className="char-role">{currentPlayerCharacter.role}</div>
                                
                        <div className='attributes'>
                            {attributeAllocations[playerName] && attributeAllocations[playerName].length > 0 ? (
                                <>
                                    <div className="attribute-line">
                                        <span className="primary-ability small">
                                            {attributeAllocations[playerName][0]?.charAt(0).toUpperCase() + attributeAllocations[playerName][0]?.slice(1)}
                                        </span>
                                    </div>
                                    /
                                    <div className="attribute-line">
                                        <span className="secondary-ability small">
                                            {attributeAllocations[playerName][1]?.charAt(0).toUpperCase() + attributeAllocations[playerName][1]?.slice(1)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="no-allocation">No attributes allocated</div>
                            )}
                        </div>
                            </div>
                        </div>
                            <div className="stats-section">
                            <h4>Stats</h4>
                            <div className="stats-grid">
                                {(() => {
                                    const statBonuses = getStatBonuses(playerName, activeEffects);
                                    return (
                                        <>
                                            <div className="stat-item">
                                                <span className="stat-label">Health</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.health}
                                                    {statBonuses.health && (
                                                        <span className={statBonuses.health > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                            {statBonuses.health > 0 ? ' +' : ' '}{statBonuses.health}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Speed</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.speed}
                                                    {statBonuses.speed && (
                                                        <span className={statBonuses.speed > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                            {statBonuses.speed > 0 ? ' +' : ' '}{statBonuses.speed}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Resistance</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.resistance}
                                                    {statBonuses.resistance && (
                                                        <span className={statBonuses.resistance > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                            {statBonuses.resistance > 0 ? ' +' : ' '}{statBonuses.resistance}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Strength</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.strength}
                                                    {statBonuses.strength && (
                                                        <span className={statBonuses.strength > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                            {statBonuses.strength > 0 ? ' +' : ' '}{statBonuses.strength}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Technical Ability</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.ta}
                                                    {statBonuses.ta && (
                                                        <span className={statBonuses.ta > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                            {statBonuses.ta > 0 ? ' +' : ' '}{statBonuses.ta}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            </div>
                    </div>

                    <div className="weapon-section">
                        <h4>Weapon</h4>
                        <div 
                            className={`weapon-card ${weaponSelected ? 'weapon-selected' : ''} ${actionUsed ? 'weapon-disabled' : ''}`}
                            onClick={() => isMyTurn && !actionUsed && setWeaponSelected(!weaponSelected)}
                            style={{ cursor: isMyTurn && !actionUsed ? 'pointer' : 'not-allowed' }}
                        >
                            <div className="weapon-info">
                                <div className="weapon-name">{currentPlayerCharacter.weapon.name}</div>
                                <div className="weapon-damage">DMG: {currentPlayerCharacter.weapon.damage}</div>
                                <div className="weapon-range">{currentPlayerCharacter.weapon.range == 1 ? "Melee" : currentPlayerCharacter.weapon.range}</div>
                            </div>
                        </div>
                    </div>

                    <div className="abilities-section">
                        <h4>Abilities</h4>
                        <div className="abilities-grid">
                            {currentPlayerCharacter.abilities.map((ability, index) => {
                                const currentCooldown = cooldowns[ability.id] || 0;
                                const isOnCooldown = currentCooldown > 0;
                                const isSelected = selectedAbility === ability.id;
                                
                                return (
                                    <button 
                                        onClick={() => handleAbilityClick(ability)} 
                                        key={index} 
                                        className={`ability-card ${
                                            isOnCooldown ? 'ability-on-cooldown' : ''
                                        } ${
                                            isSelected ? 'ability-selected' : ''
                                        }`}
                                        disabled={!isMyTurn || isOnCooldown || actionUsed}
                                    >
                                        <div className="ability-header">
                                            <div className="ability-name">{ability.name}</div>
                                            <div className="ability-cd">
                                                {isOnCooldown ? currentCooldown : `CD: ${ability.cooldown}`}
                                            </div>
                                            {ability.range && (
                                                <div className="ability-range">
                                                    {ability.range === 1 ? "Melee" : ability.range}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ability-desc">{ability.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="ultimate-section">
                        <h4>Ultimate</h4>
                        <button 
                            className="ultimate-card" 
                            disabled={!isMyTurn || actionUsed}
                            onClick={() => {
                                console.log('[ULTIMATE CLICK] Ultimate clicked:', currentPlayerCharacter.ultimate);
                                handleAbilityClick(currentPlayerCharacter.ultimate);
                            }}
                        >
                            <div className="ultimate-header">
                                <div className="ultimate-name">{currentPlayerCharacter.ultimate.name}</div>
                            </div>
                            <div className="ultimate-desc">{currentPlayerCharacter.ultimate.description}</div>
                        </button>
                    </div>
                </>
            ) : (
                <div className="no-character">No character selected</div>
            )}
        </div>

        {isMyTurn && <button className="end-turn" onClick={handleEndTurn} disabled={!isMyTurn}>End Turn</button>}
        </div>

    );
};

export default Main;


