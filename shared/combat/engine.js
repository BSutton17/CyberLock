// The combat rules engine. The server owns one combat per room and runs every action through here;
// clients only send intents (move, attack, use an ability, end turn) and draw the result.
//
// All functions take a context:
//   ctx.combat     - the fight (mutated in place)
//   ctx.characters - party characters by player name (mutated in place; health lives here)
//   ctx.cooldowns  - ability cooldowns by player name (mutated in place)
//   ctx.targetablePlayers - optional list of player names enemies may attack (default: everyone alive)
//   ctx.random     - optional random source for chance-based abilities
//
// Player actions return { ok: true, events } or { ok: false, error, message }.

import { ABILITIES } from './abilities.js';
import {
    getAbility,
    executeAbility,
    tickCooldowns,
    effectiveUnit,
    applyDamageKeywords,
    hasDamageReflection,
    isHealingPrevented,
    absorbWithBonusHealth,
    withHealth,
    maxHealthOf,
    createActiveEffect,
    removeEffectsOwnedBy,
    zoneSide,
    isZone,
    INSTANT_EFFECT_TYPES
} from './effects.js';
import { planEnemyTurn, getEnemyWeaponAttackStatValue } from './enemyAI.js';
import { distance, findPath, isInBounds, isInsideArea, movementFromSpeed, samePosition, occupiedCells, tileKey } from './grid.js';
import { removeDeadEnemiesFromTurnOrder, removeAllyFromTurnOrder, markEnemyAsCorpse } from './turnOrder.js';

const NO_TARGET_TYPES = new Set(['self', 'all-allies', 'all-enemies']);

// ---------------------------------------------------------------------------
// Setup and lookups
// ---------------------------------------------------------------------------

/** A new fight. `positions` maps every unit id (player names and enemy ids) to its tile. */
export function createCombatState({ encounterIndex = 0, sceneKey = null, enemies = [], positions = {}, turnOrder = [], combatType = 'low', postCombat = 'none' } = {}) {
    return {
        encounterIndex,
        sceneKey,
        combatType,
        postCombat,
        enemies,
        positions,
        activeEffects: [],
        turnOrder,
        currentTurnIndex: 0,
        turn: null,
        turnNumber: 0,
        downed: {},
        endedResult: null
    };
}

const isLiving = (unit) => !!unit && !unit.isDeadBody && (unit.stats?.health || 0) > 0;

export function findEnemy(ctx, id) {
    return (ctx.combat.enemies || []).find(enemy => enemy.id === id) || null;
}

export function isPlayer(ctx, id) {
    return !!id && Object.prototype.hasOwnProperty.call(ctx.characters || {}, id);
}

export function getUnit(ctx, id) {
    return isPlayer(ctx, id) ? ctx.characters[id] : findEnemy(ctx, id);
}

export const sideOf = (ctx, id) => (isPlayer(ctx, id) ? 'ally' : 'enemy');

const nameOf = (ctx, id) => getUnit(ctx, id)?.name || id;

/** The unit with buffs, debuffs and zones applied. */
export function effective(ctx, id) {
    const unit = getUnit(ctx, id);
    if (!unit) return null;
    return effectiveUnit(unit, id, {
        activeEffects: ctx.combat.activeEffects,
        side: sideOf(ctx, id),
        position: ctx.combat.positions[id] || null
    });
}

const livingPlayerIds = (ctx) => Object.keys(ctx.characters || {}).filter(id => isLiving(ctx.characters[id]));
const livingEnemies = (ctx) => (ctx.combat.enemies || []).filter(isLiving);

/**
 * Who a unit is, for the narrator: its name, which line set it uses (a character's id, or the
 * enemy's template id), its side, and whether it's a boss (bosses go by name, others get "the").
 */
export function unitInfo(ctx, id) {
    const unit = getUnit(ctx, id);
    if (!unit) return null;
    const player = isPlayer(ctx, id);
    return {
        id,
        name: unit.name || id,
        key: player ? unit.id : (unit.templateId || String(unit.id || '').replace(/_\d+$/, '')),
        side: player ? 'ally' : 'enemy',
        boss: !player && unit.tier === 'boss'
    };
}

// What an ability sees as "the other side" and "my side", from the caster's point of view.
export function abilityParams(ctx, casterId) {
    const effectivePlayers = Object.fromEntries(livingPlayerIds(ctx).map(id => [id, { ...effective(ctx, id), id }]));
    const effectiveEnemies = Object.fromEntries(livingEnemies(ctx).map(enemy => [enemy.id, effective(ctx, enemy.id)]));

    return sideOf(ctx, casterId) === 'ally'
        ? { enemies: Object.values(effectiveEnemies), playerCharacters: effectivePlayers }
        : { enemies: Object.values(effectivePlayers), playerCharacters: effectiveEnemies };
}

function cooldownsOf(ctx, id) {
    if (isPlayer(ctx, id)) {
        ctx.cooldowns[id] = ctx.cooldowns[id] || {};
        return ctx.cooldowns[id];
    }
    const enemy = findEnemy(ctx, id);
    if (enemy) enemy.cooldowns = enemy.cooldowns || {};
    return enemy?.cooldowns || {};
}

function setCooldowns(ctx, id, cooldowns) {
    if (isPlayer(ctx, id)) {
        ctx.cooldowns[id] = cooldowns;
        return;
    }
    const enemy = findEnemy(ctx, id);
    if (enemy) enemy.cooldowns = cooldowns;
}

