// Bots for party members. Two policies:
//
// - greedyTurn: fast rules of thumb (heal whoever is hurt, otherwise hit whatever takes the most
//   damage). Used for teammates while the smart bot imagines the future.
// - lookaheadTurn: the smart bot. For every sensible next step (move somewhere and attack, use an
//   ability on a target, reposition, end the turn) it plays the fight forward on a copy until the
//   end of its own next turn and keeps the step that leaves the party best off. Because it judges
//   abilities by what they actually do in the game, it uses new or changed abilities sensibly
//   without being told how.
import * as engine from './engine.js';
import { executeAbility, getAbility, getDamageTakenMultiplier } from './effects.js';
import { distance, reachableCells, isInBounds, GRID_ROWS, GRID_COLS, occupiedCells, tileKey } from './grid.js';
import { cloneContext, endTurn, fightOutcome, playUntil, isLiving } from './autoplay.js';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const livingEnemies = (ctx) => (ctx.combat.enemies || []).filter(enemy => isLiving(enemy) && ctx.combat.positions[enemy.id]);
const livingAllies = (ctx) => Object.keys(ctx.characters).filter(id => isLiving(ctx.characters[id]) && ctx.combat.positions[id]);

const ratio = (unit) => (unit?.stats?.health || 0) / Math.max(1, unit?.stats?.maxHealth || unit?.stats?.health || 1);

const hasLock = (ctx, id, key) =>
    (ctx.combat.activeEffects || []).some(effect => effect?.target === id && effect.turnsRemaining > 0 && effect[key]);

const canMove = (ctx, id) => engine.movementLeft(ctx, id) > 0 && !hasLock(ctx, id, 'preventMovement');

const canWeaponAttack = (ctx, id) => {
    const turn = ctx.combat.turn;
    return !!turn && (!turn.actionUsed || turn.extraWeaponAttacks > 0) && !hasLock(ctx, id, 'preventActions');
};

const readyAbilities = (ctx, id) =>
    engine.abilityIdsOf(ctx.characters[id]).filter(abilityId => !engine.abilityBlocker(ctx, id, abilityId));

// Tiles this unit can stand on this turn (its own tile first).
function standingCells(ctx, id) {
    const here = ctx.combat.positions[id];
    if (!here) return [];
    if (!canMove(ctx, id)) return [{ ...here, distance: 0 }];
    const reach = reachableCells(here, engine.movementLeft(ctx, id), {
        positions: ctx.combat.positions,
        movingId: id,
        activeEffects: ctx.combat.activeEffects,
        passThrough: engine.teammatesOf(ctx, id)
    });
    return [{ ...here, distance: 0 }, ...reach];
}

// How far a tile is from the nearest living enemy (bigger is safer).
function safety(ctx, cell) {
    return livingEnemies(ctx).reduce((closest, enemy) => Math.min(closest, distance(cell, ctx.combat.positions[enemy.id])), Infinity);
}

const withPosition = (ctx, id, cell) => ({ ...ctx.combat.positions, [id]: { row: cell.row, col: cell.col } });

