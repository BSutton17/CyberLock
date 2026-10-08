// Room model: who is seated, who is admin, and the per-room lobby/progression state.
// Pure functions only; sockets live in Server/sockets.

export const MAX_PARTY_SIZE = 6;

// Lobby stages, in order. Each stage ends when every seated player is ready.
export const STAGES = ['lobby', 'characterSelect', 'attributes1', 'attributes2', 'abilities', 'playing'];

export function createRoom(code) {
  return {
    code,
    players: [],
    admin: null,
    memberIds: {},            // playerName -> userId (stops someone else taking your seat)
    characterSelections: {},
    readyPlayers: [],         // character select
    attributes: {},
    attributeReadyPlayers: [],
    abilitySelections: {},
    abilityReadyPlayers: [],
    abilityRound: null,       // { required: [names] } while players pick new abilities mid-game
    levelUpReadyPlayers: [],
    levelUp: null,            // { key, snapshot, required: [names] } while a level-up is open
    completedLevelUps: [],
    playerScreens: {},
    selectedFaction: null,
    stage: 'lobby'
  };
}

export function generateRoomCode(isTaken, random = Math.random) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const digits = attempt < 100 ? 4 : 5;
    const min = 10 ** (digits - 1);
    const code = String(Math.floor(random() * (9 * min)) + min);
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not find a free room code');
}

/**
 * Seats `userId` in the room as `requestedName`.
 * - A user who is already seated keeps their existing seat (even if they ask for another name).
 * - A name held by a different user is refused.
 * - New players are refused once the room is full.
 */
export function claimSeat(room, requestedName, userId, maxPartySize = MAX_PARTY_SIZE) {
  const existingName = Object.keys(room.memberIds).find(name => room.memberIds[name] === userId);
  if (existingName) {
    return { ok: true, name: existingName, isNew: false };
  }

  const holder = room.memberIds[requestedName];
  if (holder && holder !== userId) {
    return { ok: false, error: 'name_taken', message: `Someone in this room is already called ${requestedName}. Pick another display name.` };
  }

  if (room.players.length >= maxPartySize && !room.players.includes(requestedName)) {
    return { ok: false, error: 'room_full', message: 'This room is full.' };
  }

  room.memberIds[requestedName] = userId;
  if (!room.players.includes(requestedName)) {
    room.players.push(requestedName);
  }
  if (!room.admin) {
    room.admin = requestedName;
  }
  if (!room.playerScreens[requestedName]) {
    room.playerScreens[requestedName] = 'waiting';
  }
  return { ok: true, name: requestedName, isNew: true };
}

const without = (list, name) => (Array.isArray(list) ? list.filter(entry => entry !== name) : []);

// Removes every trace of a player. Returns the new admin if the admin left, otherwise null.
export function removePlayer(room, playerName) {
  room.players = without(room.players, playerName);
  delete room.memberIds[playerName];
  delete room.characterSelections[playerName];
  delete room.attributes[playerName];
  delete room.abilitySelections[playerName];
  delete room.playerScreens[playerName];
  room.readyPlayers = without(room.readyPlayers, playerName);
  room.attributeReadyPlayers = without(room.attributeReadyPlayers, playerName);
  room.abilityReadyPlayers = without(room.abilityReadyPlayers, playerName);
  room.levelUpReadyPlayers = without(room.levelUpReadyPlayers, playerName);
  if (room.levelUp) room.levelUp.required = without(room.levelUp.required, playerName);
  if (room.abilityRound) room.abilityRound.required = without(room.abilityRound.required, playerName);

  if (room.admin === playerName) {
    room.admin = room.players[0] || null;
    return room.admin;
  }
  return null;
}

// Ready-state lists are cleared when a player drops so a stale "ready" can't skip a step.
export function clearReadyFlags(room, playerName) {
  room.readyPlayers = without(room.readyPlayers, playerName);
  room.attributeReadyPlayers = without(room.attributeReadyPlayers, playerName);
  room.abilityReadyPlayers = without(room.abilityReadyPlayers, playerName);
}

export function isCharacterTaken(room, playerName, characterId) {
  if (!characterId) return false;
  return Object.entries(room.characterSelections || {}).some(
    ([owner, character]) => owner !== playerName && character?.id === characterId
  );
}

export const everyoneIn = (players, readyList) =>
  players.length > 0 && players.every(player => readyList.includes(player));
