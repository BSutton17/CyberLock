import { describe, it, expect, vi } from 'vitest';
import {
  createNarrator,
  resolveFaction,
  cleanNarration,
  cleanOptions,
  limitSentences,
  tidyCombatSummary,
  findOutsiderNames,
  isNotableTurn,
  buildRulesContext,
  FACTION_OPTIONS
} from './storyEngine.js';
import { createMockProvider } from './providers/mock.js';

const quietLogger = { log: () => {}, warn: () => {} };

// A fake model that records every request and answers from a script.
function scriptedProvider(responses = []) {
  const calls = [];
  return {
    name: 'scripted',
    model: 'scripted',
    calls,
    async generate(request) {
      calls.push(request);
      const next = responses.length > 1 ? responses.shift() : responses[0];
      if (next instanceof Error) throw next;
      if (typeof next === 'function') return next(request);
      return typeof next === 'string' ? next : JSON.stringify(next ?? { narration: 'ok', options: [], location: 'none', memory: '' });
    }
  };
}

const party = [
  { playerName: 'bryson', characterId: 'offensive_tank_1', characterName: 'Shipment', role: 'Tank', level: 1 },
  { playerName: 'sean', characterId: 'hacker_support_4', characterName: 'Ghost Shell', role: 'Support', level: 1 }
];

const attributesByPlayer = {
  bryson: ['Intimidation', 'Crook', 'Politician', 'Spy', 'Detective', 'Medic', 'Banker', 'Navigator', 'Scholar', 'Electrician'],
  sean: ['Electrician', 'Banker', 'Scholar', 'Politician', 'Spy', 'Detective', 'Medic', 'Navigator', 'Crook', 'Intimidation']
};

const context = (overrides = {}) => ({
  party,
  players: ['bryson', 'sean'],
  attributesByPlayer,
  encounterIndex: 0,
  enemies: [],
  ...overrides
});

const beat = (overrides = {}) => ({ narration: 'Rain falls on the square.', options: ['Go left', 'Go right'], location: 'street', memory: 'Something happened.', ...overrides });

describe('text helpers', () => {
  it('resolveFaction prefers explicit values and ignores mixed text', () => {
    expect(resolveFaction('enforcers')).toBe('enforcers');
    expect(resolveFaction('Fight with the Rebels')).toBe('rebels');
    expect(resolveFaction('rebels vs enforcers', 'the Enforcers')).toBe('enforcers');
    expect(resolveFaction('maybe later')).toBeNull();
  });

  it('cleanNarration strips markdown, the banned closing question, and overlong text', () => {
    expect(cleanNarration('**Boom.** What do you do?')).toBe('Boom.');
    const long = 'A sentence here. '.repeat(200);
    const cleaned = cleanNarration(long, 100);
    expect(cleaned.length).toBeLessThanOrEqual(100);
    expect(cleaned.endsWith('.')).toBe(true);
  });

  it('cleanOptions trims numbering and quotes, dedupes, and keeps two', () => {
    expect(cleanOptions(['1. "Go left"', '- Go left', 'Go right', 'Third'])).toEqual(['Go left', 'Go right']);
    expect(cleanOptions('nope')).toEqual([]);
  });

  it('limitSentences caps sentences and words', () => {
    expect(limitSentences('One. Two. Three.', 2, 50)).toBe('One. Two.');
    expect(limitSentences('a b c d e f', 1, 3)).toBe('a b c.');
  });

  it('tidyCombatSummary removes the turn prefix and decimal damage', () => {
    expect(tidyCombatSummary("Leo's turn ends: Leo strikes Enforcer Soldier for 12.0 damage.")).toBe('Leo strikes Enforcer Soldier for 12 damage.');
  });

  it('findOutsiderNames flags characters outside the party, case-sensitively', () => {
    expect(findOutsiderNames('Shipment and Ghost Shell hold the door.', party)).toEqual([]);
    expect(findOutsiderNames('Leo laughs. Aaron Bray reloads.', party)).toEqual(expect.arrayContaining(['Aaron Bray', 'Leo']));
    expect(findOutsiderNames('the true north of the city, a patchwork of streets', party)).toEqual([]);
  });

  it('isNotableTurn spots kills, abilities and bosses but not plain attacks', () => {
    expect(isNotableTurn('Leo strikes the drone.', {})).toBe(false);
    expect(isNotableTurn('Leo uses Flash Step.', {})).toBe(true);
    expect(isNotableTurn('The drone falls.', {})).toBe(true);
    expect(isNotableTurn('The Architect moves.', { actor: 'The Architect' }, [{ name: 'The Architect', tier: 'boss' }])).toBe(true);
  });

  it('buildRulesContext includes the character and only abilities the question mentions', () => {
    const text = buildRulesContext('how does flash step work with my weapon', {
      currentCharacter: { name: 'Leo', role: 'DPS', level: 3, weapon: { name: 'Energy Sword', damage: 9, range: 1 }, abilities: [] },
      generalRules: { basicAttack: 'Select weapon then click.' },
      abilityCatalog: [{ name: 'Flash Step', description: 'Double speed' }, { name: 'Fireball', description: 'Boom' }]
    });
    expect(text).toContain('Leo');
    expect(text).toContain('Flash Step');
    expect(text).not.toContain('Fireball');
    expect(text).toContain('Select weapon then click.');
    expect(buildRulesContext('x', null)).toBe('');
  });
});

