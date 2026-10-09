import React, { useEffect, useState } from 'react';
import { useGameContext } from './Context';
import './MockToggle.css';

/**
 * Bottom-left switch for the host: "Mock" swaps the AI narrator for the free offline one in this
 * room, for testing in production without spending AI credits. Everyone else sees a small badge
 * while it's on.
 */
function MockToggle({ inRoom }) {
    const { socket, room, isAdmin } = useGameContext();
    const [mock, setMock] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const handleMode = ({ mock: enabled } = {}) => setMock(!!enabled);
        socket.on('narrator_mode', handleMode);
        return () => {
            socket.off('narrator_mode', handleMode);
        };
    }, [socket]);

    if (!inRoom) return null;

    if (!isAdmin) {
        return mock ? <div className="mock-toggle mock-badge" role="status">Mock narrator</div> : null;
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
            className={`mock-toggle ${mock ? 'on' : ''}`}
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
