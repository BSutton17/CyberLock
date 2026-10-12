import { describe, it, expect, vi } from 'vitest';
import {
  createNarrator,
  resolveFaction,
  cleanNarration,
  cleanOptions,
  findOutsiderNames,
  buildRulesContext,
  FACTION_OPTIONS
} from './storyEngine.js';
import { createMockProvider } from './providers/mock.js';
import { STORY_SYSTEM_PROMPT } from './prompts.js';

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

  it('findOutsiderNames flags characters outside the party, case-sensitively', () => {
    expect(findOutsiderNames('Shipment and Ghost Shell hold the door.', party)).toEqual([]);
    expect(findOutsiderNames('Leo laughs. Aaron Bray reloads.', party)).toEqual(expect.arrayContaining(['Aaron Bray', 'Leo']));
    expect(findOutsiderNames('the true north of the city, a patchwork of streets', party)).toEqual([]);
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

  it('gives bots decisions too, with a person pressing the button for them', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 3, personalMoments: false });
    // Solo game: bryson plays Shipment, a bot plays Ghost Shell.
    const solo = (overrides = {}) => context({ players: ['bryson'], bots: ['sean'], connectedPlayers: ['bryson'], ...overrides });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: solo() });

    const owners = [];
    let result = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: solo({ encounterIndex: 1 }) });
    owners.push(result.decisionOwner);
    for (const choice of ['Go left', 'Go right']) {
      result = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice }, context: solo({ encounterIndex: 1 }) });
      if (result.options) owners.push(result.decisionOwner);
    }

    expect(owners.length).toBeGreaterThanOrEqual(2);
    const botCalls = owners.filter(owner => owner.player === 'sean');
    expect(botCalls.length).toBeGreaterThan(0);
    for (const owner of botCalls) expect(owner).toMatchObject({ characterName: 'Ghost Shell', decidedBy: 'bryson', decidedByName: 'Shipment' });
    for (const owner of owners.filter(owner => owner.player === 'bryson')) expect(owner.decidedBy).toBe('bryson');
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

describe('combat', () => {
  it('never asks the model to narrate a fight (combat lines are hand-written, see combatLines/)', async () => {
    const provider = scriptedProvider([{ narration: 'should not be used' }]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'turn_action', message: 'Shipment swings.', context: context() });
    expect(provider.calls).toHaveLength(0);
  });
});