/** Ability ids a character can use right now (loadout plus ultimate from level 3). */
export function abilityIdsOf(character) {
    const ids = (Array.isArray(character?.abilities) ? character.abilities : [])
        .map(ability => (typeof ability === 'string' ? ability : ability?.id))
        .filter(Boolean);
    const ultimate = typeof character?.ultimate === 'string' ? character.ultimate : character?.ultimate?.id;
    if (ultimate && (Number(character?.level) || 1) >= 3) ids.push(ultimate);
    return ids;
}

const hasControlLock = (ctx, id, key) =>
    (ctx.combat.activeEffects || []).some(effect => effect?.target === id && effect.turnsRemaining > 0 && effect[key]);

const abilitiesDisabled = (ctx, id) =>
    (ctx.combat.activeEffects || []).some(effect => effect?.target === id && effect.type === 'abilities_disabled' && effect.turnsRemaining > 0);

export function usesTaForWeapon(character) {
    return character?.role === 'Support' || character?.id === 'spellcaster_dps_1';
}

// ---------------------------------------------------------------------------
// Events, logging
// ---------------------------------------------------------------------------

// Events tell clients what to animate and what to show in the combat log.
function emitter() {
    const events = [];
    return {
        events,
        push(event) { events.push(event); },
        message(text) { if (text) events.push({ type: 'message', text }); }
    };
}

/**
 * Records one thing that happened this turn: the plain text, plus a structured beat the narrator
 * tells it from ({ kind: 'move' | 'weapon' | 'ability' | 'kill' | 'down', ... }). Anything
 * without a beat of its own is kept as a 'note' with its text.
 */
function logTurn(ctx, text, beat = null) {
    if (!text || !ctx.combat.turn) return;
    ctx.combat.turn.log.push(text);
    (ctx.combat.turn.beats ||= []).push(beat || { kind: 'note', text });
}

// What is dealing damage right now (a weapon swing, an ability, a lingering effect), so a kill can
// be credited to it. Each unit remembers the last thing that hurt it.
function withStrike(ctx, strike, run) {
    const previous = ctx.strike;
    ctx.strike = strike;
    try {
        return run();
    } finally {
        ctx.strike = previous;
    }
}

const weaponStrike = (ctx, actorId) => ({ kind: 'weapon', actorId, weapon: getUnit(ctx, actorId)?.weapon?.name || null });
const abilityStrike = (actorId, abilityId) => ({ kind: 'ability', actorId, abilityId });

// The ability behind each lingering damage effect.
const EFFECT_ABILITY = { burn: 'fireball', poison: 'poison_apple', damage_over_time: 'white_phospherus', toxic_mist_field: 'toxic_mist' };

// ---------------------------------------------------------------------------
// Damage, healing, deaths
// ---------------------------------------------------------------------------

/**
 * Deals damage after damage keywords. Reflectable hits on a unit with Counter bounce back to the
 * attacker instead. Party members' bonus health soaks damage first. Returns the damage dealt.
 */
export function applyDamage(ctx, out, { sourceId = null, targetId, amount, reflectable = false, minimumDamage = 1, ignoreKeywords = false }) {
    const target = getUnit(ctx, targetId);
    if (!isLiving(target)) return 0;

    const effects = ctx.combat.activeEffects;
    const damage = ignoreKeywords
        ? Math.max(minimumDamage, Math.round(Math.max(0, amount || 0)))
        : applyDamageKeywords(amount, effects, targetId, { minimumDamage });
    if (damage <= 0) return 0;

    if (reflectable && sourceId && sourceId !== targetId && hasDamageReflection(effects, targetId) && isLiving(getUnit(ctx, sourceId))) {
        const text = `${target.name} turns the blow back on ${nameOf(ctx, sourceId)}!`;
        out.message(text);
        logTurn(ctx, text);
        withStrike(ctx, abilityStrike(targetId, 'counter'), () => applyDamage(ctx, out, { targetId: sourceId, amount: damage, ignoreKeywords: true }));
        return 0;
    }

    let remaining = damage;
    if (isPlayer(ctx, targetId)) {
        const absorbed = absorbWithBonusHealth(damage, effects, targetId);
        ctx.combat.activeEffects = absorbed.effects;
        remaining = absorbed.remainingDamage;
        ctx.characters[targetId] = withHealth(target, (target.stats.health || 0) - remaining);
    } else {
        const index = ctx.combat.enemies.findIndex(enemy => enemy.id === targetId);
        ctx.combat.enemies[index] = withHealth(target, (target.stats.health || 0) - remaining);
    }

    if (ctx.strike) (ctx.lastStrikeOn ||= {})[targetId] = ctx.strike;
    out.push({ type: 'damage', targetId, amount: damage });
    return damage;
}

/** Heals a living unit up to its max health unless healing is prevented. Returns HP restored. */
export function applyHealing(ctx, out, targetId, amount) {
    const target = getUnit(ctx, targetId);
    if (!isLiving(target) || isHealingPrevented(ctx.combat.activeEffects, targetId)) return 0;

    const before = target.stats.health || 0;
    const healed = withHealth(target, before + Math.max(0, amount || 0));
    if (isPlayer(ctx, targetId)) {
        ctx.characters[targetId] = healed;
    } else {
        const index = ctx.combat.enemies.findIndex(enemy => enemy.id === targetId);
        ctx.combat.enemies[index] = healed;
    }

    const restored = healed.stats.health - before;
    if (restored > 0) out.push({ type: 'heal', targetId, amount: restored });
    return restored;
}

/**
 * Turns anyone who just reached 0 HP into a casualty: enemies become corpses (cleared after the
 * current turn), party members are taken out of the turn order, and effects they own end.
 * Returns { actorDied } when the unit whose turn it is went down.
 */
