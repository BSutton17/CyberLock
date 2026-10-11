import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameContext } from './Context';
import './PauseButton.css';

const minutes = (ms) => Math.max(1, Math.round(ms / 60000));
const clockTime = (when) => new Date(when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Top-bar "Pause" for single-player games (one person, any number of bots). Pausing stops the
 * fight and any personal moment's clock. While paused the player can step away (or just close
 * the game) and come back within the window (10 minutes); the game picks up where it stopped.
 */
function PauseButton() {
    const { socket, room, players = [], bots = [], gamePaused, steppedAway, setSteppedAway } = useGameContext();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const humans = players.filter(player => !bots.includes(player));
    const solo = humans.length === 1;
    const paused = !!gamePaused?.paused;
    const windowMs = gamePaused?.windowMs || 600000;

    useEffect(() => {
        if (!paused) setError('');
    }, [paused]);

    const setPaused = (next) => {
        if (!room || busy) return;
        setBusy(true);
        socket.emit('set_paused', { room, paused: next }, (reply) => {
            setBusy(false);
            if (!reply?.ok) setError(reply?.message || 'Could not change the pause.');
        });
    };

    const stepAway = () => {
        setSteppedAway({ until: Date.now() + windowMs });
        socket.disconnect();
    };

    const rejoin = () => {
        // Reconnecting rejoins the saved game (HomeScreen), which clears steppedAway.
        socket.connect();
    };

    const overlay = steppedAway ? (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Stepped away">
            <div className="pause-panel">
                <h2>You stepped away</h2>
                <p>Your game is saved and waiting until {clockTime(steppedAway.until)}. Come back before then and it picks up right where you left it.</p>
                <button className="pause-primary" onClick={rejoin}>Rejoin</button>
            </div>
        </div>
    ) : paused ? (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Paused">
            <div className="pause-panel">
                <h2>Paused</h2>
                <p>Nothing moves until you resume. You can step away or close the game and come back within {minutes(windowMs)} minutes; it picks up right here.</p>
                {error && <p className="pause-error" role="alert">{error}</p>}
                <div className="pause-actions">
                    <button className="pause-primary" onClick={() => setPaused(false)} disabled={busy}>Resume</button>
                    <button className="pause-secondary" onClick={stepAway}>Step away</button>
                </div>
            </div>
        </div>
    ) : null;

    if (!solo && !steppedAway) return null;
    return (
        <>
            {solo && (
                <button className="leave-main pause-button" onClick={() => setPaused(true)} disabled={busy || paused}>
                    Pause
                </button>
            )}
            {overlay && createPortal(overlay, document.body)}
        </>
    );
}

export default PauseButton;
