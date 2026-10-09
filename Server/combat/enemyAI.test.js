import { describe, it, expect } from 'vitest';
import { planEnemyTurn, selectAttackTarget, isCellInDangerZone } from '../../shared/combat/enemyAI.js';

const enemy = (overrides = {}) => ({
  id: 'e1',
  name: 'Enforcer',
  role: 'DPS',
  behavior: 'aggressive',
  stats: { health: 40, maxHealth: 40, speed: 30, resistance: 10, strength: 40, ta: 10 },
  weapon: { name: 'Baton', damage: 6, range: 1 },
  abilities: [],
  cooldowns: {},
  ...overrides
});

const player = (health = 60, role = 'DPS') => ({ role, stats: { health, maxHealth: 80, resistance: 10 } });

describe('selectAttackTarget', () => {
  it('finishes off whoever it can kill, otherwise hits the most fragile target', () => {
    const positions = { e1: { row: 1, col: 1 }, weak: { row: 1, col: 2 }, tank: { row: 0, col: 1 } };
    const characters = { weak: player(5, 'Support'), tank: player(80, 'Tank') };
    expect(selectAttackTarget(enemy({ turnsTaken: 1 }), ['weak', 'tank'], characters, positions)).toBe('weak');
  });

  it('goes for the toughest party member in reach on its first turn', () => {
    const positions = { e1: { row: 1, col: 1 }, support: { row: 1, col: 2 }, tank: { row: 0, col: 1 } };
    const characters = {
      support: { role: 'Support', stats: { health: 55, maxHealth: 55, resistance: 10 } },
      tank: { role: 'Tank', stats: { health: 100, maxHealth: 100, resistance: 50 } }
    };
    expect(selectAttackTarget(enemy(), ['support', 'tank'], characters, positions)).toBe('tank');
    // Only one in reach: it hits that one even on the first turn.
    expect(selectAttackTarget(enemy(), ['support'], characters, positions)).toBe('support');
  });

  it('aims a first-turn damage ability at the toughest target too', () => {
    const positions = { e1: { row: 1, col: 1 }, support: { row: 1, col: 2 }, tank: { row: 1, col: 4 } };
    const characters = {
      support: { role: 'Support', stats: { health: 55, maxHealth: 55, resistance: 10 } },
      tank: { role: 'Tank', stats: { health: 100, maxHealth: 100, resistance: 50 } }
    };
    const caster = enemy({ abilities: [{ id: 'sparkshot', level: 1 }], cooldowns: { sparkshot: 0 } });
    const plan = planEnemyTurn(caster, ['support', 'tank'], [], [caster], characters, positions);
    expect(plan.abilityToUse?.id).toBe('sparkshot');
    expect(plan.target).toBe('tank');
  });
});

describe('planEnemyTurn', () => {
  // Regression: dead players (0 HP) looked like the easiest kill, so enemies kept hitting corpses.
  it('never targets a fallen player', () => {
    const positions = { e1: { row: 1, col: 1 }, dead: { row: 1, col: 2 }, alive: { row: 2, col: 1 } };
    const characters = { dead: player(0), alive: player(60) };
    const action = planEnemyTurn(enemy(), ['dead', 'alive'], [], [enemy()], characters, positions);
    expect(action.target).toBe('alive');
  });

  it('does nothing when no living player is left', () => {
    const positions = { e1: { row: 1, col: 1 }, dead: { row: 1, col: 2 } };
    const action = planEnemyTurn(enemy(), ['dead'], [], [enemy()], { dead: player(0) }, positions);
    expect(action.target).toBeFalsy();
    expect(action.movement).toBeFalsy();
  });

  // Regression: aggressive ranged enemies walked into melee range instead of shooting.
  it('lets an aggressive ranged enemy shoot from where it stands', () => {
    const ranged = enemy({ weapon: { name: 'Rifle', damage: 6, range: 3 } });
    const positions = { e1: { row: 1, col: 1 }, p1: { row: 3, col: 1 } };
    const action = planEnemyTurn(ranged, ['p1'], [], [ranged], { p1: player() }, positions);
    expect(action.movement).toBeNull();
    expect(action.target).toBe('p1');
  });

  it('moves toward players who are out of reach', () => {
    const positions = { e1: { row: 0, col: 0 }, p1: { row: 6, col: 9 } };
    const action = planEnemyTurn(enemy(), ['p1'], [], [enemy()], { p1: player() }, positions);
    expect(action.movement).toBeTruthy();
  });

  it('stays put and skips its action while immobilized by chains', () => {
    const positions = { e1: { row: 1, col: 1 }, p1: { row: 1, col: 2 } };
    const effects = [{ type: 'status_effect', status: 'immobilized', target: 'e1', turnsRemaining: 1, preventMovement: true, preventActions: true }];
    const action = planEnemyTurn(enemy(), ['p1'], [], [enemy()], { p1: player() }, positions, effects);
    expect(action).toMatchObject({ immobilized: true, target: null, movement: null });
  });

  it('cannot use abilities under EMP', () => {
    const caster = enemy({ abilities: [{ id: 'humble', name: 'Humble', level: 1 }], cooldowns: { humble: 0 } });
    const positions = { e1: { row: 1, col: 1 }, p1: { row: 1, col: 2 } };
    const effects = [{ type: 'abilities_disabled', target: 'e1', turnsRemaining: 2 }];
    const action = planEnemyTurn(caster, ['p1'], [], [caster], { p1: player() }, positions, effects);
    expect(action.abilityToUse).toBeFalsy();
  });

  describe('enemy healers', () => {
    const healer = enemy({
      id: 'healer',
      role: 'Support',
      behavior: 'support',
      abilities: [{ id: 'the_show_must_go_on', name: 'The Show Must Go On', level: 1 }],
      cooldowns: { the_show_must_go_on: 0 }
    });
    const positions = { healer: { row: 0, col: 4 }, buddy: { row: 0, col: 5 }, p1: { row: 6, col: 4 } };

    it('does not waste a heal when everyone is healthy', () => {
      const buddy = enemy({ id: 'buddy' });
      const action = planEnemyTurn(healer, ['p1'], ['buddy'], [healer, buddy], { p1: player() }, positions);
      expect(action.abilityToUse).toBeFalsy();
    });

    it('heals a hurt ally in range', () => {
      const buddy = enemy({ id: 'buddy', stats: { ...enemy().stats, health: 10 } });
      const action = planEnemyTurn(healer, ['p1'], ['buddy'], [healer, buddy], { p1: player() }, positions);
      expect(action.abilityToUse?.id).toBe('the_show_must_go_on');
      expect(action.target).toBe('buddy');
    });
  });
});

describe('hazard zones', () => {
  const mist = (side) => ({ type: 'toxic_mist_field', center: { row: 3, col: 3 }, radius: 1, turnsRemaining: 2, side });

  it('makes cautious enemies avoid zones the party placed, but not their own side\'s', () => {
    const cautious = enemy({ behavior: 'defensive' });
    expect(isCellInDangerZone({ row: 3, col: 4 }, [mist('ally')], cautious)).toBe(true);
    expect(isCellInDangerZone({ row: 3, col: 4 }, [mist('enemy')], cautious)).toBe(false);
    expect(isCellInDangerZone({ row: 0, col: 0 }, [mist('ally')], cautious)).toBe(false);
  });

  it('lets aggressive enemies charge straight through', () => {
    expect(isCellInDangerZone({ row: 3, col: 3 }, [mist('ally')], enemy())).toBe(false);
  });
});
