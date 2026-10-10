// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DialogueChoices from './DialogueChoices';

const dialogue = {
  id: 'd1',
  kind: 'reply',
  npc: 'A checkpoint guard',
  playerName: 'B',
  characterName: 'Livewire',
  options: [
    { id: 'skill', text: 'We came to save someone.', attribute: 'politician' },
    { id: 'honest', text: "We're just passing through.", attribute: null },
    { id: 'defiant', text: "It's none of your business.", attribute: null }
  ]
};

afterEach(cleanup);

describe('DialogueChoices', () => {
  it('lets the chosen player pick, with attribute answers tagged', () => {
    const onChoose = vi.fn();
    render(<DialogueChoices dialogue={dialogue} playerName="B" onChoose={onChoose} />);
    expect(screen.getByText('Your answer to a checkpoint guard')).toBeTruthy();
    expect(screen.getByText('Politician')).toBeTruthy();
    fireEvent.click(screen.getByText("It's none of your business."));
    expect(onChoose).toHaveBeenCalledWith('defiant');
  });

  it('shows everyone else the same choices, but only the chosen player can click', () => {
    const onChoose = vi.fn();
    render(<DialogueChoices dialogue={dialogue} playerName="A" onChoose={onChoose} />);
    expect(screen.getByText(/Livewire's answer to a checkpoint guard \(only they can choose\)/)).toBeTruthy();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons.every(button => button.disabled)).toBe(true);
  });

  it('words questions to an NPC as asking', () => {
    render(<DialogueChoices dialogue={{ ...dialogue, kind: 'ask', npc: 'Ines Calder' }} playerName="A" onChoose={() => {}} />);
    expect(screen.getByText(/Livewire can ask Ines Calder something/)).toBeTruthy();
  });

  it('shows no timer while there is plenty of time, then counts down the last 30 seconds', () => {
    const { rerender } = render(<DialogueChoices dialogue={{ ...dialogue, timeLeftMs: 180000 }} playerName="B" onChoose={() => {}} />);
    expect(screen.queryByRole('timer')).toBeNull();
    rerender(<DialogueChoices dialogue={{ ...dialogue, id: 'd2', timeLeftMs: 29500 }} playerName="B" onChoose={() => {}} />);
    expect(screen.getByRole('timer').textContent).toBe('30s left to answer');
    cleanup();
    render(<DialogueChoices dialogue={{ ...dialogue, timeLeftMs: 12000 }} playerName="A" onChoose={() => {}} />);
    expect(screen.getByRole('timer').textContent).toBe('12s left for Livewire to answer');
  });
});
