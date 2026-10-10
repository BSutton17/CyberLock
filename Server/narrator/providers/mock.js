// Offline narrator for local development, playtests without an AI key, and tests. No network,
// instant. Story beats come from mockStory.js (hand-written pieces fitted to the party, their side,
// the act and their last decision). Combat is never narrated by a provider (see combatLines/).
import { mockStoryBeat } from '../mockStory.js';

export function createMockProvider({ delayMs = 0, random = Math.random } = {}) {
  // Lines used lately, so the same situation or consequence doesn't come up twice in a row.
  const recent = [];
  return {
    name: 'mock',
    model: 'mock',
    async generate({ kind, hints = {} }) {
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // The offline recap is the one the game builds from its own records.
      if (kind === 'summary') {
        return JSON.stringify({ paragraph: hints.recap || '' });
      }

      if (kind === 'rules') {
        return JSON.stringify({
          answer: `(Offline help) ${hints.question ? `About "${hints.question}": ` : ''}select your weapon or an ability, then click a target in range. Bonus-action abilities can be used alongside your main action. End your turn when you are done.`
        });
      }

      return JSON.stringify(mockStoryBeat(hints, random, recent));
    }
  };
}
