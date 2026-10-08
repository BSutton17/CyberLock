import { describe, it, expect } from 'vitest';
import {
  STORY_COMBAT_FLOW,
  TOTAL_ENCOUNTERS,
  generateEncounterEnemies,
  getEnemyFaction,
  getBossOrdinal,
  assignEnemyAbilities,
  getAbilitiesByLevelAndRole,
  createEnemyInstance,
  isFinalEncounter,
  ORDERED_BOSS_IDS_BY_FACTION
} from '../../shared/combat/encounters.js';
import { ABILITIES } from '../../shared/combat/abilities.js';
import EnemiesData from '../../shared/data/enemies.js';
import { BOSS_ENCOUNTERS, TOTAL_ENCOUNTERS as STORY_TOTAL } from '../narrator/campaign.js';

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('campaign fights', () => {
  it('match the story outline: ten fights, bosses at 3, 7 and 10', () => {
    expect(TOTAL_ENCOUNTERS).toBe(STORY_TOTAL);
    const bossFights = STORY_COMBAT_FLOW.map((fight, index) => (fight.combatType === 'boss' ? index : -1)).filter(i => i >= 0);
    expect(bossFights).toEqual(BOSS_ENCOUNTERS);
    expect(isFinalEncounter(9)).toBe(true);
    expect(isFinalEncounter(8)).toBe(false);
  });

  it('meets each side\'s bosses in order', () => {
    expect([2, 6, 9].map(getBossOrdinal)).toEqual([0, 1, 2]);
    for (const [index, ordinal] of [[2, 0], [6, 1], [9, 2]]) {
      const enemies = generateEncounterEnemies({ encounterIndex: index, partyFaction: 'rebels', partySize: 4, random: seeded() });
      expect(enemies.some(enemy => enemy.id.startsWith(ORDERED_BOSS_IDS_BY_FACTION.enforcers[ordinal]))).toBe(true);
    }
  });
});

describe('generateEncounterEnemies', () => {
  it('fields party size + 2 enemies of the other side in a low fight', () => {
    const enemies = generateEncounterEnemies({ encounterIndex: 0, partyFaction: 'enforcers', partySize: 3, random: seeded() });
    expect(enemies).toHaveLength(5);
    expect(enemies.every(enemy => getEnemyFaction(enemy) === 'rebels')).toBe(true);
  });

  it('gives every enemy a unique id and full health', () => {
    for (let index = 0; index < TOTAL_ENCOUNTERS; index++) {
      const enemies = generateEncounterEnemies({ encounterIndex: index, partyFaction: 'rebels', partySize: 6, partyLevel: 3, random: seeded(index + 1) });
      expect(enemies.length).toBeGreaterThan(0);
      expect(new Set(enemies.map(enemy => enemy.id)).size).toBe(enemies.length);
      expect(enemies.every(enemy => enemy.stats.health === enemy.stats.maxHealth && enemy.stats.health > 0)).toBe(true);
    }
  });

  it('skips generic enemies in hard fights for small parties', () => {
    const enemies = generateEncounterEnemies({ encounterIndex: 1, partyFaction: 'rebels', partySize: 2, random: seeded() });
    expect(enemies.every(enemy => enemy.tier !== 'generic')).toBe(true);
  });

  it('puts at most one support in a medium fight', () => {
    for (let seed = 1; seed < 30; seed++) {
      const enemies = generateEncounterEnemies({ encounterIndex: 4, partyFaction: 'rebels', partySize: 5, random: seeded(seed) });
      expect(enemies.filter(enemy => enemy.tier === 'mid-tier' && enemy.role === 'Support').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('enemy scaling and abilities', () => {
  const template = EnemiesData.enemies.find(enemy => enemy.id === 'enforcer_soldier');

  it('adds 6 to each stat per level and toughens up for big parties', () => {
    const base = createEnemyInstance(template, 0, 3, 1, seeded());
    const scaled = createEnemyInstance(template, 0, 5, 3, seeded());
    expect(scaled.stats.maxHealth).toBe(base.stats.maxHealth + 12);
    expect(scaled.stats.resistance).toBeCloseTo((template.stats.resistance + 12) * 1.2);
    expect(scaled.id).toBe('enforcer_soldier_1');
  });

  it('leaves every enemy type something to pick at every unlock level', () => {
    for (const roles of [['DPS'], ['DPS', 'Tank'], ['Support']]) {
      for (const level of [1, 3, 5]) {
        expect(getAbilitiesByLevelAndRole(level, roles).length, `${roles}@${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives one ability per unlocked tier, never a banned one', () => {
    const abilities = assignEnemyAbilities({ level: 5, behavior: 'support' }, seeded());
    expect(abilities.map(ability => ability.level)).toEqual([1, 3, 5]);
    expect(abilities.every(ability => ABILITIES[ability.id]?.role === 'Support')).toBe(true);
    for (let seed = 1; seed < 40; seed++) {
      const picked = assignEnemyAbilities({ level: 5, behavior: 'intelligent' }, seeded(seed));
      expect(picked.some(ability => ['charge', 'gtg', 'eagle_eye'].includes(ability.id))).toBe(false);
    }
  });
});
