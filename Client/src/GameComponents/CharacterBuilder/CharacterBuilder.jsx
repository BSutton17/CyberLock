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

function CharacterBuilder() {
    const { players, playerName, room, socket, playerCharacters, getCharacterImage, allPlayerAttributes, setAllPlayerAttributes } = useGameContext();
    const [playerAttributes, setPlayerAttributes] = useState(Array(10).fill(null));
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [showDescription, setShowDescription] = useState(null);
    const character = playerCharacters[playerName]; 
    const [count, setCount] = useState(0);

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
    }, [socket]);

    const setAttribute = (attr) => {
        if(playerAttributes[0] === null || count === 0 && playerAttributes[1] !== null){
            // setPrimaryAttribute(attr.name);
            setPlayerAttributes(prevAttributes => {
                const newAttributes = [...prevAttributes];
                newAttributes[0] = attr.name;
                socket.emit('update_attributes', { room, playerName, newAttributes});
                return newAttributes;
            });
        }else if (playerAttributes[1] === null || count === 1 && playerAttributes[0] !== null){
            // setSecondaryAttribute(attr.name);
            setPlayerAttributes(prevAttributes => {
                const newAttributes = [...prevAttributes];
                newAttributes[1] = attr.name;
                socket.emit('update_attributes', { room, playerName, newAttributes });
                return newAttributes;
            });
        }
        setCount(count? 0 : 1);
    }

    const clearAttribute = (index) => {
        setPlayerAttributes(prevAttributes => {
            const newAttributes = [...prevAttributes];
            newAttributes[index] = null;
            socket.emit('update_attributes', { room, playerName, newAttributes });
            return newAttributes;
        });
    }

    const hasTeamConflict = () => {
        const myPrimary = playerAttributes[0];

        if (!myPrimary) return false;

        if (players.length === 6) {
            for (const [player, theirAttributes] of Object.entries(allPlayerAttributes)) {
                if (player === playerName) continue;

                const theirPrimary = theirAttributes[0];
                if (theirPrimary  === myPrimary) return true;
            }

            return false;
        }

        const mySecondary = playerAttributes[1];
        if (!mySecondary) return false;

        for (const [player, theirAttributes] of Object.entries(allPlayerAttributes)) {
            if (player === playerName || !Array.isArray(theirAttributes)) continue;

            const theirPrimary = theirAttributes[0] || null;
            const theirSecondary = theirAttributes[1] || null;

            if (theirPrimary === myPrimary) return true;

            if (players.length !== 6 && mySecondary) {
                if (theirPrimary === mySecondary || theirSecondary === myPrimary || theirSecondary === mySecondary) {
                    return true;
                }
            }
        }
        return false;
    }

    const handleReady = () => {
        setIsReady(true);
        socket.emit('attribute_part1_ready', { room, playerName});
    }

    const isDisabled = (attr) => {
        if(players.length === 2){
            const primaryAttributes = Object.values(allPlayerAttributes).map(attrs => Array.isArray(attrs) ? attrs[0] : null);
            return primaryAttributes.includes(attr);
        }
        for (const [player, theirAttributes] of Object.entries(allPlayerAttributes)) {
            if (theirAttributes.includes(attr)) {
                return true;
            }
        }
        return false;
    }

    return(
        <div className="character-builder-container">
            <div className="builder-header">
                <h1>Character Feats</h1>
                {players.length === 6 ? (
                    <p>Since you have a full team, you must choose a unique primary attribute. Your secondary is optional.</p>
                ) : (
                    <p>You must choose a unique primary and secondary attribute.</p>
                )}
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
                                    <h4>Primary Attribute</h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[0] || ''}
                                    placeholder="Primary Attribute"
                                    onClick={() => clearAttribute(0)}
                                />
                            </div>
                            <div className="attribute-box">
                                <h4>Secondary Attribute</h4>
                                <input
                                    type="text"
                                    readOnly
                                    value={playerAttributes[1] || ''}
                                    placeholder="Secondary Attribute"
                                    onClick={() => clearAttribute(1)}
                                />
                            </div>
                        </div>

                        <div className="allocation-column allocation-attributes">
                            <div className="attributes-list">
                                {NON_COMBAT_ATTRIBUTES.map((attr) => (
                                    <div className="attribute-info" key={attr.id}>
                                        <div
                                            onMouseEnter={() => setShowDescription(attr.id)}
                                            onMouseLeave={() => setShowDescription(null)}
                                            
                                            className='item-name'
                                        >
                                            <button onClick={() => {
                                                setAttribute(attr);
                                            }}
                                            disabled ={playerAttributes[0] === attr.name || playerAttributes[1] === attr.name || isDisabled(attr.name)}
                                            >{attr.name}</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="player-allocations">
                    <h3>Team Allocations</h3>
                    {players.map((player) => {
                        const teamAttributes =
                            player === playerName
                                ? playerAttributes
                                : Array.isArray(allPlayerAttributes[player])
                                ? allPlayerAttributes[player]
                                : [null, null];

                        const primary = teamAttributes?.[0] || null;
                        const secondary = teamAttributes?.[1] || null;
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
                    disabled={hasTeamConflict() || !playerAttributes[0] || !playerAttributes[1]}
                >
                    {isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>    
    );
};

export default CharacterBuilder;