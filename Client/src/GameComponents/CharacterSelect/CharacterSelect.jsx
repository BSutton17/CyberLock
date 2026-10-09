import React, { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../../Components/Context';
import charactersData from '@shared/data/characters.js';
import { enrichAllCharacters } from '../../Utils/characterUtils';
import './CharacterSelect.css';

const MAX_PARTY_SIZE = 6;

function CharacterSelect() {
    const {
        players,
        playerName,
        playerCharacters,
        setPlayerCharacters,
        socket,
        room,
        readyPlayers,
        getCharacterImage,
        isAdmin,
        bots = []
    } = useGameContext();
    const enrichedCharactersData = enrichAllCharacters(charactersData);
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [displayClassInfo, setDisplayClassInfo] = useState(false);
    const lastTappedCharacterRef = useRef({ id: null, timestamp: 0 });
    const [notice, setNotice] = useState('');

    // The server has the final say on who gets a character (two players can click at once).
    useEffect(() => {
        const handleTaken = () => setNotice('Someone else just took that character. Pick another one.');
        socket.on('character_taken', handleTaken);
        return () => {
            socket.off('character_taken', handleTaken);
        };
    }, [socket]);

    const isCharacterTakenByAnotherPlayer = (characterId) =>
        Object.entries(playerCharacters).some(
            ([player, character]) => player !== playerName && character?.id === characterId
        );

    const handleCharacterClick = (character) => {
        setSelectedCharacter(character);
        setDisplayClassInfo(true);

        const now = Date.now();
        const isRapidRepeatTap =
            lastTappedCharacterRef.current.id === character.id &&
            now - lastTappedCharacterRef.current.timestamp < 400;

        lastTappedCharacterRef.current = {
            id: character.id,
            timestamp: now
        };

        if (isRapidRepeatTap && !isCharacterTakenByAnotherPlayer(character.id)) {
            handleAddToTeam(character);
        }
    };

    const handleAddToTeam = (character) => {
        if (isCharacterTakenByAnotherPlayer(character.id)) {
            setNotice('That character is already taken by another player.');
            return;
        }

        setNotice('');
        socket.emit("character_selected", { room, playerName, character });
    };

    const handleRemoveFromTeam = () => {
        setPlayerCharacters(prev => {
            const updated = { ...prev };
            delete updated[playerName];
            return updated;
        });
        socket.emit("character_removed", { room, playerName });
    };

    const handleReady = () => {
        if (!playerCharacters[playerName]) {
            setNotice('Select a character before readying up.');
            return;
        }

        socket.emit("player_ready", { room, playerName });
    };

    const isPlayerReady = readyPlayers.includes(playerName);
    const isPartyFull = players.length >= MAX_PARTY_SIZE;

    // Bots fill empty seats; the server picks a character for each (a missing role first).
    const handleAddBot = () => {
        setNotice('');
        socket.emit('add_bot', { room }, (result) => {
            if (result && !result.ok) setNotice(result.message || 'Could not add a bot.');
        });
    };

    const handleRemoveBot = (bot) => {
        socket.emit('remove_bot', { room, name: bot }, (result) => {
            if (result && !result.ok) setNotice(result.message || 'Could not remove that bot.');
        });
    };

    return (
        <div className='character-select-container'>
            <div className='header'>
                <h1>Character Select</h1>
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
                                            {bots.includes(player) && <span className='bot-tag'>Bot</span>}
                                            {bots.includes(player) && isAdmin && (
                                                <button className='remove-bot-button' onClick={() => handleRemoveBot(player)} aria-label={`Remove ${player}`}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='empty-slot'>{player} - Not Selected</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className='team-controls'>
                            <button onClick={handleRemoveFromTeam} disabled={!playerCharacters[playerName]}>Clear</button>
                            {isAdmin && (
                                <button onClick={handleAddBot} disabled={isPartyFull} title='A computer-controlled teammate'>
                                    {isPartyFull ? 'Party full' : 'Add bot'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className='middle-section'>
                    <div className='characters-grid'>
                        <h3>Choose Your Character</h3>
                        <div className='character-cards'>
                            {enrichedCharactersData.characters.map((character) => (
                                <div 
                                    key={character.id} 
                                    className={`character-card ${selectedCharacter?.id === character.id ? 'selected' : ''} ${playerCharacters[playerName]?.id === character.id ? 'in-team' : ''}`}
                                    onClick={() => handleCharacterClick(character)}
                                >
                                    <img
                                        className='character-card-image'
                                        src={getCharacterImage(character)}
                                        alt={character.name}
                                    />
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
                                
                                <div className='stats-detail'>
                                    <h5>Stats</h5>
                                    <div className="stat-row"><span>Health</span><span>{selectedCharacter.stats.health}</span></div>
                                    <div className="stat-row"><span>Speed</span><span>{selectedCharacter.stats.speed}</span></div>
                                    <div className="stat-row"><span>Resistance</span><span>{selectedCharacter.stats.resistance}</span></div>
                                    <div className="stat-row"><span>Strength</span><span>{selectedCharacter.stats.strength}</span></div>
                                    <div className="stat-row"><span>TA</span><span>{selectedCharacter.stats.ta}</span></div>
                                </div>

                                {(() => {
                                    const isMine = playerCharacters[playerName]?.id === selectedCharacter.id;
                                    const isTaken = isCharacterTakenByAnotherPlayer(selectedCharacter.id);
                                    return (
                                        <button
                                            className='choose-character-button'
                                            onClick={() => handleAddToTeam(selectedCharacter)}
                                            disabled={isMine || isTaken || isPlayerReady}
                                        >
                                            {isMine ? 'Your character' : isTaken ? 'Taken' : `Play as ${selectedCharacter.name}`}
                                        </button>
                                    );
                                })()}

                                <div className='weapon-detail'>
                                    <h5>Weapon: {selectedCharacter.weapon.name}</h5>
                                    {selectedCharacter.weapon.damage && (
                                        <div className='weapon-stats-grid'>
                                            <div className='weapon-stats'>
                                                <span className='weapon-stat-label'>Damage</span>
                                                <span className='weapon-stat-value'>{selectedCharacter.weapon.damage}</span>
                                            </div>
                                            <div className='weapon-stats'>
                                                <span className='weapon-stat-label'>Range</span>
                                                <span className='weapon-stat-value'>{selectedCharacter.weapon.range == 1 ? "Melee" : selectedCharacter.weapon.range}</span>
                                            </div>
                                        </div>
                                    )}
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

            {notice && <div className='select-notice' role='status'>{notice}</div>}

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