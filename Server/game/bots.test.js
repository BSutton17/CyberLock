import { describe, it, expect } from 'vitest';
import { chooseBotAttributes, chooseBotCharacter, fillBotAbilities, levelUpBot, nextBotName, humanPlayers, rollLevelUpPlan, LEVEL_UP_CHANCES, levelUpChancesFor } from './bots.js';
import { createRoom, seatBot } from './rooms.js';
import { ATTRIBUTE_NAMES } from './attributes.js';
import { LEVEL_UP_POINTS } from './progression.js';
import CharactersData from '../../shared/data/characters.js';

const template = (id) => structuredClone(CharactersData.characters.find(character => character.id === id));

function roomWith(humans, bots = []) {
  const room = createRoom('1234');
  for (const name of humans) {
    room.players.push(name);
    room.memberIds[name] = `u-${name}`;
  }
  for (const name of bots) seatBot(room, name, template('offensive_tank_1'));
  return room;
}

describe('bots', () => {
  it('take only attributes no person picked, after everyone has chosen', () => {
    const room = roomWith(['A', 'B'], ['Nova (bot)', 'Atlas (bot)']);
    room.attributes = { A: ['Medic', 'Spy'], B: ['Crook', 'Banker'] };
    for (let seed = 0; seed < 20; seed++) {
      const picks = chooseBotAttributes(room, () => (seed + 0.5) / 20);
      const botPicks = [...picks['Nova (bot)'], ...picks['Atlas (bot)']];
      expect(botPicks).toHaveLength(4);
      expect(new Set(botPicks).size).toBe(4);
      for (const name of botPicks) expect(['Medic', 'Spy', 'Crook', 'Banker']).not.toContain(name);
    }
  });

  it('settle for anything that is not someone\'s primary when people took nearly everything', () => {
    const room = roomWith(['A', 'B', 'C', 'D', 'E'], ['Nova (bot)']);
    const names = [...ATTRIBUTE_NAMES];
    room.attributes = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((player, i) => [player, [names[i * 2], names[i * 2 + 1]]]));
    const [primary, secondary] = chooseBotAttributes(room, () => 0)['Nova (bot)'];
    const humanPrimaries = ['A', 'B', 'C', 'D', 'E'].map(player => room.attributes[player][0]);
    expect(humanPrimaries).not.toContain(primary);
    expect(secondary).toBeTruthy();
    expect(secondary).not.toBe(primary);
  });

  it('get free names, a missing role, and never hold the room', () => {
    const room = roomWith(['A']);
    room.characterSelections.A = template('healing_support_1');
    const name = nextBotName(room);
    expect(name).toMatch(/\(bot\)$/);
    expect(chooseBotCharacter(room, () => 0).role).toBe('Tank');
    seatBot(room, name, chooseBotCharacter(room, () => 0));
    expect(humanPlayers(room)).toEqual(['A']);
    expect(nextBotName(room)).not.toBe(name);
  });

  it("roll each 5-point chunk of a level-up against their character's chances", () => {
    for (const chances of Object.values(LEVEL_UP_CHANCES)) {
      expect(Object.values(chances).reduce((a, b) => a + b, 0)).toBe(100);
    }
    expect(levelUpChancesFor(template('defensive_tank_2'))).toBe(LEVEL_UP_CHANCES.Tank);
    expect(levelUpChancesFor(template('hacker_support_4'))).toBe(LEVEL_UP_CHANCES.Support);

    const leo = template('aggressive_dps_2');
    const counts = {};
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let level = 0; level < 2000; level++) {
      const plan = rollLevelUpPlan(leo, random);
      expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(15);
      expect(Object.values(plan).every(points => points % 5 === 0)).toBe(true);
      for (const [stat, points] of Object.entries(plan)) counts[stat] = (counts[stat] || 0) + points / 5;
    }
    expect(counts.ta).toBeUndefined(); // Leo never rolls TA
    expect(counts.strength / 6000).toBeCloseTo(0.35, 1);
    expect(counts.maxHealth / 6000).toBeCloseTo(0.10, 1);
  });

  it('level up through the normal rules and fill new ability slots', () => {
    const level2 = { ...template('spellcaster_dps_1'), level: 2, abilities: [{ id: 'sparkshot' }], ultimate: '' };
    const { character, leveledUp } = levelUpBot(level2);
    expect(leveledUp).toBe(true);
    const spent = ['maxHealth', 'speed', 'resistance', 'strength', 'ta'].reduce((total, stat) => total + character.stats[stat] - level2.stats[stat], 0);
    expect(spent).toBe(LEVEL_UP_POINTS);
    const equipped = fillBotAbilities(character, () => 0);
    expect(equipped.abilities[0].id).toBe('sparkshot'); // keeps its existing pick
    expect(equipped.abilities).toHaveLength(2);
    expect(equipped.ultimate?.id).toBeTruthy();
    expect(typeof equipped.abilities[1].execute).toBe('undefined'); // plain data, like a player's pick
  });
});
