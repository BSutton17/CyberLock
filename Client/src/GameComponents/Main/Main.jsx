import React from 'react';
import { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import './Main.css';

function Main() {
    const { players, playerCharacters, playerName, room } = useGameContext();
    const [currentPlayerCharacter, setCurrentPlayerCharacter] = useState(null);
    const [ultimateReady, setUltimateReady] = useState(false);

    useEffect(() => {
        if (playerCharacters[playerName]) {
            setCurrentPlayerCharacter(playerCharacters[playerName]);
        }
    }, [playerCharacters, playerName]);

    return (
        <div className="main-game-container">
        <div className="scene-name">
            <h2>Location</h2>
        </div>
        <div className="party">
            <h3>Party</h3>
            {players
                .sort((a, b) => {
                    const speedA = playerCharacters[a]?.stats.speed || 0;
                    const speedB = playerCharacters[b]?.stats.speed || 0;
                    return speedB - speedA;
                })
                .map((player, index) => {
                    const character = playerCharacters[player];
                    return (
                        <div key={index} className='party-member'>
                            {character ? (
                                <>
                                    <div className="character-icon"></div>
                                    <div className="character-info">
                                        <div className="character-name">{character.name}</div>
                                        <div className="character-stats">
                                            <span className="stat-speed">SPD: {character.stats.speed}</span>
                                            <span className="stat-hp">HP: {character.stats.health}/{character.stats.health}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="character-name">No Character</div>
                            )}
                        </div>
                    );
                })}
        </div>

        <div className="main-game">
            <div className="game-area">
            Main Game Area
            </div>
        </div>

        <div className="AI-script">
            <h3>AI Log goes here</h3>
        </div>
        <div className="inventory">
            <button className="inventory-slot ability-slot">
                <div className="ability-name">{currentPlayerCharacter?.abilities?.[0]?.name || 'Ability 1'}</div>
                <div className="ability-cooldown">CD: {currentPlayerCharacter?.abilities?.[0]?.cooldown || '-'}</div>
            </button>
            <button className="inventory-slot ability-slot">
                <div className="ability-name">{currentPlayerCharacter?.abilities?.[1]?.name || 'Ability 2'}</div>
                <div className="ability-cooldown">CD: {currentPlayerCharacter?.abilities?.[1]?.cooldown || '-'}</div>
            </button>
            <button className="inventory-slot ability-slot">
                <div className="ability-name">{currentPlayerCharacter?.abilities?.[2]?.name || 'Ability 3'}</div>
                <div className="ability-cooldown">CD: {currentPlayerCharacter?.abilities?.[2]?.cooldown || '-'}</div>
            </button>
            <button disabled={ultimateReady} className="inventory-slot ultimate-slot">
                <div className="ultimate-name">{currentPlayerCharacter?.ultimate?.name || 'Ultimate'}</div>
            </button>
        </div>

        <button className="end-turn">End Turn</button>
        </div>

    );
};

export default Main;


