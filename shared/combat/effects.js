// Ability execution, cooldowns, and the rules for active effects (buffs, debuffs, damage keywords,
// damage/heal over time and zones).
//
// Effect lifecycle: every effect has an owner (whoever caused it) and ticks only when its owner's
// turn ends. A new effect is "pending" (appliedThisTurn) until the owner's current turn ends, then
// counts down once per owner turn. Effects created with tickOnCastTurn start active immediately.
//
// Stat effects never change a unit's base stats; effective stats are worked out on demand for
// players and enemies alike.

import { ABILITIES } from './abilities.js';
import { isInsideArea } from './grid.js';

export function getAbility(abilityId) {
    return ABILITIES[abilityId] || null;
}

export function isAbilityReady(abilityId, cooldowns = {}) {
    if (!getAbility(abilityId)) return false;
    return (cooldowns[abilityId] || 0) === 0;
}

export function executeAbility(abilityId, params) {
    const ability = getAbility(abilityId);
    if (!ability) {
        return { success: false, message: 'Ability not found' };
    }
    if (!isAbilityReady(abilityId, params.cooldowns || {})) {
        return { success: false, message: 'Ability on cooldown' };
    }

    const result = ability.execute(params);
    if (result.success) {
        // +1 because cooldowns tick at the end of the turn the ability was used in.
        result.newCooldown = ability.cooldown + 1;
    }
    return result;
}

export function tickCooldowns(cooldowns = {}) {
    const next = { ...cooldowns };
    Object.keys(next).forEach(abilityId => {
        if (next[abilityId] > 0) next[abilityId]--;
    });
    return next;
}

export function isEffectActiveNow(effect) {
    return effect?.turnsRemaining > 0 && !effect?.appliedThisTurn;
}

const numberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export const ZONE_EFFECT_TYPES = new Set(['healing_field', 'toxic_mist_field', 'blizzard_field', 'fireball_zone', 'black_hole_zone']);

export const isZone = (effect) => ZONE_EFFECT_TYPES.has(effect?.type) && !!effect.center;

// Zones affect units by side: a healing field helps its caster's side, mist and blizzard hurt the
// other side. Zones from before sides were recorded count as the party's.
export const zoneSide = (effect) => (effect?.side === 'enemy' ? 'enemy' : 'ally');

