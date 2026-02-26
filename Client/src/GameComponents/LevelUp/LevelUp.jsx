import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import './LevelUp.css';

const TOTAL_POINTS = 10;
const STATS = [
    { id: 'maxHealth', label: 'Max Health' },
    { id: 'speed', label: 'Speed' },
    { id: 'resistance', label: 'Resistance' },
    { id: 'strength', label: 'Strength' },
    { id: 'ta', label: 'Technical Ability' }
];

function LevelUp(){
    const {players, playerCharacters, setPlayerCharacters, playerName, room, socket } = useGameContext();
    const [isReady, setIsReady] = useState(false);
    const [levelPoints, setLevelPoints] = useState(
        STATS.reduce((acc, attr) => ({ ...acc, [attr.id]: 0}), {})
    );

    const currentCharacter = playerCharacters[playerName];

    useEffect(() => {
        if (!currentCharacter) return;
        setLevelPoints(STATS.reduce((acc, attr) => ({ ...acc, [attr.id]: 0}), {}));
    }, [currentCharacter?.id]);

    const totalPointsUsed = Object.values(levelPoints).reduce((sum, val) => sum + val, 0);
    const remainingPoints = TOTAL_POINTS - totalPointsUsed;

    const handleReady = () => {
        // Check if applied all points
        if(remainingPoints != 0){
            alert('You must apply all your points before readying up!');
            return;
        }
        const playerInfo = currentCharacter;
        const stats = currentCharacter.stats;
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                stats: {
                    ...stats,
                    health: currentCharacter.stats.maxHealth
                }
            }
        }
        setPlayerCharacters(updatedCharacter);

        socket.emit('level_up_complete', {room, players: updatedCharacter});
        setIsReady(true);
    }

    const canIncrement = () => {
        if (remainingPoints <= 0) return false;        
        return true;
    };

    const handleIncrement = (attrId) => {
        if (canIncrement()) {
            const newPoints = { ...levelPoints, [attrId]: levelPoints[attrId] + 1 };
            setLevelPoints(newPoints);

            const playerInfo = currentCharacter;
            const stats = currentCharacter.stats;
            const updatedCharacter = {
                ...playerCharacters,
                [playerName]: {
                    ...playerInfo,
                    stats: {
                        ...stats,
                        [attrId]: currentCharacter.stats[attrId] + 1,
                    }
                }
            }
            setPlayerCharacters(updatedCharacter);
        }
    };

    const canDecrement = (attrId) => {
        return levelPoints[attrId] > 0;
    };

    const handleDecrement = (attrId) => {
        if (canDecrement(attrId)) {
            const newPoints = { ...levelPoints, [attrId]: levelPoints[attrId] - 1 };
            setLevelPoints(newPoints);

            const playerInfo = currentCharacter;
            const stats = currentCharacter.stats;
            const updatedCharacter = {
                ...playerCharacters,
                [playerName]: {
                    ...playerInfo,
                    stats: {
                        ...stats,
                        [attrId]: currentCharacter.stats[attrId] - 1,
                    }
                }
            }
            setPlayerCharacters(updatedCharacter);
        }
    };

    if (!currentCharacter) {
        return (
            <div className="level-up-container">
                <div className="levelup-header">
                    <h1>Level Up</h1>
                </div>
                <div className="levelup-empty">Waiting for your character data...</div>
            </div>
        );
    }

    return(
        <div className="level-up-container">
            <div className="levelup-header">
                <h1>Level Up</h1>
                <p>Distribute all points before confirming</p>
                <div className="levelup-points-display">
                    <span className="levelup-points-remaining">Remaining Points: {remainingPoints}</span>
                </div>
            </div>

            <div className="levelup-content">
                <div className="levelup-allocation">
                    <h3>Allocate Stats</h3>
                    <div className="levelup-stats-list">
                        {STATS.map((stat) => (
                            <div key={stat.id} className="levelup-stat-row">
                                <div className="levelup-stat-info">
                                    <span className="levelup-stat-name">{stat.label}</span>
                                    <span className="levelup-stat-added">+{levelPoints[stat.id]}</span>
                                </div>

                                <div className="levelup-stat-controls">
                                    <button
                                        className="levelup-control-btn"
                                        onClick={() => handleDecrement(stat.id)}
                                        disabled={isReady || !canDecrement(stat.id)}
                                    >
                                        -
                                    </button>
                                    <button
                                        className="levelup-control-btn"
                                        onClick={() => handleIncrement(stat.id)}
                                        disabled={isReady || !canIncrement()}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="levelup-preview">
                    <h3>{currentCharacter.name}</h3>
                    <div className="levelup-preview-grid">
                        <div className="levelup-preview-item">
                            <span className="levelup-preview-label">Max Health</span>
                            <span className="levelup-preview-value">{currentCharacter.stats.maxHealth}</span>
                        </div>
                        <div className="levelup-preview-item">
                            <span className="levelup-preview-label">Speed</span>
                            <span className="levelup-preview-value">{currentCharacter.stats.speed}</span>
                        </div>
                        <div className="levelup-preview-item">
                            <span className="levelup-preview-label">Resistance</span>
                            <span className="levelup-preview-value">{currentCharacter.stats.resistance}</span>
                        </div>
                        <div className="levelup-preview-item">
                            <span className="levelup-preview-label">Strength</span>
                            <span className="levelup-preview-value">{currentCharacter.stats.strength}</span>
                        </div>
                        <div className="levelup-preview-item">
                            <span className="levelup-preview-label">Technical Ability</span>
                            <span className="levelup-preview-value">{currentCharacter.stats.ta}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="levelup-footer">
                <button 
                    className="levelup-ready-button" 
                    onClick={handleReady}
                    disabled={isReady || remainingPoints !== 0}
                >
                    {isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="levelup-status">Players in party: {players.length}</p>
            </div>
        </div>
    )
}

export default LevelUp;