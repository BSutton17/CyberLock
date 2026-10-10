// @vitest-environment happy-dom
import React, { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import GameContext from './Context';
import StorySummary from './StorySummary';

afterEach(cleanup);

// A socket that answers right away, or holds the answer until `answer()` is called.
function fakeSocket({ reply = null, hold = false } = {}) {
  const socket = {
    asked: [],
    pending: [],
    emit(event, payload, ack) {
      socket.asked.push(event);
      if (hold) socket.pending.push(() => ack?.({ summary: reply }));
      else ack?.({ summary: reply });
    },
    answer() {
      socket.pending.splice(0).forEach(send => send());
    }
  };
  return socket;
}

function Room({ socket, initial = null }) {
  const [storySummary, setStorySummary] = useState(initial);
  return (
    <GameContext.Provider value={{ socket, room: '1234', storySummary, setStorySummary }}>
      <StorySummary />
    </GameContext.Provider>
  );
}

const twoActs = {
  acts: [
    { act: 1, title: 'Act I - Eyes in the Sky', text: 'The party sided with the Rebels and brought down The Architect.', finished: true },
    { act: 2, title: 'Act II - Blackout', text: 'Shipment picked the night raid on the depot.', finished: false }
  ]
};

describe('StorySummary', () => {
  it('asks the narrator only when the button is pressed', () => {
    const socket = fakeSocket();
    render(<Room socket={socket} />);
    expect(socket.asked).toEqual([]);
    fireEvent.click(screen.getByText('Summarize'));
    expect(socket.asked).toEqual(['request_story_summary']);
    expect(screen.getByRole('dialog', { name: 'The story so far' })).toBeTruthy();
    expect(screen.getByText(/Nothing to recap yet/)).toBeTruthy();
  });

  it('shows one paragraph per act, and closes', () => {
    render(<Room socket={fakeSocket({ reply: twoActs })} />);
    fireEvent.click(screen.getByText('Summarize'));
    expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(['Act I - Eyes in the Sky', 'Act II - Blackout']);
    expect(screen.getByText('Shipment picked the night raid on the depot.')).toBeTruthy();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the last version while the newest is written', () => {
    const socket = fakeSocket({ reply: twoActs, hold: true });
    render(<Room socket={socket} initial={{ acts: [twoActs.acts[0]] }} />);
    fireEvent.click(screen.getByText('Summarize'));
    expect(screen.getByText(/brought down The Architect/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Catching up/);
    act(() => socket.answer());
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Shipment picked the night raid on the depot.')).toBeTruthy();
  });
});
