import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import './LevelUp.css';

const TOTAL_POINTS = 10;
const STATS = [
    { id: 'maxHealth'},
    { id: 'speed'},
    { id: 'resistance'},
    { id: 'strength'},
    { id: 'ta'}
];

function LevelUp(){
    const {players, playerCharacters, setPlayerCharacters, playerName, room, socket } = useGameContext();
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [levelPoints, setLevelPoints] = useState(
        STATS.reduce((acc, attr) => ({ ...acc, [attr.id]: 0}), {})
    );

    const totalPointsUsed = Object.values(levelPoints).reduce((sum, val) => sum + val, 0);
    const remainingPoints = TOTAL_POINTS - totalPointsUsed;

    const handleReady = () => {
        // Check if applied all points
        if(remainingPoints != 0){
            alert('You must apply all your points before readying up!');
            return;
        }
        const currentCharacter = playerCharacters[playerName];
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

        socket.emit('level_up_complete', {room});
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

            const currentCharacter = playerCharacters[playerName];
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

            const currentCharacter = playerCharacters[playerName];
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
            console.log(playerCharacters);
        }
    };

    return(
        <div>
            <div className="builder-header">
                <h1>Available Level Up points</h1>
                <div className="points-display">
                    <span className="points-remaining">Remaining Points: {remainingPoints}</span>
                </div>
            </div>
            <div>
                <button onClick={() => handleIncrement("maxHealth")}>+ maxHealth</button>
                
                <button onClick={() => handleIncrement("speed")}>+ speed</button>
            
                <button onClick={() => handleIncrement("resistance")}>+ resistance</button>
            
                <button onClick={() => handleIncrement("strength")}>+ strength</button>
            
                <button onClick={() => handleIncrement("ta")}>+ ta</button>
            <div>
                <button onClick={() => handleDecrement("maxHealth")}>- maxHealth</button>
                
                <button onClick={() => handleDecrement("speed")}>- speed</button>
            
                <button onClick={() => handleDecrement("resistance")}>- resistance</button>
            
                <button onClick={() => handleDecrement("strength")}>- strength</button>
            
                <button onClick={() => handleDecrement("ta")}>- ta</button>
            </div>

            </div>

            <div className="stats-grid">
                {(() => {
                    return (
                        <>
                        <div className="stat-item">
                            <span className="stat-label">Current Health</span>
                            <span className="stat-value">
                                {playerCharacters[playerName].stats.health}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Max Health</span>
                            <span className="stat-value">
                                {playerCharacters[playerName].stats.maxHealth}
                            </span>
                        </div>
                        <div className="stat-item">
                             <span className="stat-label">Speed</span>
                             <span className="stat-value">
                                {playerCharacters[playerName].stats.speed}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Resistance</span>
                            <span className="stat-value">
                                {playerCharacters[playerName].stats.resistance}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Strength</span>
                            <span className="stat-value">
                                {playerCharacters[playerName].stats.strength}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Technical Ability</span>
                            <span className="stat-value">
                                {playerCharacters[playerName].stats.ta}
                            </span>
                            </div>
                        </>
                    );
                })()}
            </div>


            <div className="builder-footer">
                <button 
                    className="ready-button" 
                    onClick={handleReady}
                    disabled={isReady || remainingPoints !== 0}
                >
                    {isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>
    )
}

export default LevelUp;