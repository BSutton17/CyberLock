import { describe, it, expect } from 'vitest';
import { splitSentences, splitParagraphs, buildNarrationScreens, addParagraphBreaks, SCREEN_MAX_CHARS } from '../../shared/text/narrationScreens.js';
import { cleanNarration, joinParagraphs } from './storyEngine.js';
import { STYLE_GUIDE } from './prompts.js';

describe('splitting narration into sentences', () => {
  it('never splits inside a line of dialogue', () => {
    expect(splitSentences('"I know. Neither did we. Division did." Behind her, Gene Shock waits.')).toEqual([
      '"I know. Neither did we. Division did."',
      'Behind her, Gene Shock waits.'
    ]);
  });

  it('ends a sentence after a closing quote, so two ideas never run together', () => {
    expect(splitSentences('"Nobody gets anywhere that fast." Shipment hauls himself up.')).toEqual([
      '"Nobody gets anywhere that fast."',
      'Shipment hauls himself up.'
    ]);
  });

  it('keeps an attribution with its question, and a line broken by one', () => {
    expect(splitSentences('"What did I see?" he says. "Ask me later," she says, "if I\'m still here."')).toEqual([
      '"What did I see?" he says.',
      '"Ask me later," she says, "if I\'m still here."'
    ]);
  });
});

describe('screens', () => {
  const scene = joinParagraphs(
    'Smoke rolls off the far end of the market.',
    '"You three. Either you\'re stupid or you\'re useful."',
    '"Depends who\'s asking," Leo says.',
    '"Commander Talia Reyes. Rebels."'
  );

  it('puts a quick back-and-forth on one screen, each speaker on their own line', () => {
    expect(buildNarrationScreens(scene, { story: true })).toEqual([
      'Smoke rolls off the far end of the market.\n"You three. Either you\'re stupid or you\'re useful."\n"Depends who\'s asking," Leo says.\n"Commander Talia Reyes. Rebels."'
    ]);
  });

  it('gives a long paragraph its own screens, split between whole sentences', () => {
    const long = 'The checkpoint line moves slower than a Monday. '.repeat(10).trim();
    const screens = buildNarrationScreens(joinParagraphs(long, '"Next," the guard says.'), { story: true });
    expect(screens.length).toBeGreaterThan(2);
    for (const screen of screens) expect(screen.length).toBeLessThanOrEqual(SCREEN_MAX_CHARS);
    expect(screens.at(-1)).toMatch(/"Next," the guard says\.$/);
  });

  it('starts a new line for a new speaker when the text came without paragraphs', () => {
    expect(addParagraphBreaks('"Who shot it down?" "That\'s the interesting part, kid." She tips her head.')).toEqual([
      '"Who shot it down?"',
      '"That\'s the interesting part, kid." She tips her head.'
    ]);
  });

  it('shows fights one sentence at a time', () => {
    expect(buildNarrationScreens('Good. Shipment answers with a shoulder.')).toEqual(['Good.', 'Shipment answers with a shoulder.']);
  });
});

describe('story narration keeps its paragraphs', () => {
  it('cleans each paragraph but keeps the breaks between them', () => {
    expect(cleanNarration('**Smoke**  rolls.\n\n"Move,"   she says.\n"Now."')).toBe('Smoke rolls.\n\n"Move," she says.\n\n"Now."');
    expect(splitParagraphs(cleanNarration('One.\n\nTwo.'))).toEqual(['One.', 'Two.']);
  });

  it('cuts an overlong narration between whole sentences, never mid-line', () => {
    const text = joinParagraphs('A '.repeat(40).trim() + '.', '"First line. Second line," she says.');
    const cut = cleanNarration(text, 100);
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut).not.toMatch(/First line\.$/);
  });

  it('tells the model to lay narration out like a book', () => {
    expect(STYLE_GUIDE).toMatch(/^FORMATTING$/m);
    expect(STYLE_GUIDE).toMatch(/A new paragraph every time a different person speaks/);
  });
});
