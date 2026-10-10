import { describe, it, expect } from 'vitest';
import { createDialogue, publicDialogue, followUpNarration, attitudeLabel, DIALOGUE_EXCHANGES } from './dialogue.js';
import { createNarrator } from './storyEngine.js';
import { createMockProvider } from './providers/mock.js';
import { buildStateBlock } from './prompts.js';
import { VALID_ATTRIBUTES } from './lore.js';

const quiet = { log() {}, warn() {} };
const target = { playerName: 'B', characterName: 'Livewire' };
const askIndexes = new Set(DIALOGUE_EXCHANGES.map((exchange, index) => (exchange.kind === 'ask' ? index : -1)).filter(i => i >= 0));
const replyIndexes = new Set(DIALOGUE_EXCHANGES.map((exchange, index) => (exchange.kind === 'reply' ? index : -1)).filter(i => i >= 0));

describe('personal moments', () => {
  it('come in both kinds, with sensible attribute answers', () => {
    expect(askIndexes.size).toBeGreaterThanOrEqual(3);
    expect(replyIndexes.size).toBeGreaterThanOrEqual(5);
    for (const exchange of DIALOGUE_EXCHANGES) {
      for (const attribute of Object.keys(exchange.skills)) expect(VALID_ATTRIBUTES).toContain(attribute);
      expect(exchange.intro).toContain('{character}');
    }
  });

  it('has an NPC ask the player a question inside the narration', () => {
    // Exchange 0 is the checkpoint guard: "Why are you here?"
    const plain = createDialogue({ target, attributes: ['banker', 'spy', 'medic'], faction: 'rebels', random: () => 0 });
    expect(plain.kind).toBe('reply');
    expect(plain.intro).toBe('A checkpoint guard steps into the party\'s path and looks straight at Livewire. "Why are you here?"');
    expect(publicDialogue(plain).options.map(option => option.id)).toEqual(['honest', 'defiant', 'sly']);

    const politician = createDialogue({ target, attributes: ['spy', 'politician'], faction: 'rebels', random: () => 0 });
    expect(politician.options[0]).toMatchObject({ tone: 'skill', attribute: 'politician', text: 'We came to save someone.' });
    expect(politician.options.map(option => option.text)).toContain("It's none of your business.");
  });

  it('only counts an attribute ranked in the top three', () => {
    const dialogue = createDialogue({ target, attributes: ['spy', 'medic', 'banker', 'politician'], faction: 'rebels', random: () => 0 });
    expect(dialogue.options.some(option => option.tone === 'skill')).toBe(false);
  });

  it('lets the player ask an NPC something, told as narration afterwards', () => {
    const dialogue = createDialogue({ target, faction: 'rebels', used: replyIndexes, random: () => 0 });
    expect(dialogue.kind).toBe('ask');
    expect(dialogue.intro).toMatch(/Livewire has a moment to ask her something/);
    const honest = dialogue.options.find(option => option.id === 'honest');
    const told = followUpNarration(dialogue, honest, { ownerName: 'Shipment', random: () => 0 });
    expect(told).toMatch(/^Livewire asks Ines, gently, what she saw that night\./);
    expect(told).toMatch(/Division van/);
    expect(told).toMatch(/Shipment's call/);
  });

  it('fills in the right people for the side the party joined', () => {
    const notGuardOrInes = new Set([0, 1]);
    expect(createDialogue({ target, faction: 'rebels', used: notGuardOrInes, random: () => 0 }).npc).toBe('Commander Rhea Vance');
    expect(createDialogue({ target, faction: 'enforcers', used: notGuardOrInes, random: () => 0 }).npc).toBe('Captain Mara Kessler');
  });

  it('keeps reactions and the silent option hidden from clients', () => {
    const shown = publicDialogue(createDialogue({ target, faction: 'rebels', random: () => 0 }));
    expect(JSON.stringify(shown)).not.toMatch(/reaction|told/);
    expect(shown.options.some(option => option.id === 'silent')).toBe(false);
  });

  it('gives every answer its own words, reaction and story thread', () => {
    const allLeads = [];
    for (const exchange of DIALOGUE_EXCHANGES) {
      const answers = [exchange.honest, exchange.defiant, exchange.sly, ...Object.values(exchange.skills)];
      for (const field of ['text', 'reaction', 'lead']) {
        const values = answers.map(answer => answer[field]);
        expect(values.every(Boolean), `${exchange.npc} ${field}`).toBe(true);
        expect(new Set(values).size, `${exchange.npc} ${field}`).toBe(values.length);
      }
      allLeads.push(...answers.map(answer => answer.lead));
    }
    expect(new Set(allLeads).size).toBe(allLeads.length);
    expect(DIALOGUE_EXCHANGES.length).toBeGreaterThanOrEqual(18);
  });

  it('labels attitudes', () => {
    expect(attitudeLabel(3)).toMatch(/trusts/);
    expect(attitudeLabel(-1)).toMatch(/wary/);
    expect(attitudeLabel(0)).toMatch(/undecided/);
  });
});

describe('personal moments in the story', () => {
  const party = [
    { playerName: 'A', characterId: 'offensive_tank_1', characterName: 'Shipment', role: 'Tank' },
    { playerName: 'B', characterId: 'offensive_support_2', characterName: 'Livewire', role: 'Support' },
    { playerName: 'Nova (bot)', characterId: 'aggressive_dps_2', characterName: 'Leo', role: 'DPS' }
  ];
  const context = {
    party,
    players: ['A', 'B'], // bots are never in the list of people
    attributesByPlayer: { A: ['medic', 'spy'], B: ['politician', 'crook'] },
    connectedPlayers: ['A', 'B'],
    partyFaction: 'rebels',
    encounterIndex: 1
  };

  async function afterFight() {
    const narrator = createNarrator({ provider: createMockProvider(), logger: quiet, random: () => 0.1 });
    const result = await narrator.handleEvent({ room: 'r', eventType: 'encounter_end', context });
    return { narrator, result };
  }

  it('tells the moment in the narration and holds the group decision until it is answered', async () => {
    const { result } = await afterFight();
    expect(result.dialogue).toBeTruthy();
    expect(['A', 'B']).toContain(result.dialogue.playerName);
    expect(result.response).toContain(result.dialogue.characterName);
    expect(result.options).toBeNull();
  });

  it('turns the answer into narration that hands the decision back to the group', async () => {
    const { narrator, result } = await afterFight();
    const { playerName, id, options, characterName } = result.dialogue;
    const other = playerName === 'A' ? 'B' : 'A';
    expect(narrator.answerDialogue('r', { playerName: other, dialogueId: id, optionId: options[0].id })).toBeNull();

    const defiant = options.find(option => option.id === 'defiant');
    const answer = narrator.answerDialogue('r', { playerName, dialogueId: id, optionId: defiant.id });
    expect(answer.response).toContain(characterName);
    expect(answer.options).toHaveLength(2);
    expect(answer.attitude).toMatch(/wary/);
    expect(narrator.answerDialogue('r', { playerName, dialogueId: id, optionId: defiant.id })).toBeNull(); // only once

    const state = buildStateBlock(narrator.getSession('r'), { party });
    expect(state).toMatch(/wary of the party/);
    expect(state).toContain(defiant.text);
  });

  it('starts a story thread the narrator is told about, and the offline narrator pays it off', async () => {
    const { narrator, result } = await afterFight();
    const { playerName, id, options } = result.dialogue;
    const chosen = narrator.getSession('r').pendingDialogue.options.find(option => option.id === options[0].id);
    narrator.answerDialogue('r', { playerName, dialogueId: id, optionId: chosen.id });

    const session = narrator.getSession('r');
    session.openingCombatStarted = true; // past the opening, so the next choice is a story choice
    expect(session.personalMoments.at(-1).lead).toBe(chosen.lead);
    expect(buildStateBlock(session, { party })).toContain(chosen.lead);
    expect(session.storyLog).toContain(chosen.lead);

    const next = await narrator.handleEvent({ room: 'r', eventType: 'choice_made', data: { choice: options[0].text }, context });
    expect(next.response).toContain(chosen.lead);
  });

  it('lets the moment pass in silence when time runs out', async () => {
    const { narrator, result } = await afterFight();
    const expired = narrator.expireDialogue('r', result.dialogue.id);
    expect(expired.response).toMatch(new RegExp(`${result.dialogue.characterName} (doesn't answer|lets the moment pass)`));
    expect(expired.options).toHaveLength(2);
    expect(narrator.getSession('r').personalMoments).toHaveLength(0);
  });
});

describe('personal moments written by the AI', () => {
  const party = [
    { playerName: 'A', characterId: 'offensive_tank_1', characterName: 'Shipment', role: 'Tank' },
    { playerName: 'B', characterId: 'offensive_support_2', characterName: 'Livewire', role: 'Support' }
  ];
  const context = { party, players: ['A', 'B'], attributesByPlayer: { A: ['medic', 'spy'], B: ['politician', 'crook'] }, connectedPlayers: ['A', 'B'], partyFaction: 'rebels', encounterIndex: 1 };
  const beat = { narration: 'Rain hammers the depot roof.', options: ['Go in loud', 'Wait for dark'], location: 'warehouse', memory: 'They reached the depot.' };
  const moment = (overrides = {}) => ({
    kind: 'reply',
    npc: 'A dock foreman',
    intro: 'A dock foreman blocks the gate and squints at {who}. "You lot with the union or the company?"',
    options: [
      { approach: 'honest', attribute: '', text: 'Neither. We just need in.', told: 'x says they need in.', reaction: 'The foreman shrugs.', lead: 'The foreman left the side gate unlocked.' },
      { approach: 'defiant', attribute: '', text: 'Move.', told: 'x tells him to move.', reaction: 'He moves, and calls someone.', lead: 'Company security knows the party is at the depot.' },
      { approach: 'sly', attribute: '', text: 'Union. Obviously.', told: 'x lies smoothly.', reaction: 'He grins and lowers his voice.', lead: 'The union is planning a walkout the party could use as cover.' },
      { approach: 'skill', attribute: 'politician', text: 'We are here for the workers.', told: 'x makes a promise.', reaction: 'The foreman takes off his cap.', lead: 'The dock workers will back the party in a fight at the depot.' }
    ],
    ...overrides
  });

  function scripted(responses) {
    const calls = [];
    return { name: 'scripted', model: 'scripted', calls, async generate(request) { calls.push(request); return JSON.stringify(responses.length > 1 ? responses.shift() : responses[0]); } };
  }

  async function fightEnds(provider) {
    const narrator = createNarrator({ provider, logger: quiet, random: () => 0.1 });
    // Joining a side first, as in a real game, so moments can happen.
    await narrator.handleEvent({ room: 'r', eventType: 'choice_made', data: { faction: 'rebels' }, context: { ...context, encounterIndex: 0 } });
    const result = await narrator.handleEvent({ room: 'r', eventType: 'encounter_end', context });
    return { narrator, result };
  }

  it('writes the moment fresh for the scene, with answers that lead different ways', async () => {
    const provider = scripted([beat, beat, moment({ intro: 'A dock foreman blocks the gate and squints at Livewire. "You lot with the union or the company?"' })]);
    const { narrator, result } = await fightEnds(provider);
    expect(provider.calls.at(-1).messages[0].content).toMatch(/genuinely different approach/);
    expect(result.dialogue.npc).toBe('A dock foreman');
    expect(result.response).toContain('union or the company');
    // Livewire (B) ranks Politician first, so the skill answer is offered, first.
    const ids = result.dialogue.options.map(option => option.id);
    if (result.dialogue.playerName === 'B') expect(ids[0]).toBe('skill');
    const answer = narrator.answerDialogue('r', { playerName: result.dialogue.playerName, dialogueId: result.dialogue.id, optionId: 'sly' });
    expect(answer.response).toMatch(/He grins/);
    expect(narrator.getSession('r').personalMoments.at(-1).lead).toBe('The union is planning a walkout the party could use as cover.');
  });

  it('falls back to a written moment if the AI mentions someone outside the party', async () => {
    const bad = moment({ intro: 'Leo, who is not here, waves.' });
    const { result } = await fightEnds(scripted([beat, beat, bad]));
    expect(result.dialogue).toBeTruthy();
    expect(result.dialogue.npc).not.toBe('A dock foreman');
    expect(result.dialogue.options.length).toBeGreaterThanOrEqual(3);
  });

  it('never asks the same thing the group is about to decide', async () => {
    // The scene's decision is "Go in loud" / "Wait for dark"; this moment asks the same.
    const echo = moment({ options: moment().options.map((option, i) => (i === 0 ? { ...option, text: 'Go in loud, right now.' } : option)) });
    const provider = scripted([beat, beat, echo]);
    const { result } = await fightEnds(provider);
    expect(provider.calls.at(-1).messages[0].content).toMatch(/about something else entirely/);
    expect(result.dialogue.npc).not.toBe('A dock foreman');
    expect(result.dialogue.options.map(option => option.text)).not.toContain('Go in loud, right now.');
  });
});

