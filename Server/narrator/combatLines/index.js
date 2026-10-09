// Combat narration from hand-written lines (no AI, so fights cost no credits). The engine records
// each turn as beats (see logTurn in shared/combat/engine.js); this tells them one sentence each:
//
//   move     -> MOVEMENT[mover][advance | retreat | regroup]
//   weapon   -> WEAPON_HITS[weapon][low | medium | high], or WEAPON_KILLS[weapon][enemy] if it killed
//   ability  -> ABILITY_LINES[ability], or FINAL_BLOWS[ability][enemy] if it killed
//   kill     -> the line of whatever dealt the blow (a lingering poison, a reflected hit...)
//   down     -> a party member falling
//
// Placeholders: {user} who acts, {target} who it's aimed at, {other} who a mover heads toward or
// away from, {victim} who falls. Enemies read "the Enforcer Soldier"; bosses go by name.
// Pronouns follow the unit: {user.they} {user.them} {user.their} {user.self} (and the same for
// {target}) become "she / her / her / herself" for True North, "it / it / its / itself" for a drone.

import { MOVEMENT } from './movement.js';
import { ABILITY_LINES } from './abilities.js';
import { FINAL_BLOWS } from './finalBlows.js';
import { WEAPON_HITS } from './weaponHits.js';
import { WEAPON_KILLS } from './weaponKills.js';
import { flavorCombatLog } from '../combatFlavor.js';
import { CHARACTERS } from '../lore.js';

export { MOVEMENT, ABILITY_LINES, FINAL_BLOWS, WEAPON_HITS, WEAPON_KILLS };

// A hit's size next to the target's max health.
export const damageTier = (share) => (share < 0.15 ? 'low' : share < 0.35 ? 'medium' : 'high');

const GENERIC_MOVES = {
    advance: ['{user} closes the distance on {other}.', '{user} pushes up toward {other}.'],
    retreat: ['{user} backs away from {other}.', '{user} gives {other} some room.'],
    regroup: ['{user} falls in beside {other}.', '{user} shifts over toward {other}.'],
    alone: ['{user} shifts to a better position.', '{user} finds new footing.']
};
const GENERIC_FALLS = ['{victim} crumples and does not get back up.', '{victim} goes down and stays down.', '{victim} staggers, then hits the ground hard.'];
const GENERIC_DRONE_FALLS = ["{victim}'s lights flicker before it drops to the ground.", '{victim} sparks, sputters and crashes to the floor.'];
const ALLY_FALLS = ['{victim} hits the ground hard and does not get up.', '{victim} drops to one knee, then collapses.', '{victim} goes down in a heap.'];
const GENERIC_HITS = ['{user} lands a hit on {target}.', '{user} catches {target} with a blow.'];
const GENERIC_ABILITY = ['{user} makes a move.'];

const RECENT_LIMIT = 60;

// "the Enforcer Soldier" for rank-and-file enemies, names for bosses and the party.
export function displayName(unit) {
    if (!unit) return '';
    return unit.side === 'enemy' && !unit.boss ? `the ${unit.name}` : unit.name;
}

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

const PRONOUNS = {
    he: { they: 'he', them: 'him', their: 'his', self: 'himself' },
    she: { they: 'she', them: 'her', their: 'her', self: 'herself' },
    it: { they: 'it', them: 'it', their: 'its', self: 'itself' },
    they: { they: 'they', them: 'them', their: 'their', self: 'themself' }
};
// Enemies that aren't "they": machines and the named bosses.
const ENEMY_PRONOUNS = {
    enforcer_drone: 'it',
    enforcer_genisis: 'it',
    enforcer_the_architect: 'he',
    enforcer_macro_hull: 'he',
    rebel_garret_maxwell: 'he',
    rebel_levi_wicker: 'he',
    rebel_virgil_wesley: 'he'
};

function pronounsOf(unit) {
    const set = unit?.side === 'ally'
        ? String(CHARACTERS[unit.key]?.pronouns || 'they').split('/')[0]
        : ENEMY_PRONOUNS[unit?.key] || 'they';
    return PRONOUNS[set] || PRONOUNS.they;
}