export function resolveDeaths(ctx, out) {
    const combat = ctx.combat;
    const fallen = [];

    combat.enemies = combat.enemies.map(enemy => {
        if (enemy.isDeadBody || (enemy.stats?.health || 0) > 0) return enemy;
        fallen.push(enemy.id);
        const text = `${enemy.name} falls.`;
        out.message(text);
        const strike = ctx.lastStrikeOn?.[enemy.id];
        logTurn(ctx, text, { kind: 'kill', victim: unitInfo(ctx, enemy.id), strike: strike ? { ...strike, actor: unitInfo(ctx, strike.actorId) } : null });
        out.push({ type: 'death', unitId: enemy.id });
        return markEnemyAsCorpse(enemy);
    });

    const downedPlayers = Object.keys(ctx.characters || {}).filter(id =>
        (ctx.characters[id]?.stats?.health || 0) <= 0 && combat.downed[id] === undefined
    );
    downedPlayers.forEach(id => {
        combat.downed[id] = combat.turnNumber;
        fallen.push(id);
        const text = `${ctx.characters[id].name} goes down.`;
        out.message(text);
        logTurn(ctx, text, { kind: 'down', victim: unitInfo(ctx, id) });
        out.push({ type: 'death', unitId: id });
    });

    if (fallen.length === 0) return { actorDied: false };

    combat.activeEffects = removeEffectsOwnedBy(combat.activeEffects, fallen);
    const current = combat.turnOrder[combat.currentTurnIndex];
    const actorDied = !!current && fallen.includes(current.id);

    removeDeadEnemiesFromTurnOrder(combat);
    downedPlayers.forEach(id => removeAllyFromTurnOrder(combat, id));
    if (actorDied && combat.turn) combat.turn.actorDied = true;

    return { actorDied };
}

// ---------------------------------------------------------------------------
// Ability results
// ---------------------------------------------------------------------------

function changeCooldowns(ctx, unitId, update) {
    const cooldowns = { ...cooldownsOf(ctx, unitId) };
    Object.keys(cooldowns).forEach(abilityId => { cooldowns[abilityId] = update(abilityId, cooldowns[abilityId] || 0); });
    setCooldowns(ctx, unitId, cooldowns);
}

function applyInstantEffect(ctx, casterId, effect) {
    const targetId = effect.target;
    if (!getUnit(ctx, targetId)) return;

    if (effect.type === 'cooldown_reduction') {
        changeCooldowns(ctx, targetId, (_id, value) => Math.max(0, value - (effect.value || 1)));
    } else if (effect.type === 'cooldown_reset') {
        const excluded = new Set(effect.excludeAbilityIds || []);
        changeCooldowns(ctx, targetId, (id, value) => (excluded.has(id) ? value : 0));
    } else if (effect.type === 'cooldown_increase') {
        // Ultimates are left alone: their long cooldowns carry over between fights, and an enemy
        // spamming Butterfly Effect could otherwise push one out of reach for the rest of the game.
        changeCooldowns(ctx, targetId, (id, value) => (getAbility(id)?.isUltimate ? value : value + (effect.value || 1)));
    } else if (effect.type === 'extra_weapon_attacks' && targetId === casterId && ctx.combat.turn?.id === casterId) {
        ctx.combat.turn.extraWeaponAttacks = effect.value || 0;
    }
}

// Teleports and pushes. Moved as one batch, so units can swap into each other's old tiles
// (Black Hole packs several enemies into the centre at once).
function applyForcedMovement(ctx, out, moves = []) {
    const positions = ctx.combat.positions;
    const valid = (moves || [])
        .map(({ enemyId: unitId, path, to }) => ({
            unitId,
            destination: (Array.isArray(path) && path.length > 0 ? path[path.length - 1] : to) || null
        }))
        .filter(({ unitId, destination }) => getUnit(ctx, unitId) && positions[unitId] && isInBounds(destination));

    const movers = new Set(valid.map(move => move.unitId));
    const taken = new Set(
        Object.entries(positions).filter(([id]) => !movers.has(id)).map(([, pos]) => tileKey(pos.row, pos.col))
    );
    const blocked = valid.filter(({ destination }) => taken.has(tileKey(destination.row, destination.col)));
    blocked.forEach(({ unitId }) => taken.add(tileKey(positions[unitId].row, positions[unitId].col)));

    valid.forEach(({ unitId, destination }) => {
        const key = tileKey(destination.row, destination.col);
        if (taken.has(key)) return;
        taken.add(key);
        const from = positions[unitId];
        positions[unitId] = { row: destination.row, col: destination.col };
        out.push({ type: 'teleport', unitId, from, to: positions[unitId] });
    });
}

