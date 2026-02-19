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

    const allPlayersSelected = players.every(player => playerCharacters[player]);
    const isPlayerReady = readyPlayers.includes(playerName);

    return (
        <div className='character-select-container'>
            <div className='header'>
                <h1>Character Select</h1>
                <h2>Choose your team</h2>
            </div>

            <div className='main-content'>
                <div className='left-column'>
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
                        <h3>Available Characters:</h3>
                        <div className='character-cards'>
                            {enrichedCharactersData.characters.map((character) => (
                                <div 
                                    key={character.id} 
                                    className={`character-card ${selectedCharacter?.id === character.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        handleCharacterClick(character)
                                        setDisplayClassInfo(true);
                                    }}
                                    onDoubleClick={() => handleAddToTeam(character)}
                                >
                                    <h4>{character.name}</h4>
                                    <p className='role'>{character.role}</p>
                                    <p className='non-combat'>{character.nonCombatRole}</p>
                                    <div className='stats'>
                                        <span>HP: {character.stats.health}</span>
                                        <span>SPD: {character.stats.speed}</span>
                                        <span>RES: {character.stats.resistance}</span>
                                        <span>STR: {character.stats.strength}</span>
                                        <span>TA: {character.stats.ta}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                {selectedCharacter !== "" && displayClassInfo && (
                    <>
                    <div className='class-info-panel'>
                        <div className='character-info'>
                            {selectedCharacter ? (
                                <div className='character-details'>
                                    <h4>{selectedCharacter.name}</h4>
                                    <p><strong>Role:</strong> {selectedCharacter.role}</p>
                                    
                                    <div className='stats-detail'>
                                        <h5>Stats:</h5>
                                        <p>Health: {selectedCharacter.stats.health}</p>
                                        <p>Speed: {selectedCharacter.stats.speed}</p>
                                        <p>Resistance: {selectedCharacter.stats.resistance}</p>
                                        <p>Strength: {selectedCharacter.stats.strength}</p>
                                        <p>TA: {selectedCharacter.stats.ta}</p>
                                    </div>

                                    <div className='weapon-detail'>
                                        <h5>Weapon:</h5>
                                        <p>{selectedCharacter.weapon.name}</p>
                                        {selectedCharacter.weapon.damage && (
                                            <p>Damage: {selectedCharacter.weapon.damage}</p>
                                        )}
                                    </div>

                                    <div className='abilities-detail'>
                                        <h5>Abilities:</h5>
                                        {selectedCharacter.abilities.map((ability, index) => (
                                            <div key={index} className='ability'>
                                                <strong>{ability.name}</strong>
                                                {ability.cooldown && <span> (Cooldown: {ability.cooldown})</span>}
                                                <p>{ability.description}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='ultimate-detail'>
                                        <h5>Ultimate:</h5>
                                        <strong>{selectedCharacter.ultimate.name}</strong>
                                        <p>{selectedCharacter.ultimate.description}</p>
                                    </div>
                                </div>
                            ) : (
                                <p>Select a character to view details</p>
                            )}
                        </div>
                        </div>
                    </>
                )}
            </div>

            <div className='footer-controls'>
                <button 
                    className='ready-button-select' 
                    onClick={handleReady}
                    disabled={!playerCharacters[playerName] || isPlayerReady}
                >
                    {isPlayerReady ? "Ready! Waiting for others..." : "Ready"}
                </button>
                <p className='ready-status'>{readyPlayers}/{players.length} players ready</p>
            </div>
        </div>
    );
};

export default CharacterSelect;