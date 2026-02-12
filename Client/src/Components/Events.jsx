import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';

function Events(){

    const { socket, setPlayers, setDisplayGame, 
      setAdmin, setScreen, setPlayerCharacters, 
      setReadyPlayers, setGamePhase, setStoryText, 
      setCombatRewards, room, setEnemies, 
      setTurnOrder, setCurrentTurn, 
      setIsMyTurn, playerName, setAttributeAllocations, playerCharacters } = useGameContext();
    useEffect(() => {
    
        socket.on("updatePlayerList", (playerList) => {
          setPlayers([...playerList]);
        });
    
        socket.on("gameStarted", () => {
          setDisplayGame(true);
          setScreen("characterSelect");
        });
        
        socket.on("setAdmin", (admin) => {
          let isAdmin = admin;
          const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
          const storedRoom = localStorage.getItem('room');
          
          // Identify race condition on refresh where server denies admin because old socket persists
          if (!admin && storedIsAdmin && storedRoom === room) {
            isAdmin = true;
          }

          setAdmin(isAdmin);
          localStorage.setItem('isAdmin', isAdmin.toString());
        });

        socket.on("update_character_selections", (selections) => {
          setPlayerCharacters(selections);
        });

        socket.on("update_ready_status", (readyList) => {
          setReadyPlayers(readyList);
        });

        socket.on("character_customization", () => {
          setScreen("characterBuilder");
        });

        socket.on("start_main_game", () => {
          setScreen("main");
        });

        // Game phase transitions
        socket.on("phase_changed_combat", ({ enemies, enemyPositions, turnOrder, currentTurn, characterSelections }) => {
          console.log('Combat Phase Started - Turn Order:', turnOrder);
          console.log('Received enemies:', enemies);
          console.log('Received enemy positions:', enemyPositions);
          console.log('Received character selections:', characterSelections);
          
          // Update character selections to ensure all players have current data
          if (characterSelections) {
            setPlayerCharacters(characterSelections);
          }
          
          setEnemies(enemies);
          
          // Store enemy positions in session storage so Main.jsx can use them
          if (enemyPositions) {
            sessionStorage.setItem(`enemyPositions_${room}`, JSON.stringify(enemyPositions));
          }
          
          setTurnOrder(turnOrder);
          setCurrentTurn(currentTurn);
          setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
        });

        socket.on("turn_changed", ({ currentTurn }) => {
          console.log('TURN CHANGED EVENT RECEIVED');
          console.log('Current Turn:', currentTurn);
          console.log('Turn Type:', currentTurn.type);
          console.log('Turn ID:', currentTurn.id);
          console.log('[TURN DEBUG] playerName in Events:', playerName);
          console.log('[TURN DEBUG] Comparison:', currentTurn.id === playerName, 'type check:', currentTurn.type === 'ally');
          console.log('[TURN DEBUG] Setting isMyTurn to:', currentTurn.id === playerName && currentTurn.type === 'ally');
          setCurrentTurn(currentTurn);
          setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
        });

        socket.on("attribute_allocations_updated", (allocations) => {
          setAttributeAllocations(allocations);
        });

        socket.on("player_health_updated", ({ playerName: damagedPlayer, newHealth }) => {
          console.log(`🩹 Player health updated: ${damagedPlayer} -> ${newHealth}`);
          setPlayerCharacters(prev => ({
            ...prev,
            [damagedPlayer]: {
              ...prev[damagedPlayer],
              stats: { ...prev[damagedPlayer].stats, health: newHealth }
            }
          }));
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
          socket.off("attribute_allocations_updated");
          socket.off("player_health_updated");
        };
    }, [room, playerName]); // Added playerName dependency so listeners update when it changes
    
    return (
        <>
        </>
    );
};

export default Events;