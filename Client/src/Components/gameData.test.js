import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import charactersData from '@shared/data/characters.js';
import enemiesData from '@shared/data/enemies.js';
import {
  CHARACTER_IMAGE_MAP,
  ENEMY_IMAGE_MAP,
  ENEMY_NAME_IMAGE_MAP,
  FALLBACK_IMAGE,
  getCharacterImage,
  getEnemyImage
} from './imageMaps';

const publicDir = path.resolve(__dirname, '../../public');
const publicFileExists = (webPath) => fs.existsSync(path.join(publicDir, webPath));

const STAT_KEYS = ['health', 'maxHealth', 'speed', 'resistance', 'strength', 'ta'];
const ROLES = ['DPS', 'Tank', 'Support'];
const ENEMY_TIERS = ['generic', 'mid-tier', 'mini-boss', 'boss'];
const ENEMY_BEHAVIORS = ['aggressive', 'defensive', 'support', 'intelligent'];

describe('character data', () => {
  const characters = charactersData.characters;

  it('has unique ids', () => {
    const ids = characters.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(characters.map(c => [c.id, c]))('%s has valid stats, role and weapon', (_id, character) => {
    expect(ROLES).toContain(character.role);
    expect(character.level).toBe(1);
    for (const key of STAT_KEYS) {
      expect(Number.isFinite(character.stats[key]), key).toBe(true);
    }
    expect(character.stats.health).toBe(character.stats.maxHealth);
    expect(character.weapon.range).toBeGreaterThanOrEqual(1);
    expect(character.weapon.damage).toBeGreaterThan(0);
  });

  it('every character has an image that exists', () => {
    for (const character of characters) {
      const image = CHARACTER_IMAGE_MAP[character.id];
      expect(image, character.id).toBeDefined();
      expect(publicFileExists(image), image).toBe(true);
    }
  });
});

describe('enemy data', () => {
  const enemies = enemiesData.enemies;

  it('has unique ids', () => {
    const ids = enemies.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(enemies.map(e => [e.id, e]))('%s has a valid tier, role, behavior, stats and weapon', (_id, enemy) => {
    expect(ENEMY_TIERS).toContain(enemy.tier);
    expect(ROLES).toContain(enemy.role);
    expect(ENEMY_BEHAVIORS).toContain(enemy.behavior);
    for (const key of STAT_KEYS) {
      expect(Number.isFinite(enemy.stats[key]), key).toBe(true);
    }
    expect(enemy.stats.health).toBe(enemy.stats.maxHealth);
    expect(enemy.weapon.range).toBeGreaterThanOrEqual(1);
  });

  it('has three bosses per faction', () => {
    const bosses = enemies.filter(e => e.tier === 'boss').map(e => e.id);
    expect(bosses.filter(id => id.startsWith('enforcer_'))).toHaveLength(3);
    expect(bosses.filter(id => id.startsWith('rebel_'))).toHaveLength(3);
  });

  it('every enemy has its own image that exists', () => {
    for (const enemy of enemies) {
      const image = ENEMY_IMAGE_MAP[enemy.id];
      expect(image, enemy.id).toBeDefined();
      expect(publicFileExists(image), image).toBe(true);
    }
    for (const image of Object.values(ENEMY_NAME_IMAGE_MAP)) {
      expect(publicFileExists(image), image).toBe(true);
    }
  });
});

describe('image lookups', () => {
  it('resolves enemy instances (id with a numeric suffix) to the template image', () => {
    expect(getEnemyImage({ id: 'enforcer_drone_3', name: 'Enforcer Drone' })).toBe(ENEMY_IMAGE_MAP.enforcer_drone);
    expect(getEnemyImage('rebel_initiate_12')).toBe(ENEMY_IMAGE_MAP.rebel_initiate);
  });

  it('falls back to the name map and then to an image that exists', () => {
    expect(getEnemyImage({ name: 'Genisis' })).toBe(ENEMY_NAME_IMAGE_MAP.Genisis);
    expect(getEnemyImage({ id: 'mystery' })).toBe(FALLBACK_IMAGE);
    expect(getCharacterImage(null)).toBe(FALLBACK_IMAGE);
    expect(publicFileExists(FALLBACK_IMAGE)).toBe(true);
  });
});
