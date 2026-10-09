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

function Harness({ socket, playerName = 'bryson', serverStoryState = null, initialCombat = null }) {
  const [playerCharacters, setPlayerCharacters] = useState({
    bryson: character('aggressive_dps_2', 'Leo', 40),
    sean: character('hacker_support_4', 'Ghost Shell', 25)
  });
  const [enemies, setEnemies] = useState(initialCombat?.enemies || []);
  const [turnOrder, setTurnOrder] = useState(initialCombat?.turnOrder || []);
  const [currentTurn, setCurrentTurn] = useState(initialCombat?.currentTurn || null);
  const [isMyTurn, setIsMyTurn] = useState(initialCombat?.currentTurn?.id === playerName && !!initialCombat?.turn);
  const [gamePhase, setGamePhase] = useState(initialCombat ? 'combat' : 'story');
  const [combatState] = useState(initialCombat);
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
    serverStoryState,
    combatState
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

  it("shows only a personal moment's choices until it is answered, then the group decision", async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} serverStoryState={{ combatFlowIndex: 1, selectedFaction: 'rebels', lastStoryMessage: null }} />);

    act(() => {
      socket.serverSends('ai_message', {
        requestId: 'after-fight',
        eventType: 'encounter_end',
        response: 'A checkpoint guard looks straight at Leo. "Why are you here?"',
        options: null,
        attribute: 'spy',
        startCombat: false,
        dialogue: {
          id: 'd1', kind: 'reply', npc: 'A checkpoint guard', playerName: 'bryson', characterName: 'Leo',
          options: [{ id: 'honest', text: "We're just passing through.", attribute: null }, { id: 'defiant', text: "It's none of your business.", attribute: null }]
        }
      });
    });

    const answers = await screen.findAllByText("It's none of your business.", {}, { timeout: 8000 });
    expect(screen.queryByText('Investigate the nearest lead')).toBeNull();
    expect(screen.queryByText('Take a cautious route forward')).toBeNull();
    fireEvent.click(answers[0]);
    expect(socket.emitted.some(({ event, args }) => event === 'dialogue_reply' && args[0].optionId === 'defiant')).toBe(true);

    act(() => {
      socket.serverSends('ai_message', {
        requestId: null,
        eventType: 'dialogue_reply',
        response: `Leo: "It's none of your business." The guard scowls. It's Leo's call.`,
        options: ['Tail the courier quietly', 'Plant a tracker and wait'],
        attribute: 'spy',
        startCombat: false,
        dialogue: null
      });
    });
    expect((await screen.findAllByText('Tail the courier quietly', {}, { timeout: 8000 })).length).toBeGreaterThan(0);
    expect(screen.queryByText("It's none of your business.")).toBeNull();
  }, 30000); // the narration types out before choices appear

  it('cleans up every socket listener on unmount', async () => {
    const socket = createFakeSocket();
    const { unmount } = render(<Harness socket={socket} />);
    expect(socket.listenerCount('ai_message')).toBeGreaterThan(0);
    unmount();
    for (const event of ['ai_message', 'combat_ended', 'combat_error', 'combat_narration', 'turn_timed_out', 'faction_selected']) {
      expect(socket.listenerCount(event), event).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Fights: the server runs them; Main draws the board and sends intents.
// ---------------------------------------------------------------------------

const enemy = (id) => ({
  id,
  name: 'Enforcer Soldier',
  tier: 'generic',
  stats: { health: 40, maxHealth: 40, speed: 30, resistance: 20, strength: 40, ta: 20 },
  weapon: { name: 'Baton', damage: 6, range: 1 },
  isDeadBody: false
});

const fightSnapshot = (overrides = {}) => ({
  encounterIndex: 0,
  sceneKey: 'street',
  enemies: [enemy('e1')],
  positions: { bryson: { row: 6, col: 3 }, sean: { row: 6, col: 6 }, e1: { row: 5, col: 3 } },
  activeEffects: [],
  turnOrder: [{ type: 'ally', id: 'bryson', speed: 40 }, { type: 'enemy', id: 'e1', speed: 30 }, { type: 'ally', id: 'sean', speed: 25 }],
  currentTurn: { type: 'ally', id: 'bryson', speed: 40 },
  turn: { type: 'ally', id: 'bryson', number: 1, movementUsed: 0, movementLeft: 4, actionUsed: false, bonusActionUsed: false, extraWeaponAttacks: 0 },
  cooldowns: {},
  characters: {},
  events: [],
  turnMsRemaining: 40000,
  endedResult: null,
  ...overrides
});

const storyInProgress = { combatFlowIndex: 1, selectedFaction: 'rebels', lastStoryMessage: null };
const cell = (container, row, col) => container.querySelectorAll('.grid-cell')[row * 10 + col];
const emitsOf = (socket, name) => socket.emitted.filter(({ event }) => event === name).map(({ args }) => args[0]);
// The first half second of a turn ignores clicks (stops double-clicks carrying over).
const waitForTurnLock = () => new Promise(resolve => setTimeout(resolve, 600));

describe('Main (combat)', () => {
  it('draws the board from the server and shows how much movement is left', async () => {
    const socket = createFakeSocket();
    const { container } = render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    await waitFor(() => expect(cell(container, 5, 3).className).toContain('enemy-cell'));
    expect(cell(container, 6, 3).className).toContain('player-controlled');
    expect(screen.getByText('4 moves left')).toBeTruthy();
  });

  it('asks the server to move when an empty tile is clicked', async () => {
    const socket = createFakeSocket();
    const { container } = render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    await waitForTurnLock();
    fireEvent.click(cell(container, 6, 1));
    expect(emitsOf(socket, 'combat_move')).toEqual([{ room: '1234', to: { row: 6, col: 1 } }]);
  });

  it('attacks with the weapon: pick the weapon, then the enemy', async () => {
    const socket = createFakeSocket();
    const { container } = render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    await waitForTurnLock();
    fireEvent.click(screen.getByText('Energy Sword'));
    fireEvent.click(cell(container, 5, 3));
    expect(emitsOf(socket, 'combat_attack')).toEqual([{ room: '1234', targetId: 'e1' }]);
    expect(emitsOf(socket, 'combat_move')).toHaveLength(0);
  });

  it('ends the turn through the server', async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    await waitForTurnLock();
    fireEvent.click(screen.getByText('End Turn'));
    expect(emitsOf(socket, 'combat_end_turn')).toEqual([{ room: '1234' }]);
  });

  it('shows why the server refused an action', async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    act(() => socket.serverSends('combat_error', { message: 'Not enough movement left.' }));
    expect(await screen.findByText('Not enough movement left.')).toBeTruthy();
  });

  it('does nothing on another player turn', async () => {
    const socket = createFakeSocket();
    const snapshot = fightSnapshot({ currentTurn: { type: 'ally', id: 'sean', speed: 25 }, turn: { type: 'ally', id: 'sean', movementLeft: 2 } });
    const { container } = render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={snapshot} />);
    await waitForTurnLock();
    fireEvent.click(cell(container, 6, 1));
    expect(emitsOf(socket, 'combat_move')).toHaveLength(0);
    expect(screen.queryByText('End Turn')).toBeNull();
  });

  it('shows combat narration from the server', async () => {
    const socket = createFakeSocket();
    render(<Harness socket={socket} serverStoryState={storyInProgress} initialCombat={fightSnapshot()} />);
    act(() => socket.serverSends('combat_narration', { text: 'Leo ducks under the baton.' }));
    // Typed out letter by letter; every letter must arrive exactly once.
    await waitFor(() => expect(document.querySelector('.ai-text').textContent).toBe('Leo ducks under the baton.'), { timeout: 3000 });
  });
});