describe('mock mode', () => {
  it('uses the offline narrator for a room switched to mock, and the AI otherwise', async () => {
    const ai = scriptedProvider([beat()]);
    const offline = scriptedProvider([beat({ narration: 'Offline words.' })]);
    const narrator = createNarrator({ provider: ai, mockProvider: offline, logger: quietLogger });

    const mocked = await narrator.handleEvent({ room: 'test', eventType: 'game_start', context: { ...context(), useMock: true } });
    expect(mocked.response).toBe('Offline words.');
    expect(ai.calls).toHaveLength(0);
    expect(narrator.isMockMode('test')).toBe(true);

    await narrator.handleEvent({ room: 'live', eventType: 'game_start', context: { ...context(), useMock: false } });
    expect(ai.calls).toHaveLength(1);
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

describe('the story so far (Summarize button)', () => {
  const summaryCalls = (provider) => provider.calls.filter(call => call.kind === 'summary');

  it('writes one paragraph for the act the story is in, only when asked', async () => {
    const provider = scriptedProvider([beat(), { paragraph: 'The party sided with the Rebels after the market bombing, and Shipment chose to hit the depot at night.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    narrator.recordFight('r1', { encounterIndex: 0, result: 'enemies_defeated' });
    // Nothing is written until someone presses the button.
    expect(summaryCalls(provider)).toHaveLength(0);

    const summary = await narrator.summarize('r1', context({ encounterIndex: 1 }));
    const [request] = summaryCalls(provider);
    expect(request.messages[0].content).toMatch(/ONE plain paragraph/);
    expect(request.messages[0].content).toContain('Act I - Eyes in the Sky');
    expect(summary.acts).toEqual([
      { act: 1, title: 'Act I - Eyes in the Sky', text: 'The party sided with the Rebels after the market bombing, and Shipment chose to hit the depot at night.', finished: false }
    ]);
    expect(narrator.getSummary('r1')).toEqual(summary);
  });

  it('only rewrites an act that has news, so a finished act costs one call', async () => {
    const provider = scriptedProvider([beat(), (request) => JSON.stringify({ paragraph: `Recap number ${request.messages[0].content.length}.` })]);
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 1, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });

    await narrator.summarize('r1', context({ encounterIndex: 1 }));
    await narrator.summarize('r1', context({ encounterIndex: 1 }));
    expect(summaryCalls(provider)).toHaveLength(1);

    // Act I ends with the boss; the story moves into Act II.
    narrator.recordFight('r1', { encounterIndex: 2, result: 'enemies_defeated' });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 3 }) });
    const later = await narrator.summarize('r1', context({ encounterIndex: 3 }));
    expect(later.acts.map(act => [act.title, act.finished])).toEqual([['Act I - Eyes in the Sky', true], ['Act II - Blackout', false]]);
    expect(summaryCalls(provider)).toHaveLength(3);
    expect(summaryCalls(provider)[1].messages[0].content).toMatch(/boss fight against The Architect/);

    // Pressing again with nothing new costs nothing.
    await narrator.summarize('r1', context({ encounterIndex: 3 }));
    expect(summaryCalls(provider)).toHaveLength(3);
  });

  it('shares one write between two presses at the same time', async () => {
    const provider = scriptedProvider([beat(), { paragraph: 'Something happened.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const [first, second] = await Promise.all([narrator.summarize('r1', context()), narrator.summarize('r1', context())]);
    expect(first).toEqual(second);
    expect(summaryCalls(provider)).toHaveLength(1);
  });

  it("falls back to a paragraph built from the game's own records", async () => {
    const provider = scriptedProvider([beat(), new Error('model down')]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'enforcers' }, context: context() });
    narrator.recordFight('r1', { encounterIndex: 0, result: 'enemies_defeated' });
    narrator.recordFight('r1', { encounterIndex: 1, result: 'enemies_defeated' });
    const { acts } = await narrator.summarize('r1', context({ encounterIndex: 2 }));
    expect(acts).toHaveLength(1);
    expect(acts[0].text).toMatch(/fight with the Enforcers/);
    expect(acts[0].text).toMatch(/2 fights/);
  });

  it('never calls the AI in mock mode', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    narrator.setMockMode('r1', true);
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const { acts } = await narrator.summarize('r1', context({ encounterIndex: 1 }));
    expect(acts[0].text).toMatch(/fight with the Rebels/);
    expect(provider.calls).toHaveLength(0);
  });

  it('drops a paragraph that names characters outside the party', async () => {
    const provider = scriptedProvider([beat(), { paragraph: 'Shipment kept the door while Aaron Bray cheered.' }]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const { acts } = await narrator.summarize('r1', context());
    expect(acts[0].text).not.toMatch(/Aaron Bray/);
    expect(acts[0].text).toMatch(/Rebels/);
  });
});

describe('building up to the bosses', () => {
  it("asks the model to let the act's villain cast a shadow, more strongly right before the fight", async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(provider.calls.at(-1).messages[0].content).toMatch(/let The Architect \(this act's villain\) cast a shadow/);
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 2 }) });
    expect(provider.calls.at(-1).messages[0].content).toMatch(/The next fight is against The Architect\. Build up to it/);
  });

  it('has the offline narrator foreshadow the boss in the scene before the boss fight', async () => {
    const narrator = createNarrator({ provider: createMockProvider(), logger: quietLogger, personalMoments: false, random: () => 0.6 });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'enforcers' }, context: context() });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 2 }) });
    expect(result.response).toMatch(/Garret|Maxwell|hammer/i);
  });
});

describe("each game's NPC names", () => {
  it('gives the recurring NPCs new names per game, everywhere players see them', async () => {
    const { castify, chooseCast } = await import('./cast.js');
    const cast = chooseCast(() => 0.99);
    expect(cast.witness.full).not.toBe('Ines Calder');
    const text = castify('Ines Calder waves. "Ines!" Dex "Static" Moreno grins at Commander Rhea Vance and Director Hale.', cast);
    expect(text).not.toMatch(/Ines|Calder|Dex|Static|Moreno|Rhea|Vance|Hale/);
    expect(text).toContain(cast.witness.full);
    expect(text).toContain(cast.fixer.full);
    expect(text).toContain(`Commander ${cast.rebelCommander.full}`);
    expect(text).toContain(cast.director.full);
    // Ordinary words are left alone.
    expect(castify('Static fills the comms. The party moves on.', cast)).toBe('Static fills the comms. The party moves on.');
  });

  it("puts this game's names in the narration and personal moments", async () => {
    const narrator = createNarrator({ provider: scriptedProvider([beat({ narration: 'Ines Calder is waiting by the stall.' })]), logger: quietLogger, random: () => 0.99, personalMoments: false });
    const result = await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context() });
    expect(result.response).not.toContain('Ines');
    expect(result.response).toMatch(/is waiting by the stall/);
  });
});

