// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import GameContext from '../../Components/Context';
import Main from './Main';

// A stand-in socket that records emits and lets the test push server events.
function createFakeSocket() {
  const handlers = new Map();
  return {
    connected: true,
    emitted: [],
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
    },
    off(event, handler) {
      if (!handler) handlers.delete(event);
      else handlers.get(event)?.delete(handler);
    },
    emit(event, ...args) {
      this.emitted.push({ event, args });
    },
    serverSends(event, payload) {
      for (const handler of [...(handlers.get(event) || [])]) handler(payload);
    },
    listenerCount(event) {
      return handlers.get(event)?.size || 0;
    }
  };
}

const character = (id, name, speed) => ({
  id,
  name,
  role: 'DPS',
  level: 1,
  abilities: [],
  ultimate: null,
  stats: { health: 80, maxHealth: 80, speed, resistance: 20, strength: 30, ta: 20 },
  weapon: { name: 'Energy Sword', damage: 9, range: 1 }
});

function Harness({ socket, playerName = 'bryson', serverStoryState = null }) {
  const [playerCharacters, setPlayerCharacters] = useState({
    bryson: character('aggressive_dps_2', 'Leo', 40),
    sean: character('hacker_support_4', 'Ghost Shell', 25)
  });
  const [enemies, setEnemies] = useState([]);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gamePhase, setGamePhase] = useState('story');
  const [allPlayerAttributes, setAllPlayerAttributes] = useState({
    bryson: ['Politician', 'Spy'],
    sean: ['Electrician', 'Banker', 'Politician']
  });
  const [chat, setChat] = useState(false);

  const value = {
    players: ['bryson', 'sean'],
    playerCharacters, setPlayerCharacters,
    playerName,
    room: '1234',
    socket,
    getAbilityScaler: () => null,
    getIsBonusAction: () => null,
    gamePhase, setGamePhase,
    isMyTurn, setIsMyTurn,
    currentTurn, setCurrentTurn,
    enemies, setEnemies,
    turnOrder, setTurnOrder,
    isAdmin: true,
    setScreen: () => {},
    getCharacterImage: () => '/favicon.png',
    getEnemyImage: () => '/favicon.png',
    debugLogLevel: 'quiet',
    chat, setChat,
    allPlayerAttributes, setAllPlayerAttributes,
    musicVolume: 0,
    isMuted: true,
    connectedPlayers: ['bryson', 'sean'],
    serverStoryState
  };

  return <GameContext.Provider value={value}><Main /></GameContext.Provider>;
}

const aiRequests = (socket, eventType) =>
  socket.emitted.filter(({ event, args }) => event === 'ai_request' && args[0]?.eventType === eventType).map(({ args }) => args[0]);

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Main (story flow)', () => {
  it('renders the party and asks the narrator for the opening scene', async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} />);

    expect(screen.getByText('Party')).toBeTruthy();
    expect(screen.getAllByText('Leo').length).toBeGreaterThan(0);
    await waitFor(() => expect(aiRequests(socket, 'game_start')).toHaveLength(1));
  });

  it('shows the faction decision to its owner and sends the choice', async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} />);
    await waitFor(() => expect(aiRequests(socket, 'game_start')).toHaveLength(1));
    const { requestId } = aiRequests(socket, 'game_start')[0];

    act(() => {
      socket.serverSends('ai_message', {
        requestId,
        eventType: 'game_start',
        response: 'Choose.',
        options: ['Fight with the Enforcers', 'Fight with the Rebels'],
        attribute: 'politician',
        location: 'city_square',
        startCombat: false
      });
    });

    const rebelsButtons = await screen.findAllByText('Fight with the Rebels', {}, { timeout: 3000 });
    expect(screen.getAllByText(/^Your call \(Politician\)/).length).toBeGreaterThan(0);

    fireEvent.click(rebelsButtons[0]);
    expect(socket.emitted.some(({ event, args }) => event === 'faction_selected' && args[0].faction === 'rebels')).toBe(true);
    expect(aiRequests(socket, 'choice_made')[0]).toMatchObject({ data: expect.objectContaining({ faction: 'rebels' }) });
  });

  it('does not let a player who does not own the decision make it', async () => {
    const socket = createFakeSocket();
    // Sean is not the story controller, so he never requests the intro; feed the message directly.
    render(<Harness socket={socket} playerName="sean" />);

    act(() => {
      socket.serverSends('ai_message', {
        requestId: 'x',
        eventType: 'game_start',
        response: 'Choose.',
        options: ['Fight with the Enforcers', 'Fight with the Rebels'],
        attribute: 'politician',
        startCombat: false
      });
    });

    const buttons = await screen.findAllByText('Fight with the Rebels', {}, { timeout: 3000 });
    expect(screen.getAllByText('Leo (bryson) decides (Politician)').length).toBeGreaterThan(0);
    expect(buttons.every(button => button.disabled)).toBe(true);
    fireEvent.click(buttons[0]);
    expect(socket.emitted.some(({ event }) => event === 'faction_selected')).toBe(false);
  });

  it('restores a pending decision from the server after a reconnect', async () => {
    const socket = createFakeSocket();
    render(
      <Harness
        socket={socket}
        serverStoryState={{
          combatFlowIndex: 1,
          selectedFaction: 'rebels',
          lastStoryMessage: {
            eventType: 'encounter_end',
            response: 'The dust settles.',
            options: ['Tail the courier quietly', 'Plant a tracker and wait'],
            attribute: 'spy',
            startCombat: false
          }
        }}
      />
    );

    expect((await screen.findAllByText('Tail the courier quietly', {}, { timeout: 3000 })).length).toBeGreaterThan(0);
    // Bryson ranked Spy second, Sean never: Bryson owns it.
    expect(screen.getAllByText(/^Your call \(Spy\)/).length).toBeGreaterThan(0);
    // The story already started, so the opening must not be requested again.
    expect(aiRequests(socket, 'game_start')).toHaveLength(0);
  });

  it('cleans up every socket listener on unmount', async () => {
    const socket = createFakeSocket();
    const { unmount } = render(<Harness socket={socket} />);
    expect(socket.listenerCount('ai_message')).toBeGreaterThan(0);
    unmount();
    for (const event of ['ai_message', 'combat_ended', 'execute_enemy_turn', 'enemies_updated', 'faction_selected']) {
      expect(socket.listenerCount(event), event).toBe(0);
    }
  });
});