describe('narrator flow', () => {
  it('opens with the faction choice owned by the Politician and tells the model who is in the party', async () => {
    const provider = scriptedProvider([beat({ options: ['whatever'] })]);
    const narrator = createNarrator({ provider, logger: quietLogger, random: () => 0 });

    const result = await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context() });

    expect(result).toMatchObject({ options: FACTION_OPTIONS, attribute: 'politician', location: 'city_square', startCombat: false });
    const prompt = provider.calls[0].messages[0].content;
    expect(prompt).toContain('ONLY player characters');
    expect(prompt).toContain('Shipment');
    expect(prompt).toContain('Ghost Shell');
    // Bryson ranks Politician 3rd, Sean 4th -> Bryson (Shipment) decides.
    expect(prompt).toContain('Shipment (Politician) must make the call');
    expect(provider.calls[0].system).toContain('CyberLock');
  });

  it('starts the opening fight once a side is chosen and remembers it', async () => {
    const provider = scriptedProvider([beat(), beat({ options: [] })]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context() });

    const result = await narrator.handleEvent({
      room: 'r1',
      eventType: 'choice_made',
      message: 'The party sides with the Rebels against the Enforcers.',
      data: { faction: 'rebels', choice: 'the Rebels' },
      context: context()
    });

    expect(result).toMatchObject({ startCombat: true, options: null, attribute: null, location: 'city_square' });
    expect(narrator.describeSession('r1').faction).toBe('rebels');
  });

  it('asks again when the opening answer names no side', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat()]), logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'hmm' }, context: context() });
    expect(result.options).toEqual(FACTION_OPTIONS);
    expect(result.startCombat).toBe(false);
  });

  it('runs a decision interlude after a fight, rotates the decision owner, then leads into the next fight', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 2, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });

    const first = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(first.startCombat).toBe(false);
    expect(first.options).toEqual(['Go left', 'Go right']);
    expect(first.location).toBe('street');

    const second = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'Go left', source: 'story_point' }, context: context({ encounterIndex: 1 }) });
    expect(second.startCombat).toBe(false);
    expect(second.attribute).not.toBe(first.attribute);

    const third = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'Go right' }, context: context({ encounterIndex: 1 }) });
    expect(third).toMatchObject({ startCombat: true, options: null, location: 'street' });

    const fightPrompt = provider.calls[provider.calls.length - 1].messages[0].content;
    expect(fightPrompt).toContain('Division strike team');
    expect(fightPrompt).toContain('Recent decisions');
  });

  it('builds toward the act boss before a boss fight', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 1 });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 2 }) });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'Go left' }, context: context({ encounterIndex: 2 }) });

    expect(result).toMatchObject({ startCombat: true, location: 'office' });
    expect(provider.calls[provider.calls.length - 1].messages[0].content).toContain('The Architect appears in person');
  });

  it('retries once when the model names a character who is not in the party', async () => {
    const provider = scriptedProvider([
      beat({ narration: 'Dax Slater kicks the door in.' }),
      beat({ narration: 'Shipment kicks the door in.' })
    ]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context({ party: [party[1]] }) });

    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[1].messages[0].content).toMatch(/NOT in this party/);
    // Shipment is not in this one-player party either: nothing usable is left, so the safe fallback is used.
    expect(result.response).not.toContain('Shipment');
    expect(result.fallback).toBe(true);
  });

  it('falls back to pre-written text with real options when the model fails', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([new Error('boom')]), logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'enforcers' }, context: context() });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });

    expect(result.fallback).toBe(true);
    expect(result.options).toHaveLength(2);
    expect(result.attribute).toBeTruthy();
  });

  it('uses the model\'s two options only when it returns exactly two', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat({ options: ['Only one'] })]), logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(result.options).toHaveLength(2);
    expect(result.options).not.toContain('Only one');
  });

  it('writes the ending after the final fight', async () => {
    const provider = scriptedProvider([beat({ narration: 'It is over.' })]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 10 }) });
    expect(result).toMatchObject({ response: 'It is over.', options: null, startCombat: false });
  });

  it('writes the ending on campaign_end', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat({ narration: 'Finale.' })]), logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'campaign_end', context: context({ encounterIndex: 10 }) });
    expect(result).toMatchObject({ response: 'Finale.', options: null, startCombat: false });
  });

  it('keeps the shop options fixed and owned by the Banker', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat()]), logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'shop_intro', context: context() });
    expect(result).toMatchObject({ options: ['Leave shop', 'Continue shopping'], attribute: 'banker', location: 'shop' });
  });

  it('resets a room\'s story', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat()]), logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    narrator.resetSession('r1');
    expect(narrator.describeSession('r1')).toBeNull();
  });
});

