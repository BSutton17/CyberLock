import { describe, it, expect } from 'vitest';
import {
  createCombatState,
  beginTurn,
  finishTurn,
  movePlayer,
  attack,
  useAbility,
  canEndTurn,
  planEnemy,
  runEnemyAbilityAndMove,
  runEnemyAttack,
  movementLeft,
  combatSnapshot,
  abilityIdsOf,
  effective,
  ABILITIES
} from '../../shared/combat/engine.js';
import { advanceTurn } from '../../shared/combat/turnOrder.js';

const stats = (overrides = {}) => ({ health: 60, maxHealth: 80, speed: 30, resistance: 20, strength: 40, ta: 40, ...overrides });

const player = (name, { role = 'DPS', abilities = [], ultimate = '', level = 1, ...statOverrides } = {}) => ({
  id: `${role.toLowerCase()}_test`,
  name,
  role,
  level,
  stats: stats(statOverrides),
  weapon: { name: 'Blade', damage: 6, range: 1 },
  abilities,
  ultimate
});

const enemy = (id, { behavior = 'aggressive', role = 'DPS', abilities = [], ...statOverrides } = {}) => ({
  id,
  name: id.toUpperCase(),
  tier: 'generic',
  role,
  behavior,
  level: 1,
  stats: stats({ health: 100, maxHealth: 100, ...statOverrides }),
  weapon: { name: 'Baton', damage: 6, range: 1 },
  abilities,
  cooldowns: Object.fromEntries(abilities.map(ability => [ability.id, 0])),
  isDeadBody: false,
  corpseTurnsRemaining: 0
});

// Builds a fight. `order` lists unit ids in turn order; the first one's turn is started.
function setup({ players = {}, enemies = [], positions = {}, order, random = () => 0 } = {}) {
  const turnOrder = (order || [...Object.keys(players), ...enemies.map(e => e.id)]).map(id => ({
    type: players[id] ? 'ally' : 'enemy',
    id,
    speed: 0
  }));
  const combat = createCombatState({ encounterIndex: 0, sceneKey: 'street', enemies, positions, turnOrder });
  const ctx = { combat, characters: players, cooldowns: {}, random };
  beginTurn(ctx);
  return ctx;
}

// Ends the current turn and starts the next one, like the server does.
function nextTurn(ctx) {
  const finished = { ...ctx.combat.turn };
  const result = finishTurn(ctx);
  advanceTurn(ctx.combat, finished);
  beginTurn(ctx);
  return result;
}

const hp = (ctx, id) => (ctx.characters[id] || ctx.combat.enemies.find(e => e.id === id)).stats.health;

// ---------------------------------------------------------------------------
// Zones (the reason for this rewrite)
// ---------------------------------------------------------------------------

describe('Feels Like Home', () => {
  const healerFight = () => setup({
    players: {
      healer: player('Patchwork', { role: 'Support', abilities: ['feels_like_home'], ta: 40, health: 40 }),
      stayer: player('Stayer', { health: 40 }),
      leaver: player('Leaver', { health: 40 }),
      latecomer: player('Latecomer', { health: 40 })
    },
    enemies: [enemy('e1')],
    positions: {
      healer: { row: 5, col: 3 },
      stayer: { row: 5, col: 4 },
      leaver: { row: 5, col: 5 },
      latecomer: { row: 6, col: 7 },
      e1: { row: 0, col: 0 }
    },
    order: ['healer', 'leaver', 'latecomer', 'stayer', 'e1']
  });

  it('heals whoever stands in the field when it ticks, not whoever was there when it was cast', () => {
    const ctx = healerFight();
    expect(useAbility(ctx, 'healer', { abilityId: 'feels_like_home', targetPosition: { row: 5, col: 4 } }).ok).toBe(true);

    // First tick: end of the healer's turn. Everyone in the 3x3 heals 5 (ta 40 / 8).
    nextTurn(ctx);
    expect(hp(ctx, 'healer')).toBe(45);
    expect(hp(ctx, 'stayer')).toBe(45);
    expect(hp(ctx, 'leaver')).toBe(45);
    expect(hp(ctx, 'latecomer')).toBe(40);

    // The leaver walks out, the latecomer walks in.
    expect(movePlayer(ctx, 'leaver', { row: 4, col: 7 }).ok).toBe(true);
    nextTurn(ctx);
    expect(movePlayer(ctx, 'latecomer', { row: 6, col: 5 }).ok).toBe(true);
    nextTurn(ctx); // latecomer
    nextTurn(ctx); // stayer
    nextTurn(ctx); // enemy (too far away to reach anyone)

    // Second tick: end of the healer's next turn.
    nextTurn(ctx);
    expect(hp(ctx, 'stayer')).toBe(50);
    expect(hp(ctx, 'leaver')).toBe(45);
    expect(hp(ctx, 'latecomer')).toBe(45);
  });

  it('lasts two ticks and then disappears', () => {
    const ctx = healerFight();
    useAbility(ctx, 'healer', { abilityId: 'feels_like_home', targetPosition: { row: 5, col: 4 } });
    const fields = () => ctx.combat.activeEffects.filter(effect => effect.type === 'healing_field');

    nextTurn(ctx);
    expect(fields()).toHaveLength(1);
    for (let i = 0; i < 4; i++) nextTurn(ctx);
    expect(ctx.combat.turn.id).toBe('healer');
    nextTurn(ctx);
    expect(fields()).toHaveLength(0);
  });

  it('only heals its own side', () => {
    const ctx = setup({
      players: { healer: player('Patchwork', { role: 'Support', abilities: ['feels_like_home'], health: 40 }) },
      enemies: [enemy('e1', { health: 50 })],
      positions: { healer: { row: 5, col: 3 }, e1: { row: 5, col: 4 } }
    });
    useAbility(ctx, 'healer', { abilityId: 'feels_like_home', targetPosition: { row: 5, col: 4 } });
    nextTurn(ctx);
    expect(hp(ctx, 'healer')).toBe(45);
    expect(hp(ctx, 'e1')).toBe(50);
  });

  it('heals enemies, not players, when an enemy support places it', () => {
    const ctx = setup({
      players: { p1: player('P1', { health: 40 }) },
      enemies: [
        enemy('medic', { role: 'Support', behavior: 'support', abilities: [{ id: 'feels_like_home', name: 'Feels Like Home', level: 1 }], health: 50 }),
        enemy('grunt', { health: 50 })
      ],
      positions: { medic: { row: 1, col: 4 }, grunt: { row: 1, col: 5 }, p1: { row: 2, col: 4 } },
      order: ['medic', 'grunt', 'p1']
    });
    const plan = planEnemy(ctx, 'medic');
    expect(plan.abilityToUse?.id).toBe('feels_like_home');
    runEnemyAbilityAndMove(ctx, 'medic', plan);
    nextTurn(ctx);
    expect(hp(ctx, 'medic')).toBeGreaterThan(50);
    expect(hp(ctx, 'p1')).toBe(40);
  });
});

