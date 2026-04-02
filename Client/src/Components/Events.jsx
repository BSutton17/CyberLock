import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';
import { enrichCharacterAbilities } from '../Utils/characterUtils';

const MAX_CHARACTER_LEVEL = 5;

const getAllowedAbilitySlots = (level) => {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
};

function Events(){

    const { socket, setPlayers, setDisplayGame, 
      setAdmin, setScreen, setPlayerCharacters, 
      setReadyPlayers, setGamePhase, setStoryText, characterPositions,
      setCombatRewards, room, setEnemies, 
      setTurnOrder, setCurrentTurn, 
      setIsMyTurn, playerName, setAttributeAllocations, setAttributePoints, playerCharacters, debugLogLevel } = useGameContext();

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
      const isSameCharacter = incomingCharacter?.id && previousCharacter?.id && incomingCharacter.id === previousCharacter.id;

      if (!Array.isArray(incomingAbilities)) {
        return previousAbilities;
      }

      const hasPreviousAbilities = Array.isArray(previousAbilities) && previousAbilities.length > 0;
      const incomingIsEmpty = incomingAbilities.length === 0;

      if (incomingIsEmpty && hasPreviousAbilities && isSameCharacter) {
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

      const isSameCharacter = incomingCharacter?.id && previousCharacter?.id && incomingCharacter.id === previousCharacter.id;

      return hasValidIncomingUltimate ? incomingUltimate : (isSameCharacter ? previousCharacter?.ultimate : null);
    };

    const sanitizeCharacterProgression = (character) => {
      if (!character || typeof character !== 'object') return character;

      const rawLevel = Number(character.level);
      const level = Number.isFinite(rawLevel)
        ? Math.max(1, Math.min(MAX_CHARACTER_LEVEL, rawLevel))
        : 1;
      const allowedAbilitySlots = getAllowedAbilitySlots(level);
      const abilities = Array.isArray(character.abilities)
        ? character.abilities.slice(0, allowedAbilitySlots).filter(Boolean)
        : [];
      const ultimate = level >= 3 ? (character.ultimate || null) : null;

      return {
        ...character,
        level,
        abilities,
        ultimate
      };
    };

    const mergeCharacterPayload = (incomingCharacter, previousCharacter = {}) => {
      return sanitizeCharacterProgression({
        ...previousCharacter,
        ...incomingCharacter,
        abilities: resolveAbilities(incomingCharacter, previousCharacter),
        ultimate: resolveUltimate(incomingCharacter, previousCharacter)
      });
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

          const existingOverworldPositions = sessionStorage.getItem(`overworldPlayerPositions_${room}`);
          const currentOverworldPositions = sessionStorage.getItem(`playerPositions_${room}`);
          if (!existingOverworldPositions && currentOverworldPositions) {
            try {
              const parsedCurrentPositions = JSON.parse(currentOverworldPositions);
              if (parsedCurrentPositions && typeof parsedCurrentPositions === 'object' && Object.keys(parsedCurrentPositions).length > 0) {
                sessionStorage.setItem(`overworldPlayerPositions_${room}`, JSON.stringify(parsedCurrentPositions));
              }
            } catch (error) {
              console.error('[POSITION SNAPSHOT] Failed to snapshot overworld positions before combat:', error);
            }
          }
          
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

        socket.on("attribute_points_updated", (points) => {
          setAttributePoints(points || {});
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

        socket.on("level_up_complete", (payload = {}) => {
          const players = payload.players || playerCharacters || {};

          setPlayerCharacters(prevCharacters => {
            const mergedPlayers = Object.fromEntries(
              Object.entries(players).map(([name, character]) => {
                const previousCharacter = prevCharacters[name] || {};
                return [name, enrichCharacterAbilities(mergeCharacterPayload(character, previousCharacter))];
              })
            );

            return {
              ...prevCharacters,
              ...mergedPlayers
            };
          });

          const currentPlayer = players[playerName];
          const currentLevel = Number(currentPlayer?.level || 0);

          if (currentLevel === 3 || currentLevel === 5) {
            setScreen("chooseAbilities");
          } else {
            setScreen("main");
          }
        });

        socket.on("game_reset", () => {
          setPlayerCharacters({});
          setReadyPlayers([]);
          setEnemies([]);
          setTurnOrder([]);
          setAttributeAllocations({});
          setAttributePoints({});
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
          socket.off("attribute_points_updated");
          socket.off("player_health_updated");
          socket.off("level_up");
          socket.off("level_up_complete");
          socket.off("game_reset");
        };
    }, [room, playerName, playerCharacters]);
    
    return (
        <>
        </>
    );
};

export default Events;