/** What an ability would do if `id` used it from `cell` (nothing is changed). */
function previewAbility(ctx, id, abilityId, intent, cell = ctx.combat.positions[id]) {
    const ability = getAbility(abilityId);
    if (!ability) return null;
    const noTarget = ability.targetType === 'self' || ability.targetType === 'all-allies' || ability.targetType === 'all-enemies';
    try {
        const result = executeAbility(abilityId, {
            caster: engine.effective(ctx, id),
            playerName: id,
            target: noTarget ? null : (intent.targetId ?? null),
            targets: intent.targets || (intent.targetId ? [intent.targetId] : undefined),
            targetPosition: intent.targetPosition,
            characterPositions: withPosition(ctx, id, cell),
            cooldowns: {},
            random: () => 0.5,
            ...engine.abilityParams(ctx, id)
        });
        return result?.success ? result : null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Targets for each ability
// ---------------------------------------------------------------------------

function groundTargets(ctx, id, ability) {
    const enemies = livingEnemies(ctx).map(enemy => ctx.combat.positions[enemy.id]);
    const allies = livingAllies(ctx).map(ally => ctx.combat.positions[ally]);
    const helpful = ability.type === 'heal';
    const anchors = helpful ? allies : enemies;
    const cells = new Map();
    for (const anchor of anchors) {
        cells.set(tileKey(anchor.row, anchor.col), anchor);
        // Between two units, so a 3x3 field can catch both.
        for (const other of anchors) {
            if (other === anchor || distance(anchor, other) > 2) continue;
            const mid = { row: Math.round((anchor.row + other.row) / 2), col: Math.round((anchor.col + other.col) / 2) };
            cells.set(tileKey(mid.row, mid.col), mid);
        }
    }
    return [...cells.values()].map(targetPosition => ({ targetPosition, anchor: targetPosition }));
}

// Where a teleported unit should go: enemies to the far corner, allies to the safest free tile.
function relocateTargets(ctx, id) {
    const options = [];
    const here = ctx.combat.positions[id];
    const taken = occupiedCells(ctx.combat.positions);
    const freeCells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            if (!taken.has(tileKey(row, col))) freeCells.push({ row, col });
        }
    }
    if (freeCells.length === 0) return options;
    const allyCells = livingAllies(ctx).map(ally => ctx.combat.positions[ally]);
    const farFromAllies = (cell) => Math.min(...allyCells.map(pos => distance(cell, pos)));

    for (const enemy of livingEnemies(ctx)) {
        const pos = ctx.combat.positions[enemy.id];
        if (distance(here, pos) > 2) continue;
        const destination = freeCells.reduce((best, cell) => (farFromAllies(cell) > farFromAllies(best) ? cell : best));
        options.push({ targetId: enemy.id, targetPosition: destination, anchor: pos });
    }
    for (const allyId of livingAllies(ctx)) {
        const pos = ctx.combat.positions[allyId];
        if (allyId === id || distance(here, pos) > 2) continue;
        const destination = freeCells.reduce((best, cell) => (safety(ctx, cell) > safety(ctx, best) ? cell : best));
        options.push({ targetId: allyId, targetPosition: destination, anchor: pos });
    }
    return options;
}

// Most dangerous enemies first (by how hard they hit).
function threatOrder(ctx) {
    return [...livingEnemies(ctx)].sort((a, b) => threatOf(b) - threatOf(a));
}

/** Every target worth considering for an ability: [{ targetId?, targets?, targetPosition?, anchor? }]. */
function abilityTargets(ctx, id, ability) {
    switch (ability.targetType) {
        case 'self':
        case 'all-allies':
        case 'all-enemies':
            return [{}];
        case 'single-enemy':
            return livingEnemies(ctx).map(enemy => ({ targetId: enemy.id, anchor: ctx.combat.positions[enemy.id] }));
        case 'ally':
            return livingAllies(ctx).map(allyId => ({ targetId: allyId, anchor: ctx.combat.positions[allyId] }));
        case 'multi-enemy': {
            const top = threatOrder(ctx).slice(0, 4);
            const max = ability.maxTargets || 2;
            const options = top.map(enemy => ({ targets: [enemy.id], anchor: ctx.combat.positions[enemy.id] }));
            if (max >= 2) {
                for (let i = 0; i < top.length; i++) {
                    for (let j = i + 1; j < top.length; j++) {
                        const a = ctx.combat.positions[top[i].id];
                        const b = ctx.combat.positions[top[j].id];
                        // Both must be in range from one tile; anchor on the farther one and check later.
                        options.push({ targets: [top[i].id, top[j].id], anchor: a, anchor2: b });
                    }
                }
            }
            return options;
        }
        case 'ground-target':
            return groundTargets(ctx, id, ability);
        case 'relocate':
            return relocateTargets(ctx, id);
        default:
            return [];
    }
}

// ---------------------------------------------------------------------------
// Greedy policy
// ---------------------------------------------------------------------------