describe('Toxic Mist', () => {
  it('hurts enemies standing in it when it ticks, so walking out avoids it', () => {
    const ctx = setup({
      players: { tank: player('Tank', { role: 'Tank', abilities: ['toxic_mist'], level: 3, ta: 30, strength: 10 }) },
      enemies: [enemy('inside', { resistance: 0 }), enemy('outside', { resistance: 0 })],
      positions: { tank: { row: 5, col: 4 }, inside: { row: 3, col: 4 }, outside: { row: 0, col: 9 } },
      order: ['tank', 'inside', 'outside']
    });
    expect(useAbility(ctx, 'tank', { abilityId: 'toxic_mist', targetPosition: { row: 3, col: 4 } }).ok).toBe(true);
    nextTurn(ctx);
    expect(hp(ctx, 'inside')).toBe(70);
    expect(hp(ctx, 'outside')).toBe(100);
  });

  it('uses Strength when the tank has more of it than TA', () => {
    const ctx = setup({
      players: { tank: player('Tank', { role: 'Tank', abilities: ['toxic_mist'], level: 3, ta: 10, strength: 45 }) },
      enemies: [enemy('inside', { resistance: 0 })],
      positions: { tank: { row: 5, col: 4 }, inside: { row: 3, col: 4 } },
      order: ['tank', 'inside']
    });
    useAbility(ctx, 'tank', { abilityId: 'toxic_mist', targetPosition: { row: 3, col: 4 } });
    nextTurn(ctx);
    expect(hp(ctx, 'inside')).toBe(55);
  });

  it('never hurts the party that placed it', () => {
    const ctx = setup({
      players: { tank: player('Tank', { role: 'Tank', abilities: ['toxic_mist'], level: 3 }), buddy: player('Buddy') },
      enemies: [enemy('e1')],
      positions: { tank: { row: 5, col: 4 }, buddy: { row: 4, col: 4 }, e1: { row: 0, col: 0 } }
    });
    useAbility(ctx, 'tank', { abilityId: 'toxic_mist', targetPosition: { row: 4, col: 4 } });
    nextTurn(ctx);
    expect(hp(ctx, 'buddy')).toBe(60);
    expect(hp(ctx, 'tank')).toBe(60);
  });
});

