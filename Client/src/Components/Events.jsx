import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';

function Events(){

    const { socket, setPlayers, setDisplayGame, 
      setAdmin, setScreen, setPlayerCharacters, 
      setReadyPlayers, setGamePhase, setStoryText, 
      setCombatRewards, room, setEnemies, 
      setTurnOrder, setCurrentTurn, 
      setIsMyTurn, playerName } = useGameContext();
    useEffect(() => {
    
        socket.on("updatePlayerList", (playerList) => {
          setPlayers([...playerList]);
        });
    
        socket.on("gameStarted", () => {
          setDisplayGame(true);
          setScreen("characterSelect");
        });
        
        socket.on("setAdmin", (admin) => {
          setAdmin(admin);
        });

        socket.on("update_character_selections", (selections) => {
          setPlayerCharacters(selections);
        });

        socket.on("update_ready_status", (readyList) => {
          setReadyPlayers(readyList);
        });

        socket.on("start_main_game", () => {
          setScreen("main");
        });

        // Game phase transitions
        socket.on("phase_changed_combat", ({ enemies, turnOrder, currentTurn }) => {
          console.log('Combat Phase Started - Turn Order:', turnOrder);
          console.log('Received enemies:', enemies);
          setEnemies(enemies);
          setTurnOrder(turnOrder);
          setCurrentTurn(currentTurn);
          setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
        });

        socket.on("turn_changed", ({ currentTurn }) => {
          setCurrentTurn(currentTurn);
          setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
        });
    
        return () => {
          socket.off("updatePlayerList");
          socket.off("gameStarted");
          socket.off("setAdmin");
          socket.off("update_character_selections");
          socket.off("update_ready_status");
          socket.off("start_main_game");
          socket.off("phase_changed_combat");
          socket.off("turn_changed");
        };
    }, [room]);
    
    return (
        <>
        </>
    );
};

export default Events;