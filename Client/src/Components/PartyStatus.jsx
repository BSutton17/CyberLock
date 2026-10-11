import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameContext } from './Context';
import './PartyStatus.css';

// How long "X left the party" stays up.
export const NOTICE_MS = 6000;

const countdown = (ms) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * Who dropped out and how long they have to come back ("Livewire lost connection: 2:41 to
 * rejoin"), and who left for good. The game goes on meanwhile; a player who doesn't make it back
 * leaves the party, and the next fights are built for the smaller party.
 */
function PartyStatus() {
    const { awayPlayers = {}, partyNotice, setPartyNotice, playerCharacters = {}, playerName } = useGameContext();
    const [now, setNow] = useState(() => Date.now());
    const away = Object.entries(awayPlayers).filter(([player, until]) => player !== playerName && until > now);
    const showNotice = partyNotice && now - partyNotice.at < NOTICE_MS;

    useEffect(() => {
        if (away.length === 0 && !partyNotice) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(timer);
    }, [away.length, partyNotice]);

    useEffect(() => {
        if (!partyNotice) return undefined;
        const timer = setTimeout(() => setPartyNotice?.(null), Math.max(0, NOTICE_MS - (Date.now() - partyNotice.at)));
        return () => clearTimeout(timer);
    }, [partyNotice, setPartyNotice]);

    if (away.length === 0 && !showNotice) return null;
    return createPortal(
        <div className="party-status" role="status" aria-live="polite">
            {away.map(([player, until]) => (
                <div key={player} className="party-status-line">
                    {playerCharacters[player]?.name || player} lost connection: {countdown(until - now)} to rejoin
                </div>
            ))}
            {showNotice && <div className="party-status-line party-status-left">{partyNotice.text}</div>}
        </div>,
        document.body
    );
}

export default PartyStatus;
