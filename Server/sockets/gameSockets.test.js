import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as connectClient } from 'socket.io-client';
import { createGameServer } from '../app.js';
import { config as baseConfig } from '../config.js';
import { createSessionToken } from '../auth/session.js';
import { createNarrator } from '../narrator/storyEngine.js';
import { createMockProvider } from '../narrator/providers/mock.js';

const quiet = { log: () => {}, warn: () => {}, error: () => {} };

const testConfig = {
  ...baseConfig,
  isProduction: false,
  allowedOrigins: [],
  timing: {
    allyTurnAdvanceDelayMs: 0,
    combatStartEnemyDelayMs: 0,
    enemyTurnTimeoutMs: 400,
    allyTurnTimeoutMs: 600,
    disconnectGraceMs: 150
  }
};

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
    logger: quiet
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

    const part1 = waitFor(a, 'attribute_part1_complete');
    a.emit('attribute_part1_ready', { room });
    b.emit('attribute_part1_ready', { room });
    await part1;

    const mainGame = waitFor(a, 'start_main_game');
    a.emit('attributes_part2_ready', { room });
    b.emit('attributes_part2_ready', { room });
    await mainGame;

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
  async function startFight(enemies, chars = { A: character('a', 40), B: character('b', 10) }) {
    const { room, sockets } = await createRoomWith([['u1', 'A'], ['u2', 'B']]);
    seedCharacters(room, chars);
    const phase = waitFor(sockets[0], 'phase_changed_combat');
    sockets[0].emit('start_combat', { room, generatedEnemies: enemies, sceneKey: 'street' });
    return { room, sockets, phase: await phase };
  }

  it('orders turns by speed and runs enemy turns through a client', async () => {
    const { room, sockets: [a], phase } = await startFight([enemy('e1', 20)]);
    expect(phase.turnOrder.map(t => t.id)).toEqual(['A', 'e1', 'B']);
    expect(phase.encounterIndex).toBe(0);

    const enemyTurn = waitFor(a, 'execute_enemy_turn');
    a.emit('end_turn', { room });
    const { enemyId, executionId, allies } = await enemyTurn;
    expect(enemyId).toBe('e1');
    expect(allies).toEqual(['A', 'B']);

    const backToB = waitFor(a, 'turn_changed', ({ currentTurn }) => currentTurn.id === 'B');
    a.emit('enemy_turn_complete', { room, enemyId, executionId });
    await backToB;
  });

  it('ignores an end-turn from someone whose turn it is not', async () => {
    const { room, sockets: [, b] } = await startFight([enemy('e1', 20)]);
    const correction = waitFor(b, 'turn_changed', ({ currentTurn }) => currentTurn.id === 'A');
    b.emit('end_turn', { room });
    await correction;
    expect(game.state.combat[room].currentTurnIndex).toBe(0);
  });

  // Regression: killing a player who acted earlier this round used to stall combat.
  it('keeps going when an enemy kills a player who already acted', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20), enemy('e2', 5)]);
    const enemyTurn = waitFor(a, 'execute_enemy_turn');
    a.emit('end_turn', { room });
    const { executionId } = await enemyTurn;

    a.emit('player_damaged', { room, playerName: 'A', newHealth: 0 });
    await waitFor(b, 'turn_order_updated', ({ turnOrder }) => !turnOrder.some(t => t.id === 'A'));
    expect(game.state.combat[room].turnOrder[game.state.combat[room].currentTurnIndex].id).toBe('e1');

    const toB = waitFor(b, 'turn_changed', ({ currentTurn }) => currentTurn.id === 'B');
    a.emit('enemy_turn_complete', { room, enemyId: 'e1', executionId });
    await toB;
  });

  // Regression: an enemy dying during its own turn made the next player lose theirs.
  it('does not skip the next player when the acting enemy dies on its own turn', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20), enemy('e2', 5)]);
    const enemyTurn = waitFor(a, 'execute_enemy_turn');
    a.emit('end_turn', { room });
    const { executionId } = await enemyTurn;

    const toB = waitFor(b, 'turn_changed', ({ currentTurn }) => currentTurn.id === 'B');
    a.emit('enemy_turn_complete', {
      room,
      enemyId: 'e1',
      executionId,
      updatedEnemies: [enemy('e1', 20, 0), enemy('e2', 5)]
    });
    await toB;
  });

  it('removes a player killed by an end-of-turn effect and moves on', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    const enemyTurn = waitFor(b, 'execute_enemy_turn');
    a.emit('end_turn', { room, updatedPlayerCharacters: { A: character('a', 40, 0) } });
    await enemyTurn;
    expect(game.state.combat[room].turnOrder.map(t => t.id)).toEqual(['e1', 'B']);
  });

  it('declares victory when the last enemy falls', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    const ended = waitFor(a, 'combat_ended');
    a.emit('enemy_damaged', { room, enemyId: 'e1', newHealth: 0 });
    expect(await ended).toEqual({ result: 'enemies_defeated' });
  });

  it('declares defeat only when every player is down', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    const noDefeat = expectNo(a, 'combat_ended');
    a.emit('player_damaged', { room, playerName: 'B', newHealth: 0 });
    await noDefeat;
    const ended = waitFor(a, 'combat_ended');
    a.emit('player_damaged', { room, playerName: 'A', newHealth: 0 });
    expect(await ended).toEqual({ result: 'all_dead' });
  });

  it('ends an AFK player\'s turn automatically', async () => {
    const { sockets: [a] } = await startFight([enemy('e1', 20)]);
    const timedOut = waitFor(a, 'turn_timed_out', null ?? (() => true), 2000);
    const enemyTurn = waitFor(a, 'execute_enemy_turn', () => true, 2000);
    expect(await timedOut).toEqual({ playerName: 'A' });
    await enemyTurn;
  });

  it('skips an enemy turn nobody completes after retrying', async () => {
    const { room, sockets: [a] } = await startFight([enemy('e1', 20)]);
    a.emit('end_turn', { room });
    const toB = waitFor(a, 'turn_changed', ({ currentTurn }) => currentTurn.id === 'B', 3000);
    await toB;
  });

  it('ignores a second start_combat while a fight is running', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    const echo = waitFor(b, 'phase_changed_combat');
    b.emit('start_combat', { room, generatedEnemies: [enemy('other', 99)] });
    const payload = await echo;
    expect(payload.enemies.map(e => e.id)).toEqual(['e1']);
    expect(game.state.rooms[room].encountersStarted).toBe(1);
  });

  it('puts a reconnecting player back in the fight and restores their screen', async () => {
    const { room, sockets: [a, b] } = await startFight([enemy('e1', 20)]);
    const removed = waitFor(a, 'turn_order_updated', ({ turnOrder }) => !turnOrder.some(t => t.id === 'B'));
    b.disconnect();
    await removed;

    const b2 = await connect('u2', 'B');
    const phase = waitFor(b2, 'phase_changed_combat');
    const story = waitFor(b2, 'story_state');
    const restored = waitFor(a, 'turn_order_updated', ({ turnOrder }) => turnOrder.some(t => t.id === 'B'));
    await ack(b2, 'join_room', room, 'B');
    expect((await phase).turnOrder.map(t => t.id)).toContain('B');
    expect(await story).toMatchObject({ combatFlowIndex: 1 });
    await restored;
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
