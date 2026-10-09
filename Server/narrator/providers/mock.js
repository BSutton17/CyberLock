// Offline narrator for local development, playtests without an AI key, and tests. No network,
// instant. Story beats come from mockStory.js (hand-written pieces fitted to the party, their side,
// the act and their last decision); combat lines from the same templates the real narrator uses
// for routine turns.
import { mockStoryBeat } from '../mockStory.js';
import { flavorCombatLog } from '../combatFlavor.js';

export function createMockProvider({ delayMs = 0, combatDelayMs = delayMs, random = Math.random } = {}) {
  // Lines used lately, so the same situation or consequence doesn't come up twice in a row.
  const recent = [];
  return {
    name: 'mock',
    model: 'mock',
    async generate({ kind, hints = {} }) {
      const wait = kind === 'combat' ? combatDelayMs : delayMs;
      if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }

      if (kind === 'rules') {
        return JSON.stringify({
          answer: `(Offline help) ${hints.question ? `About "${hints.question}": ` : ''}select your weapon or an ability, then click a target in range. Bonus-action abilities can be used alongside your main action. End your turn when you are done.`
        });
      }

      if (kind === 'combat') {
        const lines = hints.lines || String(hints.summary || '').split(/(?<=[.!?])\s+/).filter(Boolean);
        return JSON.stringify({ narration: flavorCombatLog(lines, { enemies: hints.enemies || [] }, random) || 'Steel meets steel and the line holds.' });
      }

      return JSON.stringify(mockStoryBeat(hints, random, recent));
    }
  };
}
