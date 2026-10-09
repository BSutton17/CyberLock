// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import GameContext from './Context';
import MockToggle from './MockToggle';

function fakeSocket() {
  const handlers = new Map();
  return {
    emitted: [],
    on(event, handler) { (handlers.get(event) || handlers.set(event, new Set()).get(event)).add(handler); },
    off(event, handler) { handlers.get(event)?.delete(handler); },
    emit(event, payload, ack) { this.emitted.push({ event, payload }); ack?.({ ok: true, mock: payload.mock }); },
    serverSends(event, payload) { for (const handler of [...(handlers.get(event) || [])]) handler(payload); }
  };
}

const renderWith = (socket, isAdmin) => render(
  <GameContext.Provider value={{ socket, room: '1234', isAdmin }}>
    <MockToggle inRoom />
  </GameContext.Provider>
);

afterEach(cleanup);

describe('MockToggle', () => {
  it('lets the host switch the room to the offline narrator', () => {
    const socket = fakeSocket();
    renderWith(socket, true);
    fireEvent.click(screen.getByText('Mock off'));
    expect(socket.emitted).toEqual([{ event: 'set_narrator_mode', payload: { room: '1234', mock: true } }]);
    expect(screen.getByText('Mock on')).toBeTruthy();
  });

  it('shows other players a badge only while mock is on', () => {
    const socket = fakeSocket();
    renderWith(socket, false);
    expect(screen.queryByText('Mock narrator')).toBeNull();
    act(() => socket.serverSends('narrator_mode', { mock: true }));
    expect(screen.getByText('Mock narrator')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
