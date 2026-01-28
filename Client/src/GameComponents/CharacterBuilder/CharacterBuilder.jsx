import React, { useState, useEffect } from 'react';
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

const TOTAL_POINTS = 45;
const MAX_POINTS_PER_ATTRIBUTE = 9;

function CharacterBuilder() {
    const { players, playerName, room, socket, playerCharacters } = useGameContext();
    const [attributePoints, setAttributePoints] = useState(
        NON_COMBAT_ATTRIBUTES.reduce((acc, attr) => ({ ...acc, [attr.id]: 0 }), {})
    );
    const [allPlayerPoints, setAllPlayerPoints] = useState({});
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);

    useEffect(() => {
        socket.on('attribute_points_updated', (points) => {
            setAllPlayerPoints(points);
        });

        socket.on('attribute_ready_status', (ready) => {
            setReadyPlayers(ready);
        });

        return () => {
            socket.off('attribute_points_updated');
            socket.off('attribute_ready_status');
        };
    }, [socket]);

    const totalPointsUsed = Object.values(attributePoints).reduce((sum, val) => sum + val, 0);
    const remainingPoints = TOTAL_POINTS - totalPointsUsed;

    const hasDuplicateValues = () => {
        const values = Object.values(attributePoints).filter(v => v > 0);
        return values.length !== new Set(values).size;
    };

    const hasTeamConflict = () => {
        const myPrimary = Object.entries(attributePoints).find(([, points]) => points === 9);
        const mySecondary = Object.entries(attributePoints).find(([, points]) => points === 8);
        
        if (!myPrimary || !mySecondary) return false;
        
        const myPrimaryId = myPrimary[0];
        const mySecondaryId = mySecondary[0];
        
        // Check all other players
        for (const [player, points] of Object.entries(allPlayerPoints)) {
            if (player === playerName) continue;
            
            const theirPrimary = Object.entries(points).find(([, p]) => p === 9);
            const theirSecondary = Object.entries(points).find(([, p]) => p === 8);
            
            if (theirPrimary && theirPrimary[0] === myPrimaryId) return true;
            if (theirPrimary && theirPrimary[0] === mySecondaryId) return true;
            if (theirSecondary && theirSecondary[0] === myPrimaryId) return true;
            if (theirSecondary && theirSecondary[0] === mySecondaryId) return true;
        }
        
        return false;
    };

    const hasInvalidMedicAssignment = () => {
        const myCharacter = playerCharacters[playerName];
        if (!myCharacter || myCharacter.role === 'Support') return false;
        
        const medicPoints = attributePoints['medic'];
        return medicPoints === 9 || medicPoints === 8;
    };

    const canIncrement = (attrId) => {
        const currentValue = attributePoints[attrId];
        const nextValue = currentValue + 1;
        
        if (remainingPoints <= 0) return false;
        if (nextValue > MAX_POINTS_PER_ATTRIBUTE) return false;
        
        return true;
    };

    const canDecrement = (attrId) => {
        return attributePoints[attrId] > 0;
    };

    const handleIncrement = (attrId) => {
        if (canIncrement(attrId)) {
            const newPoints = { ...attributePoints, [attrId]: attributePoints[attrId] + 1 };
            setAttributePoints(newPoints);
            socket.emit('update_attribute_points', { room, playerName, points: newPoints });
        }
    };

    const handleDecrement = (attrId) => {
        if (canDecrement(attrId)) {
            const newPoints = { ...attributePoints, [attrId]: attributePoints[attrId] - 1 };
            setAttributePoints(newPoints);
            socket.emit('update_attribute_points', { room, playerName, points: newPoints });
        }
    };

    const handleReady = () => {
        if (remainingPoints !== 0) {
            alert('You must use all 45 points before readying up!');
            return;
        }
        if (hasDuplicateValues()) {
            alert('No two attributes can have the same point value!');
            return;
        }
        if (hasTeamConflict()) {
            alert('Your primary or secondary conflicts with another team member!');
            return;
        }
        if (hasInvalidMedicAssignment()) {
            alert('Only Support characters can have Medic as their primary or secondary!');
            return;
        }
        
        // Sort attributes from most points to least points
        const sortedAttributes = Object.entries(attributePoints)
            .sort(([, a], [, b]) => b - a)
            .map(([id]) => id);
        
        socket.emit('attribute_ready', { room, playerName, sortedAttributes });
        setIsReady(true);
    };

    return (
        <div className="character-builder-container">
            <div className="builder-header">
                <h1>Character Feats</h1>
                <p>No team member can have the same primary and secondary traits</p>
                <div className="points-display">
                    <span className="points-remaining">Remaining Points: {remainingPoints}</span>
                </div>
            </div>

            <div className="builder-content">
                <div className="attribute-allocation">
                    <h3>Your Attributes</h3>
                    <div className="attributes-list">
                        {NON_COMBAT_ATTRIBUTES.map((attr) => {
                            const currentValue = attributePoints[attr.id];
                            const fillPercentage = (currentValue / MAX_POINTS_PER_ATTRIBUTE) * 100;
                            
                            return (
                                <div 
                                    key={attr.id} 
                                    className="attribute-item"
                                    style={{ '--fill-percentage': `${fillPercentage}%` }}
                                >
                                    <div className="attribute-info">
                                        <h4>{attr.name}</h4>
                                        <p>{attr.description}</p>
                                    </div>
                                    <div className="attribute-controls">
                                        <button 
                                            onClick={() => handleDecrement(attr.id)}
                                            disabled={isReady || !canDecrement(attr.id)}
                                            className="control-btn"
                                        >
                                            -
                                        </button>
                                        <span className="attribute-value">{currentValue}</span>
                                        <button 
                                            onClick={() => handleIncrement(attr.id)}
                                            disabled={!canIncrement(attr.id)}
                                            className="control-btn"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="player-allocations">
                    <h3>Team Allocations</h3>
                    {players.map((player) => {
                        const playerPoints = player === playerName ? attributePoints : (allPlayerPoints[player] || {});
                        const primary = Object.entries(playerPoints).find(([, points]) => points === 9);
                        const secondary = Object.entries(playerPoints).find(([, points]) => points === 8);
                        const character = playerCharacters[player]
                        
                        return (
                            <div key={player} className={`player-stats-card ${player === playerName ? 'current-player' : ''}`}>
                                <h4>{player} - {character?.name || 'No Character'}</h4>
                                <div className="player-abilities">
                                    {primary ? (
                                        <div className="primary-ability">
                                            {NON_COMBAT_ATTRIBUTES.find(a => a.id === primary[0])?.name}
                                        </div>
                                    ) : (
                                        <span className="no-allocation">No primary</span>
                                    )}
                                    {secondary ? (
                                        <div className="secondary-ability">
                                            {NON_COMBAT_ATTRIBUTES.find(a => a.id === secondary[0])?.name}
                                        </div>
                                    ) : (
                                        <span className="no-allocation">No secondary</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {hasDuplicateValues() && (
                <div className="error-message">
                    Warning: No two attributes can have the same point value!
                </div>
            )}

            {hasTeamConflict() && (
                <div className="error-message">
                    Warning: Your primary or secondary conflicts with another team member!
                </div>
            )}

            {hasInvalidMedicAssignment() && (
                <div className="error-message">
                    Only Support characters can have Medic as primary or secondary trait
                </div>
            )}

            <div className="builder-footer">
                <button 
                    className="ready-button" 
                    onClick={handleReady}
                    disabled={isReady || remainingPoints !== 0 || hasDuplicateValues() || hasTeamConflict() || hasInvalidMedicAssignment()}
                >
                    {isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>
    );
};

export default CharacterBuilder;