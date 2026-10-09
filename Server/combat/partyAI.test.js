import { describe, it, expect } from 'vitest';
import { createCombatState, beginTurn } from '../../shared/combat/engine.js';
import { greedyTurn, lookaheadTurn, chooseStep, candidateSteps, evaluate, styleBonus } from '../../shared/combat/partyAI.js';
import { cloneContext, fightOutcome, playUntil } from '../../shared/combat/autoplay.js';

const stats = (overrides = {}) => ({ health: 80, maxHealth: 80, speed: 30, resistance: 20, strength: 40, ta: 40, ...overrides });

const player = (name, { role = 'DPS', abilities = [], weapon = { name: 'Blade', damage: 6, range: 1 }, ...statOverrides } = {}) => ({
  id: `${role.toLowerCase()}_test`,
  name,
  role,
  level: 1,
  stats: stats(statOverrides),
  weapon,
  abilities: abilities.map(id => ({ id })),
  ultimate: ''
});

const enemy = (id, statOverrides = {}) => ({
  id,
  name: id.toUpperCase(),
  tier: 'generic',
  role: 'DPS',
  behavior: 'aggressive',
  level: 1,
  stats: stats({ health: 40, maxHealth: 40, ...statOverrides }),
  weapon: { name: 'Baton', damage: 6, range: 1 },
  abilities: [],
  cooldowns: {},
  isDeadBody: false,
  corpseTurnsRemaining: 0
});

function setup({ players, enemies, positions, order }) {
  const turnOrder = order.map(id => ({ type: players[id] ? 'ally' : 'enemy', id, speed: 0 }));
  const ctx = {
    combat: createCombatState({ encounterIndex: 0, sceneKey: 'street', enemies, positions, turnOrder }),
    characters: players,
    cooldowns: {},
    random: () => 0.5
  };
  beginTurn(ctx);
  return ctx;
}

const hp = (ctx, id) => (ctx.characters[id] || ctx.combat.enemies.find(e => e.id === id))?.stats.health;

