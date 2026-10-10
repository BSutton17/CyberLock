import React, { useEffect, useMemo, useState } from 'react';
import './DialogueChoices.css';

const formatAttribute = (attribute) => (attribute ? attribute.charAt(0).toUpperCase() + attribute.slice(1) : '');

// The countdown appears once this much time is left to answer.
export const COUNTDOWN_FROM_MS = 30000;

/**
 * The choices for a personal moment in the narration: one party member answers an NPC (or asks
 * them something). Everyone sees the choices; only that player can pick. The answer is told in the
 * next narration, which then brings up the group's decision.
 *
 * @param {object} props
 * @param {object} props.dialogue - { id, kind: 'reply'|'ask', npc, playerName, characterName, options: [{ id, text, attribute }],
 *   timeLeftMs } (time left to answer when it was sent; a countdown shows for the last 30 s)
 * @param {string} props.playerName - this client's player
 * @param {(optionId: string) => void} props.onChoose
 * @param {boolean} [props.busy]
 * @param {boolean} [props.mobile] - use the mobile overlay's styles
 */
function DialogueChoices({ dialogue, playerName, onChoose, busy = false, mobile = false }) {
    const isMine = dialogue.playerName === playerName;
    // When this moment closes, by this device's clock.
    const deadline = useMemo(
        () => (Number.isFinite(dialogue.timeLeftMs) ? Date.now() + dialogue.timeLeftMs : null),
        [dialogue.id, dialogue.timeLeftMs]
    );
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
    }, [deadline]);
    const msLeft = deadline ? Math.max(0, deadline - now) : null;
    const secondsLeft = msLeft === null ? null : Math.ceil(msLeft / 1000);
    const showCountdown = msLeft !== null && msLeft <= COUNTDOWN_FROM_MS;
    const who = isMine ? 'You' : dialogue.characterName;
    // "A street kid" starts a sentence; mid-sentence it's "a street kid".
    const npc = String(dialogue.npc || '').replace(/^A /, 'a ').replace(/^An /, 'an ');
    const label = dialogue.kind === 'ask'
        ? `${who} can ask ${npc} something`
        : `${isMine ? 'Your' : `${dialogue.characterName}'s`} answer to ${npc}`;

    return (
        <div className={`${mobile ? 'mobile-ai-overlay-choices' : 'ai-choices'} dialogue-choices`}>
            <div className={mobile ? 'mobile-ai-choice-owner' : 'ai-choice-owner'}>
                {label}{isMine ? '' : ' (only they can choose)'}
            </div>
            {showCountdown && (
                <div className="dialogue-countdown" role="timer" aria-live="polite">
                    {isMine ? `${secondsLeft}s left to answer` : `${secondsLeft}s left for ${dialogue.characterName} to answer`}
                </div>
            )}
            {dialogue.options.map(option => (
                <button key={option.id} onClick={() => onChoose(option.id)} disabled={!isMine || busy}>
                    {option.attribute && <span className="dialogue-tag">{formatAttribute(option.attribute)}</span>}
                    {option.text}
                </button>
            ))}
        </div>
    );
}

export default DialogueChoices;
