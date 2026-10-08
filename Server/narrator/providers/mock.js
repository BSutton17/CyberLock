// Offline narrator for local development and tests. No API key, no network, instant.
// It writes simple but readable text from the hints the story engine passes along.
import { optionsForAttribute } from '../fallbacks.js';

const pick = (list, seed) => list[Math.abs(seed) % list.length];

export function createMockProvider({ delayMs = 0 } = {}) {
  let counter = 0;

  return {
    name: 'mock',
    model: 'mock',
    async generate({ kind, hints = {} }) {
      counter += 1;
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      if (kind === 'rules') {
        return JSON.stringify({
          answer: `(Offline help) ${hints.question ? `About "${hints.question}": ` : ''}select your weapon or an ability, then click a target in range. Bonus-action abilities can be used alongside your main action. End your turn when you are done.`
        });
      }

      if (kind === 'combat') {
        return JSON.stringify({ narration: hints.summary || 'Steel meets steel and the line holds.' });
      }

      const party = hints.partyNames?.length ? hints.partyNames.join(', ') : 'The party';
      const owner = hints.ownerName || 'the party';
      const options = hints.needsOptions ? (hints.fixedOptions || optionsForAttribute(hints.attribute)) : [];

      const openers = [
        `${party} move through the smoke, weapons low.`,
        `Sirens fade somewhere behind ${party}.`,
        `${party} regroup under a flickering transit sign.`
      ];

      const lines = [pick(openers, counter)];
      if (hints.setup) lines.push(hints.setup);
      if (hints.lastChoice) lines.push(`The choice to "${hints.lastChoice}" is already changing things.`);
      if (hints.needsOptions) lines.push(`All eyes turn to ${owner}. It is their call.`);
      if (hints.startsCombat) lines.push('Then the shooting starts.');

      return JSON.stringify({
        narration: lines.join(' '),
        options,
        location: hints.location || 'none',
        memory: hints.lastChoice ? `The party chose to ${hints.lastChoice}.` : `${party} pressed on.`
      });
    }
  };
}
