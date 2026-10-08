import React, { useState, useEffect } from 'react';
import { FaFistRaised } from 'react-icons/fa';
import { IoLogoElectron } from 'react-icons/io5';
import { LuCirclePlus } from 'react-icons/lu';
import { useGameContext } from '../../Components/Context';
import { ABILITIES } from '../Main/AbilityStore';
import './ChooseAbilities.css';

function ChooseAbilities(){
    const { players, playerCharacters, setPlayerCharacters, playerName, room, socket, getAbilityScaler, getIsBonusAction } = useGameContext();
    const [isReady, setIsReady] = useState(false);
    const [hasSubmittedReady, setHasSubmittedReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const currentCharacter = playerCharacters?.[playerName] || null;
    const playerLevel = currentCharacter?.level ?? 1;
    const playerRole = currentCharacter?.role ?? '';

    const handleReady = () => {
        if (!isReady || hasSubmittedReady) return;
        const latestCharacter = currentCharacter;
        if (latestCharacter) {
            socket.emit("character_selected", { room, playerName, character: latestCharacter });
        }
        socket.emit('ability_ready', { room, playerName });
        setHasSubmittedReady(true);
    }

    const checkReady = () => {
        const character = currentCharacter;
        if (!character) {
            setIsReady(false);
            return;
        }

        const selectedAbilities = Array.isArray(character.abilities)
            ? character.abilities.filter(Boolean).length
            : 0;

        const requiredAbilityCount = playerLevel < 3 ? 1 : (playerLevel < 5 ? 2 : 3);
        const hasUltimate = playerLevel < 3 || (character.ultimate && typeof character.ultimate === 'object' && !!character.ultimate.id);

        setIsReady(selectedAbilities >= requiredAbilityCount && hasUltimate);
    }

    const assignAbility = (name, index) => {
        const playerInfo = currentCharacter;
        if (!playerInfo) return;
        const abilities = playerInfo.abilities;
        const updateAbilities = Array.isArray(abilities) ? [...abilities] : [];
        updateAbilities[index] = name;
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                abilities: updateAbilities
            }
        }
        
        setPlayerCharacters(updatedCharacter);
        socket.emit("character_selected", { room, playerName, character: updatedCharacter[playerName] });
    }

    const assignUltimate = (name) => {
        const playerInfo = currentCharacter;
        if (!playerInfo) return;
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                ultimate: name
            }
        }
        setPlayerCharacters(updatedCharacter);
        socket.emit("character_selected", { room, playerName, character: updatedCharacter[playerName] });
    }

    useEffect(() => {
        checkReady();
    }, [playerCharacters, currentCharacter]);

    useEffect(() => {
        const handleAbilityReadyStatus = (readyList) => {
            setReadyPlayers(Array.isArray(readyList) ? readyList : []);
        };

        const handleGameStart = () => {
            setHasSubmittedReady(true);
        };

        socket.on('ability_ready_status', handleAbilityReadyStatus);
        socket.on('start_game', handleGameStart);

        return () => {
            socket.off('ability_ready_status', handleAbilityReadyStatus);
            socket.off('start_game', handleGameStart);
        };
    }, [socket]);

    return (
        <div className="choose-abilities-wrapper">
            <div className="abilities-header">
                <h1>Choose Abilities</h1>
            </div>

            <div className="abilities-content">
                <div className="character-panel">
                    <div className="character-section">
                        <h3>Character</h3>
                        <div className="character-info">
                            <p className="character-name">{currentCharacter?.name || 'Loading...'}</p>
                            <p className="character-level">Level {playerLevel}</p>
                            <p className="character-role">{currentCharacter?.role || '-'}</p>
                        </div>
                    </div>

                    <div className="current-abilities-section">
                        <h3>Current Abilities</h3>
                        <div className="current-abilities-list">
                            {Array.isArray(currentCharacter?.abilities) && currentCharacter.abilities.map((ability, index) => (
                                ability ? (
                                    <div key={index} className="current-ability-item">
                                        <div className='damage-scaling-list'>{getAbilityScaler(ability)}{getIsBonusAction(ability)}</div>
                                        <span className="ability-level">Level {[1, 3, 5][index]}</span>
                                        <div className="ability-details">
                                            <span className="ability-name">{ability.name || 'Empty'}</span>
                                            <p className='ability-description'>{ability.description}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={index} className="current-ability-item empty">
                                        <span className="ability-level">Level {[1, 3, 5][index]}</span>
                                        <div className="ability-details">
                                            <span className="ability-name">Empty Slot</span>
                                        </div>
                                    </div>
                                )
                            ))}
                            {currentCharacter?.ultimate && (
                                <div className="current-ability-item ultimate">
                                    <span className="ability-level">Ultimate</span>
                                    <div className="ability-details">
                                        <span className="ability-name">{currentCharacter.ultimate.name || 'Empty'}</span>
                                        <p className='ability-description'>{currentCharacter.ultimate.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="abilities-panel">
                    {(() => {
                        const ultimateAbilities = Object.entries(ABILITIES)
                            .filter(([, ability]) => (ability.isUltimate && ability.role === playerRole));
                        
                        const level5Abilities = Object.entries(ABILITIES)
                            .filter(([, ability]) => (ability.level === 5 && ability.role === playerRole));
                        
                        const level3Abilities = Object.entries(ABILITIES)
                            .filter(([, ability]) => (ability.level === 3 && ability.role === playerRole));
                        
                        const level1Abilities = Object.entries(ABILITIES)
                            .filter(([, ability]) => (ability.level === 1 && ability.role === playerRole));

                        const currentUltimate = currentCharacter?.ultimate;
                        const currentAbilities = currentCharacter?.abilities;

                        return (
                            <>
                                {ultimateAbilities.length > 0 && (
                                    <div className="dropdown-container ultimate-category">
                                        <button 
                                            className="dropdown-toggle ultimate-btn"
                                            onClick={() => setExpandedCategory(expandedCategory === 'ultimate' ? null : 'ultimate')}
                                            disabled={playerLevel < 3}
                                        >
                                            <span className="dropdown-title">Ultimate Ability</span>
                                            <span className="dropdown-selected">
                                                {currentUltimate?.name || 'Select...'}
                                            </span>
                                            <span className={`dropdown-arrow ${expandedCategory === 'ultimate' ? 'open' : ''}`}>▼</span>
                                        </button>
                                        {expandedCategory === 'ultimate' && (
                                            <div className="dropdown-menu">
                                                {ultimateAbilities.map(([, ability]) => (
                                                    <button 
                                                        key={ability.name}
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            assignUltimate(ability);
                                                            setExpandedCategory(null);
                                                        }}
                                                    >
                                                        <span className='ability-description-drop'><span className='ability-name-drop'>{ability.name}</span> - {ability.description} {getAbilityScaler(ability)}{getIsBonusAction(ability)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {level5Abilities.length > 0 && (
                                    <div className="dropdown-container level5-category">
                                        <button 
                                            className="dropdown-toggle level5-btn"
                                            onClick={() => setExpandedCategory(expandedCategory === 'level5' ? null : 'level5')}
                                            disabled={playerLevel < 5}
                                        >
                                            <span className="dropdown-title">Level 5 Ability</span>
                                            <span className="dropdown-selected">
                                                {Array.isArray(currentAbilities) && currentAbilities[2] ? currentAbilities[2].name : 'Select...'}
                                            </span>
                                            <span className={`dropdown-arrow ${expandedCategory === 'level5' ? 'open' : ''}`}>▼</span>
                                        </button>
                                        {expandedCategory === 'level5' && (
                                            <div className="dropdown-menu">
                                                {level5Abilities.map(([, ability]) => (
                                                    <button 
                                                        key={ability.name}
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            assignAbility(ability, 2);
                                                            setExpandedCategory(null);
                                                        }}
                                                    >
                                                        <span className="ability-description-drop"><span className='ability-name-drop'>{ability.name}</span> - {ability.description} {getAbilityScaler(ability)}{getIsBonusAction(ability)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {level3Abilities.length > 0 && (
                                    <div className="dropdown-container level3-category">
                                        <button 
                                            className="dropdown-toggle level3-btn"
                                            onClick={() => setExpandedCategory(expandedCategory === 'level3' ? null : 'level3')}
                                            disabled={playerLevel < 3}
                                        >
                                            <span className="dropdown-title">Level 3 Ability</span>
                                            <span className="dropdown-selected">
                                                {Array.isArray(currentAbilities) && currentAbilities[1] ? currentAbilities[1].name : 'Select...'}
                                            </span>
                                            <span className={`dropdown-arrow ${expandedCategory === 'level3' ? 'open' : ''}`}>▼</span>
                                        </button>
                                        {expandedCategory === 'level3' && (
                                            <div className="dropdown-menu">
                                                {level3Abilities.map(([, ability]) => (
                                                    <button 
                                                        key={ability.name}
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            assignAbility(ability, 1);
                                                            setExpandedCategory(null);
                                                        }}
                                                    >
                                                        <span className="ability-description-drop"><span className='ability-name-drop'>{ability.name}</span> - {ability.description} {getAbilityScaler(ability)}{getIsBonusAction(ability)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {level1Abilities.length > 0 && (
                                    <div className="dropdown-container level1-category">
                                        <button 
                                            className="dropdown-toggle level1-btn"
                                            onClick={() => setExpandedCategory(expandedCategory === 'level1' ? null : 'level1')}
                                            disabled={playerLevel < 1}
                                        >
                                            <span className="dropdown-title">Level 1 Ability</span>
                                            <span className="dropdown-selected">
                                                {Array.isArray(currentAbilities) && currentAbilities[0] ? currentAbilities[0].name : 'Select...'}
                                            </span>
                                            <span className={`dropdown-arrow ${expandedCategory === 'level1' ? 'open' : ''}`}>▼</span>
                                        </button>
                                        {expandedCategory === 'level1' && (
                                            <div className="dropdown-menu">
                                                {level1Abilities.map(([, ability]) => (
                                                    <button 
                                                        key={ability.name}
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            assignAbility(ability, 0);
                                                            setExpandedCategory(null);
                                                        }}
                                                    >
                                                       <span className="ability-description-drop"><span className='ability-name-drop'>{ability.name}</span> - {ability.description} {getAbilityScaler(ability)}{getIsBonusAction(ability)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            <div className="ability-legend" aria-label="Ability icon legend">
                <div className="ability-legend-list">
                    <div className="ability-legend-item">
                        <span className="ability-legend-icon"><FaFistRaised /></span>
                        <span>Ability scales with strength</span>
                    </div>
                    <div className="ability-legend-item">
                        <span className="ability-legend-icon"><IoLogoElectron /></span>
                        <span>Ability scales with TA</span>
                    </div>
                    <div className="ability-legend-item">
                        <span className="ability-legend-icon"><LuCirclePlus /></span>
                        <span>Bonus action</span>
                    </div>
                </div>
            </div>

            <div className="builder-footer">
                <button 
                    className="ready-button" 
                    onClick={handleReady}
                    disabled={!isReady || hasSubmittedReady}
                >
                    {!isReady ? 'Select Required Abilities' : (hasSubmittedReady ? 'Waiting for others...' : 'Ready')}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>
    )
}

export default ChooseAbilities;