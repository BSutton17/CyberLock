import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameContext } from './Context';
import './StorySummary.css';

/**
 * Top-bar "Summarize" button: the story so far, one short paragraph per act, up to right now.
 * The narrator only writes it when someone presses the button (to save AI credits); acts with no
 * news since the last press are reused. Whoever presses it, the whole room gets the new version
 * (Events.jsx keeps it), so opening it again shows that right away while it checks for news.
 */
function StorySummary() {
    const { socket, room, storySummary, setStorySummary } = useGameContext();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const requestRef = useRef(0);

    const openSummary = () => {
        setOpen(true);
        if (!room) return;
        const request = ++requestRef.current;
        setLoading(true);
        socket.emit('request_story_summary', { room }, (reply) => {
            if (request !== requestRef.current) return;
            if (reply?.summary) setStorySummary(reply.summary);
            setLoading(false);
        });
    };

    useEffect(() => {
        if (!open) return undefined;
        const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    const acts = Array.isArray(storySummary?.acts) ? storySummary.acts.filter(act => act?.text) : [];

    return (
        <>
            <button className="leave-main summary-button" onClick={openSummary}>Summarize</button>
            {open && createPortal(
                <div className="story-summary-backdrop" onClick={() => setOpen(false)}>
                    <div className="story-summary-panel" role="dialog" aria-modal="true" aria-label="The story so far" onClick={(event) => event.stopPropagation()}>
                        <h2>The story so far</h2>
                        {acts.length > 0 && (
                            <div className={`story-summary-acts${loading ? ' is-updating' : ''}`}>
                                {acts.map(act => (
                                    <section key={act.act} className="story-summary-act">
                                        <h3>{act.title}</h3>
                                        <p>{act.text}</p>
                                    </section>
                                ))}
                            </div>
                        )}
                        {loading ? (
                            <p className="story-summary-status" role="status">{acts.length > 0 ? 'Catching up on the latest…' : 'Writing the story so far…'}</p>
                        ) : acts.length === 0 && (
                            <p className="story-summary-empty">Nothing to recap yet.</p>
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