// Rough worth of an ability's immediate result, in "health points" (damage dealt or healing done).
function immediateWorth(ctx, result) {
    if (!result) return 0;
    let worth = 0;
    for (const { target, amount } of result.damage || []) {
        const enemy = engine.findEnemy(ctx, target);
        if (!enemy) continue;
        const dealt = Math.round(amount * getDamageTakenMultiplier(ctx.combat.activeEffects, target));
        worth += Math.min(dealt, enemy.stats.health) + (dealt >= enemy.stats.health ? 15 : 0);
    }
    for (const { target, amount } of result.healing || []) {
        const ally = ctx.characters[target];
        if (!ally) continue;
        const missing = (ally.stats.maxHealth || 0) - (ally.stats.health || 0);
        worth += Math.min(amount, missing) * (ratio(ally) < 0.5 ? 1.5 : 0.8);
    }
    for (const effect of result.effects || []) {
        if (effect.type === 'damage_over_time') worth += (effect.amount || 0) * (effect.duration || 1) * 0.6;
        if (effect.type === 'poison') worth += 4 * (effect.duration || 1);
        if (effect.type === 'toxic_mist_field') worth += (effect.amount || 0) * 1.5;
    }
    return worth;
}

// The most valuable immediate action this turn: { move, intent, worth }.
function bestGreedyAction(ctx, id) {
    const cells = standingCells(ctx, id);
    const here = ctx.combat.positions[id];
    let best = null;
    const consider = (move, intent, worth) => {
        if (worth > 0 && (!best || worth > best.worth)) best = { move, intent, worth };
    };
    const reachFor = (anchor, range) => {
        if (!anchor) return here;
        if (distance(here, anchor) <= range) return here;
        const inRange = cells.filter(cell => distance(cell, anchor) <= range);
        if (inRange.length === 0) return null;
        return inRange.reduce((a, b) => (a.distance <= b.distance ? a : b));
    };

    if (canWeaponAttack(ctx, id)) {
        const me = engine.effective(ctx, id);
        const range = me.weapon?.range || 1;
        for (const enemy of livingEnemies(ctx)) {
            const cell = reachFor(ctx.combat.positions[enemy.id], range);
            if (!cell) continue;
            const dealt = Math.round(engine.weaponDamage(me, engine.effective(ctx, enemy.id)) * getDamageTakenMultiplier(ctx.combat.activeEffects, enemy.id));
            consider(cell, { kind: 'attack', targetId: enemy.id }, Math.min(dealt, enemy.stats.health) + (dealt >= enemy.stats.health ? 15 : 0));
        }
    }

    for (const abilityId of readyAbilities(ctx, id)) {
        const ability = getAbility(abilityId);
        if (ability.type !== 'damage' && ability.type !== 'heal') continue;
        const targets = ability.targetType === 'ground-target'
            ? livingEnemies(ctx).map(enemy => ({ targetPosition: ctx.combat.positions[enemy.id], anchor: ctx.combat.positions[enemy.id] }))
                .concat(ability.type === 'heal' ? livingAllies(ctx).map(ally => ({ targetPosition: ctx.combat.positions[ally], anchor: ctx.combat.positions[ally] })) : [])
            : abilityTargets(ctx, id, ability);
        for (const target of targets.slice(0, 8)) {
            const cell = reachFor(target.anchor, ability.range || 1);
            if (!cell) continue;
            const intent = { kind: 'ability', abilityId, targetId: target.targetId, targets: target.targets, targetPosition: target.targetPosition };
            consider(cell, intent, immediateWorth(ctx, previewAbility(ctx, id, abilityId, intent, cell)));
        }
    }
    return best;
}

// Walk toward the nearest enemy; ranged units stop at weapon range.
function approach(ctx, id) {
    if (!canMove(ctx, id)) return;
    const here = ctx.combat.positions[id];
    const enemies = livingEnemies(ctx);
    if (enemies.length === 0) return;
    const range = ctx.characters[id].weapon?.range || 1;
    const nearest = enemies.reduce((a, b) => (distance(here, ctx.combat.positions[a.id]) <= distance(here, ctx.combat.positions[b.id]) ? a : b));
    const target = ctx.combat.positions[nearest.id];
    const score = (cell) => Math.abs(distance(cell, target) - range) + (distance(cell, target) < range ? 0.5 : 0);
    const cells = standingCells(ctx, id);
    const best = cells.reduce((a, b) => (score(b) < score(a) ? b : a));
    if (best.distance > 0) engine.movePlayer(ctx, id, { row: best.row, col: best.col });
}