describe('Blizzard', () => {
  it('slows enemies only while they stand in it', () => {
    const ctx = setup({
      players: { mage: player('Mage', { abilities: ['blizzard'], level: 3 }) },
      enemies: [enemy('e1', { speed: 40 })],
      positions: { mage: { row: 6, col: 4 }, e1: { row: 3, col: 4 } }
    });
    useAbility(ctx, 'mage', { abilityId: 'blizzard', targetPosition: { row: 3, col: 4 } });
    expect(effective(ctx, 'e1').stats.speed).toBe(20);

    ctx.combat.positions.e1 = { row: 0, col: 0 };
    expect(effective(ctx, 'e1').stats.speed).toBe(40);
  });

  it('counts slowdown from where the turn started, so stepping out does not refund movement', () => {
    const ctx = setup({
      players: { p1: player('P1', { speed: 40 }) },
      enemies: [enemy('e1')],
      positions: { p1: { row: 3, col: 4 }, e1: { row: 0, col: 0 } }
    });
    ctx.combat.activeEffects.push({ type: 'blizzard_field', center: { row: 3, col: 4 }, radius: 1, turnsRemaining: 2, side: 'enemy', ownerTurnId: 'e1' });
    beginTurn(ctx);
    expect(movementLeft(ctx, 'p1')).toBe(2);
    expect(movePlayer(ctx, 'p1', { row: 3, col: 6 }).ok).toBe(true);
    expect(movementLeft(ctx, 'p1')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Player turns
// ---------------------------------------------------------------------------

describe('player actions', () => {
  const duel = (overrides = {}) => setup({
    players: { p1: player('P1', { abilities: ['shadow_strike', 'flash_step'], level: 1, ...overrides }) },
    enemies: [enemy('e1')],
    positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } }
  });

  it('only lets the player whose turn it is act', () => {
    const ctx = setup({
      players: { p1: player('P1'), p2: player('P2') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, p2: { row: 4, col: 5 }, e1: { row: 3, col: 4 } }
    });
    expect(attack(ctx, 'p2', 'e1')).toMatchObject({ ok: false, error: 'not_your_turn' });
    expect(canEndTurn(ctx, 'p2').ok).toBe(false);
    expect(canEndTurn(ctx, 'p1').ok).toBe(true);
  });

  it('allows one weapon attack per turn, in range', () => {
    const ctx = duel();
    expect(attack(ctx, 'p1', 'e1').ok).toBe(true);
    expect(hp(ctx, 'e1')).toBe(78); // 40/10 * 6 - 20/10 = 22
    expect(attack(ctx, 'p1', 'e1')).toMatchObject({ ok: false, error: 'no_action' });
  });

  it('refuses out-of-range attacks and abilities', () => {
    const ctx = duel();
    ctx.combat.positions.e1 = { row: 0, col: 4 };
    expect(attack(ctx, 'p1', 'e1').error).toBe('out_of_range');
    expect(useAbility(ctx, 'p1', { abilityId: 'shadow_strike', targetId: 'e1' }).error).toBe('out_of_range');
  });

  it('gives one action and one bonus action', () => {
    const ctx = setup({
      players: { p1: player('P1', { role: 'Support', abilities: ['the_show_must_go_on', 'zen'], level: 3 }), p2: player('P2', { health: 10 }) },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, p2: { row: 5, col: 4 }, e1: { row: 3, col: 4 } }
    });
    expect(useAbility(ctx, 'p1', { abilityId: 'the_show_must_go_on', targetId: 'p2' }).ok).toBe(true); // bonus action
    expect(useAbility(ctx, 'p1', { abilityId: 'zen' }).ok).toBe(true); // action
    expect(attack(ctx, 'p1', 'e1').error).toBe('no_action');
  });

  it('only allows abilities the character has, off cooldown', () => {
    const ctx = duel();
    expect(useAbility(ctx, 'p1', { abilityId: 'black_hole', targetPosition: { row: 3, col: 4 } }).error).toBe('not_owned');
    ctx.cooldowns.p1 = { shadow_strike: 2 };
    expect(useAbility(ctx, 'p1', { abilityId: 'shadow_strike', targetId: 'e1' }).error).toBe('cooldown');
  });

  it('puts the ability on cooldown and counts it down at the end of each of your turns', () => {
    const ctx = duel();
    useAbility(ctx, 'p1', { abilityId: 'shadow_strike', targetId: 'e1' });
    expect(ctx.cooldowns.p1.shadow_strike).toBe(ABILITIES.shadow_strike.cooldown + 1);
    nextTurn(ctx);
    expect(ctx.cooldowns.p1.shadow_strike).toBe(ABILITIES.shadow_strike.cooldown);
  });

  it('unlocks the ultimate at level 3', () => {
    expect(abilityIdsOf({ abilities: ['a'], ultimate: 'no_limits', level: 2 })).toEqual(['a']);
    expect(abilityIdsOf({ abilities: [{ id: 'a' }], ultimate: { id: 'no_limits' }, level: 3 })).toEqual(['a', 'no_limits']);
  });

  it('No Limits gives three weapon attacks', () => {
    const ctx = setup({
      players: { p1: player('P1', { ultimate: 'no_limits', level: 3 }) },
      enemies: [enemy('e1', { health: 500, maxHealth: 500 })],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } }
    });
    expect(useAbility(ctx, 'p1', { abilityId: 'no_limits' }).ok).toBe(true);
    expect(attack(ctx, 'p1', 'e1').ok).toBe(true);
    expect(attack(ctx, 'p1', 'e1').ok).toBe(true);
    expect(attack(ctx, 'p1', 'e1').ok).toBe(true);
    expect(attack(ctx, 'p1', 'e1').error).toBe('no_action');
  });

  it('Flash Step adds movement on the same turn', () => {
    const ctx = duel();
    expect(movementLeft(ctx, 'p1')).toBe(3);
    useAbility(ctx, 'p1', { abilityId: 'flash_step' });
    expect(movementLeft(ctx, 'p1')).toBe(6);
  });
});

