// Splits narration into the screens the typewriter shows one at a time.
//
// Story narration is laid out like a book: paragraphs, a new one whenever someone else speaks
// (the narrator writes it that way, see FORMATTING in Server/narrator/prompts.js). A screen holds
// one paragraph, or a few short ones together (a quick back-and-forth), each on its own line.
// Fights show one sentence at a time, since their lines share a short bar.
//
// Nothing is ever split inside a quotation, and a sentence ending in a closing quote ends there,
// so two people's lines never run together and one person's line never breaks in the middle.

// A screen holds about this much text; a longer paragraph is split between sentences.
export const SCREEN_MAX_CHARS = 260;
// Short paragraphs share a screen, up to this many.
const MAX_PARAGRAPHS_PER_SCREEN = 4;

const OPENING_QUOTES = new Set(['"', '“']);
const CLOSING_QUOTES = new Set(['"', '”']);
const SENTENCE_END = new Set(['.', '!', '?']);

/** Paragraphs, from blank lines or single line breaks. */
export function splitParagraphs(text = '') {
    return String(text || '')
        .split(/\n+/)
        .map(paragraph => paragraph.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean);
}

/**
 * Sentences, never breaking inside a quotation: "I know. Neither did we." stays whole, and
 * `...that fast." Shipment hauls...` splits after the closing quote.
 */
export function splitSentences(text = '') {
    const source = String(text || '').replace(/\s+/g, ' ').trim();
    const length = source.length;
    const sentences = [];
    let start = 0;
    let inQuote = false;
    for (let i = 0; i < length; i++) {
        const char = source[i];
        if (char === '“') { inQuote = true; continue; }
        if (char === '”') { inQuote = false; continue; }
        if (char === '"') { inQuote = !inQuote; continue; }
        if (!SENTENCE_END.has(char)) continue;

        // A sentence ends at . ! or ? (plus the closing quote, if it ends someone's line)...
        let end = i + 1;
        while (end < length && SENTENCE_END.has(source[end])) end++;
        if (end < length && inQuote && CLOSING_QUOTES.has(source[end])) {
            inQuote = false;
            end++;
        }
        i = end - 1;
        // ...followed by a space, outside any quotation...
        if (end < length && source[end] !== ' ') continue;
        if (inQuote) continue;
        // ...and not by a lowercase word: "What did I see?" he says.
        const next = source.slice(end).trimStart()[0];
        if (next && /[a-z]/.test(next)) continue;
        sentences.push(source.slice(start, end).trim());
        start = end;
    }
    const rest = source.slice(start).trim();
    if (rest) sentences.push(rest);
    return sentences.filter(Boolean);
}

const startsWithQuote = (sentence) => OPENING_QUOTES.has(sentence[0]);
const endsWithQuote = (sentence) => CLOSING_QUOTES.has(sentence[sentence.length - 1]);

/**
 * Narration that came without paragraph breaks gets them where a new line of dialogue follows a
 * finished one ("Who shot it down?" "That's the interesting part.") — a new speaker, in a book.
 */
export function addParagraphBreaks(text = '') {
    const sentences = splitSentences(text);
    const paragraphs = [];
    for (const sentence of sentences) {
        const previous = paragraphs[paragraphs.length - 1];
        const lastSentence = previous?.[previous.length - 1];
        if (previous && !(startsWithQuote(sentence) && lastSentence && startsWithQuote(lastSentence) && endsWithQuote(lastSentence))) {
            previous.push(sentence);
        } else {
            paragraphs.push([sentence]);
        }
    }
    return paragraphs.map(paragraph => paragraph.join(' '));
}

// A paragraph too long for one screen, split between sentences.
function splitLongParagraph(paragraph) {
    const chunks = [];
    let current = '';
    for (const sentence of splitSentences(paragraph)) {
        if (current && (current.length + 1 + sentence.length) > SCREEN_MAX_CHARS) {
            chunks.push(current);
            current = sentence;
        } else {
            current = current ? `${current} ${sentence}` : sentence;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

/**
 * The screens for one narration.
 * @param {string} text
 * @param {{ story?: boolean }} options - story: paragraph screens; otherwise one sentence each
 * @returns {string[]} screens; lines within a screen are separated by "\n"
 */
export function buildNarrationScreens(text = '', { story = false } = {}) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return [];

    if (!story) {
        return splitParagraphs(trimmed).flatMap(paragraph => splitSentences(paragraph));
    }

    const given = splitParagraphs(trimmed);
    const paragraphs = (given.length > 1 ? given : addParagraphBreaks(trimmed))
        .flatMap(paragraph => (paragraph.length > SCREEN_MAX_CHARS ? splitLongParagraph(paragraph) : [paragraph]));

    // Short paragraphs in a row (a quick back-and-forth) share a screen, one per line.
    const screens = [];
    let current = [];
    let length = 0;
    for (const paragraph of paragraphs) {
        const fits = current.length > 0
            && current.length < MAX_PARAGRAPHS_PER_SCREEN
            && length + paragraph.length <= SCREEN_MAX_CHARS;
        if (!fits && current.length > 0) {
            screens.push(current.join('\n'));
            current = [];
            length = 0;
        }
        current.push(paragraph);
        length += paragraph.length;
    }
    if (current.length > 0) screens.push(current.join('\n'));
    return screens;
}
