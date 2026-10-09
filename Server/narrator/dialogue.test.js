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
    expect(publicDialogue(plain).options.map(option => option.id)).toEqual(['honest', 'defiant']);

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

  it('lets the moment pass in silence when time runs out', async () => {
    const { narrator, result } = await afterFight();
    const expired = narrator.expireDialogue('r', result.dialogue.id);
    expect(expired.response).toMatch(new RegExp(`${result.dialogue.characterName} (doesn't answer|lets the moment pass)`));
    expect(expired.options).toHaveLength(2);
    expect(narrator.getSession('r').personalMoments).toHaveLength(0);
  });
});