describe('first meetings and plain words', () => {
  const lastPrompt = (provider) => provider.calls[provider.calls.length - 1].messages[0].content;

  it("introduces the side's leader properly the first time the party meets them", async () => {
    const provider = scriptedProvider([beat({ options: [], narration: 'A woman with a glowing eye steps out. "Rhea Vance," she says.' })]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    const prompt = lastPrompt(provider);
    expect(prompt).toMatch(/meeting them for the first time/);
    expect(prompt).toMatch(/introduce themselves by name/);
    expect(prompt).toMatch(/Not named on the page yet[^\n]*Commander Rhea Vance/);
    expect(narrator.getSession('r1').metNpcs).toContain('Commander Rhea Vance');
  });

  it('has the leader give the party a direction after the opening fight, and lists who they have met', async () => {
    const provider = scriptedProvider([beat({ options: [], narration: 'Rhea Vance nods at them.' }), beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    const prompt = lastPrompt(provider);
    expect(prompt).toMatch(/Commander Rhea Vance pulls the party aside/);
    expect(prompt).toMatch(/what they want from the party next/);
    expect(prompt).toMatch(/Recurring NPCs the party knows by name: Commander Rhea Vance/);
    // Already met: no second introduction.
    expect(prompt).not.toMatch(/first time the party meets Commander Rhea Vance/);
  });

  it("remembers what the narration explained so it isn't explained again", async () => {
    const provider = scriptedProvider([beat({ options: [], explained: ['uplink', 'Division'] }), beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(lastPrompt(provider)).toMatch(/Already explained to the players \(don't explain again\): uplink, Division/);
    expect(lastPrompt(provider)).toMatch(/narration, options, location, memory, explained/);
  });

  it('gives scenes room to talk', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 3, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 2 }) });
    expect(lastPrompt(provider)).toMatch(/mostly conversation/);
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'Go left' }, context: context({ encounterIndex: 2 }) });
    expect(lastPrompt(provider)).toMatch(/4-7 sentences, with people talking/);
    expect(lastPrompt(provider)).toMatch(/talk it through/);
  });

  it('tells the model how every recurring NPC looks, sounds and slowly reveals who they are', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context() });
    const { system } = provider.calls[0];
    expect(system).toMatch(/PLAIN WORDS FOR NEWCOMERS/);
    expect(system).toMatch(/SHOW, DON'T TELL/);
    expect(system).toMatch(/Commander Rhea Vance[\s\S]*Looks: [\s\S]*Sounds like: [\s\S]*Wants: [\s\S]*Act I: [\s\S]*Act III: /);
  });

  it('has the offline narrator introduce the leader too, then brief the party after the first fight', async () => {
    const narrator = createNarrator({ provider: createMockProvider(), logger: quietLogger, personalMoments: false, random: () => 0 });
    const joined = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    // Either hand-written introduction: how she looks, her name, what she wants.
    expect(joined.response).toMatch(/Rhea Vance/);
    expect(joined.response).toMatch(/amber/);
    expect(joined.response).toMatch(/prove|Proof/);
    const after = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    expect(after.response).toMatch(/Rhea Vance/);
    expect(after.response).toMatch(/surveillance grid|The Architect/);
  });
});

