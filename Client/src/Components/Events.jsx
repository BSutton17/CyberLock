import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';
import { enrichCharacterAbilities } from '../Utils/characterUtils';

function Events(){

    const { socket, setPlayers, setDisplayGame, 
      setAdmin, setScreen, setPlayerCharacters, 
      setReadyPlayers, setGamePhase, setStoryText, 
      setCombatRewards, room, setEnemies, 
      setTurnOrder, setCurrentTurn, 
      setIsMyTurn, playerName, setAttributeAllocations, playerCharacters } = useGameContext();

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

            return {
              ...prevCharacters,
              ...normalizedSelections
            };
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

        // Game phase transitions
        socket.on("phase_changed_combat", ({ enemies, enemyPositions, turnOrder, currentTurn, characterSelections }) => {
          console.log('Combat Phase Started - Turn Order:', turnOrder);
          console.log('Received enemies:', enemies);
          console.log('Received enemy positions:', enemyPositions);
          console.log('Received character selections:', characterSelections);

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

        socket.on("level_up_complete", () => {
          setScreen("chooseAbilities");
        });

        socket.on("ability_select_complete",() => {
          setScreen("main");
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
          socket.off("phase_changed_combat");
          socket.off("turn_changed");
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