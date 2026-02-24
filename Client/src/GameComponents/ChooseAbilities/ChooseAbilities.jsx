import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import { ABILITIES } from '../Main/AbilityStore';
import './ChooseAbilities.css';


function ChooseAbilities(){
    const {players, playerCharacters, setPlayerCharacters, playerName, room, socket } = useGameContext();
    const [isReady, setIsReady] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const playerLevel = playerCharacters[playerName].level;
    const playerRole = "support"

    const handleReady = () => {
        socket.emit('ability_select_complete', {room});
        setIsReady(true);
    }

    const checkReady = () => {
        const abilityCount = Object.keys(playerCharacters[playerName].abilities).length;
        if(playerLevel < 3){
            if(abilityCount == 1){
                setIsReady(true);
            }
        }else if(playerLevel < 5){
            if(abilityCount == 2){
                setIsReady(true);
            }
        }else if(playerLevel >= 5){
            if(abilityCount == 3 && playerCharacters[playerName].ultimate != ""){
                setIsReady(true);
            }
        }
    }

    const assignAbility = (name, index) => {
        const playerInfo = playerCharacters[playerName];
        const abilities = playerCharacters[playerName].abilities;
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                abilities: {
                    ...abilities,
                    [index]: name
                }
            }
        }
        
        setPlayerCharacters(updatedCharacter);
    }

    const assignUltimate = (name) => {
        const playerInfo = playerCharacters[playerName];
        const updatedCharacter = {
            ...playerCharacters,
            [playerName]: {
                ...playerInfo,
                ultimate: name
            }
        }
        setPlayerCharacters(updatedCharacter);
    }

    useEffect(() => {
        checkReady();
        console.log(playerCharacters);
    }, [playerCharacters]);

    return (
        <div>
            <button onClick = {() => console.log(playerCharacters[playerName].abilities.length)}>Testing</button>
            <div className="ability-grid">
                {(() => {
                    return (
                        <>
                        <div className="container">
                            {Object.entries(ABILITIES)
                                .filter(([key, ability]) => (ability.isUltimate && ability.role === playerRole))
                                .map(([key, ability]) => (
                                    <button onClick={() => assignUltimate(ability.name)} key={ability.name} disabled= {playerLevel < 5}>
                                        {ability.name}
                                    </button>
                            ))}
                        </div>
                        <div className="container">
                            {Object.entries(ABILITIES)
                                .filter(([key, ability]) => (ability.level === 5 && ability.role === playerRole))
                                .map(([key, ability]) => (
                                    <button onClick={() => assignAbility(ability.name, 2)} key={ability.name} disabled= {playerLevel < 5}>
                                        {ability.name}
                                    </button>
                            ))}
                        </div>
                        <div className="container">
                            {Object.entries(ABILITIES)
                                .filter(([key, ability]) => (ability.level === 3 && ability.role === playerRole))
                                .map(([key, ability]) => (
                                    <button onClick={() => assignAbility(ability.name, 1)} key={ability.name} disabled= {playerLevel < 3}>
                                        {ability.name}
                                    </button>
                            ))}
                        </div>
                        <div className="container">
                            {Object.entries(ABILITIES)
                                .filter(([key, ability]) => (ability.level === 1 && ability.role === playerRole))
                                .map(([key, ability]) => (
                                    <button onClick={() => assignAbility(ability.name, 0)} key={ability.name} disabled= {playerLevel < 1}>
                                        {ability.name}
                                    </button>
                            ))}
                        </div>
                        </>
                    );
                })()}
            </div>
            <div className="builder-footer">
                <button 
                    className="ready-button" 
                    onClick={handleReady}
                    disabled={!isReady}
                >
                    {!isReady ? 'Waiting for others...' : 'Ready'}
                </button>
                <p className="ready-status">{readyPlayers.length}/{players.length} players ready</p>
            </div>
        </div>
    )
}

export default ChooseAbilities;