describe('ultimates do what they say', () => {
  const ultimateFight = (ultimate, { enemies = [enemy('e1')], positions = {} } = {}) => setup({
    players: { p1: player('P1', { ultimate, level: 3 }), p2: player('P2') },
    enemies,
    positions: { p1: { row: 5, col: 4 }, p2: { row: 5, col: 5 }, e1: { row: 3, col: 4 }, ...positions },
    order: ['p1', 'p2', ...enemies.map(e => e.id)]
  });

  it('all wait longer between uses than any regular ability', () => {
    const ultimates = Object.values(ABILITIES).filter(ability => ability.isUltimate);
    const longestRegular = Math.max(...Object.values(ABILITIES).filter(ability => !ability.isUltimate).map(ability => ability.cooldown));
    expect(ultimates).toHaveLength(9);
    for (const ability of ultimates) expect(ability.cooldown, ability.id).toBeGreaterThan(longestRegular);
  });

  it('Black Hole pulls enemies together and pins them for two turns', () => {
    const ctx = ultimateFight('black_hole', {
      enemies: [enemy('e1'), enemy('e2')],
      positions: { e1: { row: 1, col: 2 }, e2: { row: 2, col: 6 } }
    });
    expect(useAbility(ctx, 'p1', { abilityId: 'black_hole', targetPosition: { row: 2, col: 4 } }).ok).toBe(true);
    for (const id of ['e1', 'e2']) {
      const pos = ctx.combat.positions[id];
      expect(Math.abs(pos.row - 2) + Math.abs(pos.col - 4)).toBeLessThanOrEqual(2);
      expect(ctx.combat.activeEffects.some(e => e.target === id && e.status === 'immobilized' && e.duration === 2)).toBe(true);
    }
  });

  it('Dead Calm hits much harder this turn but roots you', () => {
    const adjacent = { positions: { e1: { row: 4, col: 4 } } };
    const plain = ultimateFight('dead_calm', adjacent);
    expect(attack(plain, 'p1', 'e1').ok).toBe(true);
    const plainDamage = 100 - hp(plain, 'e1');

    const ctx = ultimateFight('dead_calm', adjacent);
    expect(useAbility(ctx, 'p1', { abilityId: 'dead_calm' }).ok).toBe(true);
    expect(movementLeft(ctx, 'p1')).toBe(0);
    expect(attack(ctx, 'p1', 'e1').ok).toBe(true);
    expect(100 - hp(ctx, 'e1')).toBeGreaterThan(plainDamage * 2);
  });

  it("Executioner's Judgment halves weaker enemies and takes 20% from tougher ones", () => {
    const ctx = ultimateFight('executioners_judgment', {
      enemies: [enemy('big'), enemy('small', { health: 50, maxHealth: 50 })],
      positions: { big: { row: 3, col: 4 }, small: { row: 3, col: 6 } }
    });
    useAbility(ctx, 'p1', { abilityId: 'executioners_judgment' });
    expect(hp(ctx, 'big')).toBe(80);   // max 100 > the caster's 80
    expect(hp(ctx, 'small')).toBe(25); // max 50 <= 80
  });

  it('White Phospherus burns every enemy at the end of the turn it is used', () => {
    const ctx = ultimateFight('white_phospherus');
    useAbility(ctx, 'p1', { abilityId: 'white_phospherus' });
    nextTurn(ctx);
    expect(hp(ctx, 'e1')).toBe(80);
  });

  it('Murus Fictilis shields and armors the whole party', () => {
    const ctx = ultimateFight('murus_fictilis');
    useAbility(ctx, 'p1', { abilityId: 'murus_fictilis' });
    nextTurn(ctx);
    expect(effective(ctx, 'p2').stats.resistance).toBe(50);
    expect(ctx.combat.activeEffects.some(e => e.target === 'p2' && e.stat === 'health' && e.value === 35)).toBe(true);
  });

  it('Dedicating Everything to You powers up one ally for two turns', () => {
    const ctx = ultimateFight('dedicating');
    useAbility(ctx, 'p1', { abilityId: 'dedicating', targetId: 'p2' });
    nextTurn(ctx);
    expect(effective(ctx, 'p2').stats.strength).toBe(65);
  });

  it('EMP shocks every enemy', () => {
    const ctx = ultimateFight('emp');
    useAbility(ctx, 'p1', { abilityId: 'emp' });
    expect(hp(ctx, 'e1')).toBe(78); // 40/10*6 - 20/10
  });

  it('Love Galore heals the party for half their max health', () => {
    const ctx = ultimateFight('love_galore');
    ctx.characters.p2.stats.health = 20;
    useAbility(ctx, 'p1', { abilityId: 'love_galore' });
    expect(hp(ctx, 'p2')).toBe(60);
  });
});

describe('moving through teammates', () => {
  // P1 at (6,4) is boxed in by teammates on both sides and above; the enemy is far away.
  const boxedIn = () => setup({
    players: { p1: player('P1', { speed: 30 }), a: player('A'), b: player('B'), c: player('C') },
    enemies: [enemy('e1')],
    positions: { p1: { row: 6, col: 4 }, a: { row: 6, col: 3 }, b: { row: 6, col: 5 }, c: { row: 5, col: 4 }, e1: { row: 0, col: 9 } },
    order: ['p1', 'a', 'b', 'c', 'e1']
  });

  it('walks through a teammate to the tile beyond', () => {
    const ctx = boxedIn();
    const result = movePlayer(ctx, 'p1', { row: 4, col: 4 });
    expect(result.ok).toBe(true);
    expect(result.events[0].path).toEqual([{ row: 5, col: 4 }, { row: 4, col: 4 }]);
  });

  it('never stops on a teammate', () => {
    expect(movePlayer(boxedIn(), 'p1', { row: 5, col: 4 }).error).toBe('blocked');
  });

  it('still cannot walk through enemies', () => {
    const ctx = setup({
      players: { p1: player('P1', { speed: 30 }) },
      enemies: [enemy('wall', {})],
      positions: { p1: { row: 6, col: 0 }, wall: { row: 5, col: 0 } },
      order: ['p1', 'wall']
    });
    // Straight up is blocked by the enemy; going around takes 4 steps, more than the 3 allowed.
    expect(movePlayer(ctx, 'p1', { row: 4, col: 0 }).error).toBe('too_far');
  });
});