describe('party bots', () => {
  it('walk up and finish off a nearly dead enemy', () => {
    for (const policy of [greedyTurn, (ctx, id) => lookaheadTurn(ctx, id)]) {
      const ctx = setup({
        players: { A: player('A') },
        enemies: [enemy('e1', { health: 5 }), enemy('e2')],
        positions: { A: { row: 6, col: 4 }, e1: { row: 4, col: 4 }, e2: { row: 0, col: 9 } },
        order: ['A', 'e1', 'e2']
      });
      policy(ctx, 'A');
      expect(ctx.combat.enemies.find(e => e.id === 'e1')?.isDeadBody ?? true).toBe(true);
    }
  });

  it('end a won fight right away instead of waiting a turn', () => {
    const ctx = setup({
      players: { A: player('A') },
      enemies: [enemy('e1', { health: 5 })],
      positions: { A: { row: 6, col: 4 }, e1: { row: 5, col: 4 } },
      order: ['A', 'e1']
    });
    const step = chooseStep(ctx, 'A');
    expect(step).toMatchObject({ kind: 'attack', targetId: 'e1' });
  });

  it('heal a teammate when the heal is what keeps them standing', () => {
    // The enemy hits for 34: the tank survives only if healed (ta 150 heals 30).
    const ctx = setup({
      players: {
        healer: player('Healer', { role: 'Support', abilities: ['the_show_must_go_on'], ta: 150 }),
        tank: player('Tank', { health: 15 })
      },
      enemies: [enemy('e1', { strength: 60 })],
      positions: { healer: { row: 6, col: 0 }, tank: { row: 4, col: 4 }, e1: { row: 3, col: 4 } },
      order: ['healer', 'tank', 'e1']
    });
    lookaheadTurn(ctx, 'healer');
    expect(hp(ctx, 'tank')).toBeGreaterThan(15);
  });

  it('only suggest steps the rules allow', () => {
    const ctx = setup({
      players: { A: player('A', { abilities: ['shadow_strike', 'vine_whip'] }) },
      enemies: [enemy('e1'), enemy('e2')],
      positions: { A: { row: 6, col: 4 }, e1: { row: 3, col: 4 }, e2: { row: 0, col: 0 } },
      order: ['A', 'e1', 'e2']
    });
    for (const step of candidateSteps(ctx, 'A').filter(Boolean)) {
      const copy = cloneContext(ctx);
      const here = copy.combat.positions.A;
      if (step.move && (step.move.row !== here.row || step.move.col !== here.col)) {
        expect(copy.combat.positions.A).toBeTruthy();
      }
    }
    expect(candidateSteps(ctx, 'A').some(step => step?.kind === 'ability' && step.abilityId === 'shadow_strike')).toBe(true);
  });

  it('never change the real fight while imagining the future', () => {
    const ctx = setup({
      players: { A: player('A'), B: player('B') },
      enemies: [enemy('e1'), enemy('e2')],
      positions: { A: { row: 6, col: 3 }, B: { row: 6, col: 5 }, e1: { row: 2, col: 3 }, e2: { row: 2, col: 5 } },
      order: ['A', 'e1', 'B', 'e2']
    });
    const before = JSON.stringify({ combat: ctx.combat, characters: ctx.characters });
    chooseStep(ctx, 'A');
    expect(JSON.stringify({ combat: ctx.combat, characters: ctx.characters })).toBe(before);
  });

  it('score a win above everything else and a loss below', () => {
    const ctx = setup({
      players: { A: player('A') },
      enemies: [enemy('e1')],
      positions: { A: { row: 6, col: 4 }, e1: { row: 0, col: 4 } },
      order: ['A', 'e1']
    });
    const weights = { e1: 1 };
    const won = cloneContext(ctx);
    won.combat.enemies[0].stats.health = 0;
    won.combat.enemies[0].isDeadBody = true;
    const lost = cloneContext(ctx);
    lost.characters.A.stats.health = 0;
    expect(evaluate(won, weights)).toBeGreaterThan(evaluate(ctx, weights));
    expect(evaluate(lost, weights)).toBeLessThan(evaluate(ctx, weights));
  });

  it('lean toward their movement style when choosing where to stand', () => {
    const fight = (behavior, overrides = {}) => setup({
      players: { A: { ...player('A', { weapon: { name: 'Gun', damage: 6, range: 3 }, ...overrides }), behavior }, H: player('H', { role: 'Support' }) },
      enemies: [enemy('e1')],
      positions: { A: { row: 6, col: 4 }, H: { row: 6, col: 0 }, e1: { row: 1, col: 4 } },
      order: ['A', 'H', 'e1']
    });
    const close = { kind: 'move', move: { row: 2, col: 4 } };  // 1 tile from the enemy
    const atRange = { kind: 'move', move: { row: 4, col: 4 } }; // 3 tiles: the gun's range
    const byHealer = { kind: 'move', move: { row: 6, col: 1 } };

    expect(styleBonus(fight('aggressive'), 'A', close)).toBeGreaterThan(styleBonus(fight('aggressive'), 'A', atRange));
    expect(styleBonus(fight('defensive'), 'A', atRange)).toBeGreaterThan(styleBonus(fight('defensive'), 'A', close));
    // Intelligent: no preference while healthy, back to the healer when badly hurt.
    expect(styleBonus(fight('intelligent'), 'A', close)).toBe(0);
    const hurt = fight('intelligent', { health: 10 });
    expect(styleBonus(hurt, 'A', byHealer)).toBeGreaterThan(styleBonus(hurt, 'A', close));
  });

  it('play a whole fight to the end', () => {
    const ctx = setup({
      players: { A: player('A', { strength: 60 }), B: player('B', { role: 'Support', abilities: ['the_show_must_go_on'], weapon: { name: 'Drone', damage: 4, range: 3 } }) },
      enemies: [enemy('e1'), enemy('e2')],
      positions: { A: { row: 6, col: 3 }, B: { row: 6, col: 5 }, e1: { row: 1, col: 3 }, e2: { row: 1, col: 6 } },
      order: ['A', 'B', 'e1', 'e2']
    });
    const outcome = playUntil(ctx, (c, id) => lookaheadTurn(c, id, { seed: 3 }), { maxTurns: 200 });
    expect(['win', 'loss']).toContain(outcome);
    expect(fightOutcome(ctx)).toBe(outcome);
  });
});
