import React from 'react';
import './DialogueChoices.css';

const formatAttribute = (attribute) => (attribute ? attribute.charAt(0).toUpperCase() + attribute.slice(1) : '');

/**
 * The choices for a personal moment in the narration: one party member answers an NPC (or asks
 * them something). Everyone sees the choices; only that player can pick. The answer is told in the
 * next narration, which then brings up the group's decision.
 *
 * @param {object} props
 * @param {object} props.dialogue - { id, kind: 'reply'|'ask', npc, playerName, characterName, options: [{ id, text, attribute }] }
 * @param {string} props.playerName - this client's player
 * @param {(optionId: string) => void} props.onChoose
 * @param {boolean} [props.busy]
 * @param {boolean} [props.mobile] - use the mobile overlay's styles
 */
function DialogueChoices({ dialogue, playerName, onChoose, busy = false, mobile = false }) {
    const isMine = dialogue.playerName === playerName;
    const who = isMine ? 'You' : dialogue.characterName;
    const label = dialogue.kind === 'ask'
        ? `${who} can ask ${dialogue.npc} something`
        : `${isMine ? 'Your' : `${dialogue.characterName}'s`} answer to ${dialogue.npc}`;

    return (
        <div className={`${mobile ? 'mobile-ai-overlay-choices' : 'ai-choices'} dialogue-choices`}>
            <div className={mobile ? 'mobile-ai-choice-owner' : 'ai-choice-owner'}>
                {label}{isMine ? '' : ' (only they can choose)'}
            </div>
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
