// @vitest-environment happy-dom
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import GameContext from './Context';
import PauseButton from './PauseButton';
import PartyStatus from './PartyStatus';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function fakeSocket() {
  const socket = {
    sent: [],
    emit: vi.fn((event, payload, ack) => {
      socket.sent.push([event, payload]);
      ack?.({ ok: true, paused: payload?.paused });
    }),
    disconnect: vi.fn(),
    connect: vi.fn()
  };
  return socket;
}

function Room({ socket, players = ['A', 'Patchwork (bot)'], bots = ['Patchwork (bot)'], paused = false, extra = {} }) {
  const [steppedAway, setSteppedAway] = useState(null);
  const value = { socket, room: '1234', players, bots, gamePaused: { paused, windowMs: 600000 }, steppedAway, setSteppedAway, ...extra };
  return (
    <GameContext.Provider value={value}>
      <PauseButton />
      <PartyStatus />
    </GameContext.Provider>
  );
}

describe('PauseButton', () => {
  it('shows in a single-player game and asks the server to pause', () => {
    const socket = fakeSocket();
    render(<Room socket={socket} />);
    fireEvent.click(screen.getByText('Pause'));
    expect(socket.sent).toEqual([['set_paused', { room: '1234', paused: true }]]);
  });

  it('is not offered when more than one person is playing', () => {
    render(<Room socket={fakeSocket()} players={['A', 'B']} bots={[]} />);
    expect(screen.queryByText('Pause')).toBeNull();
  });

  it('covers the game while paused, with resume and a ten-minute step away', () => {
    const socket = fakeSocket();
    render(<Room socket={socket} paused />);
    expect(screen.getByRole('dialog', { name: 'Paused' }).textContent).toMatch(/within 10 minutes/);
    fireEvent.click(screen.getByText('Resume'));
    expect(socket.sent.at(-1)).toEqual(['set_paused', { room: '1234', paused: false }]);

    fireEvent.click(screen.getByText('Step away'));
    expect(socket.disconnect).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Stepped away' })).toBeTruthy();
    fireEvent.click(screen.getByText('Rejoin'));
    expect(socket.connect).toHaveBeenCalled();
  });
});

describe('PartyStatus', () => {
  it('counts down for a player who dropped out', () => {
    vi.useFakeTimers();
    const awayPlayers = { B: Date.now() + 161000 };
    render(<Room socket={fakeSocket()} players={['A', 'B']} bots={[]} extra={{ playerName: 'A', awayPlayers, playerCharacters: { B: { name: 'Livewire' } } }} />);
    expect(screen.getByText('Livewire lost connection: 2:41 to rejoin')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Livewire lost connection: 2:40 to rejoin')).toBeTruthy();
  });

  it('says when someone left the party, then clears it', () => {
    vi.useFakeTimers();
    const setPartyNotice = vi.fn();
    render(<Room socket={fakeSocket()} extra={{ partyNotice: { text: 'Livewire (sean) left the party.', at: Date.now() }, setPartyNotice }} />);
    expect(screen.getByText('Livewire (sean) left the party.')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(6100); });
    expect(setPartyNotice).toHaveBeenCalledWith(null);
  });
});
