import { describe, it, expect } from 'vitest';
import { completeAttributeRankings, ATTRIBUTE_NAMES, RANKING_LENGTH } from './attributes.js';

// Small seeded generator so failures are reproducible.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sameSlotClashes = (rankings) => {
  const clashes = [];
  for (let slot = 2; slot < RANKING_LENGTH; slot++) {
    const names = Object.values(rankings).map(ranking => ranking[slot]);
    if (new Set(names).size !== names.length) clashes.push(slot);
  }
  return clashes;
};

const expectFullRanking = (ranking) => {
  expect(ranking).toHaveLength(RANKING_LENGTH);
  expect([...ranking].sort()).toEqual([...ATTRIBUTE_NAMES].sort());
};

// Picks like the Character Feats screen allows: unique primaries, and unique secondaries unless
// the party is full (then the secondary is optional and may match someone else's).
function randomPicks(playerCount, random) {
  const pool = [...ATTRIBUTE_NAMES].sort(() => random() - 0.5);
  const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
  const picks = {};
  players.forEach((player, i) => {
    if (playerCount === 6) {
      const others = ATTRIBUTE_NAMES.filter(name => name !== pool[i]);
      picks[player] = [pool[i], random() < 0.3 ? null : others[Math.floor(random() * others.length)]];
    } else {
      picks[player] = [pool[i * 2], pool[i * 2 + 1]];
    }
  });
  return { players, picks };
}

describe('completeAttributeRankings', () => {
  it('keeps each player\'s primary and secondary and fills the other eight', () => {
    const rankings = completeAttributeRankings(['A', 'B'], {
      A: ['Medic', 'Spy', null, null],
      B: ['Crook', 'Banker']
    }, seeded(1));

    expect(rankings.A.slice(0, 2)).toEqual(['Medic', 'Spy']);
    expect(rankings.B.slice(0, 2)).toEqual(['Crook', 'Banker']);
    expectFullRanking(rankings.A);
    expectFullRanking(rankings.B);
    expect(sameSlotClashes(rankings)).toEqual([]);
  });

  it('never gives two players the same attribute in the same slot, for every party size', () => {
    for (let playerCount = 1; playerCount <= 6; playerCount++) {
      for (let seed = 0; seed < 300; seed++) {
        const random = seeded(seed * 31 + playerCount);
        const { players, picks } = randomPicks(playerCount, random);
        const rankings = completeAttributeRankings(players, picks, random);

        for (const player of players) {
          expectFullRanking(rankings[player]);
          expect(rankings[player][0]).toBe(picks[player][0]);
          if (picks[player][1]) expect(rankings[player][1]).toBe(picks[player][1]);
        }
        expect(sameSlotClashes(rankings)).toEqual([]);
      }
    }
  });

  it('fills an empty secondary without clashing with other secondaries', () => {
    const players = ['A', 'B', 'C', 'D', 'E', 'F'];
    const picks = {
      A: ['Politician', null],
      B: ['Intimidation', 'Medic'],
      C: ['Scholar', 'Medic'],
      D: ['Spy', 'Banker'],
      E: ['Detective', 'Crook'],
      F: ['Navigator', 'Electrician']
    };
    const rankings = completeAttributeRankings(players, picks, seeded(7));
    expect(['Medic', 'Banker', 'Crook', 'Electrician']).not.toContain(rankings.A[1]);
    expectFullRanking(rankings.A);
  });

  it('shuffles: different seeds give different orders', () => {
    const picks = { A: ['Medic', 'Spy'] };
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => completeAttributeRankings(['A'], picks, seeded(seed)).A.join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('accepts lowercase ids and ignores junk or repeated picks', () => {
    const rankings = completeAttributeRankings(['A'], { A: ['medic', 'medic'] }, seeded(3));
    expect(rankings.A[0]).toBe('Medic');
    expectFullRanking(rankings.A);

    const junk = completeAttributeRankings(['B'], { B: ['<script>', 42] }, seeded(3));
    expectFullRanking(junk.B);
  });

  it('handles a player with no picks at all', () => {
    const rankings = completeAttributeRankings(['A', 'B'], { A: ['Medic', 'Spy'] }, seeded(4));
    expectFullRanking(rankings.B);
    expect(sameSlotClashes(rankings)).toEqual([]);
  });
});