export function applyStep(ctx, id, step) {
    if (!step) return { ok: true };
    const here = ctx.combat.positions[id];
    if (step.move && here && (step.move.row !== here.row || step.move.col !== here.col)) {
        const moved = engine.movePlayer(ctx, id, { row: step.move.row, col: step.move.col });
        if (!moved.ok) return moved;
    }
    if (step.kind === 'attack') return engine.attack(ctx, id, step.targetId);
    if (step.kind === 'ability') {
        return engine.useAbility(ctx, id, {
            abilityId: step.abilityId,
            targetId: step.targetId ?? null,
            targets: step.targets,
            targetPosition: step.targetPosition
        });
    }
    return { ok: true };
}

/** Fast rules-of-thumb turn: heal or hit whatever is worth most right now, else close in. */
export function greedyTurn(ctx, id) {
    for (let actions = 0; actions < 4; actions++) {
        if (fightOutcome(ctx) || !isLiving(ctx.characters[id])) return;
        const best = bestGreedyAction(ctx, id);
        if (!best) break;
        const result = applyStep(ctx, id, { ...best.intent, move: best.move });
        if (!result.ok) break;
    }
    if (!fightOutcome(ctx) && isLiving(ctx.characters[id])) approach(ctx, id);
}

// ---------------------------------------------------------------------------
// Look-ahead policy
// ---------------------------------------------------------------------------

function threatOf(enemy) {
    const stats = enemy?.stats || {};
    const ranged = (enemy?.weapon?.range || 1) > 1;
    const attackStat = ranged ? (stats.ta || stats.strength || 0) : (stats.strength || stats.ta || 0);
    const hit = (attackStat / 10) * (enemy?.weapon?.damage || 0);
    return Math.max(5, hit + (enemy?.role === 'Support' ? 10 : 0));
}

function bonusHealthOf(ctx, id) {
    return (ctx.combat.activeEffects || [])
        .filter(effect => effect.type === 'stat_buff' && effect.stat === 'health' && effect.target === id && effect.turnsRemaining > 0)
        .reduce((total, effect) => total + (Number(effect.value) || 0), 0);
}

/**
 * How good a position is for the party: enemy health removed (weighted by how dangerous each
 * enemy is) plus the party's remaining health, with big swings for wins, losses and knockouts.
 */
export function evaluate(ctx, threatWeights, turnsTaken = 0) {
    const outcome = fightOutcome(ctx);
    // Sooner wins (and later losses) are better, so finishing the fight now beats finishing it later.
    if (outcome === 'win') return 1000 + 20 * partyHealth(ctx) - 10 * turnsTaken;
    if (outcome === 'loss') return -1000 + 10 * turnsTaken;

    // Fallen enemies leave the board, so score against everyone who was there when we started.
    let enemyTerm = 0;
    for (const [enemyId, weight] of Object.entries(threatWeights)) {
        const enemy = engine.findEnemy(ctx, enemyId);
        enemyTerm += weight * (isLiving(enemy) ? 1 - ratio(enemy) : 1.4);
    }

    return enemyTerm + 1.2 * partyHealth(ctx);
}

// Each standing party member counts their health fraction (shields included); a fallen one -1.5.
function partyHealth(ctx) {
    let total = 0;
    for (const [id, ally] of Object.entries(ctx.characters)) {
        if (!isLiving(ally)) {
            total -= 1.5;
            continue;
        }
        const max = Math.max(1, ally.stats.maxHealth || 1);
        total += Math.min(1.3, (ally.stats.health + bonusHealthOf(ctx, id)) / max);
    }
    return total;
}

function threatWeightsFor(ctx) {
    const enemies = ctx.combat.enemies || [];
    const threats = enemies.map(threatOf);
    const average = threats.reduce((a, b) => a + b, 0) / Math.max(1, threats.length);
    return Object.fromEntries(enemies.map((enemy, i) => [enemy.id, threats[i] / Math.max(1, average)]));
}

