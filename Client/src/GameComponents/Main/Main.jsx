import React from 'react';
import { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import EnemiesData from '../../Components/Enemies.json';
import { executeEnemyTurn } from './EnemyCombat';
import { getAbility, executeAbility, applyAbilityEffects, tickCooldowns, tickActiveEffects } from './AbilityStore';
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

    useEffect(() => {
        if (playerCharacters[playerName]) {
            setCurrentPlayerCharacter(playerCharacters[playerName]);
        }
    }, [playerCharacters, playerName]);

    // Reset movement tracking when turn starts
    useEffect(() => {
        if (isMyTurn && characterPositions[playerName]) {
            setTurnStartPosition(characterPositions[playerName]);
            setMovementUsed(0);
            setActionUsed(false);
            console.log('Turn started - movement reset');
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
        if (enemies.length > 0) {
            const enemyPositions = {};
            const topRow = Math.floor(Math.random() * 2);
            enemies.forEach((enemy, index) => {
                // Only set position if enemy doesn't already have one
                if (!characterPositions[enemy.id]) {
                    enemyPositions[enemy.id] = { row: topRow, col: index + 3 };
                }
            });
            if (Object.keys(enemyPositions).length > 0) {
                setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
            }
        }
    }, [enemies.length]); // Only re-run when enemy count changes, not when enemy data updates

    // Listen for enemy turn execution
    useEffect(() => {
        const handleExecuteEnemyTurn = ({ enemyId, allies, alliedEnemies }) => {
            console.log('EXECUTE_ENEMY_TURN EVENT RECEIVED');
            console.log('Enemy ID:', enemyId);
            console.log('Allies:', allies);
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

            // Apply movement
            if (turnAction.movement) {
                console.log(`Moving ${enemy.name} to`, turnAction.movement);
                setCharacterPositions(prev => ({
                    ...prev,
                    [enemyId]: turnAction.movement
                }));
            }

            // Apply damage if target selected
            if (turnAction.target && turnAction.useWeapon) {
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
                    
                    setActiveEffects(updatedEffects);
                    
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
                    
                    // Emit to server to sync player health
                    socket.emit('player_damaged', { 
                        room, 
                        playerName: turnAction.target, 
                        damage: damageAmount, 
                        newHealth: Math.max(0, newHealth),
                        bonusHealthConsumed: damageAmount - remainingDamage
                    });
                    
                    console.log(`${turnAction.target} health: ${target.stats.health} → ${Math.max(0, newHealth)} (${damageAmount - remainingDamage} absorbed by bonus health)`);

                }
            }

            // Delay before completing turn
            setTimeout(() => {
                console.log('Enemy turn complete, emitting to server');
                socket.emit('enemy_turn_complete', { room });
            }, 1500);
        };

        const handleEnemiesUpdated = ({ enemies: updatedEnemies }) => {
            console.log('Enemies updated:', updatedEnemies);
            setEnemies(updatedEnemies);
        };

        socket.on("execute_enemy_turn", handleExecuteEnemyTurn);
        socket.on("enemies_updated", handleEnemiesUpdated);

        return () => {
            socket.off("execute_enemy_turn", handleExecuteEnemyTurn);
            socket.off("enemies_updated", handleEnemiesUpdated);
        };
    }, [socket, enemies, playerCharacters, setPlayerCharacters, characterPositions, room, turnOrder, setTurnOrder]);

    const handleGridClick = (row, col) => {
        if (!isMyTurn) return;
        
        // Check if clicking on an enemy with weapon selected
        const characterOnCell = Object.entries(characterPositions).find(
            ([id, pos]) => pos.row === row && pos.col === col
        );
        
        // Handle ability targeting
        if (selectedAbility && characterOnCell) {
            const enemyId = characterOnCell[0];
            const enemy = enemies.find(e => e.id === enemyId);
            
            if (enemy) {
                const abilityData = getAbility(selectedAbility);
                
                // Check if it's a multi-target ability
                if (abilityData.targetType === 'multi-enemy') {
                    // Add to selected targets
                    if (!selectedTargets.includes(enemyId)) {
                        const newTargets = [...selectedTargets, enemyId];
                        setSelectedTargets(newTargets);
                        
                        console.log(`Selected target ${enemy.name}. Total: ${newTargets.length}/${abilityData.maxTargets || 2}`);
                        
                        // If we have enough targets, execute
                        if (newTargets.length >= (abilityData.maxTargets || 2)) {
                            executeAbilityMultiTarget(selectedAbility, newTargets);
                        }
                    }
                } else {
                    // Single target ability
                    executeAbilityOnTarget(selectedAbility, enemyId);
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

        // Calculate max movement based on speed
        const maxMovement = Math.floor(currentPlayerCharacter.stats.speed / 10);
        
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
            
            setCharacterPositions(prev => ({
                ...prev,
                [playerName]: { row, col }
            }));
            setMovementUsed(movementUsed + movementThisStep);
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
        socket.emit('combat_complete', { room, rewards });    }

    const handleAbilityClick = (ability) => {
        if (!isMyTurn || actionUsed) return;
        
        const abilityData = getAbility(ability.id);
        if (!abilityData) return;
        
        // Check cooldown
        if (cooldowns[ability.id] > 0) {
            console.log(`Ability ${ability.name} on cooldown: ${cooldowns[ability.id]} turns remaining`);
            return;
        }
        
        // Handle self-targeted abilities immediately
        if (abilityData.targetType === 'self') {
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
        
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            target: target,
            targets: target ? [target] : undefined, // For multi-target abilities
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
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
            result
        });
        
        setSelectedAbility(null);
        setSelectedTargets([]);
        setActionUsed(true);
        
        // Auto-end turn after 1.5 seconds
        setTimeout(() => {
            handleEndTurn();
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
            result
        });
        
        setSelectedAbility(null);
        setSelectedTargets([]);
        setActionUsed(true);
        
        // Auto-end turn after 1.5 seconds
        setTimeout(() => {
            handleEndTurn();
        }, 1500);
    };

    const handleEndTurn = () => {
        if (!isMyTurn) return;
        console.log('END TURN clicked');
        console.log('Player Name:', playerName);
        console.log('Room:', room);
        
        // Tick down cooldowns using functional update
        setCooldowns(prevCooldowns => tickCooldowns(prevCooldowns));
        
        // Tick down active effects using functional updates to get latest state
        setActiveEffects(prevEffects => {
            setPlayerCharacters(prevChars => {
                const { updatedEffects, updatedCharacters } = tickActiveEffects(prevEffects, prevChars);
                
                console.log('Effects ticked:', {
                    remainingEffects: updatedEffects.length,
                    expiredEffects: prevEffects.length - updatedEffects.length
                });
                
                return updatedCharacters;
            });
            
            const { updatedEffects } = tickActiveEffects(prevEffects, playerCharacters);
            return updatedEffects;
        });
        
        socket.emit('end_turn', { room, playerName });    
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
            <button onClick={handleStoryComplete}>Combat</button>
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
                                <div className="stat-item">
                                    <span className="stat-label">Health</span>
                                    <span className="stat-value">
                                        {currentPlayerCharacter.stats.health}
                                        {activeEffects
                                            .filter(e => e.target === playerName && e.stat === 'health' && e.turnsRemaining > 0)
                                            .map((effect, idx) => (
                                                <span key={idx} className={effect.type === 'stat_buff' ? 'stat-buff' : 'stat-debuff'}>
                                                    {effect.type === 'stat_buff' ? ' +' : ' -'}{effect.value}
                                                </span>
                                            ))}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Speed</span>
                                    <span className="stat-value">
                                        {currentPlayerCharacter.stats.speed}
                                        {activeEffects
                                            .filter(e => e.target === playerName && e.stat === 'speed' && e.turnsRemaining > 0)
                                            .map((effect, idx) => (
                                                <span key={idx} className={effect.type === 'stat_buff' ? 'stat-buff' : 'stat-debuff'}>
                                                    {effect.type === 'stat_buff' ? ' +' : ' -'}{effect.value}
                                                </span>
                                            ))}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Resistance</span>
                                    <span className="stat-value">
                                        {currentPlayerCharacter.stats.resistance}
                                        {activeEffects
                                            .filter(e => e.target === playerName && e.stat === 'resistance' && e.turnsRemaining > 0)
                                            .map((effect, idx) => (
                                                <span key={idx} className={effect.type === 'stat_buff' ? 'stat-buff' : 'stat-debuff'}>
                                                    {effect.type === 'stat_buff' ? ' +' : ' -'}{effect.value}
                                                </span>
                                            ))}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Strength</span>
                                    <span className="stat-value">
                                        {currentPlayerCharacter.stats.strength}
                                        {activeEffects
                                            .filter(e => e.target === playerName && e.stat === 'strength' && e.turnsRemaining > 0)
                                            .map((effect, idx) => (
                                                <span key={idx} className={effect.type === 'stat_buff' ? 'stat-buff' : 'stat-debuff'}>
                                                    {effect.type === 'stat_buff' ? ' +' : ' -'}{effect.value}
                                                </span>
                                            ))}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Technical Ability</span>
                                    <span className="stat-value">
                                        {currentPlayerCharacter.stats.ta}
                                        {activeEffects
                                            .filter(e => e.target === playerName && e.stat === 'ta' && e.turnsRemaining > 0)
                                            .map((effect, idx) => (
                                                <span key={idx} className={effect.type === 'stat_buff' ? 'stat-buff' : 'stat-debuff'}>
                                                    {effect.type === 'stat_buff' ? ' +' : ' -'}{effect.value}
                                                </span>
                                            ))}
                                    </span>
                                </div>
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
                                        </div>
                                        <div className="ability-desc">{ability.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="ultimate-section">
                        <h4>Ultimate</h4>
                        <button className="ultimate-card" disabled={!isMyTurn || actionUsed}>
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