describe('combat narration', () => {
  it('narrates routine turns from templates, without the model and without numbers', async () => {
    const provider = scriptedProvider([{ narration: 'should not be used' }]);
    const narrator = createNarrator({ provider, logger: quietLogger, random: () => 0 });
    const result = await narrator.handleEvent({
      room: 'r1',
      eventType: 'turn_action',
      message: "Shipment's turn ends: Shipment hits Enforcer Drone with the Hammer for 9 damage.",
      data: { actor: 'Shipment', summaries: ['Shipment hits Enforcer Drone with the Hammer for 9 damage.'] },
      context: { ...context(), enemies: [{ name: 'Enforcer Drone', tier: 'generic', isDead: false }] }
    });
    expect(provider.calls).toHaveLength(0);
    expect(result.response).toBe('Shipment brings the hammer down on the Enforcer Drone, landing a solid blow.');
  });

  it('asks the model for one sentence per action and strips any numbers it writes', async () => {
    const provider = scriptedProvider([{ narration: 'Ghost Shell fries every circuit for 40 damage.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Ghost Shell uses EMP.', context: context() });
    expect(provider.calls[0].messages[0].content).toMatch(/one short sentence per action/);
    expect(result.response).toBe('Ghost Shell fries every circuit.');
  });

  it('asks the model for notable turns and limits it to two short sentences', async () => {
    const provider = scriptedProvider([{ narration: 'One. Two. Three. Four.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Ghost Shell uses EMP.', context: context() });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].kind).toBe('combat');
    expect(result.response).toBe('One. Two.');
  });

  it('stops calling the model past the per-minute limit', async () => {
    const provider = scriptedProvider([{ narration: 'AI line.' }]);
    let clock = 0;
    const narrator = createNarrator({ provider, logger: quietLogger, combatLinesPerMinute: 2, now: () => clock });
    for (let i = 0; i < 4; i++) {
      await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Leo uses Flash Step.', context: context() });
    }
    expect(provider.calls).toHaveLength(2);
    clock = 61_000;
    await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Leo uses Flash Step.', context: context() });
    expect(provider.calls).toHaveLength(3);
  });

  it('falls back to the game log (minus numbers) if the model mentions an outsider', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([{ narration: 'Aaron Bray cheers.' }]), logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Shipment uses Charge!', context: context() });
    expect(result.response).toBe('Shipment uses Charge!');
  });
});

describe('rules help', () => {
  it('answers with the rules prompt and remembers the conversation', async () => {
    const provider = scriptedProvider([{ answer: 'Click your weapon.' }, { answer: 'Yes.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    const first = await narrator.handleEvent({ room: 'r1', eventType: 'chat_message', message: 'How do I attack?', context: context() });
    expect(first.response).toBe('Click your weapon.');
    expect(provider.calls[0].system).toContain('help assistant');

    await narrator.handleEvent({ room: 'r1', eventType: 'chat_message', message: 'Really?', context: context() });
    expect(provider.calls[1].messages[0].content).toContain('How do I attack?');
  });

  it('falls back politely when the model is down', async () => {
    const narrator = createNarrator({ provider: scriptedProvider([new Error('down')]), logger: quietLogger });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'chat_message', message: 'help', context: context() });
    expect(result.fallback).toBe(true);
    expect(result.response).toMatch(/try again/i);
  });
});

describe('mock provider end to end', () => {
  it('plays through a whole interlude offline', async () => {
    const narrator = createNarrator({ provider: createMockProvider(), logger: quietLogger, personalMoments: false });
    const start = await narrator.handleEvent({ room: 'm', eventType: 'game_start', context: context() });
    expect(start.response).toContain('Shipment');
    expect(start.options).toEqual(FACTION_OPTIONS);

    const fight = await narrator.handleEvent({ room: 'm', eventType: 'choice_made', data: { faction: 'enforcers' }, context: context() });
    expect(fight.startCombat).toBe(true);

    const after = await narrator.handleEvent({ room: 'm', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(after.options).toHaveLength(2);

    const help = await narrator.handleEvent({ room: 'm', eventType: 'chat_message', message: 'how do I move', context: context() });
    expect(help.response).toMatch(/Offline help/);
  });
});

describe('logging', () => {
  it('logs provider timing', async () => {
    const logger = { log: vi.fn(), warn: vi.fn() };
    const narrator = createNarrator({ provider: scriptedProvider([beat()]), logger });
    await narrator.handleEvent({ room: 'r', eventType: 'game_start', context: context() });
    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/\[AI\] scripted story \d+ms/));
  });
});