describe('movement', () => {
  const walker = () => setup({
    players: { p1: player('P1', { speed: 30 }), p2: player('P2') },
    enemies: [enemy('e1')],
    positions: { p1: { row: 6, col: 0 }, p2: { row: 5, col: 0 }, e1: { row: 0, col: 9 } }
  });

  it('walks around units and spends movement by path length', () => {
    const ctx = walker();
    const result = movePlayer(ctx, 'p1', { row: 6, col: 2 });
    expect(result.ok).toBe(true);
    expect(result.events[0]).toMatchObject({ type: 'move', unitId: 'p1' });
    expect(movementLeft(ctx, 'p1')).toBe(1);
    expect(movePlayer(ctx, 'p1', { row: 6, col: 5 }).error).toBe('too_far');
  });

  it('cannot end on a unit or pass through a barrier', () => {
    const ctx = walker();
    expect(movePlayer(ctx, 'p1', { row: 5, col: 0 }).error).toBe('blocked');
    ctx.combat.activeEffects.push({ type: 'blue_barrier', cell: { row: 6, col: 1 }, turnsRemaining: 2 });
    // The only way round the barrier is through P2 and back down: 4 steps, one more than allowed.
    expect(movePlayer(ctx, 'p1', { row: 6, col: 2 }).error).toBe('too_far');
  });

  it('is stopped by chains', () => {
    const ctx = walker();
    ctx.combat.activeEffects.push({ type: 'status_effect', status: 'immobilized', target: 'p1', turnsRemaining: 1, preventMovement: true, preventActions: true });
    expect(movePlayer(ctx, 'p1', { row: 6, col: 1 }).error).toBe('immobilized');
    expect(attack(ctx, 'p1', 'e1').error).toBe('locked');
  });
});

// ---------------------------------------------------------------------------
// Damage rules
// ---------------------------------------------------------------------------

describe('damage', () => {
  it('Counter turns an enemy attack back on the attacker', () => {
    const ctx = setup({
      players: { p1: player('P1', { abilities: ['counter'], level: 5 }) },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } },
      order: ['p1', 'e1']
    });
    useAbility(ctx, 'p1', { abilityId: 'counter' });
    nextTurn(ctx); // reflection switches on as p1's turn ends

    const plan = planEnemy(ctx, 'e1');
    runEnemyAbilityAndMove(ctx, 'e1', plan);
    runEnemyAttack(ctx, 'e1', plan);
    expect(hp(ctx, 'p1')).toBe(60);
    expect(hp(ctx, 'e1')).toBeLessThan(100);
  });

  it('hitting an enemy that has Counter up hurts you instead', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } }
    });
    ctx.combat.activeEffects.push({ type: 'damage_reflection', target: 'e1', turnsRemaining: 1, ownerTurnId: 'e1' });
    attack(ctx, 'p1', 'e1');
    expect(hp(ctx, 'e1')).toBe(100);
    expect(hp(ctx, 'p1')).toBe(38);
  });

  it('bonus health soaks hits first', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } },
      order: ['e1', 'p1']
    });
    ctx.combat.activeEffects.push({ type: 'stat_buff', stat: 'health', target: 'p1', value: 15, turnsRemaining: 2, ownerTurnId: 'p1' });
    const plan = planEnemy(ctx, 'e1');
    runEnemyAttack(ctx, 'e1', plan);
    expect(hp(ctx, 'p1')).toBe(53); // 22 damage, 15 absorbed
    expect(ctx.combat.activeEffects.some(effect => effect.stat === 'health')).toBe(false);
  });

  it('curses amplify everything, including damage over time', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 0, col: 0 } }
    });
    ctx.combat.activeEffects.push(
      { type: 'damage_taken_multiplier', target: 'e1', value: 1.5, turnsRemaining: 2, ownerTurnId: 'p1' },
      { type: 'damage_over_time', target: 'e1', amount: 10, turnsRemaining: 2, ownerTurnId: 'p1' }
    );
    nextTurn(ctx);
    expect(hp(ctx, 'e1')).toBe(85);
  });
});

