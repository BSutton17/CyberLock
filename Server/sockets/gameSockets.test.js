import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as connectClient } from 'socket.io-client';
import { createGameServer } from '../app.js';
import { config as baseConfig } from '../config.js';
import { createSessionToken } from '../auth/session.js';
import { createNarrator } from '../narrator/storyEngine.js';
import { createMockProvider } from '../narrator/providers/mock.js';
import { createDialogue } from '../narrator/dialogue.js';
import { generatePlayerSpawnPositions } from '../game/spawning.js';

const quiet = { log: () => {}, warn: () => {}, error: () => {} };

const testConfig = {
  ...baseConfig,
  isProduction: false,
  allowedOrigins: [],
  timing: {
    allyTurnAdvanceDelayMs: 0,
    autoEndTurnDelayMs: 0,
    combatStartEnemyDelayMs: 0,
    enemyThinkMs: 0,
    enemyAttackDelayMs: 0,
    enemyTurnEndDelayMs: 0,
    animationScale: 0,
    allyTurnTimeoutMs: 600,
    disconnectGraceMs: 150,
    dialogueTimeoutMs: 200
  }
};

// The enemies the next fight will have (the real game builds them from the campaign).
let nextEnemies = [];

let game;
let baseUrl;
const clients = [];

beforeEach(async () => {
  game = createGameServer({
    config: testConfig,
    narrator: createNarrator({ provider: createMockProvider(), logger: quiet }),
    verifyGoogleToken: async (credential) => {
      if (credential !== 'good-google-token') throw new Error('bad token');
      return { id: 'google:123', name: 'Bryson', provider: 'google' };
    },
    logger: quiet,
    combatOptions: {
      generateEnemies: () => JSON.parse(JSON.stringify(nextEnemies)),
      random: () => 0,
      // Tests put the party exactly where the scenario needs it.
      spawnPlayers: (players, characters, scene, { proposed } = {}) =>
        (proposed && players.every(player => proposed[player]) ? proposed : generatePlayerSpawnPositions(players, characters, scene))
    }
  });
  await new Promise(resolve => game.server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${game.server.address().port}`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await game.close();
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const tokenFor = (id, name) => createSessionToken({ id, name, provider: 'guest' });

function connect(id, name, { token = tokenFor(id, name) } = {}) {
  const socket = connectClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function waitFor(socket, event, predicate = () => true, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (...args) => {
      if (!predicate(...args)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(args.length > 1 ? args : args[0]);
    };
    socket.on(event, handler);
  });
}

function expectNo(socket, event, predicate = () => true, ms = 250) {
  return new Promise((resolve, reject) => {
    const handler = (...args) => {
      if (predicate(...args)) {
        socket.off(event, handler);
        reject(new Error(`unexpected ${event}: ${JSON.stringify(args)}`));
      }
    };
    socket.on(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, ms);
  });
}

const ack = (socket, event, ...args) => new Promise(resolve => socket.emit(event, ...args, resolve));

async function createRoomWith(players) {
  const sockets = [];
  for (const [id, name] of players) sockets.push(await connect(id, name));
  const { room } = await ack(sockets[0], 'create_room', {});
  for (let i = 0; i < sockets.length; i++) {
    const result = await ack(sockets[i], 'join_room', room, players[i][1]);
    expect(result.ok).toBe(true);
  }
  return { room, sockets };
}

const character = (id, speed, health = 80) => ({
  id,
  name: id,
  role: 'DPS',
  level: 1,
  abilities: [],
  stats: { health, maxHealth: 80, speed, resistance: 10, strength: 10, ta: 10 },
  weapon: { name: 'x', damage: 5, range: 1 }
});

const enemy = (id, speed, health = 40) => ({
  id,
  name: id,
  tier: 'generic',
  stats: { health, maxHealth: 40, speed, resistance: 10, strength: 10, ta: 10 },
  weapon: { name: 'y', damage: 5, range: 1 }
});

// Puts the room straight into the "playing" stage with characters picked.
function seedCharacters(room, characters) {
  const roomState = game.state.rooms[room];
  roomState.stage = 'playing';
  for (const [player, char] of Object.entries(characters)) {
    roomState.characterSelections[player] = char;
  }
}

// ---------------------------------------------------------------------------
// HTTP auth
// ---------------------------------------------------------------------------

describe('auth endpoints', () => {
  it('reports health and sign-in options', async () => {
    const health = await (await fetch(`${baseUrl}/api/health`)).json();
    expect(health).toMatchObject({ status: 'ok', narrator: 'mock' });
    const config = await (await fetch(`${baseUrl}/api/auth/config`)).json();
    expect(config).toHaveProperty('guestLoginEnabled', true);
  });

  it('signs in guests and returns their profile from /me', async () => {
    const response = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  <b>Sean</b>  ' })
    });
    const { token, user } = await response.json();
    expect(user.name).toBe('bSean/b');
    const me = await (await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(me.user.id).toBe(user.id);
  });

  it('exchanges a Google credential for a session and rejects bad ones', async () => {
    const good = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'good-google-token' })
    });
    expect(good.status).toBe(200);
    expect((await good.json()).user).toMatchObject({ id: 'google:123', name: 'Bryson' });

    const bad = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'forged' })
    });
    expect(bad.status).toBe(401);
  });

  it('refuses sockets without a valid session', async () => {
    await expect(connect('x', 'x', { token: 'garbage' })).rejects.toThrow(/unauthorized/);
  });
});

// ---------------------------------------------------------------------------
// Rooms and lobby
// ---------------------------------------------------------------------------

describe('rooms', () => {
  it('creates unique rooms; the first player is admin', async () => {
    const a = await connect('u1', 'Bryson');
    const { room } = await ack(a, 'create_room', {});
    const adminChange = waitFor(a, 'admin_changed');
    const joined = await ack(a, 'join_room', room, 'Bryson');
    expect(joined).toMatchObject({ ok: true, playerName: 'Bryson', isAdmin: true });
    expect((await adminChange).admin).toBe('Bryson');

    const { room: other } = await ack(a, 'create_room', {});
    expect(other).not.toBe(room);
  });

  it('reports unknown rooms and names taken by someone else', async () => {
    const a = await connect('u1', 'Bryson');
    expect(await ack(a, 'join_room', '9999', 'Bryson')).toMatchObject({ ok: false, code: 'room_not_found' });

    const { room } = await ack(a, 'create_room', {});
    await ack(a, 'join_room', room, 'Bryson');
    const b = await connect('u2', 'Bryson');
    expect(await ack(b, 'join_room', room, 'Bryson')).toMatchObject({ ok: false, code: 'name_taken' });
  });

  it('hands admin to the next player when the admin leaves', async () => {
    const { sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    const adminChanged = waitFor(b, 'admin_changed', payload => payload.admin === 'B');
    const players = waitFor(b, 'updatePlayerList', list => list.length === 1);
    a.emit('leave_room');
    await adminChanged;
    expect(await players).toEqual(['B']);
  });

  it('only lets the admin start the game', async () => {
    const { sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    const notStarted = expectNo(a, 'gameStarted');
    b.emit('startGame');
    await notStarted;
    const started = waitFor(b, 'gameStarted');
    a.emit('startGame');
    await started;
  });

  it('runs the lobby: character select, attributes, abilities, then the game', async () => {
    const { room, sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    a.emit('startGame');
    await waitFor(b, 'gameStarted');

    a.emit('character_selected', { room, character: character('offensive_tank_1', 30) });
    await waitFor(b, 'update_character_selections', sel => !!sel.A);

    // B tries to take the same character.
    const taken = waitFor(b, 'character_taken');
    b.emit('character_selected', { room, character: character('offensive_tank_1', 30) });
    await taken;

    b.emit('character_selected', { room, character: character('hacker_support_4', 25) });
    await waitFor(a, 'update_character_selections', sel => sel.B?.id === 'hacker_support_4');

    const customization = waitFor(a, 'character_customization');
    a.emit('player_ready', { room });
    b.emit('player_ready', { room });
    await customization;

    // Character Feats: each player picks a primary and secondary; the server shuffles the rest.
    a.emit('update_attributes', { room, newAttributes: ['Medic', 'Spy'] });
    b.emit('update_attributes', { room, newAttributes: ['Crook', 'Banker', 'Scholar'] });
    await waitFor(a, 'attributes_updated', attrs => !!attrs.A && !!attrs.B);

    const rankings = waitFor(a, 'attributes_updated', attrs => attrs.A?.length === 10 && attrs.B?.length === 10);
    const mainGame = waitFor(a, 'start_main_game');
    a.emit('attributes_ready', { room });
    b.emit('attributes_ready', { room });
    const { A, B } = await rankings;
    await mainGame;

    expect(A.slice(0, 2)).toEqual(['Medic', 'Spy']);
    expect(B.slice(0, 2)).toEqual(['Crook', 'Banker']); // only the first two picks count
    expect(new Set(A).size).toBe(10);
    expect(new Set(B).size).toBe(10);
    A.forEach((name, slot) => expect(B[slot]).not.toBe(name));
    expect(game.state.rooms[room].stage).toBe('abilities');

    // Rankings are locked once the shuffle is done.
    a.emit('update_attributes', { room, newAttributes: ['Navigator', 'Detective'] });
    a.emit('attributes_ready', { room });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(game.state.rooms[room].attributes.A).toEqual(A);
    expect(game.state.rooms[room].stage).toBe('abilities');

    const startGame = waitFor(a, 'start_game');
    a.emit('ability_ready', { room });
    b.emit('ability_ready', { room });
    await startGame;
    expect(game.state.rooms[room].stage).toBe('playing');
  });

  it('does not stall a ready-check when a waiting player leaves for good', async () => {
    const { room, sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    a.emit('startGame');
    await waitFor(b, 'gameStarted');
    a.emit('character_selected', { room, character: character('offensive_tank_1', 30) });
    b.emit('character_selected', { room, character: character('hacker_support_4', 25) });
    await waitFor(a, 'update_character_selections', sel => !!sel.B);

    const customization = waitFor(a, 'character_customization');
    a.emit('player_ready', { room });
    b.disconnect();
    await customization; // B is removed after the grace period, A was the only one left
  });
});

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

describe('combat turns', () => {
  // Fight with A (fast) and B (slow) against the enemies in `nextEnemies`. Characters, positions
  // and stats can be adjusted through game.state before acting.
  async function startFight(enemies, chars = { A: character('a', 40), B: character('b', 10) }) {
    const { room, sockets } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    seedCharacters(room, chars);
    nextEnemies = enemies;
    const first = waitFor(sockets[0], 'combat_state');
    sockets[0].emit('start_combat', { room, sceneKey: 'street', playerPositions: { A: { row: 6, col: 3 }, B: { row: 6, col: 6 } } });
    return { room, sockets, state: await first };
  }

  const fight = (room) => game.state.combat[room];
  const turnOf = (snapshot) => snapshot?.currentTurn?.id;
  const stateWhere = (socket, predicate, timeoutMs) => waitFor(socket, 'combat_state', predicate, timeoutMs);

  it('builds the fight on the server and orders turns by speed', async () => {
    const { room, state } = await startFight([enemy('e1', 20)]);
    expect(state.turnOrder.map(t => t.id)).toEqual(['A', 'e1', 'B']);
    expect(state.encounterIndex).toBe(0);
    expect(state.positions).toMatchObject({ A: { row: 6, col: 3 }, B: { row: 6, col: 6 } });
    expect(state.positions.e1.row).toBeLessThan(2);
    expect(state.turn).toMatchObject({ id: 'A', actionUsed: false });
    expect(game.state.rooms[room].encountersStarted).toBe(1);
  });

  it('runs enemy turns itself: the enemy walks toward the party, then the next player is up', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    const startRow = fight(room).positions.e1.row;
    const toB = stateWhere(a, snapshot => turnOf(snapshot) === 'B');
    a.emit('combat_end_turn', { room });
    const snapshot = await toB;
    expect(snapshot.positions.e1.row).toBeGreaterThan(startRow);
  });

  it('refuses actions from someone whose turn it is not', async () => {
    const { room, sockets: [, b] } = await startFight([enemy('e1', 20)]);
    const refused = waitFor(b, 'combat_error');
    b.emit('combat_end_turn', { room });
    expect(await refused).toMatchObject({ error: 'not_your_turn' });
    expect(fight(room).turn.id).toBe('A');
  });

  it('works out attack damage itself', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    fight(room).positions.e1 = { row: 5, col: 3 };
    const hit = stateWhere(a, snapshot => snapshot.events.some(event => event.type === 'damage'));
    const result = await ack(a, 'combat_attack', { room, targetId: 'e1' });
    expect(result).toEqual({ ok: true });
    // strength 10 / 10 * weapon 5 - resistance 10 / 10 = 4
    expect((await hit).enemies[0].stats.health).toBe(36);
  });

  it('moves players along real paths and enforces their movement', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    const moved = stateWhere(a, snapshot => snapshot.positions.A.col === 1);
    expect(await ack(a, 'combat_move', { room, to: { row: 6, col: 1 } })).toEqual({ ok: true });
    expect((await moved).turn.movementLeft).toBe(2);
    expect(await ack(a, 'combat_move', { room, to: { row: 2, col: 1 } })).toMatchObject({ ok: false, error: 'too_far' });
  });

  it('only allows abilities the character actually has', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    const result = await ack(a, 'combat_ability', { room, abilityId: 'black_hole', targetPosition: { row: 1, col: 1 } });
    expect(result).toMatchObject({ ok: false, error: 'not_owned' });
  });

  it('ends the turn by itself once the player has nothing left to do', async () => {
    const chars = { A: character('a', 9), B: character('b', 1) };
    const { room, sockets: [a] } = await startFight([enemy('e1', 5)], chars);
    fight(room).positions.e1 = { row: 5, col: 3 };
    const nextTurn = stateWhere(a, snapshot => turnOf(snapshot) !== 'A');
    await ack(a, 'combat_attack', { room, targetId: 'e1' });
    expect(turnOf(await nextTurn)).toBe('e1');
  });

  it('narrates each turn from the server', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    fight(room).positions.e1 = { row: 5, col: 3 };
    const line = waitFor(b, 'combat_narration', ({ actor }) => actor === 'a');
    await ack(a, 'combat_attack', { room, targetId: 'e1' });
    a.emit('combat_end_turn', { room });
    expect((await line).text.length).toBeGreaterThan(0);
  });

  it('declares victory when the last enemy falls and patches the party up', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20, 2)]);
    game.state.rooms[room].characterSelections.B.stats.health = 5;
    fight(room).positions.e1 = { row: 5, col: 3 };
    const ended = waitFor(a, 'combat_ended');
    await ack(a, 'combat_attack', { room, targetId: 'e1' });
    const result = await ended;
    expect(result).toMatchObject({ result: 'enemies_defeated', encounterIndex: 0, postCombat: 'levelUp', isFinalEncounter: false });
    expect(result.characters.B.stats.health).toBe(80);
  });

  it('declares defeat only when every player is down', async () => {
    const strong = { ...enemy('e1', 20), stats: { ...enemy('e1', 20).stats, strength: 500 } };
    const { room, sockets: [a, b] } = await startFight([strong], { A: character('a', 40, 1), B: character('b', 10, 1) });
    fight(room).positions.e1 = { row: 6, col: 4 };
    fight(room).positions.B = { row: 6, col: 5 };

    // The enemy can only kill one of them per turn, so the fight must continue after the first.
    const firstDown = stateWhere(a, snapshot => snapshot.events.some(event => event.type === 'death'));
    a.emit('combat_end_turn', { room });
    const afterFirst = await firstDown;
    expect(afterFirst.endedResult).toBeNull();

    const ended = waitFor(a, 'combat_ended', () => true, 4000);
    const survivor = Object.entries(afterFirst.characters).find(([, c]) => c.stats.health > 0)[0];
    const survivorSocket = survivor === 'A' ? a : b;
    if (fight(room).turn?.id !== survivor) await stateWhere(a, snapshot => turnOf(snapshot) === survivor);
    survivorSocket.emit('combat_end_turn', { room });
    expect(await ended).toMatchObject({ result: 'all_dead' });
    expect(game.state.rooms[room].gameOver).toBe(true);
  });

  it('moves on when the acting player is killed by a reflected hit', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)], { A: character('a', 40, 1), B: character('b', 10) });
    fight(room).positions.e1 = { row: 5, col: 3 };
    fight(room).activeEffects.push({ type: 'damage_reflection', target: 'e1', turnsRemaining: 1, ownerTurnId: 'e1' });
    const toB = stateWhere(a, snapshot => turnOf(snapshot) === 'B');
    await ack(a, 'combat_attack', { room, targetId: 'e1' });
    const snapshot = await toB;
    expect(snapshot.turnOrder.map(t => t.id)).toEqual(['e1', 'B']);
  });

  it('ends an AFK player\'s turn automatically', async () => {
    const { sockets: [a] } = await startFight([enemy('e1', 20)]);
    const timedOut = waitFor(a, 'turn_timed_out', () => true, 2000);
    const toB = stateWhere(a, snapshot => turnOf(snapshot) === 'B', 2000);
    expect(await timedOut).toEqual({ playerName: 'A' });
    await toB;
  });

  it('ignores a second start_combat while a fight is running', async () => {
    const { room, sockets: [, b] } = await startFight([enemy('e1', 20)]);
    nextEnemies = [enemy('other', 99)];
    const echo = waitFor(b, 'combat_state');
    b.emit('start_combat', { room });
    expect((await echo).enemies.map(e => e.id)).toEqual(['e1']);
    expect(game.state.rooms[room].encountersStarted).toBe(1);
  });

  it('puts a reconnecting player back in the fight and restores their screen', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    const removed = stateWhere(a, snapshot => !snapshot.turnOrder.some(t => t.id === 'B'));
    b.disconnect();
    await removed;

    const b2 = await connect('u2', 'B');
    const back = stateWhere(b2, snapshot => snapshot.turnOrder.some(t => t.id === 'B'));
    const screen = waitFor(b2, 'start_game');
    const story = waitFor(b2, 'story_state');
    await ack(b2, 'join_room', room, 'B');
    await back;
    await screen;
    expect(await story).toMatchObject({ combatFlowIndex: 1 });
  });

  it('pauses enemy turns while nobody is connected and resumes when someone returns', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    b.disconnect();
    a.disconnect();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(fight(room).paused).toBe(true);
    expect(fight(room).turn.id).toBe('e1');

    const a2 = await connect('u1', 'A');
    const resumed = stateWhere(a2, snapshot => turnOf(snapshot) === 'A' && !snapshot.paused);
    await ack(a2, 'join_room', room, 'A');
    await resumed;
  });
});

// ---------------------------------------------------------------------------
// Level ups
// ---------------------------------------------------------------------------

describe('level up', () => {
  async function playingRoom(levels = { A: 1, B: 1 }) {
    const { room, sockets } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    seedCharacters(room, {
      A: { ...character('a', 30), level: levels.A },
      B: { ...character('b', 20), level: levels.B }
    });
    return { room, sockets };
  }

  const spend = (char, stat, points) => ({ ...char, stats: { ...char.stats, [stat]: char.stats[stat] + points } });

  it('levels each player exactly once, even if they submit twice', async () => {
    const { room, sockets: [a, b] } = await playingRoom();
    const opened = waitFor(a, 'level_up');
    a.emit('level_up', { room, encounterIndex: 0 });
    await opened;

    const base = game.state.rooms[room].characterSelections.A;
    const updated = waitFor(b, 'characters_updated', payload => payload.A?.level === 2);
    a.emit('level_up_ready', { room, updatedCharacter: spend(base, 'strength', 15) });
    expect((await updated).A.stats.strength).toBe(25);

    // A refreshes and submits again: ignored.
    a.emit('level_up_ready', { room, updatedCharacter: spend({ ...base, level: 2 }, 'strength', 15) });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(game.state.rooms[room].characterSelections.A.level).toBe(2);

    const complete = waitFor(a, 'level_up_complete');
    b.emit('level_up_ready', { room, updatedCharacter: spend(game.state.rooms[room].characterSelections.B, 'speed', 15) });
    const result = await complete;
    expect(result.players.B.level).toBe(2);
    expect(result.chooseAbilities).toEqual([]);
  });

  it('ignores a repeated level-up for the same encounter', async () => {
    const { room, sockets: [a, b] } = await playingRoom();
    a.emit('level_up', { room, encounterIndex: 0 });
    await waitFor(a, 'level_up');
    const done = waitFor(a, 'level_up_complete');
    a.emit('level_up_ready', { room, updatedCharacter: game.state.rooms[room].characterSelections.A });
    b.emit('level_up_ready', { room, updatedCharacter: game.state.rooms[room].characterSelections.B });
    await done;

    const noSecond = expectNo(a, 'level_up');
    a.emit('level_up', { room, encounterIndex: 0 });
    await noSecond;
  });

  it('rejects stat allocations over budget', async () => {
    const { room, sockets: [a] } = await playingRoom();
    a.emit('level_up', { room, encounterIndex: 0 });
    await waitFor(a, 'level_up');
    const rejected = waitFor(a, 'level_up_rejected');
    a.emit('level_up_ready', { room, updatedCharacter: spend(game.state.rooms[room].characterSelections.A, 'strength', 40) });
    expect((await rejected).message).toMatch(/points/);
    expect(game.state.rooms[room].characterSelections.A.level).toBe(1);
  });

  it('skips the level-up screen entirely when everyone is max level', async () => {
    const { room, sockets: [a] } = await playingRoom({ A: 5, B: 5 });
    const noScreen = expectNo(a, 'level_up');
    const complete = waitFor(a, 'level_up_complete');
    a.emit('level_up', { room, encounterIndex: 6 });
    await complete;
    await noScreen;
  });

  it('sends players who reach level 3 to pick a new ability, and only waits for them', async () => {
    const { room, sockets: [a, b] } = await playingRoom({ A: 2, B: 5 });
    a.emit('level_up', { room, encounterIndex: 2 });
    const opened = await waitFor(a, 'level_up');
    expect(opened.maxLevelPlayers).toEqual(['B']);

    const complete = waitFor(b, 'level_up_complete');
    a.emit('level_up_ready', { room, updatedCharacter: game.state.rooms[room].characterSelections.A });
    expect((await complete).chooseAbilities).toEqual(['A']);

    const resume = waitFor(b, 'start_game');
    a.emit('ability_ready', { room });
    await resume;
  });

  it("carries the old ultimate's cooldown (+3) over to a new ultimate picked on a level-up", async () => {
    const { room, sockets: [a, b] } = await playingRoom({ A: 4, B: 5 });
    const roomState = game.state.rooms[room];
    roomState.characterSelections.A.ultimate = { id: 'no_limits' };
    roomState.cooldowns = { A: { no_limits: 5, shadow_strike: 1 } };

    a.emit('level_up', { room, encounterIndex: 6 });
    await waitFor(a, 'level_up');
    const complete = waitFor(b, 'level_up_complete');
    a.emit('level_up_ready', { room, updatedCharacter: roomState.characterSelections.A });
    expect((await complete).chooseAbilities).toEqual(['A']);

    a.emit('character_selected', { room, character: { ...roomState.characterSelections.A, ultimate: { id: 'dead_calm' } } });
    await waitFor(a, 'update_character_selections', sel => sel.A?.ultimate?.id === 'dead_calm');
    const resume = waitFor(b, 'start_game');
    a.emit('ability_ready', { room });
    await resume;

    expect(roomState.cooldowns.A).toEqual({ dead_calm: 8, shadow_strike: 1 });
  });

  it('ignores ability changes mid-game outside the ability screen', async () => {
    const { room, sockets: [a] } = await playingRoom({ A: 3, B: 3 });
    const roomState = game.state.rooms[room];
    roomState.characterSelections.A.ultimate = { id: 'no_limits' };
    const refreshed = waitFor(a, 'update_character_selections');
    a.emit('character_selected', { room, character: { ...roomState.characterSelections.A, ultimate: { id: 'dead_calm' } } });
    await refreshed;
    expect(roomState.characterSelections.A.ultimate.id).toBe('no_limits');
  });
});

describe('cooldowns between fights', () => {
  it('keeps ultimate cooldowns from one fight to the next and resets everything else', async () => {
    const { room, sockets: [a] } = await createRoomWith([['u1', 'A']]);
    seedCharacters(room, { A: { ...character('a', 40), level: 3, ultimate: { id: 'no_limits' }, abilities: [{ id: 'shadow_strike' }] } });
    const roomState = game.state.rooms[room];
    roomState.cooldowns = { A: { no_limits: 9, shadow_strike: 2 } };
    nextEnemies = [enemy('e1', 5, 40)];
    const started = waitFor(a, 'combat_state');
    a.emit('start_combat', { room, sceneKey: 'street', playerPositions: { A: { row: 6, col: 3 } } });
    await started;
    expect(roomState.cooldowns.A).toEqual({ no_limits: 9, shadow_strike: 0 });
  });
});

describe('personal moments', () => {
  it('moves on in silence if the chosen player never answers', async () => {
    const { room, sockets: [a] } = await createRoomWith([['u1', 'A']]);
    seedCharacters(room, { A: { ...character('offensive_support_2', 30), name: 'Livewire' } });
    const roomState = game.state.rooms[room];
    roomState.selectedFaction = 'rebels';
    roomState.attributes = { A: ['Politician', 'Crook'] };
    const session = game.narrator.getSession(room);
    session.faction = 'rebels';
    session.openingCombatStarted = true;

    const story = waitFor(a, 'ai_message', message => message.eventType === 'encounter_end');
    const silence = waitFor(a, 'ai_message', message => message.eventType === 'dialogue_reply', 3000);
    a.emit('ai_request', { requestId: 'after-fight', room, eventType: 'encounter_end' });
    const told = await story;
    expect(told.dialogue?.playerName).toBe('A');
    expect(told.options).toBeNull();
    expect(told.response).toContain('Livewire');

    const after = await silence;
    expect(after.response).toMatch(/Livewire (doesn't answer|lets the moment pass)/);
    expect(after.options).toHaveLength(2);
  });

  it('lets only the chosen player answer, then tells everyone in the narration with the group decision', async () => {
    const { room, sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    const session = game.narrator.getSession(room);
    session.pendingDialogue = {
      ...createDialogue({ target: { playerName: 'B', characterName: 'Livewire' }, attributes: ['politician'], faction: 'rebels', random: () => 0 }),
      followUp: { options: ['Go left', 'Go right'], attribute: 'navigator', ownerName: 'Shipment' }
    };

    expect((await ack(a, 'dialogue_reply', { room, dialogueId: 'd1', optionId: 'skill' })).ok).toBe(false);

    const told = waitFor(a, 'ai_message', message => message.eventType === 'dialogue_reply');
    expect((await ack(b, 'dialogue_reply', { room, dialogueId: 'd1', optionId: 'skill' })).ok).toBe(true);
    const message = await told;
    expect(message.response).toMatch(/^Livewire: "We came to save someone\." /);
    expect(message.options).toEqual(['Go left', 'Go right']);
    expect(session.npcAttitudes['A checkpoint guard']).toBe(2);
    expect(game.state.rooms[room].lastStoryMessage.options).toEqual(['Go left', 'Go right']);
  });
});

// ---------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------

describe('bots', () => {
  async function onCharacterScreen(players = [['u1', 'A']]) {
    const { room, sockets } = await createRoomWith(players);
    const started = waitFor(sockets[0], 'gameStarted');
    sockets[0].emit('startGame');
    await started;
    return { room, sockets };
  }

  it('lets only the host add a bot, which picks a missing role and is ready at once', async () => {
    const { room, sockets: [a, b] } = await onCharacterScreen([['u1', 'A'], ['u2', 'B']]);

    expect((await ack(b, 'add_bot', { room })).ok).toBe(false);

    const botsUpdated = waitFor(b, 'bots_updated', list => list.length === 1);
    const result = await ack(a, 'add_bot', { room });
    expect(result.ok).toBe(true);
    expect(result.name).toMatch(/\(bot\)$/);
    expect(await botsUpdated).toEqual([result.name]);

    const roomState = game.state.rooms[room];
    expect(roomState.players).toContain(result.name);
    expect(roomState.characterSelections[result.name].role).toBe('Tank'); // nobody had a tank
    expect(roomState.readyPlayers).toContain(result.name);
  });

  it('runs the whole lobby with a bot: it is never waited on and gets a full loadout', async () => {
    const { room, sockets: [a] } = await onCharacterScreen();
    const { name: bot } = await ack(a, 'add_bot', { room });

    a.emit('character_selected', { room, character: { ...character('aggressive_dps_2', 45), name: 'Leo' } });
    await waitFor(a, 'update_character_selections', sel => !!sel.A);
    const customization = waitFor(a, 'character_customization');
    a.emit('player_ready', { room });
    await customization;

    a.emit('update_attributes', { room, newAttributes: ['Medic', 'Spy'] });
    await waitFor(a, 'attributes_updated', attrs => !!attrs.A);
    const abilities = waitFor(a, 'start_main_game');
    a.emit('attributes_ready', { room });
    await abilities;

    const roomState = game.state.rooms[room];
    expect(roomState.attributes[bot]).toHaveLength(10);
    roomState.attributes.A.forEach((name, slot) => expect(roomState.attributes[bot][slot]).not.toBe(name));
    // The bot chose after A, from what A left.
    expect(['Medic', 'Spy']).not.toContain(roomState.attributes[bot][0]);
    expect(['Medic', 'Spy']).not.toContain(roomState.attributes[bot][1]);
    expect(roomState.characterSelections[bot].abilities).toHaveLength(1);
    expect(roomState.abilityReadyPlayers).toEqual([bot]);

    const started = waitFor(a, 'start_game');
    a.emit('ability_ready', { room });
    await started;
  });

  it('lets the host remove a bot, and resets drop bots', async () => {
    const { room, sockets: [a] } = await onCharacterScreen();
    const { name: first } = await ack(a, 'add_bot', { room });
    const { name: second } = await ack(a, 'add_bot', { room });
    expect(first).not.toBe(second);

    expect((await ack(a, 'remove_bot', { room, name: first })).ok).toBe(true);
    expect(game.state.rooms[room].players).toEqual(['A', second]);
    expect((await ack(a, 'remove_bot', { room, name: 'A' })).ok).toBe(false); // not a bot

    const reset = waitFor(a, 'game_reset');
    a.emit('reset_game');
    await reset;
    expect(game.state.rooms[room].players).toEqual(['A']);
    expect(game.state.rooms[room].bots).toEqual([]);
  });

  it('stops at six seats', async () => {
    const { room, sockets: [a] } = await onCharacterScreen();
    for (let i = 0; i < 5; i++) expect((await ack(a, 'add_bot', { room })).ok).toBe(true);
    const full = await ack(a, 'add_bot', { room });
    expect(full.ok).toBe(false);
    expect(game.state.rooms[room].players).toHaveLength(6);
  });

  it('closes the room when the last person leaves, even with bots seated', async () => {
    const { room, sockets: [a] } = await onCharacterScreen();
    await ack(a, 'add_bot', { room });
    a.emit('leave_room');
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(game.state.rooms[room]).toBeUndefined();
  });

  it('plays its own turns in combat and is a target like anyone else', async () => {
    const { room, sockets: [a] } = await createRoomWith([['u1', 'A']]);
    const bot = 'Nova (bot)';
    const roomState = game.state.rooms[room];
    roomState.players.push(bot);
    roomState.bots = [bot];
    seedCharacters(room, {
      A: character('a', 10),
      [bot]: { ...character('bot', 50), weapon: { name: 'blade', damage: 9, range: 1 } }
    });
    nextEnemies = [enemy('e1', 5, 40)];

    // The bot is fastest; the fight should come round to A without A doing anything.
    const aTurn = waitFor(a, 'combat_state', state => state.currentTurn?.id === 'A', 4000);
    a.emit('start_combat', { room, sceneKey: 'street', playerPositions: { A: { row: 6, col: 0 }, [bot]: { row: 4, col: 4 } } });
    await aTurn;

    const fight = game.state.combat[room];
    expect(fight.positions[bot]).not.toEqual({ row: 4, col: 4 });
    expect(fight.turnOrder.map(entry => entry.id)).toContain(bot);
  });

  it('levels bots up automatically and never asks them to pick abilities', async () => {
    const { room, sockets: [a] } = await createRoomWith([['u1', 'A']]);
    const bot = 'Nova (bot)';
    const roomState = game.state.rooms[room];
    roomState.players.push(bot);
    roomState.bots = [bot];
    seedCharacters(room, {
      A: { ...character('a', 30), level: 2 },
      [bot]: { ...character('bot', 30), role: 'Tank', level: 2 }
    });

    a.emit('level_up', { room, encounterIndex: 2 });
    await waitFor(a, 'level_up');
    expect(roomState.characterSelections[bot].level).toBe(3);
    expect(roomState.characterSelections[bot].ultimate?.id).toBeTruthy();
    expect(roomState.characterSelections[bot].abilities).toHaveLength(2);

    const complete = waitFor(a, 'level_up_complete');
    a.emit('level_up_ready', { room, updatedCharacter: roomState.characterSelections.A });
    expect((await complete).chooseAbilities).toEqual(['A']);
  });

  it('keeps story decisions with people', async () => {
    const { room } = await createRoomWith([['u1', 'A']]);
    const roomState = game.state.rooms[room];
    roomState.players.push('Nova (bot)');
    roomState.bots = ['Nova (bot)'];
    roomState.attributes = { A: ['Spy'], 'Nova (bot)': ['Medic'] };
    const context = game.sockets.buildNarratorContext(room);
    expect(context.players).toEqual(['A']);
    expect(context.connectedPlayers).toEqual(['A']);
  });
});

// ---------------------------------------------------------------------------
// Narrator over sockets
// ---------------------------------------------------------------------------

describe('narrator events', () => {
  it('broadcasts story narration with the faction choice to the whole room', async () => {
    const { room, sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    seedCharacters(room, { A: character('offensive_tank_1', 30), B: character('hacker_support_4', 20) });

    const thinking = waitFor(b, 'ai_thinking', payload => payload.thinking === true);
    const message = waitFor(b, 'ai_message');
    a.emit('ai_request', { requestId: 'r1', room, eventType: 'game_start', message: 'go', data: {} });
    await thinking;
    const payload = await message;
    expect(payload).toMatchObject({ requestId: 'r1', eventType: 'game_start', options: ['Fight with the Enforcers', 'Fight with the Rebels'], attribute: 'politician' });
    expect(game.state.rooms[room].lastStoryMessage.eventType).toBe('game_start');
  });

  it('answers rules questions only to the player who asked', async () => {
    const { room, sockets: [a, b] } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    const notForB = expectNo(b, 'chatbot_message', () => true, 300);
    const answer = waitFor(a, 'chatbot_message');
    a.emit('ai_request', { requestId: 'c1', room, eventType: 'chat_message', message: 'how do I attack?', data: { source: 'chatbot' } });
    expect((await answer).response).toMatch(/Offline help/);
    await notForB;
  });

  it('processes each request id once', async () => {
    const { room, sockets: [a] } = await createRoomWith([['u1', 'A']]);
    let count = 0;
    a.on('ai_message', () => { count += 1; });
    a.emit('ai_request', { requestId: 'dup', room, eventType: 'turn_action', message: 'A swings.' });
    a.emit('ai_request', { requestId: 'dup', room, eventType: 'turn_action', message: 'A swings.' });
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(count).toBe(1);
  });
});
