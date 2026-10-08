import { useEffect, useRef } from 'react';
import { useGameContext } from './Context.jsx';
import { enrichCharacterAbilities } from '../Utils/characterUtils';
import { mergeCharacterPayload } from '../Utils/characterProgression';

// Global socket listeners for screen changes and shared state.
// Handlers are registered once and removed by reference so they never strip listeners that other
// components registered for the same events. Live values are read through refs.
function Events() {
  const {
    socket, setPlayers, setDisplayGame, setAdmin, setScreen, setPlayerCharacters,
    setReadyPlayers, setGamePhase, room, setEnemies, setTurnOrder, setCurrentTurn,
    setIsMyTurn, playerName, setAllPlayerAttributes, setServerStoryState, setCombatState
  } = useGameContext();

  const roomRef = useRef(room);
  const playerNameRef = useRef(playerName);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  useEffect(() => {
    const mergeIntoCharacters = (incoming = {}) => {
      setPlayerCharacters(previous => {
        const merged = Object.fromEntries(
          Object.entries(incoming).map(([name, character]) => [
            name,
            enrichCharacterAbilities(mergeCharacterPayload(character, previous[name] || {}))
          ])
        );
        return { ...previous, ...merged };
      });
    };

    const isMe = (turn) => turn?.type === 'ally' && turn.id === playerNameRef.current;

    const handlers = {
      updatePlayerList: (playerList) => setPlayers([...(playerList || [])]),

      gameStarted: () => {
        setDisplayGame(true);
        setScreen('characterSelect');
      },

      setAdmin: (isAdmin) => setAdmin(!!isAdmin),

      admin_changed: ({ admin } = {}) => setAdmin(admin === playerNameRef.current),

      update_character_selections: (selections = {}) => {
        // A full snapshot: players missing from it no longer have a character.
        setPlayerCharacters(previous => Object.fromEntries(
          Object.entries(selections).map(([name, character]) => [
            name,
            enrichCharacterAbilities(mergeCharacterPayload(character, previous[name] || {}))
          ])
        ));
      },

      update_ready_status: (readyList) => setReadyPlayers(Array.isArray(readyList) ? readyList : []),

      attributes_updated: (attributes) => {
        if (attributes && typeof attributes === 'object') setAllPlayerAttributes(attributes);
      },

      character_customization: () => setScreen('characterBuilder'),
      attribute_part1_complete: () => setScreen('characterBuilderPart2'),
      start_main_game: () => setScreen('chooseAbilities'),
      start_game: () => setScreen('main'),

      restore_screen: ({ screen } = {}) => {
        if (!screen) return;
        try { localStorage.setItem('screen', screen); } catch { /* ignore */ }
        setScreen(screen);
      },

      // The server runs every fight and sends the whole board after each action.
      combat_state: (snapshot) => {
        if (!snapshot) return;
        setCombatState(snapshot);
        if (snapshot.characters) mergeIntoCharacters(snapshot.characters);
        if (snapshot.endedResult) {
          setIsMyTurn(false);
          return;
        }
        setGamePhase('combat');
        setEnemies(snapshot.enemies || []);
        setTurnOrder(snapshot.turnOrder || []);
        setCurrentTurn(snapshot.currentTurn || null);
        // Only while the turn is live: between a turn ending and the next starting, nobody acts.
        setIsMyTurn(isMe(snapshot.currentTurn) && !!snapshot.turn);
      },

      characters_updated: (characters) => {
        if (characters && typeof characters === 'object') mergeIntoCharacters(characters);
      },

      story_state: (storyState) => setServerStoryState(storyState || null),

      level_up: () => setScreen('levelup'),

      level_up_complete: (payload = {}) => {
        if (payload.players) mergeIntoCharacters(payload.players);
        const choosers = Array.isArray(payload.chooseAbilities) ? payload.chooseAbilities : [];
        setScreen(choosers.includes(playerNameRef.current) ? 'chooseAbilities' : 'main');
      },

      game_reset: () => {
        setPlayerCharacters({});
        setReadyPlayers([]);
        setEnemies([]);
        setTurnOrder([]);
        setCurrentTurn(null);
        setIsMyTurn(false);
        setAllPlayerAttributes({});
        setGamePhase('story');
        setServerStoryState(null);
        setCombatState(null);
        const currentRoom = roomRef.current;
        ['storyProgress_', 'playerPositions_', 'enemyPositions_', 'overworldPlayerPositions_', 'pendingEncounterEndAfterLevelUp_', 'allPlayerAttributes_']
          .forEach(prefix => sessionStorage.removeItem(`${prefix}${currentRoom}`));
        setScreen('waiting');
      }
    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
    };
  }, [socket, setPlayers, setDisplayGame, setAdmin, setScreen, setPlayerCharacters, setReadyPlayers,
    setGamePhase, setEnemies, setTurnOrder, setCurrentTurn, setIsMyTurn, setAllPlayerAttributes, setServerStoryState, setCombatState]);

  return null;
}

export default Events;
