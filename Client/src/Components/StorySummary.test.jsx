// @vitest-environment happy-dom
import React, { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GameContext from './Context';
import StorySummary from './StorySummary';

afterEach(cleanup);

function Room({ reply = null }) {
  const [storySummary, setStorySummary] = useState(null);
  const socket = {
    asked: [],
    emit(event, payload, ack) { this.asked.push(event); ack?.({ summary: reply }); }
  };
  return (
    <GameContext.Provider value={{ socket, room: '1234', storySummary, setStorySummary }}>
      <StorySummary />
    </GameContext.Provider>
  );
}

describe('StorySummary', () => {
  it('says there is nothing yet before the first fight', () => {
    render(<Room />);
    fireEvent.click(screen.getByText('Summarize'));
    expect(screen.getByRole('dialog', { name: 'The story so far' })).toBeTruthy();
    expect(screen.getByText(/Nothing to recap yet/)).toBeTruthy();
  });

  it('shows the story so far it fetched, oldest first, and closes', () => {
    render(<Room reply={{ points: ['The party sided with the Rebels.', 'Shipment picked the night raid.'], fightsDone: 2 }} />);
    fireEvent.click(screen.getByText('Summarize'));
    const items = screen.getAllByRole('listitem').map(item => item.textContent);
    expect(items).toEqual(['The party sided with the Rebels.', 'Shipment picked the night raid.']);
    expect(screen.getByText('Updated after fight 2')).toBeTruthy();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
