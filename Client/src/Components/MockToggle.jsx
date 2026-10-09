import React, { useState } from 'react';
import { useGameContext } from './Context';
import './MockToggle.css';

/**
 * The host's switch: "Mock" swaps the AI narrator for the free offline one in this room, for
 * testing in production without spending AI credits. Everyone else sees a small badge while it's
 * on. It sits in the bottom-left corner before the game; in the game it sits in the top bar
 * (`inline`) so it never covers the character bar.
 */
function MockToggle({ inRoom, inline = false }) {
    // The room-wide setting lives in the game context (Events.jsx keeps it current), so the
    // switch stays right when it moves from the corner into the game's top bar.
    const { socket, room, isAdmin, narratorMock: mock, setNarratorMock: setMock } = useGameContext();
    const [busy, setBusy] = useState(false);

    if (!inRoom) return null;
    const placement = inline ? 'mock-toggle-inline' : '';

    if (!isAdmin) {
        return mock ? <div className={`mock-toggle mock-badge ${placement}`} role="status">Mock narrator</div> : null;
    }

    const toggle = () => {
        setBusy(true);
        socket.emit('set_narrator_mode', { room, mock: !mock }, (result) => {
            setBusy(false);
            if (result?.ok) setMock(!!result.mock);
        });
    };

    return (
        <button
            className={`mock-toggle ${placement} ${mock ? 'on' : ''}`}
            onClick={toggle}
            disabled={busy}
            aria-pressed={mock}
            title={mock ? 'Using the free offline narrator. Tap to use the AI again.' : 'Use the free offline narrator instead of the AI'}
        >
            Mock {mock ? 'on' : 'off'}
        </button>
    );
}

export default MockToggle;