// Every next step worth trying: move-and-act combinations, repositioning, or ending the turn.
export function candidateSteps(ctx, id) {
    const here = ctx.combat.positions[id];
    if (!here || !isLiving(ctx.characters[id])) return [];
    const cells = standingCells(ctx, id);
    const steps = [null];

    // For a target that must be within `range`: stay if possible, else the closest tile, plus
    // the safest tile in range.
    const placesFor = (anchor, range, anchor2 = null) => {
        if (!anchor) return [here];
        const inRange = cells.filter(cell => distance(cell, anchor) <= range && (!anchor2 || distance(cell, anchor2) <= range));
        if (inRange.length === 0) return [];
        const closest = inRange.reduce((a, b) => (a.distance <= b.distance ? a : b));
        const safest = inRange.reduce((a, b) => (safety(ctx, b) > safety(ctx, a) || (safety(ctx, b) === safety(ctx, a) && b.distance < a.distance) ? b : a));
        return closest.row === safest.row && closest.col === safest.col ? [closest] : [closest, safest];
    };

    if (canWeaponAttack(ctx, id)) {
        const range = engine.effective(ctx, id).weapon?.range || 1;
        for (const enemy of livingEnemies(ctx)) {
            for (const cell of placesFor(ctx.combat.positions[enemy.id], range)) {
                steps.push({ kind: 'attack', targetId: enemy.id, move: cell });
            }
        }
    }

    for (const abilityId of readyAbilities(ctx, id)) {
        const ability = getAbility(abilityId);
        const range = ability.range || (ability.targetType === 'ally' ? 99 : 1);
        for (const target of abilityTargets(ctx, id, ability)) {
            const places = ability.targetType === 'self' || ability.targetType === 'all-allies' || ability.targetType === 'all-enemies'
                ? [here]
                : placesFor(target.anchor, range, target.anchor2);
            for (const cell of places) {
                const intent = { kind: 'ability', abilityId, targetId: target.targetId, targets: target.targets, targetPosition: target.targetPosition, move: cell };
                // Skip anything the ability itself would refuse (no enemies in the area, etc.).
                if (!previewAbility(ctx, id, abilityId, intent, cell)) continue;
                steps.push(intent);
            }
        }
    }

    if (canMove(ctx, id) && cells.length > 1) {
        const enemies = livingEnemies(ctx);
        const allies = livingAllies(ctx).filter(ally => ally !== id).map(ally => ctx.combat.positions[ally]);
        const moves = [];
        if (enemies.length) {
            const nearestEnemyDistance = (cell) => Math.min(...enemies.map(enemy => distance(cell, ctx.combat.positions[enemy.id])));
            moves.push(cells.reduce((a, b) => (nearestEnemyDistance(b) < nearestEnemyDistance(a) ? b : a)));
            moves.push(cells.reduce((a, b) => (safety(ctx, b) > safety(ctx, a) ? b : a)));
        }
        if (allies.length) {
            const toAllies = (cell) => allies.reduce((total, pos) => total + distance(cell, pos), 0);
            moves.push(cells.reduce((a, b) => (toAllies(b) < toAllies(a) ? b : a)));
        }
        const seen = new Set();
        for (const cell of moves) {
            const key = tileKey(cell.row, cell.col);
            if (cell.distance === 0 || seen.has(key)) continue;
            seen.add(key);
            steps.push({ kind: 'move', move: { row: cell.row, col: cell.col } });
        }
    }

    return steps;
}

// Seeded generator so every candidate is judged against the same luck.
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

// Plays `step`, finishes the turn with the greedy policy, then plays on until the end of this
// unit's next turn (or one full round if it falls) and scores the result.
function rollout(ctx, id, step, { seed, weights }) {
    const sim = cloneContext(ctx, { random: seeded(seed) });
    if (step) {
        const result = applyStep(sim, id, step);
        if (!result.ok) return -Infinity;
        // The rest of this turn is played by the quick rules (a move is usually followed by an attack).
        if (!fightOutcome(sim) && isLiving(sim.characters[id])) greedyTurn(sim, id);
    }
    if (!fightOutcome(sim)) endTurn(sim);

    let sawOwnTurn = false;
    const roundLength = Math.max(2, sim.combat.turnOrder.length);
    playUntil(sim, greedyTurn, {
        maxTurns: roundLength + 1,
        stop: (state) => {
            if (sawOwnTurn) return true;
            if (state.combat.turn?.id === id) sawOwnTurn = true;
            return false;
        }
    });
    return evaluate(sim, weights, sim.combat.turnNumber - ctx.combat.turnNumber);
}