describe('effects over time', () => {
  const fight = () => setup({
    players: { p1: player('P1', { health: 40 }), p2: player('P2') },
    enemies: [enemy('e1', { health: 50 }), enemy('e2', { health: 50 })],
    positions: { p1: { row: 6, col: 0 }, p2: { row: 6, col: 1 }, e1: { row: 0, col: 0 }, e2: { row: 0, col: 1 } }
  });

  it('only tick when their owner\'s turn ends', () => {
    const ctx = fight();
    ctx.combat.activeEffects.push(
      { type: 'damage_over_time', target: 'e1', amount: 5, turnsRemaining: 2, ownerTurnId: 'p1' },
      { type: 'damage_over_time', target: 'e2', amount: 5, turnsRemaining: 2, ownerTurnId: 'p2' }
    );
    nextTurn(ctx); // p1 ends
    expect(hp(ctx, 'e1')).toBe(45);
    expect(hp(ctx, 'e2')).toBe(50);
  });

  it('wait one owner turn before starting unless they start immediately', () => {
    const ctx = fight();
    ctx.combat.activeEffects.push({ type: 'healing_over_time', target: 'p1', amount: 5, turnsRemaining: 2, ownerTurnId: 'p1', appliedThisTurn: true });
    nextTurn(ctx); // p1 ends: the effect arms
    expect(hp(ctx, 'p1')).toBe(40);
    for (let i = 0; i < 3; i++) nextTurn(ctx);
    nextTurn(ctx); // p1 ends again: heals
    expect(hp(ctx, 'p1')).toBe(45);
  });

  it('burn hits current health, poison max health, and Poison Apple blocks healing', () => {
    const ctx = fight();
    ctx.combat.activeEffects.push(
      { type: 'burn', target: 'e1', damagePercent: 0.1, turnsRemaining: 1, ownerTurnId: 'p1' },
      { type: 'poison', target: 'e2', damagePercent: 0.05, turnsRemaining: 1, ownerTurnId: 'p1' },
      { type: 'healing_prevented', target: 'e2', turnsRemaining: 2, ownerTurnId: 'p1' },
      { type: 'healing_over_time', target: 'e2', amount: 20, turnsRemaining: 1, ownerTurnId: 'p1' }
    );
    nextTurn(ctx);
    expect(hp(ctx, 'e1')).toBe(45);
    expect(hp(ctx, 'e2')).toBe(45);
  });

  it('stop when their target is down', () => {
    const ctx = fight();
    ctx.combat.enemies[0].stats.health = 3;
    ctx.combat.activeEffects.push({ type: 'damage_over_time', target: 'e1', amount: 5, turnsRemaining: 3, ownerTurnId: 'p1' });
    nextTurn(ctx);
    expect(ctx.combat.activeEffects.filter(effect => effect.type === 'damage_over_time')).toHaveLength(0);
  });

  it('enemy debuffs wear off cleanly', () => {
    const ctx = fight();
    useAbility(ctx, 'p1', { abilityId: 'defensive_jab', targetId: 'e1' }); // not owned: no effect
    ctx.combat.activeEffects.push({ type: 'stat_debuff', stat: 'resistance', target: 'e1', value: -10, turnsRemaining: 1, appliedThisTurn: true, ownerTurnId: 'p1' });
    expect(effective(ctx, 'e1').stats.resistance).toBe(20);
    nextTurn(ctx);
    expect(effective(ctx, 'e1').stats.resistance).toBe(10);
    for (let i = 0; i < 3; i++) nextTurn(ctx);
    nextTurn(ctx);
    expect(effective(ctx, 'e1').stats.resistance).toBe(20);
    expect(ctx.combat.enemies[0].stats.resistance).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Deaths
// ---------------------------------------------------------------------------

describe('casualties', () => {
  it('a fallen enemy leaves the turn order and its corpse clears after the turn', () => {
    const ctx = setup({
      players: { p1: player('P1', { strength: 200 }) },
      enemies: [enemy('e1', { health: 10 }), enemy('e2')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 }, e2: { row: 0, col: 0 } }
    });
    const result = attack(ctx, 'p1', 'e1');
    expect(result.events).toContainEqual({ type: 'death', unitId: 'e1' });
    expect(ctx.combat.enemies[0].isDeadBody).toBe(true);
    expect(ctx.combat.turnOrder.map(turn => turn.id)).toEqual(['p1', 'e2']);
    expect(ctx.combat.positions.e1).toBeTruthy();

    nextTurn(ctx);
    ctx.combat.enemies = ctx.combat.enemies.filter(e => !e.isDeadBody); // what tickEnemyCorpses does
    beginTurn(ctx);
    expect(ctx.combat.positions.e1).toBeUndefined();
  });

  it('a fallen player leaves the turn order and loses the effects they were keeping up', () => {
    const ctx = setup({
      players: { p1: player('P1', { health: 5 }), p2: player('P2') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 1, col: 4 }, p2: { row: 6, col: 9 }, e1: { row: 0, col: 4 } },
      order: ['e1', 'p1', 'p2']
    });
    ctx.combat.activeEffects.push({ type: 'stat_buff', stat: 'speed', target: 'p2', value: 10, turnsRemaining: 2, ownerTurnId: 'p1' });
    const plan = planEnemy(ctx, 'e1');
    runEnemyAbilityAndMove(ctx, 'e1', plan);
    const { events } = runEnemyAttack(ctx, 'e1', plan);
    expect(events).toContainEqual({ type: 'death', unitId: 'p1' });
    expect(ctx.combat.turnOrder.map(turn => turn.id)).toEqual(['e1', 'p2']);
    expect(ctx.combat.activeEffects).toHaveLength(0);
  });

  it('dying during your own turn is reported so the turn can move on', () => {
    const ctx = setup({
      players: { p1: player('P1', { health: 5 }) },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 3, col: 4 } }
    });
    ctx.combat.activeEffects.push({ type: 'damage_reflection', target: 'e1', turnsRemaining: 1, ownerTurnId: 'e1' });
    attack(ctx, 'p1', 'e1');
    expect(ctx.combat.turn.actorDied).toBe(true);
    expect(attack(ctx, 'p1', 'e1').error).toBe('down');
  });
});