describe('continuity and progression', () => {
  const lastPrompt = (provider) => provider.calls[provider.calls.length - 1].messages[0].content;

  it('keeps the details a scene established and hands them to the next scene', async () => {
    const provider = scriptedProvider([beat({ options: [], facts: ['Pike: wiry, stained vest, cigarette'] }), beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    const prompt = lastPrompt(provider);
    expect(prompt).toMatch(/Established details[^\n]*\n- Pike: wiry, stained vest, cigarette/);
    expect(prompt).toMatch(/explained, facts/);
  });

  it('tells the model which party members are played by people', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger });
    await narrator.handleEvent({ room: 'r1', eventType: 'game_start', context: context({ players: ['bryson'], bots: ['sean'] }) });
    const prompt = lastPrompt(provider);
    expect(prompt).toMatch(/Shipment[^\n]*played by a person/);
    expect(prompt).toMatch(/Ghost Shell[^\n]*played by the computer/);
  });

  it('gives each person at most one personal moment between fights', async () => {
    const provider = scriptedProvider([beat()]);
    // Moments after every decision too (random 0), so only the once-per-stretch rule stops them.
    const narrator = createNarrator({ provider, logger: quietLogger, decisionsPerInterlude: 3, random: () => 0 });
    const solo = (overrides = {}) => context({ players: ['bryson'], bots: ['sean'], ...overrides });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: solo() });
    const first = await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: solo({ encounterIndex: 1 }) });
    expect(first.dialogue?.playerName).toBe('bryson');
    narrator.answerDialogue('r1', { playerName: 'bryson', dialogueId: first.dialogue.id, optionId: 'honest' });
    const next = await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { choice: 'Go left' }, context: solo({ encounterIndex: 1 }) });
    expect(next.dialogue).toBeNull();
    expect(next.options).toHaveLength(2);
  });

  it('asks the moment writer to move on from earlier moments and to play answers out in the scene', async () => {
    const moment = {
      kind: 'reply', npc: 'A dock foreman', intro: 'A dock foreman squints at Shipment. "Union or company?"',
      options: [
        { approach: 'honest', text: 'Neither.', told: 'x', reaction: 'y', lead: 'The gate is open.' },
        { approach: 'defiant', text: 'Move.', told: 'x', reaction: 'y', lead: 'Security knows.' },
        { approach: 'sly', text: 'Union.', told: 'x', reaction: 'y', lead: 'A walkout is planned.' }
      ]
    };
    const provider = scriptedProvider([beat(), beat(), moment]);
    const narrator = createNarrator({ provider, logger: quietLogger, random: () => 0.1 });
    narrator.getSession('r1').personalMoments.push({ npc: 'Ines Calder', by: 'Shipment', reply: 'Money, mostly.', tone: 'honest', lead: null });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context({ players: ['bryson'], bots: ['sean'] }) });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ players: ['bryson'], bots: ['sean'], encounterIndex: 1 }) });
    const request = provider.calls.find(call => call.messages[0].content.includes('personal moment that happens right after'));
    expect(request.messages[0].content).toMatch(/earlier personal moments[^\n]*\n- Ines Calder \/ Shipment: "Money, mostly\."/);
    expect(request.messages[0].content).toMatch(/never a summary like "Shipment admits/);
    expect(request.messages[0].content).toMatch(/reveal something about them or change the relationship/);
  });

  it('carries the style rules from the critique', () => {
    expect(STORY_SYSTEM_PROMPT).toMatch(/STAKES AND CHOICES/);
    expect(STORY_SYSTEM_PROMPT).toMatch(/Conclusions are earned/);
    expect(STORY_SYSTEM_PROMPT).toMatch(/signature gesture is an occasional tell/);
    expect(STORY_SYSTEM_PROMPT).toMatch(/A name is used only once the party has heard it/);
  });
});

describe('keeping the story simple', () => {
  it('tells the model to keep one clear goal, plain words and simple options', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    const request = provider.calls[provider.calls.length - 1];
    expect(request.system).toMatch(/^KEEP IT SIMPLE$/m);
    expect(request.system).toMatch(/No side quests out of nowhere/);
    expect(request.system).toMatch(/No technobabble/);
    expect(request.messages[0].content).toMatch(/grow out of the current goal and what just happened/);
    expect(request.messages[0].content).toMatch(/plain everyday action under 8 words/);
  });
});

describe('whose call it is, and why', () => {
  it('asks the model to show why a decision is that character\'s call', async () => {
    const provider = scriptedProvider([beat()]);
    const narrator = createNarrator({ provider, logger: quietLogger, personalMoments: false });
    await narrator.handleEvent({ room: 'r1', eventType: 'choice_made', data: { faction: 'rebels' }, context: context() });
    await narrator.handleEvent({ room: 'r1', eventType: 'encounter_end', context: context({ encounterIndex: 1 }) });
    const request = provider.calls[provider.calls.length - 1];
    expect(request.messages[0].content).toMatch(/Show WHY it's \w[\w ]*'s call, in the scene/);
    expect(request.messages[0].content).toMatch(/Never just "it's/);
    expect(request.system).toMatch(/Show why it's their\s+call/);
  });

  it('gives the reason when a personal moment hands the decision back to the group', async () => {
    const narrator = createNarrator({ provider: createMockProvider(), logger: quietLogger, random: () => 0 });
    const session = narrator.getSession('r1');
    session.pendingDialogue = {
      id: 'd1', exchange: 0, kind: 'reply', npc: 'A guard', playerName: 'bryson', characterName: 'Shipment',
      options: [{ id: 'honest', tone: 'honest', text: 'Passing through.', told: 'Shipment: "Passing through."', reaction: 'The guard shrugs.', lead: null }],
      followUp: { options: ['Go left', 'Go right'], attribute: 'crook', ownerName: 'True North' }
    };
    const result = narrator.answerDialogue('r1', { playerName: 'bryson', dialogueId: 'd1', optionId: 'honest' });
    expect(result.response).toMatch(/True North/);
    expect(result.response).toMatch(/bending the rules quietly/);
  });
});