// Fills {user}, {target.their}... from the units in `units`. A word that starts a sentence gets a
// capital ("The Enforcer Soldier", "His"), wherever the sentence is.
function fill(template, units) {
    const line = template.replace(/\{(\w+)(?:\.(\w+))?\}/g, (_, key, form, offset) => {
        const unit = units[key];
        const value = form ? (pronounsOf(unit)[form] ?? '') : displayName(unit);
        const startsSentence = offset === 0 || /[.!?]["”]?\s+$/.test(template.slice(0, offset));
        return startsSentence ? capitalize(value) : value;
    });
    return capitalize(line.replace(/\s{2,}/g, ' ').trim());
}

/**
 * One narrator per server; `memory` (one per room) keeps it from repeating a line it used recently.
 */
export function createCombatNarrator({ random = Math.random } = {}) {
    function pick(list, memory) {
        const options = (list || []).filter(Boolean);
        if (options.length === 0) return null;
        const fresh = options.filter(line => !memory?.has(line));
        const pool = fresh.length ? fresh : options;
        const line = pool[Math.floor(random() * pool.length) % pool.length];
        if (memory) {
            memory.add(line);
            if (memory.size > RECENT_LIMIT) memory.delete(memory.values().next().value);
        }
        return line;
    }

    const isDrone = (unit) => /drone/i.test(unit?.name || '');

    function killLine(kill, memory) {
        const { victim, strike } = kill;
        const values = { victim, user: strike?.actor };
        let lines = null;
        if (strike?.kind === 'weapon') lines = WEAPON_KILLS[strike.weapon]?.[victim?.key];
        if (strike?.kind === 'ability') lines = FINAL_BLOWS[strike.abilityId]?.[victim?.key];
        if (lines && strike?.actor) return fill(pick(lines, memory), values);
        return fill(pick(isDrone(victim) ? GENERIC_DRONE_FALLS : GENERIC_FALLS, memory), values);
    }

    /**
     * @param {object[]} beats - one turn's beats from the engine
     * @param {object} [options] - { memory: Set, summary: string[] (plain log, for odd cases) }
     * @returns {string} the narration, or '' if nothing happened
     */
    function narrateTurn(beats = [], { memory } = {}) {
        const sentences = [];
        const used = new Set();
        const healedInField = [];

        // Kills credited to the strike that just happened (same actor, same weapon or ability).
        const killsAfter = (index, matches) => beats
            .map((beat, at) => ({ beat, at }))
            .filter(({ beat, at }) => at > index && !used.has(at) && beat.kind === 'kill' && beat.strike && matches(beat.strike));

        beats.forEach((beat, index) => {
            if (used.has(index)) return;
            switch (beat.kind) {
                case 'move': {
                    const set = MOVEMENT[beat.actor?.key];
                    const values = { user: beat.actor, other: beat.other };
                    const lines = beat.other ? (set?.[beat.direction] || GENERIC_MOVES[beat.direction]) : GENERIC_MOVES.alone;
                    sentences.push(fill(pick(lines, memory), values));
                    break;
                }
                case 'weapon': {
                    const values = { user: beat.actor, target: beat.target };
                    const [kill] = killsAfter(index, strike => strike.kind === 'weapon' && strike.actorId === beat.actor?.id)
                        .filter(({ beat: k }) => k.victim?.id === beat.target?.id);
                    const killLines = kill && WEAPON_KILLS[beat.weapon]?.[kill.beat.victim?.key];
                    if (killLines) {
                        used.add(kill.at);
                        sentences.push(fill(pick(killLines, memory), { ...values, victim: kill.beat.victim }));
                    } else {
                        sentences.push(fill(pick(WEAPON_HITS[beat.weapon]?.[damageTier(beat.share || 0)] || GENERIC_HITS, memory), values));
                    }
                    break;
                }
                case 'ability': {
                    const values = { user: beat.actor, target: beat.target };
                    const kills = killsAfter(index, strike => strike.kind === 'ability' && strike.abilityId === beat.abilityId && strike.actorId === beat.actor?.id);
                    const finalLines = kills.length && FINAL_BLOWS[beat.abilityId]?.[kills[0].beat.victim?.key];
                    if (finalLines) {
                        used.add(kills[0].at);
                        sentences.push(fill(pick(finalLines, memory), { ...values, victim: kills[0].beat.victim }));
                    } else {
                        const lines = ABILITY_LINES[beat.abilityId] || GENERIC_ABILITY;
                        // Lines that name a target only fit when there is one.
                        const fitting = beat.target ? lines : lines.filter(line => !/\{target[}.]/.test(line));
                        sentences.push(fill(pick(fitting.length ? fitting : GENERIC_ABILITY, memory), values));
                    }
                    break;
                }
                case 'kill':
                    sentences.push(killLine(beat, memory));
                    break;
                case 'down':
                    sentences.push(fill(pick(ALLY_FALLS, memory), { victim: beat.victim }));
                    break;
                case 'note': {
                    const match = /^(.+?) heals \d+ in the healing field\.$/.exec(beat.text || '');
                    if (match) healedInField.push(match[1]);
                    else sentences.push(flavorCombatLog([beat.text]));
                    break;
                }
                default:
                    break;
            }
        });

        if (healedInField.length) {
            const names = healedInField.length === 1
                ? healedInField[0]
                : `${healedInField.slice(0, -1).join(', ')} and ${healedInField[healedInField.length - 1]}`;
            sentences.push(`${names} ${healedInField.length === 1 ? 'catches' : 'catch'} a breath in the healing field.`);
        }
        return sentences.filter(Boolean).join(' ');
    }

    return { narrateTurn };
}
