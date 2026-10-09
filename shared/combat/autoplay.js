// Runs fights without timers or sockets: the same turn flow as Server/sockets/combat.js, but
// synchronous. Used by the party bots (to look ahead) and by the balance simulator.
import * as engine from './engine.js';
import { advanceTurn, tickEnemyCorpses, isEnemyAlive } from './turnOrder.js';

const isLiving = (unit) => !!unit && !unit.isDeadBody && (unit.stats?.health || 0) > 0;

/** A deep copy of a combat context that can be played forward without touching the original. */
export function cloneContext(ctx, overrides = {}) {
    return {
        combat: structuredClone(ctx.combat),
        characters: structuredClone(ctx.characters),
        cooldowns: structuredClone(ctx.cooldowns || {}),
        targetablePlayers: ctx.targetablePlayers ? [...ctx.targetablePlayers] : undefined,
        random: ctx.random,
        ...overrides
    };
}

/** 'win', 'loss', or null while the fight is still on. */
export function fightOutcome(ctx) {
    if (ctx.combat.endedResult) return ctx.combat.endedResult === 'enemies_defeated' ? 'win' : 'loss';
    if (!(ctx.combat.enemies || []).some(isEnemyAlive)) return 'win';
    if (!Object.values(ctx.characters || {}).some(isLiving)) return 'loss';
    return null;
}

/** Ends the current turn and starts the next one. Returns the outcome if the fight is over. */
export function endTurn(ctx) {
    const turn = ctx.combat.turn;
    if (!turn || turn.finished) return fightOutcome(ctx);
    engine.finishTurn(ctx);
    let outcome = fightOutcome(ctx);
    if (outcome) return outcome;

    advanceTurn(ctx.combat, { type: turn.type, id: turn.id });
    tickEnemyCorpses(ctx.combat);
    outcome = fightOutcome(ctx);
    if (outcome) return outcome;

    engine.beginTurn(ctx);
    return null;
}

/** Plays the current enemy's whole turn. Returns the outcome if the fight is over. */
export function playEnemyTurn(ctx) {
    const id = ctx.combat.turn?.id;
    const plan = engine.planEnemy(ctx, id);
    engine.runEnemyAbilityAndMove(ctx, id, plan);
    let outcome = fightOutcome(ctx);
    if (outcome) return outcome;
    if (!ctx.combat.turn?.actorDied && plan?.useWeapon) {
        engine.runEnemyAttack(ctx, id, plan);
        outcome = fightOutcome(ctx);
        if (outcome) return outcome;
    }
    return endTurn(ctx);
}

/**
 * Plays one turn, whoever's it is. `allyPolicy(ctx, playerId)` makes the party member's moves
 * through the engine (movePlayer / attack / useAbility); the turn is ended afterwards.
 */
export function playTurn(ctx, allyPolicy) {
    const turn = ctx.combat.turn;
    if (!turn) return fightOutcome(ctx) || 'loss';
    if (turn.type === 'enemy') return playEnemyTurn(ctx);

    allyPolicy(ctx, turn.id);
    const outcome = fightOutcome(ctx);
    if (outcome) return outcome;
    return endTurn(ctx);
}

/**
 * Plays turns until the fight ends, `stop(ctx)` returns true (checked before each turn), or
 * `maxTurns` turns have been played. Returns 'win', 'loss' or null (stopped early).
 */
export function playUntil(ctx, allyPolicy, { stop = () => false, maxTurns = 400, onTurn = null } = {}) {
    for (let played = 0; played < maxTurns; played++) {
        const outcome = fightOutcome(ctx);
        if (outcome) return outcome;
        if (stop(ctx)) return null;
        const turn = ctx.combat.turn;
        const result = playTurn(ctx, allyPolicy);
        // The finished turn (with its log and beats), e.g. for checking narration.
        if (onTurn && turn) onTurn(turn, ctx);
        if (result) return result;
    }
    return fightOutcome(ctx);
}

export { isLiving };
