import React, { useState, useEffect, use } from 'react';
import { useGameContext } from '../../Components/Context';
import './CharacterBuilder.css';

const NON_COMBAT_ATTRIBUTES = [
    { id: 'politician', name: 'Politician', description: 'Politicians excel at persuasion, negotiation, and public influence. They thrive in situations involving diplomacy, alliances, or shifting public opinion.' },
    { id: 'intimidation', name: 'Intimidation', description: 'Characters with Intimidation can coerce others through threats or presence. They thrive when pressure, leverage, or force of personality is required.' },
    { id: 'scholar', name: 'Scholar', description: 'Scholars possess deep academic or historical knowledge. They thrive in situations that require research, deciphering ancient texts, or understanding complex systems and lore.' },
    { id: 'spy', name: 'Spy', description: 'Spies are information gatherers in settings that require stealth. They thrive in situations that require secrecy, surveillance, and precision.' },
    { id: 'detective', name: 'Detective', description: 'Detectives can sniff out a clue a mile away. They thrive in situations that require investigation, pattern recognition, or solving mysteries.' },
    { id: 'medic', name: 'Medic', description: 'Medics specialize in treatment and recovery outside of combat. They thrive when diagnosing illnesses, stabilizing injuries, or providing long-term care.' },
    { id: 'navigator', name: 'Navigator', description: 'Navigators know the city like the back of their hand. When deciding where to go, Navigators get the final say.' },
    { id: 'banker', name: 'Banker', description: 'Bankers understand money, contracts, and economic leverage. They thrive in situations involving financial literacy or negotiating prices.' },
    { id: 'crook', name: 'Crook', description: 'Crooks live on the edge of the law. They are familiar with navigating the criminal underworld.' },
    { id: 'electrician', name: 'Electrician', description: 'Electricians are experts in power systems and circuitry. They thrive when repairing, sabotaging, or rerouting electrical systems and technology.' }
];

function CharacterBuilderPart2() {
    const { players, playerName, room, socket, playerCharacters, getCharacterImage, allPlayerAttributes, setAllPlayerAttributes } = useGameContext();
    const [playerAttributes, setPlayerAttributes] = useState(allPlayerAttributes[playerName] || Array(10).fill(null));
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [showDescription, setShowDescription] = useState(null);
    const character = playerCharacters[playerName]; 

    useEffect(() => {
        socket.on('attributes_updated', (attrs) => {
            setAllPlayerAttributes(attrs);
        });

        socket.on('attribute_ready_status', (ready) => {
            setReadyPlayers(ready);
        });

        return () => {
            socket.off('attributes_updated');
            socket.off('attribute_ready_status');
        };
    }, [socket, playerName]);

    const setAttribute = (attr) => {
        setPlayerAttributes((prev) => {
            const newAttributes = [...prev];
            // Find the next available slot starting from index 2
            for (let i = 2; i < 10; i++) {
                if (newAttributes[i] === null) {
                    newAttributes[i] = attr.name;
                    break;
                }
            }
            socket.emit('update_attributes', { room, playerName, newAttributes});
            return newAttributes;
        });
    }

    const clearAttribute = (index) => {
        setPlayerAttributes((prev) => {
            const newAttributes = [...prev];
            newAttributes[index] = null;
            socket.emit('update_attributes', { room, playerName, newAttributes});
            return newAttributes;
        });
    }

    const hasTeamConflict = () => {
        return false; // No conflicts in part 2
    }

    const handleReady = () => {
        setIsReady(true);
        socket.emit('attributes_part2_ready', { room, playerName});
    }

    const isDisabled = (attr) => {
        return playerAttributes.includes(attr.name);
    }

    return(
        <div className="character-builder-container">
            <div className="builder-header">
                <h1>Character Feats</h1>
                    <p>Choose the order of your other Attributes</p>
            </div>

            <div className="builder-content">
                <div className="attribute-allocation">
                    <h3>Your Attributes</h3>
                    <div className="allocation-grid">
                        <div className="allocation-column allocation-image">
                            <div className='character-card'>
                                {character && (
                                    <img
                                        className='character-card-image'
                                        src={getCharacterImage(character)}
                                        alt={character.name || 'Character'}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="allocation-column">
                            <div className="attribute-box">
                                    <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[2] || ''}
                                    placeholder="3rd"
                                    onClick={() => clearAttribute(2)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[3] || ''}
                                    placeholder="4th"
                                    onClick={() => clearAttribute(3)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[4] || ''}
                                    placeholder="5th"
                                    onClick={() => clearAttribute(4)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[5] || ''}
                                    placeholder="6th"
                                    onClick={() => clearAttribute(5)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[6] || ''}
                                    placeholder="7th"
                                    onClick={() => clearAttribute(6)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[7] || ''}
                                    placeholder="8th"
                                    onClick={() => clearAttribute(7)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[8] || ''}
                                    placeholder="9th"
                                    onClick={() => clearAttribute(8)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4></h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[9] || ''}
                                    placeholder="10th"
                                    onClick={() => clearAttribute(9)}
                                />
                            </div>
                        </div>

                        <div className="allocation-column allocation-attributes">
                            <div className="attributes-list">
                                {NON_COMBAT_ATTRIBUTES.filter(attr => !(allPlayerAttributes[playerName]?.slice(0, 2) || []).includes(attr.name)).map((attr) => (
                                    <button 
                                        className="attribute-item" 
                                        key={attr.id}
                                        onMouseEnter={() => setShowDescription(attr.id)}
                                        onMouseLeave={() => setShowDescription(null)}
                                        onClick={() => setAttribute(attr)}
                                        disabled={playerAttributes.includes(attr.name)}
                                    >
                                        <div className="attribute-info">
                                            <h4>{attr.name}</h4>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="player-allocations">
                    <h3>Team Allocations</h3>
                    {players.map((player) => {
                        const attributes =
                            player === playerName
                                ? playerAttributes
                                : Array.isArray(allPlayerAttributes[player])
                                ? allPlayerAttributes[player]
                                : [null, null];

                        const primary = attributes?.[0] || null;
                        const secondary = attributes?.[1] || null;
                        const character = playerCharacters[player];

                        return (
                            <div key={player} className={`player-stats-card ${player === playerName ? 'current-player' : ''}`}>
                                <h4>{player} - {character?.name || 'No Character'}</h4>
                                <div className="player-abilities">
                                    {primary ? (
                                        <div className="primary-ability">{primary}</div>
                                    ) : (
                                        <span className="no-allocation">No primary</span>
                                    )}
                                    {secondary ? (
                                        <div className="secondary-ability">{secondary}</div>
                                    ) : (
                                        <span className="no-allocation">No secondary</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {showDescription && (
                <div className="desc-message">
                        {NON_COMBAT_ATTRIBUTES.find(a => a.id === showDescription)?.description}
                </div>
            )}

            {hasTeamConflict() && (
                <div className="error-message">
                    Warning: Your primary or secondary conflicts with another team member!
                </div>
            )}


            <div className="builder-footer">
                <button 
                    className="ready-button" 
                    onClick={handleReady}
                    disabled={hasTeamConflict() || playerAttributes.slice(2).some(attr => attr === null)}
                >
                    {isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>    
    );
};

export default CharacterBuilderPart2;