function applyAbilityResult(ctx, out, casterId, result) {
    (result.damage || []).forEach(({ target, amount }) => {
        applyDamage(ctx, out, { sourceId: casterId, targetId: target, amount, reflectable: true, minimumDamage: 1 });
    });

    (result.healing || []).forEach(({ target, amount }) => applyHealing(ctx, out, target, amount));

    const side = sideOf(ctx, casterId);
    (result.effects || []).forEach(effect => {
        if (INSTANT_EFFECT_TYPES.has(effect.type)) {
            applyInstantEffect(ctx, casterId, effect);
            return;
        }
        ctx.combat.activeEffects.push(createActiveEffect(effect, { ownerId: casterId, side }));
    });

    applyForcedMovement(ctx, out, result.forcedMovement);
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

const currentTurnEntry = (ctx) => ctx.combat.turnOrder[ctx.combat.currentTurnIndex] || null;

// Clears casualties from the board once the turn they fell in is over.
function pruneBoard(ctx) {
    const combat = ctx.combat;
    const enemyIds = new Set(combat.enemies.map(enemy => enemy.id));
    Object.keys(combat.positions).forEach(id => {
        if (isPlayer(ctx, id)) {
            if (combat.downed[id] !== undefined && combat.downed[id] < combat.turnNumber) delete combat.positions[id];
        } else if (!enemyIds.has(id)) {
            delete combat.positions[id];
        }
    });
}

/** Starts the turn of whoever the turn order points at. */
export function beginTurn(ctx) {
    const entry = currentTurnEntry(ctx);
    ctx.combat.turnNumber += 1;
    pruneBoard(ctx);
    ctx.combat.turn = entry
        ? {
            type: entry.type,
            id: entry.id,
            number: ctx.combat.turnNumber,
            movementUsed: 0,
            actionUsed: false,
            bonusActionUsed: false,
            extraWeaponAttacks: 0,
            usedAbility: false,
            startPosition: ctx.combat.positions[entry.id] ? { ...ctx.combat.positions[entry.id] } : null,
            actorDied: false,
            log: [],
            beats: []
        }
        : null;
    return ctx.combat.turn;
}

// Over-time effects on one unit end early when that unit is down.
const PER_TARGET_TICK_TYPES = new Set(['healing_over_time', 'burn', 'poison', 'damage_over_time']);
const TICKING = '__ticking';

// Effects owned by `ownerId` take effect and count down when its turn ends.
function tickEffects(ctx, out, ownerId) {
    const combat = ctx.combat;

    // Pending effects become active; active ones are flagged to act and count down. The flag
    // survives bonus-health shields being replaced while damage is dealt below.
    combat.activeEffects = combat.activeEffects.map(effect => {
        if (effect.ownerTurnId && effect.ownerTurnId !== ownerId) return effect;
        if (effect.appliedThisTurn) return { ...effect, appliedThisTurn: false };
        return { ...effect, [TICKING]: true };
    });

    combat.activeEffects.filter(effect => effect[TICKING]).forEach(effect => {
        const target = effect.target ? getUnit(ctx, effect.target) : null;
        if (PER_TARGET_TICK_TYPES.has(effect.type) && !isLiving(target)) return;

        switch (effect.type) {
            case 'healing_over_time':
                applyHealing(ctx, out, effect.target, effect.amount);
                break;
            case 'burn':
                withStrike(ctx, abilityStrike(effect.ownerTurnId, EFFECT_ABILITY.burn), () =>
                    applyDamage(ctx, out, { targetId: effect.target, amount: Math.floor((target.stats.health || 0) * (effect.damagePercent || 0)), minimumDamage: 1 }));
                break;
            case 'poison':
                withStrike(ctx, abilityStrike(effect.ownerTurnId, EFFECT_ABILITY.poison), () =>
                    applyDamage(ctx, out, { targetId: effect.target, amount: Math.floor(maxHealthOf(target) * (effect.damagePercent || 0)), minimumDamage: 1 }));
                break;
            case 'damage_over_time':
                withStrike(ctx, abilityStrike(effect.ownerTurnId, EFFECT_ABILITY.damage_over_time), () =>
                    applyDamage(ctx, out, { targetId: effect.target, amount: effect.amount || 0, minimumDamage: 1 }));
                break;
            case 'healing_field':
                // Whoever is standing in the field right now, not whoever was there when it was cast.
                unitsInZone(ctx, effect, { helpful: true }).forEach(id => {
                    const healed = applyHealing(ctx, out, id, effect.amount || 0);
                    if (healed > 0) logTurn(ctx, `${nameOf(ctx, id)} heals ${healed} in the healing field.`);
                });
                break;
            case 'toxic_mist_field':
                unitsInZone(ctx, effect, { helpful: false }).forEach(id => {
                    const dealt = withStrike(ctx, abilityStrike(effect.ownerTurnId, EFFECT_ABILITY.toxic_mist_field), () =>
                        applyDamage(ctx, out, { targetId: id, amount: effect.amount || 0, minimumDamage: 1 }));
                    if (dealt > 0) logTurn(ctx, `${nameOf(ctx, id)} chokes in the toxic mist for ${dealt} damage.`);
                });
                break;
            default:
                break;
        }
    });

    combat.activeEffects = combat.activeEffects.flatMap(effect => {
        if (!effect[TICKING]) return [effect];
        const { [TICKING]: _ticking, ...rest } = effect;
        const turnsRemaining = rest.turnsRemaining - 1;
        const targetDown = PER_TARGET_TICK_TYPES.has(rest.type) && !isLiving(getUnit(ctx, rest.target));
        return turnsRemaining > 0 && !targetDown ? [{ ...rest, turnsRemaining }] : [];
    });
}

// Living units a zone touches: its caster's side for helpful zones, the other side otherwise.
function unitsInZone(ctx, zone, { helpful }) {
    const side = zoneSide(zone);
    const wanted = helpful ? side : (side === 'ally' ? 'enemy' : 'ally');
    const candidates = wanted === 'ally'
        ? livingPlayerIds(ctx)
        : livingEnemies(ctx).map(enemy => enemy.id);
    return candidates.filter(id => isInsideArea(ctx.combat.positions[id], zone.center, zone.radius ?? 1));
}

/**
 * Ends the current turn: the actor's cooldowns tick and the effects it owns take effect.
 * Returns { events, summary } where summary lists what happened this turn for the narrator.
 */
export function finishTurn(ctx) {
    const out = emitter();
    const turn = ctx.combat.turn;
    if (!turn) return { events: out.events, summary: [], beats: [] };

    if (getUnit(ctx, turn.id)) {
        setCooldowns(ctx, turn.id, tickCooldowns(cooldownsOf(ctx, turn.id)));
        const enemy = findEnemy(ctx, turn.id);
        if (enemy) {
            enemy.usedAbilityLastTurn = turn.usedAbility;
            enemy.turnsTaken = (enemy.turnsTaken || 0) + 1;
        }
    }

    tickEffects(ctx, out, turn.id);
    resolveDeaths(ctx, out);
    turn.finished = true;
    return { events: out.events, summary: [...turn.log], beats: [...(turn.beats || [])] };
}

/**
 * Logs a move. Several steps in a row by the same unit read as one move, from where it started.
 */
function logMove(ctx, id, from, to) {
    const turn = ctx.combat.turn;
    if (!turn) return;
    const beats = turn.beats || [];
    const last = beats[beats.length - 1];
    if (last?.kind === 'move' && last.actor?.id === id) {
        beats[beats.length - 1] = moveBeat(ctx, id, last.from, to);
        return;
    }
    logTurn(ctx, `${nameOf(ctx, id)} moves.`, moveBeat(ctx, id, from, to));
}

/**
 * A move, told by where it went: closer to the nearest foe
 * ('advance'), away from the foe that was nearest ('retreat'), or toward a teammate ('regroup').
 */
export function moveBeat(ctx, id, from, to) {
    const at = (unitId) => ctx.combat.positions[unitId];
    const player = isPlayer(ctx, id);
    const foes = (player ? livingEnemies(ctx).map(enemy => enemy.id) : livingPlayerIds(ctx)).filter(at);
    const friends = (player ? livingPlayerIds(ctx) : livingEnemies(ctx).map(enemy => enemy.id)).filter(other => other !== id && at(other));
    const nearest = (pos, ids) => ids.reduce((best, other) => {
        const d = distance(pos, at(other));
        return !best || d < best.d ? { id: other, d } : best;
    }, null);

    const beat = (direction, otherId) => ({ kind: 'move', actor: unitInfo(ctx, id), from: { ...from }, direction, other: otherId ? unitInfo(ctx, otherId) : null });
    const foeNow = nearest(to, foes);
    if (foeNow && distance(from, at(foeNow.id)) > foeNow.d) return beat('advance', foeNow.id);
    const foeBefore = nearest(from, foes);
    if (foeBefore && distance(to, at(foeBefore.id)) > foeBefore.d) return beat('retreat', foeBefore.id);

    let closest = null;
    let gained = 0;
    for (const friend of friends) {
        const gain = distance(from, at(friend)) - distance(to, at(friend));
        if (gain > gained) {
            gained = gain;
            closest = friend;
        }
    }
    if (closest) return beat('regroup', closest);
    return foeNow ? beat('advance', foeNow.id) : beat('regroup', null);
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

const fail = (error, message) => ({ ok: false, error, message });

function checkActor(ctx, playerId) {
    const { combat } = ctx;
    if (!combat || combat.endedResult) return fail('no_combat', 'There is no fight going on.');
    const turn = combat.turn;
    if (!turn || turn.finished || turn.type !== 'ally' || turn.id !== playerId) return fail('not_your_turn', "It's not your turn.");
    if (!isLiving(ctx.characters[playerId])) return fail('down', 'You are down.');
    if (!combat.positions[playerId]) return fail('no_position', 'You are not on the board.');
    return null;
}

/**
 * Tiles the acting unit can still walk this turn. Speed buffs count as soon as they are active;
 * slowing terrain and blizzards are judged from where the turn started, so stepping out of one
 * mid-turn doesn't refund movement.
 */
export function movementLeft(ctx, unitId) {
    const turn = ctx.combat.turn;
    if (!turn || turn.id !== unitId) return 0;
    const unit = getUnit(ctx, unitId);
    const from = turn.startPosition || ctx.combat.positions[unitId] || null;
    const speed = effectiveUnit(unit, unitId, { activeEffects: ctx.combat.activeEffects, side: sideOf(ctx, unitId), position: from })?.stats?.speed || 0;
    return Math.max(0, movementFromSpeed(speed, from, ctx.combat.sceneKey) - turn.movementUsed);
}

const dropGtgMarkers = (ctx, unitId) => {
    ctx.combat.activeEffects = ctx.combat.activeEffects.filter(effect =>
        !((effect.type === 'gtg_target_marker' || effect.type === 'gtg_origin_marker') && effect.target === unitId)
    );
};

/** Living party members other than `playerId` (they can be walked through, not stood on). */
export function teammatesOf(ctx, playerId) {
    return livingPlayerIds(ctx).filter(id => id !== playerId);
}

export function movePlayer(ctx, playerId, to) {
    const problem = checkActor(ctx, playerId);
    if (problem) return problem;
    if (!isInBounds(to)) return fail('bad_target', 'That tile is off the board.');
    if (hasControlLock(ctx, playerId, 'preventMovement')) return fail('immobilized', "You can't move right now.");

    const start = ctx.combat.positions[playerId];
    // Party members can walk through each other, so nobody gets boxed in by their own side.
    const path = findPath(start, to, { positions: ctx.combat.positions, movingId: playerId, activeEffects: ctx.combat.activeEffects, passThrough: teammatesOf(ctx, playerId) });
    if (!path) return fail('blocked', "You can't get there.");
    if (path.length === 0) return fail('no_move', 'You are already there.');
    if (path.length > movementLeft(ctx, playerId)) return fail('too_far', 'Not enough movement left.');

    ctx.combat.positions[playerId] = { row: to.row, col: to.col };
    ctx.combat.turn.movementUsed += path.length;
    dropGtgMarkers(ctx, playerId);
    logMove(ctx, playerId, start, to);
    return { ok: true, events: [{ type: 'move', unitId: playerId, path }] };
}

// A weapon hit, with how big it was next to the target's max health (the narrator never says numbers).
function weaponBeat(ctx, actorId, targetId, dealt) {
    const target = getUnit(ctx, targetId);
    return {
        kind: 'weapon',
        actor: unitInfo(ctx, actorId),
        target: unitInfo(ctx, targetId),
        weapon: getUnit(ctx, actorId)?.weapon?.name || null,
        share: dealt / Math.max(1, target?.stats?.maxHealth || target?.stats?.health || 1)
    };
}

export function weaponDamage(attacker, defender) {
    const attackStat = usesTaForWeapon(attacker) ? attacker.stats.ta : attacker.stats.strength;
    return Math.max(1, Math.round((attackStat / 10) * (attacker.weapon?.damage || 0) - (defender.stats.resistance || 0) / 10));
}

export function attack(ctx, playerId, targetId) {
    const problem = checkActor(ctx, playerId);
    if (problem) return problem;
    const turn = ctx.combat.turn;
    if (hasControlLock(ctx, playerId, 'preventActions')) return fail('locked', "You can't act right now.");
    if (turn.actionUsed && turn.extraWeaponAttacks <= 0) return fail('no_action', 'You already used your action this turn.');

    const enemy = findEnemy(ctx, targetId);
    if (!isLiving(enemy)) return fail('bad_target', 'Pick a living enemy.');

    const attacker = effective(ctx, playerId);
    const range = attacker.weapon?.range || 1;
    if (distance(ctx.combat.positions[playerId], ctx.combat.positions[targetId]) > range) {
        return fail('out_of_range', `Out of range (your ${attacker.weapon?.name || 'weapon'} reaches ${range}).`);
    }

    const out = emitter();
    const raw = weaponDamage(attacker, effective(ctx, targetId));
    out.push({ type: 'attack', actorId: playerId, targetId });
    const dealt = withStrike(ctx, weaponStrike(ctx, playerId), () =>
        applyDamage(ctx, out, { sourceId: playerId, targetId, amount: raw, reflectable: true, minimumDamage: 1 }));
    if (dealt > 0) {
        const text = `${attacker.name} hits ${enemy.name} with the ${attacker.weapon?.name || 'weapon'} for ${dealt} damage.`;
        out.message(text);
        logTurn(ctx, text, weaponBeat(ctx, playerId, targetId, dealt));
    }

    if (turn.extraWeaponAttacks > 0) turn.extraWeaponAttacks -= 1;
    else turn.actionUsed = true;

    resolveDeaths(ctx, out);
    return { ok: true, events: out.events };
}

function validateAbilityTarget(ctx, casterId, ability, { targetId, targets, targetPosition }) {
    const casterPos = ctx.combat.positions[casterId];
    const inRange = (pos) => !ability.range || (pos && distance(casterPos, pos) <= ability.range);
    const livingEnemy = (id) => isLiving(findEnemy(ctx, id));
    const livingPlayer = (id) => isPlayer(ctx, id) && isLiving(ctx.characters[id]);

    switch (ability.targetType) {
        case 'self':
        case 'all-allies':
        case 'all-enemies':
            return null;
        case 'single-enemy':
            if (!livingEnemy(targetId)) return fail('bad_target', 'Pick a living enemy.');
            if (!inRange(ctx.combat.positions[targetId])) return fail('out_of_range', `Out of range (${ability.name} reaches ${ability.range}).`);
            return null;
        case 'ally':
            if (!livingPlayer(targetId)) return fail('bad_target', 'Pick a party member who is still standing.');
            if (!inRange(ctx.combat.positions[targetId])) return fail('out_of_range', `Out of range (${ability.name} reaches ${ability.range}).`);
            return null;
        case 'multi-enemy': {
            const list = [...new Set(Array.isArray(targets) ? targets : [])];
            if (list.length === 0 || list.length > (ability.maxTargets || 2)) return fail('bad_target', `Pick 1-${ability.maxTargets || 2} enemies.`);
            if (!list.every(livingEnemy)) return fail('bad_target', 'Pick living enemies.');
            if (!list.every(id => inRange(ctx.combat.positions[id]))) return fail('out_of_range', `Out of range (${ability.name} reaches ${ability.range}).`);
            return null;
        }
        case 'ground-target':
            if (!isInBounds(targetPosition)) return fail('bad_target', 'Pick a tile on the board.');
            if (!inRange(targetPosition)) return fail('out_of_range', `Out of range (${ability.name} reaches ${ability.range}).`);
            return null;
        case 'relocate':
            if (!livingEnemy(targetId) && !livingPlayer(targetId)) return fail('bad_target', 'Pick someone to move.');
            if (!inRange(ctx.combat.positions[targetId])) return fail('out_of_range', `Out of range (${ability.name} reaches ${ability.range}).`);
            if (!isInBounds(targetPosition)) return fail('bad_target', 'Pick an empty tile to send them to.');
            if (occupiedCells(ctx.combat.positions, targetId).has(tileKey(targetPosition.row, targetPosition.col))) return fail('bad_target', 'That tile is taken.');
            return null;
        default:
            return fail('bad_target', 'This ability cannot be used.');
    }
}

function abilityBeat(ctx, actorId, abilityId, targetId) {
    return { kind: 'ability', abilityId, actor: unitInfo(ctx, actorId), target: targetId ? unitInfo(ctx, targetId) : null };
}

export function isBonusAction(ability) {
    return ability?.consumesAction === false;
}

/** Why the player can't use this ability now, or null if they can. */
export function abilityBlocker(ctx, playerId, abilityId) {
    const problem = checkActor(ctx, playerId);
    if (problem) return problem;
    const ability = getAbility(abilityId);
    if (!ability) return fail('unknown_ability', 'Unknown ability.');
    if (!abilityIdsOf(ctx.characters[playerId]).includes(abilityId)) return fail('not_owned', "You don't have that ability.");
    if ((cooldownsOf(ctx, playerId)[abilityId] || 0) > 0) return fail('cooldown', `${ability.name} is on cooldown.`);
    if (hasControlLock(ctx, playerId, 'preventActions')) return fail('locked', "You can't act right now.");
    if (abilitiesDisabled(ctx, playerId)) return fail('disabled', 'Your abilities are disabled.');

    const turn = ctx.combat.turn;
    if (isBonusAction(ability) ? turn.bonusActionUsed : turn.actionUsed) {
        return fail('no_action', isBonusAction(ability) ? 'You already used your bonus action.' : 'You already used your action this turn.');
    }
    return null;
}

/**
 * @param {object} intent - { abilityId, targetId?, targets?, targetPosition? }
 */
export function useAbility(ctx, playerId, intent = {}) {
    const { abilityId } = intent;
    const blocker = abilityBlocker(ctx, playerId, abilityId);
    if (blocker) return blocker;

    const ability = getAbility(abilityId);
    const targetProblem = validateAbilityTarget(ctx, playerId, ability, intent);
    if (targetProblem) return targetProblem;

    const result = executeAbility(abilityId, {
        caster: effective(ctx, playerId),
        playerName: playerId,
        target: NO_TARGET_TYPES.has(ability.targetType) ? null : (intent.targetId ?? null),
        targets: ability.targetType === 'multi-enemy' ? [...new Set(intent.targets)] : (intent.targetId ? [intent.targetId] : undefined),
        targetPosition: intent.targetPosition ? { row: intent.targetPosition.row, col: intent.targetPosition.col } : undefined,
        characterPositions: ctx.combat.positions,
        cooldowns: cooldownsOf(ctx, playerId),
        random: ctx.random,
        ...abilityParams(ctx, playerId)
    });
    if (!result.success) return fail('ability_failed', result.message || `${ability.name} failed.`);

    const turn = ctx.combat.turn;
    cooldownsOf(ctx, playerId)[abilityId] = result.newCooldown;
    if (isBonusAction(ability)) turn.bonusActionUsed = true;
    else turn.actionUsed = true;
    turn.usedAbility = true;

    const out = emitter();
    out.push({ type: 'ability', actorId: playerId, abilityId, targetId: intent.targetId ?? null, targetPosition: intent.targetPosition ?? null });
    out.message(result.message);
    logTurn(ctx, result.message, abilityBeat(ctx, playerId, abilityId, intent.targetId));
    withStrike(ctx, abilityStrike(playerId, abilityId), () => applyAbilityResult(ctx, out, playerId, result));
    resolveDeaths(ctx, out);
    return { ok: true, events: out.events };
}

/** True while the acting player still has something to do: move, act, or use a bonus ability. */
export function canStillAct(ctx, playerId) {
    const turn = ctx.combat.turn;
    if (!turn || turn.finished || turn.id !== playerId || !isLiving(ctx.characters[playerId])) return false;
    if (movementLeft(ctx, playerId) > 0 && !hasControlLock(ctx, playerId, 'preventMovement')) return true;
    if (hasControlLock(ctx, playerId, 'preventActions')) return false;
    if (!turn.actionUsed || turn.extraWeaponAttacks > 0) return true;
    if (turn.bonusActionUsed) return false;
    return abilityIdsOf(ctx.characters[playerId]).some(id => isBonusAction(getAbility(id)) && !abilityBlocker(ctx, playerId, id));
}

/** Checks that `playerId` may end the turn now. */
export function canEndTurn(ctx, playerId) {
    const { combat } = ctx;
    if (!combat || combat.endedResult) return fail('no_combat', 'There is no fight going on.');
    const turn = combat.turn;
    if (!turn || turn.finished || turn.type !== 'ally' || turn.id !== playerId) return fail('not_your_turn', "It's not your turn.");
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Enemy turns
// ---------------------------------------------------------------------------

function enemyView(ctx) {
    const players = Object.fromEntries(Object.keys(ctx.characters || {}).map(id => [id, { ...effective(ctx, id), id }]));
    const enemies = ctx.combat.enemies.map(enemy => effective(ctx, enemy.id));
    return { players, enemies };
}

/** Decides what the current enemy will do (see planEnemyTurn). */
export function planEnemy(ctx, enemyId) {
    const enemy = findEnemy(ctx, enemyId);
    if (!isLiving(enemy)) return null;

    const { players, enemies } = enemyView(ctx);
    const targetable = (ctx.targetablePlayers || Object.keys(ctx.characters || {}))
        .filter(id => isLiving(ctx.characters[id]) && ctx.combat.positions[id]);
    const allies = livingEnemies(ctx).map(other => other.id).filter(id => id !== enemyId);

    return planEnemyTurn(
        enemies.find(candidate => candidate.id === enemyId),
        targetable,
        allies,
        enemies,
        players,
        ctx.combat.positions,
        ctx.combat.activeEffects,
        ctx.combat.sceneKey
    );
}

/**
 * First half of an enemy turn: its ability (if it chose one) and its movement.
 * Returns { events, moveSteps } - moveSteps tiles walked, for pacing the animation.
 */
export function runEnemyAbilityAndMove(ctx, enemyId, plan) {
    const out = emitter();
    const enemy = findEnemy(ctx, enemyId);
    if (!plan || !isLiving(enemy) || plan.skipTurn) {
        if (plan?.skipTurn && enemy) {
            const text = `${enemy.name} strains against its restraints.`;
            out.message(text);
            logTurn(ctx, text);
        }
        return { events: out.events, moveSteps: 0 };
    }

    if (plan.abilityToUse) {
        const ability = getAbility(plan.abilityToUse.id);
        const targetPosition = ability?.targetType === 'ground-target' && plan.target ? ctx.combat.positions[plan.target] : undefined;
        const result = ability && (ability.targetType !== 'ground-target' || targetPosition)
            ? executeAbility(ability.id, {
                caster: effective(ctx, enemyId),
                playerName: enemyId,
                target: plan.target,
                targets: ability.targetType === 'multi-enemy' && plan.target ? [plan.target] : undefined,
                targetPosition,
                characterPositions: ctx.combat.positions,
                cooldowns: cooldownsOf(ctx, enemyId),
                random: ctx.random,
                ...abilityParams(ctx, enemyId)
            })
            : { success: false };

        if (result.success) {
            cooldownsOf(ctx, enemyId)[ability.id] = result.newCooldown;
            if (ctx.combat.turn) ctx.combat.turn.usedAbility = true;
            const text = result.message || `${enemy.name} uses ${ability.name}.`;
            out.push({ type: 'ability', actorId: enemyId, abilityId: ability.id, targetId: plan.target || null });
            out.message(text);
            logTurn(ctx, text, abilityBeat(ctx, enemyId, ability.id, plan.target));
            withStrike(ctx, abilityStrike(enemyId, ability.id), () => applyAbilityResult(ctx, out, enemyId, result));
            resolveDeaths(ctx, out);
        }
    }

    let moveSteps = 0;
    const stillStanding = isLiving(findEnemy(ctx, enemyId));
    const start = ctx.combat.positions[enemyId];
    if (stillStanding && plan.movement && start && !hasControlLock(ctx, enemyId, 'preventMovement')) {
        const path = findPath(start, plan.movement, { positions: ctx.combat.positions, movingId: enemyId, activeEffects: ctx.combat.activeEffects });
        if (path && path.length > 0) {
            ctx.combat.positions[enemyId] = { row: plan.movement.row, col: plan.movement.col };
            moveSteps = path.length;
            dropGtgMarkers(ctx, enemyId);
            const speed = Math.max(1, effective(ctx, enemyId)?.stats?.speed || 0);
            out.push({ type: 'move', unitId: enemyId, path, stepMs: Math.round(Math.max(120, Math.min(600, 10000 / speed))) });
            logMove(ctx, enemyId, start, plan.movement);
        }
    }

    return { events: out.events, moveSteps };
}

/** Second half of an enemy turn: its weapon attack, if it still has a target in reach. */
export function runEnemyAttack(ctx, enemyId, plan) {
    const out = emitter();
    const enemy = findEnemy(ctx, enemyId);
    if (!plan?.useWeapon || !isLiving(enemy)) return { events: out.events };

    const targetId = plan.target;
    const target = ctx.characters[targetId];
    const enemyPos = ctx.combat.positions[enemyId];
    const targetPos = ctx.combat.positions[targetId];
    if (!isLiving(target) || !enemyPos || !targetPos || distance(enemyPos, targetPos) > (enemy.weapon?.range || 1)) {
        return { events: out.events };
    }

    const attacker = effective(ctx, enemyId);
    const defender = effective(ctx, targetId);
    const raw = Math.max(1, Math.round((getEnemyWeaponAttackStatValue(attacker) / 10) * (attacker.weapon?.damage || 0) - (defender.stats.resistance || 0) / 10));

    out.push({ type: 'attack', actorId: enemyId, targetId });
    const dealt = withStrike(ctx, weaponStrike(ctx, enemyId), () =>
        applyDamage(ctx, out, { sourceId: enemyId, targetId, amount: raw, reflectable: true, minimumDamage: 0 }));
    const text = dealt > 0
        ? `${enemy.name} hits ${target.name} for ${dealt} damage.`
        : `${enemy.name} attacks ${target.name}, but the hit does nothing.`;
    out.message(text);
    logTurn(ctx, text, dealt > 0 ? weaponBeat(ctx, enemyId, targetId, dealt) : null);

    resolveDeaths(ctx, out);
    return { events: out.events };
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/** Everything clients need to draw the fight. */
export function combatSnapshot(ctx) {
    const { combat } = ctx;
    const turn = combat.turn;
    const current = currentTurnEntry(ctx);
    return {
        encounterIndex: combat.encounterIndex,
        sceneKey: combat.sceneKey,
        combatType: combat.combatType,
        enemies: combat.enemies,
        positions: combat.positions,
        activeEffects: combat.activeEffects,
        turnOrder: combat.turnOrder,
        currentTurn: current,
        turn: turn && !turn.finished && current && turn.id === current.id
            ? {
                type: turn.type,
                id: turn.id,
                number: turn.number,
                movementUsed: turn.movementUsed,
                movementLeft: turn.type === 'ally' ? movementLeft(ctx, turn.id) : 0,
                actionUsed: turn.actionUsed,
                bonusActionUsed: turn.bonusActionUsed,
                extraWeaponAttacks: turn.extraWeaponAttacks
            }
            : null,
        cooldowns: ctx.cooldowns,
        characters: ctx.characters,
        endedResult: combat.endedResult
    };
}

// Re-exported so callers only need the engine.
export { ABILITIES };
