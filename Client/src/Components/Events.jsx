import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';
import { enrichCharacterAbilities } from '../Utils/characterUtils';

function Events(){

    const { socket, setPlayers, setDisplayGame, 
      setAdmin, setScreen, setPlayerCharacters, 
      setReadyPlayers, setGamePhase, setStoryText, characterPositions,
      setCombatRewards, room, setEnemies, 
      setTurnOrder, setCurrentTurn, 
      setIsMyTurn, playerName, setAttributeAllocations, playerCharacters, debugLogLevel } = useGameContext();

    const isQuiet = debugLogLevel === 'quiet';
    const isVerbose = debugLogLevel === 'verbose';

    const logImportant = (...args) => {
      if (isQuiet) return;
      console.log(...args);
    };

    const logVerbose = (...args) => {
      if (!isVerbose) return;
      console.log(...args);
    };

    const resolveAbilities = (incomingCharacter, previousCharacter) => {
      const incomingAbilities = incomingCharacter?.abilities;
      const previousAbilities = previousCharacter?.abilities;

      if (!Array.isArray(incomingAbilities)) {
        return previousAbilities;
      }

      const hasPreviousAbilities = Array.isArray(previousAbilities) && previousAbilities.length > 0;
      const incomingIsEmpty = incomingAbilities.length === 0;

      if (incomingIsEmpty && hasPreviousAbilities) {
        console.warn('[ABILITY DEBUG] Ignoring empty incoming abilities, preserving previous abilities.');
        return previousAbilities;
      }

      return incomingAbilities;
    };

    const resolveUltimate = (incomingCharacter, previousCharacter) => {
      const incomingUltimate = incomingCharacter?.ultimate;
      const hasValidIncomingUltimate =
        (typeof incomingUltimate === 'string' && incomingUltimate.trim().length > 0) ||
        (incomingUltimate && typeof incomingUltimate === 'object' && !!incomingUltimate.id);

      return hasValidIncomingUltimate ? incomingUltimate : previousCharacter?.ultimate;
    };

    const mergeCharacterPayload = (incomingCharacter, previousCharacter = {}) => {
      return {
        ...previousCharacter,
        ...incomingCharacter,
        abilities: resolveAbilities(incomingCharacter, previousCharacter),
        ultimate: resolveUltimate(incomingCharacter, previousCharacter)
      };
    };

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
          
          if (!admin && storedIsAdmin && storedRoom === room) {
            isAdmin = true;
          }

          setAdmin(isAdmin);
          localStorage.setItem('isAdmin', isAdmin.toString());
        });

        socket.on("update_character_selections", (selections) => {
          setPlayerCharacters(prevCharacters => {
            const normalizedSelections = Object.fromEntries(
              Object.entries(selections).map(([name, character]) => {
                const previousCharacter = prevCharacters[name] || {};
                return [name, enrichCharacterAbilities(mergeCharacterPayload(character, previousCharacter))];
              })
            );

            return normalizedSelections;
          });
        });

        socket.on("update_ready_status", (readyList) => {
          setReadyPlayers(readyList);
        });

        socket.on("character_customization", () => {
          setScreen("characterBuilder");
        });

        socket.on("start_main_game", () => {
          setScreen("chooseAbilities");
        });

        socket.on("start_game", () => {
          setScreen("main");
        });

        socket.on("restore_screen", ({ screen }) => {
          if (!screen) return;
          localStorage.setItem('screen', screen);
          setScreen(screen);
        });

        // Game phase transitions
        socket.on("phase_changed_combat", ({ enemies, enemyPositions, playerPositions, turnOrder, currentTurn, characterSelections }) => {
          logImportant('[COMBAT] phase_changed_combat', {
            room,
            turnOrderLength: (turnOrder || []).length,
            currentTurn,
            enemyCount: (enemies || []).length,
            playerPositionCount: Object.keys(playerPositions || {}).length,
            enemyPositionCount: Object.keys(enemyPositions || {}).length
          });
          logVerbose('[COMBAT][VERBOSE] turnOrder:', turnOrder);
          logVerbose('[COMBAT][VERBOSE] enemies:', enemies);
          logVerbose('[COMBAT][VERBOSE] enemyPositions:', enemyPositions);
          logVerbose('[COMBAT][VERBOSE] playerPositions:', playerPositions);

          setGamePhase('combat');
          
          if (characterSelections) {
            setPlayerCharacters(prevCharacters => {
              const mergedSelections = Object.fromEntries(
                Object.entries(characterSelections).map(([name, character]) => {
                  const previousCharacter = prevCharacters[name] || {};
                  return [name, enrichCharacterAbilities(mergeCharacterPayload(character, previousCharacter))];
                })
              );

              return {
                ...prevCharacters,
                ...mergedSelections
              };
            });
          }
          
          setEnemies(enemies);
          
          if (enemyPositions) {
            sessionStorage.setItem(`enemyPositions_${room}`, JSON.stringify(enemyPositions));
          }

          if (playerPositions) {
            sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(playerPositions));
          }
          
          setTurnOrder(turnOrder);
          setCurrentTurn(currentTurn);
          setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
        });

        socket.on("turn_changed", ({ currentTurn }) => {
          const nextIsMyTurn = currentTurn.id === playerName && currentTurn.type === 'ally';
          console.log(`[TURN_CHANGED] Received - ${currentTurn.id} (${currentTurn.type}), isMyTurn: ${nextIsMyTurn}`);
          logImportant('[TURN] changed', {
            id: currentTurn.id,
            type: currentTurn.type,
            isMyTurn: nextIsMyTurn
          });
          logVerbose('[TURN][VERBOSE] playerName:', playerName);
          setCurrentTurn(currentTurn);
          setIsMyTurn(nextIsMyTurn);
        });

        socket.on("turn_order_updated", ({ turnOrder, currentTurnIndex }) => {
          setTurnOrder(turnOrder || []);

          if (Array.isArray(turnOrder) && turnOrder.length > 0) {
            const safeIndex = Math.max(0, Math.min(currentTurnIndex || 0, turnOrder.length - 1));
            const currentTurn = turnOrder[safeIndex];
            if (currentTurn) {
              setCurrentTurn(currentTurn);
              setIsMyTurn(currentTurn.id === playerName && currentTurn.type === 'ally');
            }
          }
        });

        socket.on("attribute_allocations_updated", (allocations) => {
          setAttributeAllocations(allocations);
        });

        socket.on("player_health_updated", ({ playerName: damagedPlayer, newHealth }) => {
          setPlayerCharacters(prev => ({
            ...prev,
            [damagedPlayer]: {
              ...prev[damagedPlayer],
              stats: { ...prev[damagedPlayer].stats, health: newHealth }
            }
          }));
        });
        
        socket.on("level_up", () => {
          setScreen("levelup");
        });

        socket.on("level_up_complete", ({players}) => {
          console.log(players);
          if(players[playerName].level == 3 || players[playerName].level == 5){
            setScreen("chooseAbilities");
          }else{
            setScreen("main");
          }
        });

        socket.on("game_reset", () => {
          setPlayerCharacters({});
          setReadyPlayers([]);
          setEnemies([]);
          setTurnOrder([]);
          setAttributeAllocations({});
          setScreen("waiting");
        });

        return () => {
          socket.off("updatePlayerList");
          socket.off("gameStarted");
          socket.off("setAdmin");
          socket.off("update_character_selections");
          socket.off("update_ready_status");
          socket.off("start_main_game");
          socket.off("start_game");
          socket.off("restore_screen");
          socket.off("phase_changed_combat");
          socket.off("turn_changed");
          socket.off("turn_order_updated");
          socket.off("attribute_allocations_updated");
          socket.off("player_health_updated");
          socket.off("level_up");
          socket.off("level_up_complete");
          socket.off("game_reset");
        };
    }, [room, playerName]);
    
    return (
        <>
        </>
    );
};

export default Events;