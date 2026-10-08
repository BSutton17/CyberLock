import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ABILITIES } from './AbilityStore';
import { applyAbilityEffects, calculateTotalStat } from './AbilityLogic';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

const ROLES = ['DPS', 'Tank', 'Support'];
const TARGET_TYPES = ['self', 'single-enemy', 'multi-enemy', 'ally', 'ground-target', 'all-enemies', 'all-allies', 'relocate'];
const TYPES = ['buff', 'debuff', 'damage', 'heal', 'utility'];

const unit = (id, overrides = {}) => ({
  id,
  name: id,
  role: overrides.role || 'DPS',
  stats: { health: 60, maxHealth: 80, speed: 30, resistance: 20, strength: 40, ta: 50, ...(overrides.stats || {}) }
});

// A small battlefield: caster p1 at (5,4), ally p2 next to it, enemies in front.
const fixture = () => {
  const playerCharacters = {
    p1: unit('p1', { role: 'Tank' }),
    p2: unit('p2', { role: 'Support' }),
    p3: unit('p3', { role: 'DPS' })
  };
  const enemies = [unit('e1', { stats: { strength: 10 } }), unit('e2'), unit('e3', { stats: { strength: 99 } })];
  const characterPositions = {
    p1: { row: 5, col: 4 },
    p2: { row: 5, col: 5 },
    p3: { row: 6, col: 4 },
    e1: { row: 4, col: 4 },
    e2: { row: 3, col: 4 },
    e3: { row: 4, col: 5 }
  };
  return {
    caster: playerCharacters.p1,
    playerName: 'p1',
    target: 'e1',
    targets: ['e1', 'e2'],
    targetPosition: { row: 4, col: 4 },
    enemies,
    playerCharacters,
    characterPositions,
    cooldowns: {}
  };
};

const targetFor = (ability) => (ability.targetType === 'ally' ? 'p2' : ability.targetType === 'relocate' ? 'e1' : 'e1');

describe('ability catalog', () => {
  const entries = Object.entries(ABILITIES);

  it.each(entries)('%s is well formed', (key, ability) => {
    expect(ability.id).toBe(key);
    expect(typeof ability.name).toBe('string');
    expect(ability.description.length).toBeGreaterThan(5);
    expect(ROLES).toContain(ability.role);
    expect(TARGET_TYPES).toContain(ability.targetType);
    expect(TYPES).toContain(ability.type);
    expect(Number.isInteger(ability.cooldown)).toBe(true);
    expect(typeof ability.execute).toBe('function');
    if (ability.isUltimate) {
      expect(ability.level).toBeUndefined();
    } else {
      expect([1, 3, 5]).toContain(ability.level);
    }
  });

  it('gives every role at least one ability per level and some ultimates', () => {
    for (const role of ROLES) {
      for (const level of [1, 3, 5]) {
        expect(entries.some(([, a]) => a.role === role && a.level === level), `${role}@${level}`).toBe(true);
      }
      expect(entries.some(([, a]) => a.role === role && a.isUltimate), `${role} ultimate`).toBe(true);
    }
  });

  it.each(entries)('%s executes on a standard battlefield without crashing', (_key, ability) => {
    const params = fixture();
    params.target = targetFor(ability);
    if (ability.targetType === 'relocate') params.targetPosition = { row: 4, col: 0 };
    const result = ability.execute(params);

    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    if (!result.success) return;

    const knownIds = new Set([...Object.keys(params.playerCharacters), ...params.enemies.map(e => e.id)]);
    for (const entry of [...(result.damage || []), ...(result.healing || [])]) {
      expect(knownIds.has(entry.target), `${ability.id} targets ${entry.target}`).toBe(true);
      expect(Number.isFinite(entry.amount)).toBe(true);
      expect(entry.amount).toBeGreaterThanOrEqual(0);
    }
    for (const effect of result.effects || []) {
      expect(typeof effect.type).toBe('string');
    }

    // And the results can be applied to game state.
    expect(() => applyAbilityEffects(result, {
      enemies: params.enemies,
      playerCharacters: params.playerCharacters,
      activeEffects: [],
      effectOwnerTurnId: 'p1'
    })).not.toThrow();
  });
});

describe('specific abilities', () => {
  it('Charge takes down a weaker enemy and does nothing to a stronger one', () => {
    const params = fixture();
    expect(ABILITIES.charge.execute({ ...params, target: 'e1' }).damage).toEqual([{ target: 'e1', amount: 60 }]);
    expect(ABILITIES.charge.execute({ ...params, target: 'e3' }).damage).toEqual([]);
  });

  it('Flash Step doubles speed on the turn it is used', () => {
    const params = fixture();
    const result = ABILITIES.flash_step.execute(params);
    const { activeEffects } = applyAbilityEffects(result, { enemies: [], playerCharacters: params.playerCharacters, activeEffects: [], effectOwnerTurnId: 'p1' });
    expect(calculateTotalStat(params.caster, 'p1', 'speed', activeEffects)).toBe(60);
  });

  it('Zen heals each support for a quarter of their max health', () => {
    const params = fixture();
    const result = ABILITIES.zen.execute(params);
    expect(result.healing).toEqual([{ target: 'p2', amount: 20 }]);
  });

  it('describes Cursed, EMP and Murus Fictilis with their real numbers', () => {
    const params = fixture();
    expect(ABILITIES.cursed.execute(params).message).toContain('35%');
    expect(ABILITIES.emp.execute(params).message).toContain('2 turns');
    expect(ABILITIES.murus_fictilis.execute(params).message).toContain('+35');
  });

  it('White Phospherus skips enemies that are already down', () => {
    const params = fixture();
    params.enemies[0] = { ...params.enemies[0], isDeadBody: true, stats: { ...params.enemies[0].stats, health: 0 } };
    const targets = ABILITIES.white_phospherus.execute(params).effects.map(effect => effect.target);
    expect(targets).toEqual(['e2', 'e3']);
  });

  it('Black Hole pulls enemies into free tiles only', () => {
    const params = fixture();
    const result = ABILITIES.black_hole.execute({ ...params, targetPosition: { row: 3, col: 4 } });
    const occupiedByAllies = new Set(['5,4', '5,5', '6,4']);
    for (const move of result.forcedMovement) {
      expect(occupiedByAllies.has(`${move.to.row},${move.to.col}`)).toBe(false);
    }
  });
});
