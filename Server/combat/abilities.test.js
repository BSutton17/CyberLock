import { describe, it, expect } from 'vitest';
import { ABILITIES } from '../../shared/combat/abilities.js';
import { createActiveEffect, calculateTotalStat, INSTANT_EFFECT_TYPES } from '../../shared/combat/effects.js';

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

    // And every lasting effect can become an active effect.
    for (const effect of (result.effects || []).filter(e => !INSTANT_EFFECT_TYPES.has(e.type))) {
      expect(createActiveEffect(effect, { ownerId: 'p1' }).turnsRemaining).toBeGreaterThan(0);
    }
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
    const activeEffects = result.effects.map(effect => createActiveEffect(effect, { ownerId: 'p1' }));
    expect(calculateTotalStat(params.caster, 'p1', 'speed', activeEffects)).toBe(60);
  });

  it('Zen heals the whole party for a fifth of their max health and sharpens supports', () => {
    const params = fixture();
    const result = ABILITIES.zen.execute(params);
    expect(result.healing).toEqual([{ target: 'p1', amount: 16 }, { target: 'p2', amount: 16 }, { target: 'p3', amount: 16 }]);
    expect(result.effects).toEqual([expect.objectContaining({ target: 'p2', stat: 'ta', value: 15, duration: 2 })]);
  });

  it('Fireball hits every enemy in the area for the full amount', () => {
    const params = fixture();
    const result = ABILITIES.fireball.execute({ ...params, caster: { ...params.caster, stats: { ...params.caster.stats, ta: 60 } }, random: () => 0.99 });
    // e1 (4,4), e2 (3,4) and e3 (4,5) are all inside the 3x3 around (4,4): 60/10*8 - 20/10 = 46 each.
    expect(result.damage).toEqual([{ target: 'e1', amount: 46 }, { target: 'e2', amount: 46 }, { target: 'e3', amount: 46 }]);
  });

  it('Guarded Breath halves the damage an ally takes', () => {
    const result = ABILITIES.guarded_breath.execute({ ...fixture(), target: 'p2' });
    expect(result.effects).toEqual([expect.objectContaining({ type: 'damage_taken_multiplier', target: 'p2', value: 0.5 })]);
  });

  it('Stonewall shields the caster and allies within two tiles', () => {
    const params = fixture();
    params.characterPositions.p3 = { row: 6, col: 6 };
    const result = ABILITIES.stonewall.execute(params);
    expect(result.effects.map(effect => effect.target).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(result.effects.every(effect => effect.value === 25)).toBe(true);
  });

  it('G.T.G. pins an enemy it teleports but not an ally', () => {
    const params = fixture();
    const onEnemy = ABILITIES.gtg.execute({ ...params, target: 'e1', targetPosition: { row: 0, col: 0 } });
    expect(onEnemy.effects.some(effect => effect.status === 'immobilized' && effect.target === 'e1')).toBe(true);
    const onAlly = ABILITIES.gtg.execute({ ...params, target: 'p2', targetPosition: { row: 6, col: 9 } });
    expect(onAlly.effects.some(effect => effect.status === 'immobilized')).toBe(false);
  });

  it('Poison Apple hits right away and its poison starts this turn', () => {
    const result = ABILITIES.poison_apple.execute(fixture());
    expect(result.damage).toEqual([{ target: 'e1', amount: 38 }]); // 50/10*8 - 20/10
    expect(result.effects.find(effect => effect.type === 'poison')).toMatchObject({ damagePercent: 0.1, tickOnCastTurn: true });
  });

  it('Butterfly Effect also slows every enemy', () => {
    const result = ABILITIES.butterfly_effect.execute(fixture());
    expect(result.effects.filter(effect => effect.type === 'stat_debuff' && effect.stat === 'speed')).toHaveLength(3);
  });

  it('Iron Sharpens Iron reaches Tanks as well as DPS', () => {
    const result = ABILITIES.iron_sharpens_iron.execute(fixture());
    expect(result.effects.map(effect => effect.target).sort()).toEqual(['p1', 'p3']);
    expect(result.effects.every(effect => effect.value === 15)).toBe(true);
  });

  it('Dead Calm works on the turn it is used', () => {
    const params = fixture();
    const active = ABILITIES.dead_calm.execute(params).effects.map(effect => createActiveEffect(effect, { ownerId: 'p1' }));
    expect(calculateTotalStat(params.caster, 'p1', 'strength', active)).toBe(100);
    expect(calculateTotalStat(params.caster, 'p1', 'speed', active)).toBe(0);
  });

  it('marks the quick abilities as bonus actions', () => {
    for (const id of ['quick_jab', 'selfish_sacrifice', 'dead_calm', 'rallying_guard', 'shield_up', 'butterfly_effect', 'count_me_out', 'humble', 'hurry_up', 'cursed']) {
      expect(ABILITIES[id].consumesAction, id).toBe(false);
    }
  });

  it('describes Cursed, EMP and Murus Fictilis with their real numbers', () => {
    const params = fixture();
    expect(ABILITIES.cursed.execute(params).message).toContain('50%');
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

describe('zone abilities', () => {
  it('Feels Like Home places one field that does the healing itself', () => {
    const params = fixture();
    const result = ABILITIES.feels_like_home.execute({ ...params, caster: { ...params.caster, stats: { ...params.caster.stats, ta: 40 } } });
    expect(result.effects).toEqual([expect.objectContaining({ type: 'healing_field', amount: 5, duration: 2, tickOnCastTurn: true })]);
    expect(result.healing).toBeUndefined();
  });

  it('Toxic Mist places one field instead of tagging whoever stood there', () => {
    const result = ABILITIES.toxic_mist.execute(fixture());
    expect(result.effects.map(effect => effect.type)).toEqual(['toxic_mist_field']);
  });

  it('Blizzard places a field and leaves the slowing to it', () => {
    const result = ABILITIES.blizzard.execute(fixture());
    expect(result.effects.map(effect => effect.type)).toEqual(['blizzard_field']);
    expect(result.message).toContain('e1');
  });

  it('chance-based abilities use the random source they are given', () => {
    const params = fixture();
    const lucky = ABILITIES.blackjack.execute({ ...params, target: 'p2', random: () => 0 });
    const unlucky = ABILITIES.blackjack.execute({ ...params, target: 'p2', random: () => 0.99 });
    expect(lucky.healing).toEqual([{ target: 'p2', amount: 40 }]);
    expect(unlucky.healing).toBeUndefined();
    // Sparkshot's slow always lands now.
    expect(ABILITIES.sparkshot.execute({ ...params, random: () => 0.9 }).effects).toHaveLength(1);
  });
});