/**
 * The best next step for party member `id`, or null to end the turn.
 * @param {object} [options]
 * @param {number} [options.seed] - luck used when imagining the future
 * @param {number} [options.maxCandidates] - cap on steps tried (keeps live bots responsive)
 */
export function chooseStep(ctx, id, { seed = 12345, maxCandidates = 60, onScore = null } = {}) {
    let steps = candidateSteps(ctx, id);
    if (steps.length <= 1) return null;
    if (steps.length > maxCandidates) {
        // Keep the ones that do the most right away, plus every non-damage option.
        const scored = steps.slice(1).map(step => ({ step, worth: step.kind === 'attack' || getAbility(step.abilityId)?.type === 'damage' ? quickWorth(ctx, id, step) : Infinity }));
        scored.sort((a, b) => b.worth - a.worth);
        steps = [null, ...scored.slice(0, maxCandidates - 1).map(entry => entry.step)];
    }

    const weights = threatWeightsFor(ctx);
    let best = null;
    let bestValue = -Infinity;
    for (const step of steps) {
        const value = rollout(ctx, id, step, { seed, weights }) + styleBonus(ctx, id, step);
        onScore?.(step, value);
        if (value > bestValue + 1e-9) {
            bestValue = value;
            best = step;
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// Movement style
// ---------------------------------------------------------------------------

// Each character has a `behavior` (shared/data/characters.js). It only nudges where the bot ends up
// standing, so it breaks near-ties without overriding a clearly better move.
const STYLE_WEIGHT = 0.06;

/**
 * Extra score for where `step` leaves the bot, by its movement style:
 * aggressive closes on the nearest enemy, defensive keeps it at weapon range, and intelligent falls
 * back toward a friendly support when badly hurt.
 */
export function styleBonus(ctx, id, step) {
    const me = ctx.characters[id];
    const here = ctx.combat.positions[id];
    if (!me || !here) return 0;
    const spot = step?.move || here;
    const enemies = livingEnemies(ctx);
    if (enemies.length === 0) return 0;
    const nearest = Math.min(...enemies.map(enemy => distance(spot, ctx.combat.positions[enemy.id])));

    switch (me.behavior || 'intelligent') {
        case 'aggressive':
            return -STYLE_WEIGHT * nearest;
        case 'defensive': {
            const range = me.weapon?.range || 1;
            return -STYLE_WEIGHT * Math.abs(nearest - range) - (nearest < range ? STYLE_WEIGHT : 0);
        }
        default: {
            if (ratio(me) >= 0.25) return 0;
            const healers = livingAllies(ctx).filter(ally => ally !== id && ctx.characters[ally].role === 'Support');
            if (healers.length === 0) return 0;
            return -STYLE_WEIGHT * 2 * Math.min(...healers.map(ally => distance(spot, ctx.combat.positions[ally])));
        }
    }
}

function quickWorth(ctx, id, step) {
    if (step.kind === 'attack') {
        const enemy = engine.findEnemy(ctx, step.targetId);
        return enemy ? engine.weaponDamage(engine.effective(ctx, id), engine.effective(ctx, enemy.id)) : 0;
    }
    return immediateWorth(ctx, previewAbility(ctx, id, step.abilityId, step, step.move));
}

/** A whole turn played by the look-ahead bot. */
export function lookaheadTurn(ctx, id, options = {}) {
    for (let steps = 0; steps < 4; steps++) {
        if (fightOutcome(ctx) || !isLiving(ctx.characters[id])) return;
        const turn = ctx.combat.turn;
        if (!turn || turn.id !== id || turn.finished) return;
        const step = chooseStep(ctx, id, { ...options, seed: (options.seed ?? 1) + steps * 7919 + (turn.number || 0) * 104729 });
        if (!step) return;
        const result = applyStep(ctx, id, step);
        if (!result.ok) return;
        if (!engine.canStillAct(ctx, id)) return;
    }
}
