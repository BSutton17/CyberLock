import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameContext } from './Context';
import './StorySummary.css';

/**
 * Top-bar "Summarize" button: opens the story so far, from how it began up to now. The narrator
 * rewrites it after every fight; the server pushes each new version (Events.jsx keeps it).
 */
function StorySummary() {
    const { socket, room, storySummary, setStorySummary } = useGameContext();
    const [open, setOpen] = useState(false);

    // Opening the game (or coming back to it) fetches the latest recap.
    useEffect(() => {
        if (!room) return;
        socket.emit('request_story_summary', { room }, (reply) => {
            if (reply?.summary) setStorySummary(reply.summary);
        });
    }, [socket, room, setStorySummary]);

    useEffect(() => {
        if (!open) return undefined;
        const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    const points = Array.isArray(storySummary?.points) ? storySummary.points : [];
    const fights = Number(storySummary?.fightsDone) || 0;

    return (
        <>
            <button className="leave-main summary-button" onClick={() => setOpen(true)}>Summarize</button>
            {open && createPortal(
                <div className="story-summary-backdrop" onClick={() => setOpen(false)}>
                    <div className="story-summary-panel" role="dialog" aria-modal="true" aria-label="The story so far" onClick={(event) => event.stopPropagation()}>
                        <h2>The story so far</h2>
                        {points.length > 0 ? (
                            <ol className="story-summary-points">
                                {points.map((point, index) => <li key={index}>{point}</li>)}
                            </ol>
                        ) : (
                            <p className="story-summary-empty">Nothing to recap yet. The story so far is written here after every fight.</p>
                        )}
                        {fights > 0 && (
                            <p className="story-summary-updated">Updated after fight {fights}</p>
                        )}
                        <button className="story-summary-close" onClick={() => setOpen(false)}>Close</button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default StorySummary;
