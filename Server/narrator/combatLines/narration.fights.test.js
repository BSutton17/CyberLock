// Plays whole simulated fights and checks every turn's narration against the grammar rules:
// no leftover placeholders, sentences that start with a capital, never "They" to open a sentence,
// the right "a" / "an", no doubled words, and enemies named the way their numbers call for.
import { describe, it, expect } from 'vitest';
import { createCombatNarrator } from './index.js';
import { runFight, randomParty, seededRandom } from '../../balance/simulate.js';

function narrateFights(count) {
    const out = [];
    for (let seed = 1; seed <= count; seed++) {
        const random = seededRandom(seed * 7);
        const party = randomParty(2 + (seed % 3), random);
        const narrator = createCombatNarrator({ random: seededRandom(seed) });
        const memory = { recent: new Set(), carried: null };
        runFight({
            party,
            encounterIndex: seed % 10,
            level: 1 + Math.floor((seed % 10) / 2),
            seed,
            policy: 'greedy',
            onTurn: (turn) => {
                const text = narrator.narrateTurn(turn.beats || [], { memory });
                if (text) out.push({ text, beats: turn.beats });
            }
        });
    }
    return out;
}

describe('narration of whole fights', () => {
    const narrated = narrateFights(24);
    const sentencesOf = (text) => text.split(/(?<=[.!?]["”]?)\s+(?=["“]?[A-Z])/);

    it('narrates plenty of turns', () => {
        expect(narrated.length).toBeGreaterThan(150);
    });

    it('reads as clean sentences', () => {
        const problems = [];
        for (const { text } of narrated) {
            if (/[{}]|\u0001/.test(text)) problems.push(`placeholder: ${text}`);
            if (/\s{2,}/.test(text)) problems.push(`double space: ${text}`);
            if (/\b(\w+) \1\b/i.test(text.replace(/\b(had had|that that)\b/g, ''))) problems.push(`doubled word: ${text}`);
            if (/\ba [AEIOUaeiou]\w/.test(text)) problems.push(`"a" before a vowel: ${text}`);
            if (/\ban [B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]/.test(text)) problems.push(`"an" before a consonant: ${text}`);
            for (const sentence of sentencesOf(text)) {
                if (!/^["“]?[A-Z]/.test(sentence)) problems.push(`lowercase start: ${sentence}`);
                if (/^They\b/.test(sentence)) problems.push(`opens with They: ${sentence}`);
            }
        }
        expect(problems.slice(0, 10)).toEqual([]);
    });

    it('never names one of several enemies of a kind with a bare "the" on first mention', () => {
        const problems = [];
        for (const { text, beats } of narrated) {
            const units = beats.flatMap(beat => [beat.actor, beat.target, beat.other, beat.victim]).filter(Boolean);
            for (const unit of units) {
                if (unit.side !== 'enemy' || unit.boss) continue;
                const others = (unit.kindAlive ?? 1) - (unit.alive === false ? 0 : 1);
                if (others < 1) continue;
                // Several standing: its full name may only come after a/an/another/one of/closest/last.
                const bare = new RegExp(`(^|[^\w])(the|The) ${unit.name}(?!s)`);
                const allowed = new RegExp(`(closest|last) ${unit.name}`);
                if (bare.test(text) && !allowed.test(text)) problems.push(text);
            }
        }
        expect(problems.slice(0, 5)).toEqual([]);
    });

    it('carries a subject with a pronoun now and then, but not forever', () => {
        expect(narrated.some(({ text }) => /\. (He|She|It) /.test(text))).toBe(true);
        // Within one turn's narration, never three sentences in a row opening with the same pronoun.
        const runs = narrated.filter(({ text }) => {
            const openers = sentencesOf(text).map(sentence => sentence.split(' ')[0]);
            return openers.some((word, i) => i >= 2 && /^(He|She|It)$/.test(word) && openers[i - 1] === word && openers[i - 2] === word);
        });
        expect(runs.map(r => r.text).slice(0, 3)).toEqual([]);
    });
});
