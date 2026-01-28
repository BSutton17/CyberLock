import React from 'react';
import { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import EnemiesData from '../../Components/Enemies.json';
import './Main.css';

function Main() {
    const { players, playerCharacters, playerName, room, socket, attributeAllocations, setGamePhase, isMyTurn, currentTurn, enemies, setEnemies } = useGameContext();
    const [currentPlayerCharacter, setCurrentPlayerCharacter] = useState(null);
    const [ultimateReady, setUltimateReady] = useState(false);
    const [characterPositions, setCharacterPositions] = useState({});

    useEffect(() => {
        if (playerCharacters[playerName]) {
            setCurrentPlayerCharacter(playerCharacters[playerName]);
        }
    }, [playerCharacters, playerName]);

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
            console.log('Enemies received in Main:', enemies);
            const enemyPositions = {};
            const topRow = Math.floor(Math.random() * 2);
            enemies.forEach((enemy, index) => {
                enemyPositions[enemy.id] = { row: topRow, col: index + 3 };
            });
            console.log('Enemy positions:', enemyPositions);
            setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
        }
    }, [enemies]);

    const handleGridClick = (row, col) => {
        if (!isMyTurn) return;
        
        const currentPos = characterPositions[playerName];
        if (!currentPos) return;

        const rowDiff = Math.abs(row - currentPos.row);
        const colDiff = Math.abs(col - currentPos.col);
        const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

        const isOccupied = Object.values(characterPositions).some(
            pos => pos.row === row && pos.col === col
        );

        if (isAdjacent && !isOccupied) {
            setCharacterPositions(prev => ({
                ...prev,
                [playerName]: { row, col }
            }));
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
                                {isEnemy 
                                    ? enemies.find(e => e.id === characterOnCell[0])?.name || 'E'
                                    : playerCharacters[characterOnCell[0]]?.name || '?'
                                }
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

    const handleEndTurn = () => {
        if (!isMyTurn) return;
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
                                            <span className="stat-hp">HP: {character.stats.health}/{character.stats.health}</span>
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
                                <div className="stat-item">
                                    <span className="stat-label">Health</span>
                                    <span className="stat-value">{currentPlayerCharacter.stats.health}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Speed</span>
                                    <span className="stat-value">{currentPlayerCharacter.stats.speed}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Resistance</span>
                                    <span className="stat-value">{currentPlayerCharacter.stats.resistance}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Strength</span>
                                    <span className="stat-value">{currentPlayerCharacter.stats.strength}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Technical Ability</span>
                                    <span className="stat-value">{currentPlayerCharacter.stats.ta}</span>
                                </div>
                            </div>
                            </div>
                    </div>

                    <div className="weapon-section">
                        <h4>Weapon</h4>
                        <div className="weapon-card">
                            <div className="weapon-info">
                                <div className="weapon-name">{currentPlayerCharacter.weapon.name}</div>
                                <div className="weapon-damage">DMG: {currentPlayerCharacter.weapon.damage}</div>
                            </div>
                        </div>
                    </div>

                    <div className="abilities-section">
                        <h4>Abilities</h4>
                        <div className="abilities-grid">
                            {currentPlayerCharacter.abilities.map((ability, index) => (
                                <button key={index} className="ability-card">
                                    <div className="ability-header">
                                        <div className="ability-name">{ability.name}</div>
                                        <div className="ability-cd">CD: {ability.cooldown}</div>
                                    </div>
                                    <div className="ability-desc">{ability.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="ultimate-section">
                        <h4>Ultimate</h4>
                        <button className="ultimate-card">
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

        <button className="end-turn" onClick={handleEndTurn} disabled={!isMyTurn}>End Turn</button>
        </div>

    );
};

export default Main;


