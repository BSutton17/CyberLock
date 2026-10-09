import { describe, it, expect } from 'vitest';
import { mockStoryBeat, MOCK_SITUATIONS } from './mockStory.js';
import { VALID_ATTRIBUTES, VALID_LOCATIONS } from './lore.js';

const party = [
  { name: 'Shipment', characterId: 'offensive_tank_1', role: 'Tank' },
  { name: 'Patchwork', characterId: 'healing_support_1', role: 'Support' }
];
const seeded = (seed = 3) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('offline narrator', () => {
  it('has a few situations, each with two options, for every decision attribute', () => {
    for (const attribute of VALID_ATTRIBUTES) {
      expect(MOCK_SITUATIONS[attribute]?.length, attribute).toBeGreaterThanOrEqual(3);
      for (const situation of MOCK_SITUATIONS[attribute]) {
        expect(situation.options).toHaveLength(2);
        situation.options.forEach(option => expect(option.split(' ').length).toBeLessThan(9));
        if (situation.location) expect(VALID_LOCATIONS).toContain(situation.location);
      }
    }
  });

  it('opens with the party, why they are there, and the choice of side', () => {
    const beat = mockStoryBeat({ eventType: 'game_start', party, ownerName: 'Shipment', openingScene: 'market_explosion', fixedOptions: ['A', 'B'] }, seeded());
    expect(beat.narration).toContain('Shipment');
    expect(beat.narration).toContain('Patchwork');
    expect(beat.narration).toMatch(/Enforcers/);
    expect(beat.options).toEqual(['A', 'B']);
  });

  it('follows a decision with its consequence and the next decision for the right person', () => {
    const beat = mockStoryBeat({
      eventType: 'choice_made', party, faction: 'rebels', ownerName: 'Patchwork', attribute: 'medic', needsOptions: true,
      lastChoice: 'Cut the district power', decisions: [{ by: 'Shipment', choice: 'Cut the district power', attribute: 'electrician' }]
    }, seeded());
    expect(beat.narration).toMatch(/Shipment .*cut the district power/);
    expect(beat.narration).toContain('Patchwork');
    expect(MOCK_SITUATIONS.medic.map(s => s.options.join())).toContain(beat.options.join());
  });

  it('brings the act villain in person and sends them off when beaten', () => {
    const entrance = mockStoryBeat({ eventType: 'choice_made', party, faction: 'rebels', startsCombat: true, bossId: 'enforcer_macro_hull', setup: 'The fusion plant.' }, seeded());
    expect(entrance.narration).toContain('Macro Hull');
    const exit = mockStoryBeat({ eventType: 'encounter_end', party, faction: 'rebels', ownerName: 'Shipment', attribute: 'spy', needsOptions: true, defeatedBossId: 'enforcer_macro_hull', nextActGoal: 'Expose Project Ascension.' }, seeded());
    expect(exit.narration).toContain('Macro Hull');
    expect(exit.narration).toMatch(/expose Project Ascension/);
  });

  it('ends with the choices the party actually made and a word for each member', () => {
    const beat = mockStoryBeat({
      eventType: 'ending', party, faction: 'enforcers',
      decisions: [{ by: 'the party', choice: 'Side with the Enforcers' }, { by: 'Patchwork', choice: 'Treat the wounded first' }]
    }, seeded());
    expect(beat.narration).toMatch(/side with the Enforcers/);
    expect(beat.narration).toMatch(/treat the wounded first/);
    expect(beat.narration.match(/Shipment|Patchwork/g).length).toBeGreaterThanOrEqual(3);
  });

  it('does not repeat itself across a campaign when given its memory', () => {
    const recent = [];
    const random = seeded(9);
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
      const beat = mockStoryBeat({ eventType: 'encounter_end', party, faction: 'rebels', ownerName: 'Shipment', attribute: 'navigator', needsOptions: true }, random, recent);
      expect(seen.has(beat.options.join())).toBe(false);
      seen.add(beat.options.join());
    }
  });
});
