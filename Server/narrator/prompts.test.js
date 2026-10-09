import { describe, it, expect } from 'vitest';
import { STYLE_GUIDE, STORY_SYSTEM_PROMPT } from './prompts.js';
import { findOutsiderNames } from './storyEngine.js';

describe('style guide', () => {
  it('is part of the story system prompt shared by every provider', () => {
    expect(STORY_SYSTEM_PROMPT).toContain(STYLE_GUIDE);
  });

  it('covers voice, dialogue and fights', () => {
    for (const section of ['VOICE', 'DIALOGUE', 'FIGHTS', 'NEVER']) {
      expect(STYLE_GUIDE).toMatch(new RegExp(`^${section}$`, 'm'));
    }
  });

  // The author's samples are first person; the narrator converts that voice to third omniscient.
  it('narrates in third person omniscient, present tense', () => {
    expect(STYLE_GUIDE).toMatch(/third person omniscient, present\s+tense/);
    expect(STYLE_GUIDE).not.toMatch(/close third/);
  });

  // The examples must not name playable characters, or the model copies them into games where
  // that character isn't in the party (and the outsider filter then strips the sentence).
  it('never names a playable character in its examples', () => {
    expect(findOutsiderNames(STYLE_GUIDE, [])).toEqual([]);
  });

  it('tells the model the examples are a guideline, not a template', () => {
    expect(STYLE_GUIDE).toMatch(/Never copy the example lines/);
  });
});
