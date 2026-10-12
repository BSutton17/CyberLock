import React, { useState } from 'react';
import { useGameContext } from './Context';
import './MockToggle.css';

/**
 * The host's narration switch on the connect screen. Automatic: the story moves on by itself.
 * Manual: each part of the story stays up until the host taps it (choices still work as usual).
 * Everyone else sees a badge while it's manual.
 */
function NarrationPacingToggle({ inRoom }) {
    const { socket, room, isAdmin, narrationManual: manual, setNarrationManual: setManual } = useGameContext();
    const [busy, setBusy] = useState(false);

    if (!inRoom) return null;

    if (!isAdmin) {
        return manual ? <div className="mock-toggle pacing-toggle mock-badge" role="status">Narration: manual</div> : null;
    }

    const toggle = () => {
        setBusy(true);
        socket.emit('set_narration_pacing', { room, manual: !manual }, (result) => {
            setBusy(false);
            if (result?.ok) setManual(!!result.manual);
        });
    };

    return (
        <button
            className={`mock-toggle pacing-toggle ${manual ? 'on' : ''}`}
            onClick={toggle}
            disabled={busy}
            aria-pressed={manual}
            title={manual ? 'You tap the story to move it along. Tap to make it automatic.' : 'The story moves along by itself. Tap to move it along yourself.'}
        >
            Narration: {manual ? 'manual' : 'automatic'}
        </button>
    );
}

export default NarrationPacingToggle;