// ---------------------------------------------------------------------------
// Enemy turns
// ---------------------------------------------------------------------------

describe('enemy turns', () => {
  it('walk toward the party and attack when they arrive', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 1, col: 4 } },
      order: ['e1', 'p1']
    });
    const plan = planEnemy(ctx, 'e1');
    const moved = runEnemyAbilityAndMove(ctx, 'e1', plan);
    expect(moved.moveSteps).toBe(2);
    expect(ctx.combat.positions.e1).toEqual({ row: 3, col: 4 });
    runEnemyAttack(ctx, 'e1', plan);
    expect(hp(ctx, 'p1')).toBe(38);
  });

  it('only attack players they are allowed to target (e.g. connected ones)', () => {
    const ctx = setup({
      players: { away: player('Away'), here: player('Here') },
      enemies: [enemy('e1')],
      positions: { away: { row: 1, col: 4 }, here: { row: 6, col: 4 }, e1: { row: 0, col: 4 } },
      order: ['e1', 'away', 'here']
    });
    ctx.targetablePlayers = ['here'];
    const plan = planEnemy(ctx, 'e1');
    expect(plan.target).not.toBe('away');
  });

  it('use their abilities through the same rules (cooldowns, effects)', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1', { abilities: [{ id: 'rallying_guard', name: 'Rallying Guard', level: 1 }] })],
      positions: { p1: { row: 6, col: 9 }, e1: { row: 0, col: 0 } },
      order: ['e1', 'p1']
    });
    const plan = planEnemy(ctx, 'e1');
    expect(plan.abilityToUse?.id).toBe('rallying_guard');
    runEnemyAbilityAndMove(ctx, 'e1', plan);
    expect(ctx.combat.enemies[0].cooldowns.rallying_guard).toBe(ABILITIES.rallying_guard.cooldown + 1);
    nextTurn(ctx);
    expect(ctx.combat.enemies[0].usedAbilityLastTurn).toBe(true);
    expect(effective(ctx, 'e1').stats.resistance).toBe(40);
  });

  it('Butterfly Effect and EMP slow enemy abilities down', () => {
    const ctx = setup({
      players: { p1: player('P1', { role: 'Support', abilities: ['butterfly_effect'], ultimate: 'emp', level: 3 }) },
      enemies: [enemy('e1', { abilities: [{ id: 'humble', name: 'Humble', level: 1 }] })],
      positions: { p1: { row: 6, col: 9 }, e1: { row: 0, col: 0 } },
      order: ['p1', 'e1']
    });
    useAbility(ctx, 'p1', { abilityId: 'butterfly_effect' });
    expect(ctx.combat.enemies[0].cooldowns.humble).toBe(2);
    useAbility(ctx, 'p1', { abilityId: 'emp' });
    expect(planEnemy(ctx, 'e1').abilityToUse).toBeFalsy();
  });
});

describe('cooldown support abilities', () => {
  it('Count me Out shaves three turns and Here We Go Again resets an ally', () => {
    const ctx = setup({
      players: {
        sup: player('Sup', { role: 'Support', abilities: ['count_me_out', 'here_we_go_again'], level: 5 }),
        ally: player('Ally')
      },
      enemies: [enemy('e1')],
      positions: { sup: { row: 6, col: 0 }, ally: { row: 6, col: 1 }, e1: { row: 0, col: 9 } }
    });
    ctx.cooldowns.ally = { shadow_strike: 3, no_limits: 10 };
    useAbility(ctx, 'sup', { abilityId: 'count_me_out', targetId: 'ally' });
    expect(ctx.cooldowns.ally).toEqual({ shadow_strike: 0, no_limits: 7 });
    ctx.combat.turn.actionUsed = false;
    useAbility(ctx, 'sup', { abilityId: 'here_we_go_again' });
    expect(ctx.cooldowns.ally).toEqual({ shadow_strike: 0, no_limits: 0 });
  });
});

// ---------------------------------------------------------------------------
// Every ability, through the engine
// ---------------------------------------------------------------------------