export function zonesAffecting(activeEffects = [], { type, side, position, helpful }) {
    if (!position) return [];
    return (activeEffects || []).filter(effect =>
        effect?.type === type &&
        effect.turnsRemaining > 0 &&
        isZone(effect) &&
        (helpful ? zoneSide(effect) === side : zoneSide(effect) !== side) &&
        isInsideArea(position, effect.center, effect.radius ?? 1)
    );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const COMBAT_STATS = ['speed', 'resistance', 'strength', 'ta'];

function statBreakdown(unit, unitId, statName, activeEffects = []) {
    const baseValue = Number(unit?.stats?.[statName]) || 0;
    const relevant = (activeEffects || []).filter(effect =>
        effect?.target === unitId &&
        effect?.stat === statName &&
        (effect?.type === 'stat_buff' || effect?.type === 'stat_debuff') &&
        isEffectActiveNow(effect)
    );

    const flatModifier = relevant.reduce((total, effect) => total + (numberOrNull(effect.value) ?? 0), 0);
    const multiplier = relevant.reduce((product, effect) => product * (numberOrNull(effect.multiplier) ?? 1), 1);
    const preMultiplierTotal = baseValue + flatModifier;
    const totalValue = multiplier !== 1 ? Math.floor(preMultiplierTotal * multiplier) : preMultiplierTotal;

    return { baseValue, totalValue, displayModifier: totalValue - baseValue };
}

/** Base stat plus active buffs/debuffs (zones not included). Works for players and enemies. */
export function calculateTotalStat(unit, unitId, statName, activeEffects) {
    return statBreakdown(unit, unitId, statName, activeEffects).totalValue;
}

/** Stat modifiers for the character sheet, e.g. { speed: 15, ta: -10 }. */
export function getStatBonuses(unit, unitId, activeEffects) {
    const bonuses = {};
    if (!unit?.stats) return bonuses;
    Object.keys(unit.stats).forEach(statName => {
        const { displayModifier } = statBreakdown(unit, unitId, statName, activeEffects);
        if (displayModifier !== 0) bonuses[statName] = displayModifier;
    });
    return bonuses;
}

/**
 * The unit with buffs, debuffs and zones applied to speed/resistance/strength/ta.
 * Health is untouched (bonus health is a separate shield, see absorbWithBonusHealth).
 * @param side - 'ally' for party members, 'enemy' for enemies
 * @param position - where the unit stands, for zones
 */
export function effectiveUnit(unit, unitId, { activeEffects = [], side = 'ally', position = null } = {}) {
    if (!unit?.stats) return unit;
    const stats = { ...unit.stats };
    COMBAT_STATS.forEach(statName => {
        if (statName in unit.stats) stats[statName] = calculateTotalStat(unit, unitId, statName, activeEffects);
    });
    if (zonesAffecting(activeEffects, { type: 'blizzard_field', side, position, helpful: false }).length > 0) {
        stats.speed = Math.floor((stats.speed || 0) / 2);
    }
    return { ...unit, stats };
}

// ---------------------------------------------------------------------------
// Damage keywords
// ---------------------------------------------------------------------------

export function hasDamageImmunity(activeEffects = [], targetId) {
    return activeEffects.some(effect => effect.type === 'damage_immunity' && effect.target === targetId && isEffectActiveNow(effect));
}

export function getDamageTakenMultiplier(activeEffects = [], targetId) {
    return activeEffects
        .filter(effect => effect.type === 'damage_taken_multiplier' && effect.target === targetId && isEffectActiveNow(effect))
        .reduce((product, effect) => product * (effect.value || 1), 1);
}

export function hasDamageReflection(activeEffects = [], targetId) {
    return activeEffects.some(effect => effect.type === 'damage_reflection' && effect.target === targetId && isEffectActiveNow(effect));
}

export function isHealingPrevented(activeEffects = [], targetId) {
    return (activeEffects || []).some(effect => effect?.type === 'healing_prevented' && effect.target === targetId && effect.turnsRemaining > 0);
}

/** Immunity zeroes damage; curses scale it. Results are whole numbers. */
export function applyDamageKeywords(amount, activeEffects = [], targetId, { minimumDamage = 0 } = {}) {
    if (hasDamageImmunity(activeEffects, targetId)) return 0;
    const scaled = Math.round(Math.max(0, amount || 0) * getDamageTakenMultiplier(activeEffects, targetId));
    return Math.max(minimumDamage, scaled);
}

// Temporary "bonus health" buffs soak damage before real health does.
// Returns { remainingDamage, effects } with the buffs reduced or removed.
export function absorbWithBonusHealth(damage, activeEffects = [], targetId) {
    let remainingDamage = Math.max(0, damage || 0);
    const effects = [];

    for (const effect of activeEffects || []) {
        const isBonusHealth =
            effect?.type === 'stat_buff' &&
            effect.stat === 'health' &&
            effect.target === targetId &&
            effect.turnsRemaining > 0 &&
            (Number(effect.value) || 0) > 0;

        if (!isBonusHealth || remainingDamage <= 0) {
            effects.push(effect);
            continue;
        }

        const value = Number(effect.value) || 0;
        if (value <= remainingDamage) {
            remainingDamage -= value; // fully used up: drop the buff
        } else {
            effects.push({ ...effect, value: value - remainingDamage });
            remainingDamage = 0;
        }
    }

    return { remainingDamage, effects };
}

export function maxHealthOf(unit) {
    return Math.max(1, unit?.stats?.maxHealth || unit?.stats?.max_health || unit?.stats?.health || 1);
}

export function withHealth(unit, health) {
    return { ...unit, stats: { ...unit.stats, health: Math.max(0, Math.min(maxHealthOf(unit), health)) } };
}

// ---------------------------------------------------------------------------
// Adding effects
// ---------------------------------------------------------------------------

// Instant effects are handled by the engine when the ability lands and never sit in the list.
export const INSTANT_EFFECT_TYPES = new Set(['cooldown_reduction', 'cooldown_reset', 'cooldown_increase', 'extra_weapon_attacks']);

/** Turns an ability's effect into an active effect owned by `ownerId`. */
export function createActiveEffect(effect, { ownerId = null, side = 'ally' } = {}) {
    const turns = Number.isFinite(effect.duration)
        ? effect.duration
        : (Number.isFinite(effect.turnsRemaining) ? effect.turnsRemaining : 1);

    const active = {
        ...effect,
        turnsRemaining: Math.max(1, turns),
        appliedThisTurn: !effect.tickOnCastTurn,
        ownerTurnId: effect.ownerTurnId ?? ownerId
    };
    if (isZone(active)) active.side = side;
    return active;
}

export function removeEffectsOwnedBy(activeEffects = [], ownerIds = []) {
    const owners = new Set((ownerIds || []).filter(Boolean));
    if (owners.size === 0) return activeEffects;
    return (activeEffects || []).filter(effect => !owners.has(effect?.ownerTurnId));
}
