import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import './LevelUp.css';

const TOTAL_POINTS = 15;
const STATS = [
    { id: 'maxHealth', label: 'Max Health' },
    { id: 'speed', label: 'Speed' },
    { id: 'resistance', label: 'Resistance' },
    { id: 'strength', label: 'Strength' },
    { id: 'ta', label: 'Technical Ability' }
];

const STAT_CAP_BONUS = 30;
const MAX_CHARACTER_LEVEL = 5;

function LevelUp(){
    const {players, playerCharacters, setPlayerCharacters, playerName, room, socket } = useGameContext();
    const [hasSubmittedReady, setHasSubmittedReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [levelPoints, setLevelPoints] = useState(
        STATS.reduce((acc, attr) => ({ ...acc, [attr.id]: 0}), {})
    );
    const [baseStats, setBaseStats] = useState(null);
    const [error, setError] = useState('');

    const currentCharacter = playerCharacters[playerName];
    const isMaxLevel = (currentCharacter?.level || 1) >= MAX_CHARACTER_LEVEL;

    useEffect(() => {
        if (!currentCharacter) return;
        setLevelPoints(STATS.reduce((acc, attr) => ({ ...acc, [attr.id]: 0}), {}));
        setBaseStats({ ...currentCharacter.stats });
    }, [currentCharacter?.id]);

    useEffect(() => {
        const handleLevelReadyStatus = (readyList) => {
            const list = Array.isArray(readyList) ? readyList : [];
            setReadyPlayers(list);
            // The server counts max-level players (and anyone who already submitted) as ready.
            if (list.includes(playerName)) setHasSubmittedReady(true);
        };

        const handleLevelComplete = () => {
            setHasSubmittedReady(true);
        };

        const handleRejected = ({ message } = {}) => {
            setError(message || 'Your level up was not accepted. Please try again.');
            setHasSubmittedReady(false);
        };

        socket.on('level_up_ready_status', handleLevelReadyStatus);
        socket.on('level_up_complete', handleLevelComplete);
        socket.on('level_up_rejected', handleRejected);
        // After a refresh, ask the server where this level-up stands.
        socket.emit('request_ready_status');

        return () => {
            socket.off('level_up_ready_status', handleLevelReadyStatus);
            socket.off('level_up_complete', handleLevelComplete);
            socket.off('level_up_rejected', handleRejected);
        };
    }, [socket, playerName]);

    const totalPointsUsed = Object.values(levelPoints).reduce((sum, val) => sum + val, 0);
    const remainingPoints = TOTAL_POINTS - totalPointsUsed;

    const getStatCap = (attrId) => {
        const baseValue = baseStats?.[attrId] ?? currentCharacter?.stats?.[attrId] ?? 0;
        return baseValue + STAT_CAP_BONUS;
    };

    const handleReady = () => {
        if (hasSubmittedReady) return;
        if (remainingPoints !== 0) {
            setError('Spend all your points before readying up.');
            return;
        }
        setError('');
        const playerInfo = currentCharacter;
        const stats = currentCharacter.stats;
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                level: Math.min(MAX_CHARACTER_LEVEL, (playerInfo?.level || 1) + 1),
                stats: {
                    ...stats,
                    health: currentCharacter.stats.maxHealth
                }
            }
        }
        setPlayerCharacters(updatedCharacter);

        socket.emit('level_up_ready', {
            room,
            playerName,
            updatedCharacter: updatedCharacter[playerName]
        });
        setHasSubmittedReady(true);
    }

    const canIncrement = (attrId) => {
        if (remainingPoints <= 0) return false;
        const currentValue = currentCharacter?.stats?.[attrId] ?? 0;
        const cap = getStatCap(attrId);
        return currentValue < cap;
    };

    const handleIncrement = (attrId) => {
        if (canIncrement(attrId)) {
            const cap = getStatCap(attrId);
            const currentValue = currentCharacter?.stats?.[attrId] ?? 0;
            const nextValue = Math.min(currentValue + 1, cap);
            if (nextValue === currentValue) return;

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
                        [attrId]: nextValue,
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
        return <div className="level-up-container"><div className="levelup-header"><h1>Level Up</h1><p>Loading your character...</p></div></div>;
    }

    if (isMaxLevel) {
        return (
            <div className="level-up-container">
                <div className="levelup-header">
                    <h1>Max Level</h1>
                    <p>{currentCharacter.name} is already level {MAX_CHARACTER_LEVEL}. Waiting for the rest of the crew to level up.</p>
                </div>
                <div className="levelup-footer">
                    <p className="levelup-status">{readyPlayers.length}/{players.length} players ready</p>
                </div>
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
                                    {/* Shown on phones, where the preview panel is hidden to fit one screen. */}
                                    <span className="levelup-stat-value">{currentCharacter.stats[stat.id]}</span>
                                    <span className="levelup-stat-added">+{levelPoints[stat.id]}</span>
                                </div>

                                <div className="levelup-stat-controls">
                                    <button
                                        className="levelup-control-btn"
                                        onClick={() => handleDecrement(stat.id)}
                                        disabled={hasSubmittedReady || !canDecrement(stat.id)}
                                    >
                                        -
                                    </button>
                                    <button
                                        className="levelup-control-btn"
                                        onClick={() => handleIncrement(stat.id)}
                                        disabled={hasSubmittedReady || !canIncrement(stat.id)}
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
                {error && <p className="levelup-error" role="alert">{error}</p>}
                <button 
                    className="levelup-ready-button" 
                    onClick={handleReady}
                    disabled={hasSubmittedReady || remainingPoints !== 0}
                >
                    {hasSubmittedReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="levelup-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>
    )
}

export default LevelUp;