describe('every ability works when used in a fight', () => {
  // Caster p1 at (4,4) with allies around it and three enemies in front.
  const board = (abilityId) => {
    const ability = ABILITIES[abilityId];
    const caster = player('Caster', {
      role: ability.role,
      abilities: ability.isUltimate ? [] : [abilityId],
      ultimate: ability.isUltimate ? abilityId : '',
      level: 5,
      health: 50
    });
    return setup({
      players: {
        p1: caster,
        p2: player('Medic', { role: 'Support', health: 30 }),
        p3: player('Gunner', { role: 'DPS', health: 30 }),
        p4: player('Wall', { role: 'Tank', health: 30 })
      },
      enemies: [enemy('e1', { strength: 10 }), enemy('e2'), enemy('e3')],
      positions: {
        p1: { row: 4, col: 4 },
        p2: { row: 4, col: 5 },
        p3: { row: 5, col: 4 },
        p4: { row: 5, col: 5 },
        e1: { row: 3, col: 4 },
        e2: { row: 2, col: 5 },
        e3: { row: 3, col: 6 }
      },
      order: ['p1', 'p2', 'p3', 'p4', 'e1', 'e2', 'e3']
    });
  };

  const intentFor = (ability) => {
    switch (ability.targetType) {
      case 'single-enemy': return { targetId: 'e1' };
      case 'multi-enemy': return { targets: ['e1', 'e2'] };
      case 'ally': return { targetId: 'p2' };
      case 'ground-target': return { targetPosition: { row: 3, col: 4 } };
      case 'relocate': return { targetId: 'e1', targetPosition: { row: 0, col: 0 } };
      default: return {};
    }
  };

  it.each(Object.keys(ABILITIES))('%s', (abilityId) => {
    const ctx = board(abilityId);
    const ability = ABILITIES[abilityId];
    const result = useAbility(ctx, 'p1', { abilityId, ...intentFor(ability) });
    expect(result, result.message).toMatchObject({ ok: true });
    expect(ctx.cooldowns.p1[abilityId]).toBe(ability.cooldown + 1);

    // A full round afterwards must run cleanly.
    for (let i = 0; i < 7 && !ctx.combat.endedResult; i++) {
      const turn = ctx.combat.turn;
      if (turn?.type === 'enemy') {
        const plan = planEnemy(ctx, turn.id);
        runEnemyAbilityAndMove(ctx, turn.id, plan);
        runEnemyAttack(ctx, turn.id, plan);
      }
      nextTurn(ctx);
    }
    expect(Object.values(ctx.characters).every(c => Number.isFinite(c.stats.health))).toBe(true);
    expect(ctx.combat.enemies.every(e => Number.isFinite(e.stats.health))).toBe(true);
  });
});

describe('combatSnapshot', () => {
  it('describes the board, whose turn it is and what they have left', () => {
    const ctx = setup({
      players: { p1: player('P1') },
      enemies: [enemy('e1')],
      positions: { p1: { row: 4, col: 4 }, e1: { row: 0, col: 0 } }
    });
    const snapshot = combatSnapshot(ctx);
    expect(snapshot.currentTurn).toMatchObject({ type: 'ally', id: 'p1' });
    expect(snapshot.turn).toMatchObject({ id: 'p1', movementLeft: 3, actionUsed: false, bonusActionUsed: false });
    expect(snapshot.positions.e1).toEqual({ row: 0, col: 0 });
    expect(JSON.parse(JSON.stringify(snapshot)).enemies).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// What the narrator is told
// ---------------------------------------------------------------------------

describe('turn beats for the narrator', () => {
  const fight = (enemyHealth = 100) => setup({
    players: { bryson: player('Shipment', { strength: 90 }) },
    enemies: [{ ...enemy('enforcer_soldier_1', { health: enemyHealth, maxHealth: 100 }), templateId: 'enforcer_soldier', name: 'Enforcer Soldier' }],
    positions: { bryson: { row: 6, col: 2 }, enforcer_soldier_1: { row: 3, col: 2 } }
  });

  it('records a move, then the hit, then the kill credited to the weapon, in that order', () => {
    const ctx = fight(5);
    expect(movePlayer(ctx, 'bryson', { row: 5, col: 2 }).ok).toBe(true);
    expect(movePlayer(ctx, 'bryson', { row: 4, col: 2 }).ok).toBe(true);
    expect(attack(ctx, 'bryson', 'enforcer_soldier_1').ok).toBe(true);
    const { beats } = finishTurn(ctx);

    expect(beats.map(beat => beat.kind)).toEqual(['move', 'weapon', 'kill']);
    // Two steps read as one advance toward the soldier, by the character (not the player's name).
    expect(beats[0]).toMatchObject({ direction: 'advance', actor: { name: 'Shipment', key: 'dps_test' }, other: { key: 'enforcer_soldier' } });
    expect(beats[1]).toMatchObject({ weapon: 'Blade', target: { name: 'Enforcer Soldier' } });
    expect(beats[2]).toMatchObject({ victim: { key: 'enforcer_soldier' }, strike: { kind: 'weapon', weapon: 'Blade', actor: { name: 'Shipment' } } });
  });

  it('tells retreating from regrouping', () => {
    const ctx = setup({
      players: { a: player('Leo'), b: player('Patchwork') },
      enemies: [enemy('e1')],
      positions: { a: { row: 4, col: 4 }, b: { row: 6, col: 8 }, e1: { row: 3, col: 4 } }
    });
    movePlayer(ctx, 'a', { row: 5, col: 4 });
    expect(finishTurn(ctx).beats[0]).toMatchObject({ direction: 'retreat', other: { id: 'e1' } });

    const ctx2 = setup({
      players: { a: player('Leo'), b: player('Patchwork') },
      enemies: [enemy('e1')],
      positions: { a: { row: 6, col: 1 }, b: { row: 6, col: 8 }, e1: { row: 0, col: 2 } }
    });
    movePlayer(ctx2, 'a', { row: 6, col: 3 });
    expect(finishTurn(ctx2).beats[0]).toMatchObject({ direction: 'regroup', other: { id: 'b' } });
  });

  it('credits a kill by a lingering effect to the ability behind it', () => {
    const ctx = fight(3);
    ctx.combat.activeEffects.push({ type: 'poison', target: 'enforcer_soldier_1', ownerTurnId: 'bryson', damagePercent: 0.5, turnsRemaining: 2 });
    const { beats } = finishTurn(ctx);
    expect(beats.find(beat => beat.kind === 'kill')).toMatchObject({ strike: { kind: 'ability', abilityId: 'poison_apple', actor: { name: 'Shipment' } } });
  });
});
