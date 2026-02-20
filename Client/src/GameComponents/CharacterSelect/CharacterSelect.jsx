import React, { useState } from 'react';
import { useGameContext } from '../../Components/Context';
import charactersData from '../../Components/Characters.json';
import { enrichAllCharacters } from '../../Utils/characterUtils';
import './CharacterSelect.css';

function CharacterSelect() {
    const { players, playerName, playerCharacters, setPlayerCharacters, socket, room, readyPlayers } = useGameContext();
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [displayClassInfo, setDisplayClassInfo] = useState(false);

    const enrichedCharactersData = enrichAllCharacters(charactersData);

    const handleCharacterClick = (character) => {
        setSelectedCharacter(character);
    };

    const handleAddToTeam = (character) => {
        socket.emit("character_selected", { room, playerName, character });
    };

    const handleRemoveFromTeam = () => {
        socket.emit("character_removed", { room, playerName });
    };

    const handleReady = () => {
        if (!playerCharacters[playerName]) {
            alert("Please select a character before readying up!");
            return;
        }
        socket.emit("player_ready", { room, playerName });
    };

    const isPlayerReady = readyPlayers.includes(playerName);

    return (
        <div className='character-select-container'>
            <div className='header'>
                <h1>Character Select</h1>
                <h2>Choose your team</h2>
            </div>

            <div className='main-content'>
                <div className='left-section'>
                    <div className='selected-team'>
                        <h3>Team Selection ({Object.keys(playerCharacters).length}/{players.length})</h3>
                        <div className='team-slots'>
                            {players.map((player, index) => (
                                <div key={index} className='team-slot'>
                                    {playerCharacters[player] ? (
                                        <div className='team-character'>
                                            <span>{playerCharacters[player].name}</span>
                                        </div>
                                    ) : (
                                        <div className='empty-slot'>{player} - Not Selected</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className='team-controls'>
                            <button onClick={handleRemoveFromTeam} disabled={!playerCharacters[playerName]}>Clear</button>
                        </div>
                    </div>
                </div>

                <div className='middle-section'>
                    <div className='characters-grid'>
                        <h3>Available Characters</h3>
                        <div className='character-cards'>
                            {enrichedCharactersData.characters.map((character) => (
                                <div 
                                    key={character.id} 
                                    className={`character-card ${selectedCharacter?.id === character.id ? 'selected' : ''} ${playerCharacters[playerName]?.id === character.id ? 'in-team' : ''}`}
                                    onClick={() => {
                                        handleCharacterClick(character)
                                        setDisplayClassInfo(true);
                                    }}
                                    onDoubleClick={() => handleAddToTeam(character)}
                                >
                                    <h4>{character.name}</h4>
                                    <p className='role'>{character.role}</p>
                                    <div className='mini-stats'>
                                        <div className="stat-pill">HP {character.stats.health}</div>
                                        <div className="stat-pill">SPD {character.stats.speed}</div>
                                        <div className="stat-pill">RES {character.stats.resistance}</div>
                                        <div className="stat-pill">STR {character.stats.strength}</div>
                                        <div className="stat-pill">TA {character.stats.ta}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className='right-section'>
                    {selectedCharacter && displayClassInfo ? (
                        <div className='character-info'>
                            <div className='character-details'>
                                <h4>{selectedCharacter.name}</h4>
                                <p className='detail-role'><strong>Role:</strong> {selectedCharacter.role}</p>
                                <p className='detail-desc'>{selectedCharacter.nonCombatRole}</p>
                                
                                <div className='stats-detail'>
                                    <h5>Stats</h5>
                                    <div className="stat-row"><span>Health</span><span>{selectedCharacter.stats.health}</span></div>
                                    <div className="stat-row"><span>Speed</span><span>{selectedCharacter.stats.speed}</span></div>
                                    <div className="stat-row"><span>Resistance</span><span>{selectedCharacter.stats.resistance}</span></div>
                                    <div className="stat-row"><span>Strength</span><span>{selectedCharacter.stats.strength}</span></div>
                                    <div className="stat-row"><span>TA</span><span>{selectedCharacter.stats.ta}</span></div>
                                </div>

                                <div className='weapon-detail'>
                                    <h5>Weapon: {selectedCharacter.weapon.name}</h5>
                                    {selectedCharacter.weapon.damage && (
                                        <>
                                        <p>Damage: {selectedCharacter.weapon.damage}</p>
                                        <p>{selectedCharacter.weapon.range == 1 ? "Range: Melee" : `Range: ${selectedCharacter.weapon.range}`}</p>
                                        </>
                                    )}
                                </div>

                                <div className='abilities-detail'>
                                    <h5>Abilities</h5>
                                    {selectedCharacter.abilities.map((ability, index) => (
                                        <div key={index} className='ability'>
                                            <div className="ability-header">
                                                <strong>{ability.name}</strong>
                                                {ability.cooldown && <span className="cooldown">CD: {ability.cooldown}</span>}
                                            </div>
                                            <p>{ability.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className='ultimate-detail'>
                                    <h5>Ultimate</h5>
                                    <strong>{selectedCharacter.ultimate.name}</strong>
                                    <p>{selectedCharacter.ultimate.description}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="placeholder-info">
                            <p>Select a character to view details</p>
                        </div>
                    )}
                </div>
            </div>

            <div className='footer-controls'>
                <button 
                    className='ready-button-select' 
                    onClick={handleReady}
                    disabled={!playerCharacters[playerName] || isPlayerReady}
                >
                    {isPlayerReady ? "Ready! Waiting for others..." : "Ready"}
                </button>
            </div>
        </div>
    );
};

export default CharacterSelect;