import { describe, it, expect } from 'vitest';
import {
  createRoom,
  generateRoomCode,
  claimSeat,
  removePlayer,
  isCharacterTaken,
  everyoneIn,
  MAX_PARTY_SIZE
} from './rooms.js';

describe('generateRoomCode', () => {
  it('returns a 4-digit code that is not taken', () => {
    const taken = new Set(['1000']);
    const sequence = [0, 0.5];
    const code = generateRoomCode(code => taken.has(code), () => sequence.shift() ?? 0.5);
    expect(code).toMatch(/^\d{4}$/);
    expect(taken.has(code)).toBe(false);
  });

  it('falls back to longer codes when every short one is taken', () => {
    const code = generateRoomCode(candidate => candidate.length === 4, () => 0.3);
    expect(code).toMatch(/^\d{5}$/);
  });
});

describe('claimSeat', () => {
  it('seats the first player as admin', () => {
    const room = createRoom('1234');
    expect(claimSeat(room, 'Bryson', 'u1')).toEqual({ ok: true, name: 'Bryson', isNew: true });
    expect(room.admin).toBe('Bryson');
    expect(room.players).toEqual(['Bryson']);
    expect(room.playerScreens.Bryson).toBe('waiting');
  });

  it('lets a returning user reclaim their seat, even under another name', () => {
    const room = createRoom('1234');
    claimSeat(room, 'Bryson', 'u1');
    expect(claimSeat(room, 'Bryson', 'u1')).toMatchObject({ ok: true, isNew: false });
    expect(claimSeat(room, 'B', 'u1')).toMatchObject({ ok: true, name: 'Bryson', isNew: false });
    expect(room.players).toEqual(['Bryson']);
  });

  it('refuses a name held by somebody else', () => {
    const room = createRoom('1234');
    claimSeat(room, 'Sean', 'u1');
    expect(claimSeat(room, 'Sean', 'u2')).toMatchObject({ ok: false, error: 'name_taken' });
    expect(room.players).toEqual(['Sean']);
  });

  it('refuses new players once the room is full', () => {
    const room = createRoom('1234');
    for (let i = 0; i < MAX_PARTY_SIZE; i++) claimSeat(room, `p${i}`, `u${i}`);
    expect(claimSeat(room, 'late', 'late')).toMatchObject({ ok: false, error: 'room_full' });
  });
});

describe('removePlayer', () => {
  it('removes all per-player data', () => {
    const room = createRoom('1');
    claimSeat(room, 'a', 'u1');
    claimSeat(room, 'b', 'u2');
    room.characterSelections.b = { id: 'x' };
    room.readyPlayers = ['a', 'b'];
    room.levelUp = { required: ['a', 'b'] };
    removePlayer(room, 'b');
    expect(room.players).toEqual(['a']);
    expect(room.characterSelections.b).toBeUndefined();
    expect(room.readyPlayers).toEqual(['a']);
    expect(room.levelUp.required).toEqual(['a']);
    expect(room.memberIds.b).toBeUndefined();
  });

  it('hands admin to the next player when the admin leaves', () => {
    const room = createRoom('1');
    claimSeat(room, 'a', 'u1');
    claimSeat(room, 'b', 'u2');
    expect(removePlayer(room, 'a')).toBe('b');
    expect(room.admin).toBe('b');
    expect(removePlayer(room, 'b')).toBeNull();
    expect(room.admin).toBeNull();
  });
});

describe('isCharacterTaken / everyoneIn', () => {
  it('detects another player holding the same character', () => {
    const room = createRoom('1');
    room.characterSelections = { a: { id: 'offensive_tank_1' } };
    expect(isCharacterTaken(room, 'b', 'offensive_tank_1')).toBe(true);
    expect(isCharacterTaken(room, 'a', 'offensive_tank_1')).toBe(false);
    expect(isCharacterTaken(room, 'b', 'hacker_support_4')).toBe(false);
  });

  it('requires at least one player and everyone ready', () => {
    expect(everyoneIn([], [])).toBe(false);
    expect(everyoneIn(['a', 'b'], ['a'])).toBe(false);
    expect(everyoneIn(['a', 'b'], ['b', 'a'])).toBe(true);
  });
});
