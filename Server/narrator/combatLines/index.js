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
// away from, {victim} who falls. Pronouns follow the unit: {user.they} {user.them} {user.their}
// {user.self} (and the same for the others) become "she / her / her / herself" for True North.
//
// How a unit is named comes from the scene, the way a person would tell it (see `Scene`):
//   - the party and bosses go by name; a sentence that carries on with the same subject uses a
//     pronoun instead ("Shipment walks up. He swings..."), unless someone else just mentioned
//     shares that pronoun and it would be unclear who is meant. A sentence never opens with
//     "They" (it reads like a group): rank-and-file enemies become "The tech", others keep the name;
//   - rank-and-file enemies get their article from how many of their kind are standing:
//     "an Enforcer Drone" / "one of the Enforcer Drones" / "the closest Enforcer Drone" while
//     there are several, "the Enforcer Drone" when it's alone, "the last Enforcer Drone" when the
//     others have fallen, "another Enforcer Drone" for a second one in the same breath, and
//     "the drone" once it has been pointed out.

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
// An ally ability someone used on themself (the lines are written for helping someone else).
const SELF_TARGETED = {
    heal: ['{user} patches {user.self} up and gets right back to it.', '{user} takes a quick moment to look after {user.self}.', '{user} slaps a fix on {user.their} own worst wound.'],
    buff: ['{user} gives {user.self} a boost and squares up.', '{user} turns the trick on {user.self}, and it works just as well.']
};

const RECENT_LIMIT = 60;

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

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

// What a rank-and-file enemy is called once it has been pointed out ("the drone").
const SHORT_NAMES = {
    enforcer_soldier: 'soldier',
    // Not just "drone": Patchwork has one of his own.
    enforcer_drone: 'enemy drone',
    rebel_initiate: 'initiate',
    rebel_field_tech: 'tech',
    division_command: 'officer',
    division_strategist: 'strategist',
    vanguard_captain: 'captain',
    field_captain: 'captain',
    rebel_coordinator: 'coordinator',
    operations_handler: 'handler',
    division_chief: 'chief',
    rebellion_chief: 'chief'
};
// Unit names that read badly as a person ("a Division Command"): how a sentence names one.
const PERSON_NAMES = { division_command: 'Division Command officer' };
const nounOf = (unit) => PERSON_NAMES[unit.key] || unit.name;

export function pronounSetOf(unit) {
    const set = unit?.side === 'ally'
        ? String(CHARACTERS[unit.key]?.pronouns || 'they').split('/')[0]
        : ENEMY_PRONOUNS[unit?.key] || 'they';
    return PRONOUNS[set] ? set : 'they';
}
const pronounsOf = (unit) => PRONOUNS[pronounSetOf(unit)];

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const indefinite = (noun) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
const plural = (name) => `${name}s`;
const isRankAndFile = (unit) => unit?.side === 'enemy' && !unit.boss;

// ---------------------------------------------------------------------------
// The scene: who has been mentioned, so names, articles and pronouns read naturally
// ---------------------------------------------------------------------------

/**
 * Tracks one turn's narration. `carried` is what the previous turn's narration ended on, so a
 * new turn can pick up an enemy that was just pointed out ("the drone").
 */
class Scene {
    constructor(carried = null) {
        this.mentioned = new Set(); // ids mentioned this turn
        this.kindsMentioned = new Map(); // enemy kind -> ids mentioned this turn
        this.previous = null; // the sentence before: { subject, mentions: [units] }
        this.carried = carried; // { id } from the turn before
        this.last = null; // the last unit mentioned (handed to the next turn)
        this.pronounRun = 0; // sentences in a row that opened with a pronoun
    }

    // Is a pronoun for `unit` clear, as the subject right after `before`?
    static pronounIsClear(unit, before) {
        if (!before?.subject || before.subject.id !== unit.id) return false;
        const set = pronounSetOf(unit);
        return !before.mentions.some(other => other.id !== unit.id && pronounSetOf(other) === set);
    }

    /**
     * How to call `unit` here. `slot`: 'subject' (starts a sentence), 'object', or 'possessive'
     * (followed by 's).
     */
    refer(unit, slot) {
        if (!unit) return '';
        if (!isRankAndFile(unit)) return unit.name;

        const short = SHORT_NAMES[unit.key] || unit.name;
        if (this.mentioned.has(unit.id) || this.carried?.id === unit.id) return `the ${short}`;

        const noun = nounOf(unit);
        const othersStanding = Math.max(0, (unit.kindAlive ?? 1) - (unit.alive === false ? 0 : 1));
        if (othersStanding === 0) {
            return (unit.kindTotal ?? 1) > 1 ? `the last ${noun}` : `the ${noun}`;
        }
        if ((this.kindsMentioned.get(unit.key) || []).some(id => id !== unit.id)) return `another ${noun}`;
        if (unit.closest && slot !== 'subject') return `the closest ${noun}`;
        if (slot === 'object') return `one of the ${plural(noun)}`;
        return indefinite(noun); // a subject, or a possessive ("an Enforcer Drone's rotors")
    }

    note(unit) {
        this.mentioned.add(unit.id);
        if (isRankAndFile(unit)) {
            const ids = this.kindsMentioned.get(unit.key) || [];
            if (!ids.includes(unit.id)) this.kindsMentioned.set(unit.key, [...ids, unit.id]);
        }
        this.last = unit;
    }

    /** Fills a line (one or two sentences) and records who it mentions. */
    fill(template, units) {
        const sentenceAt = (offset) => (template.slice(0, offset).match(/[.!?]["”]?\s+/g) || []).length;
        const sentences = new Map(); // index -> { subject, mentions }
        const sentence = (index) => {
            if (!sentences.has(index)) sentences.set(index, { subject: null, mentions: [] });
            return sentences.get(index);
        };
        const before = (index) => (index === 0 ? this.previous : sentences.get(index - 1) || null);

        const text = template.replace(/\{(\w+)(?:\.(\w+))?\}('s)?/g, (match, key, form, possessive = '', offset) => {
            const unit = units[key];
            const startsSentence = offset === 0 || /[.!?]["”]?\s+$/.test(template.slice(0, offset));
            if (form) {
                const word = pronounsOf(unit)[form] ?? '';
                return (startsSentence ? capitalize(word) : word) + possessive;
            }
            if (!unit) return '';

            const index = sentenceAt(offset);
            const here = sentence(index);
            let out;
            // A pronoun when it's clear who is meant, but not three sentences running.
            if (startsSentence && this.pronounRun < 2 && Scene.pronounIsClear(unit, before(index))) {
                this.pronounRun += 1;
                if (pronounSetOf(unit) === 'they') {
                    // "The tech fires twice" rather than "They fire twice".
                    out = isRankAndFile(unit) ? `The ${SHORT_NAMES[unit.key] || unit.name}` : unit.name;
                } else {
                    out = capitalize(possessive ? pronounsOf(unit).their : pronounsOf(unit).they);
                    possessive = '';
                }
            } else {
                if (startsSentence) this.pronounRun = 0;
                out = this.refer(unit, startsSentence ? 'subject' : possessive ? 'possessive' : 'object');
                if (startsSentence) out = capitalize(out);
            }
            if (startsSentence) here.subject = unit;
            here.mentions.push(unit);
            this.note(unit);
            return out + possessive;
        });

        const lastIndex = Math.max(-1, ...sentences.keys());
        this.previous = lastIndex >= 0 ? sentences.get(lastIndex) : { subject: null, mentions: [] };
        return capitalize(text.replace(/\s{2,}/g, ' ').trim());
    }
}

/** "the Enforcer Soldier" on its own, outside a scene. */
export function displayName(unit) {
    if (!unit) return '';
    return isRankAndFile(unit) ? `the ${unit.name}` : unit.name;
}

// ---------------------------------------------------------------------------
// Narrator
// ---------------------------------------------------------------------------

/**
 * One narrator per server. `memory` (one per room: { recent: Set }) keeps it from repeating lines
 * and remembers what the last turn ended on. A bare Set works too (no carry-over).
 */
export function createCombatNarrator({ random = Math.random } = {}) {
    function pick(list, recent) {
        const options = (list || []).filter(Boolean);
        if (options.length === 0) return null;
        const fresh = options.filter(line => !recent?.has(line));
        const pool = fresh.length ? fresh : options;
        const line = pool[Math.floor(random() * pool.length) % pool.length];
        if (recent) {
            recent.add(line);
            if (recent.size > RECENT_LIMIT) recent.delete(recent.values().next().value);
        }
        return line;
    }

    const isDrone = (unit) => /drone/i.test(unit?.name || '');

    /**
     * @param {object[]} beats - one turn's beats from the engine
     * @param {object} [options] - { memory }
     * @returns {string} the narration, or '' if nothing happened
     */
    function narrateTurn(beats = [], { memory } = {}) {
        const room = memory instanceof Set ? { recent: memory } : (memory || {});
        const scene = new Scene(room.carried || null);
        const sentences = [];
        const used = new Set();
        const healedInField = [];

        // Kills credited to the strike that just happened (same actor, same weapon or ability).
        const killsAfter = (index, matches) => beats
            .map((beat, at) => ({ beat, at }))
            .filter(({ beat, at }) => at > index && !used.has(at) && beat.kind === 'kill' && beat.strike && matches(beat.strike));

        const say = (lines, units) => {
            const line = pick(lines, room.recent);
            if (line) sentences.push(scene.fill(line, units));
        };

        beats.forEach((beat, index) => {
            if (used.has(index)) return;
            switch (beat.kind) {
                case 'move': {
                    const set = MOVEMENT[beat.actor?.key];
                    const lines = beat.other ? (set?.[beat.direction] || GENERIC_MOVES[beat.direction]) : GENERIC_MOVES.alone;
                    say(lines, { user: beat.actor, other: beat.other });
                    break;
                }
                case 'weapon': {
                    const units = { user: beat.actor, target: beat.target };
                    const [kill] = killsAfter(index, strike => strike.kind === 'weapon' && strike.actorId === beat.actor?.id)
                        .filter(({ beat: k }) => k.victim?.id === beat.target?.id);
                    const killLines = kill && WEAPON_KILLS[beat.weapon]?.[kill.beat.victim?.key];
                    if (killLines) {
                        used.add(kill.at);
                        say(killLines, { ...units, victim: kill.beat.victim });
                    } else {
                        say(WEAPON_HITS[beat.weapon]?.[damageTier(beat.share || 0)] || GENERIC_HITS, units);
                    }
                    break;
                }
                case 'ability': {
                    const units = { user: beat.actor, target: beat.target };
                    const kills = killsAfter(index, strike => strike.kind === 'ability' && strike.abilityId === beat.abilityId && strike.actorId === beat.actor?.id);
                    const finalLines = kills.length && FINAL_BLOWS[beat.abilityId]?.[kills[0].beat.victim?.key];
                    if (finalLines) {
                        used.add(kills[0].at);
                        say(finalLines, { ...units, victim: kills[0].beat.victim });
                    } else if (beat.target && beat.target.id === beat.actor?.id) {
                        say(/heal|show_must|blackjack|love/.test(beat.abilityId) ? SELF_TARGETED.heal : SELF_TARGETED.buff, units);
                    } else {
                        const lines = ABILITY_LINES[beat.abilityId] || GENERIC_ABILITY;
                        // Lines that name a target only fit when there is one.
                        const fitting = beat.target ? lines : lines.filter(line => !/\{target[}.]/.test(line));
                        say(fitting.length ? fitting : GENERIC_ABILITY, units);
                    }
                    break;
                }
                case 'kill': {
                    const { victim, strike } = beat;
                    let lines = null;
                    if (strike?.kind === 'weapon') lines = WEAPON_KILLS[strike.weapon]?.[victim?.key];
                    if (strike?.kind === 'ability') lines = FINAL_BLOWS[strike.abilityId]?.[victim?.key];
                    if (!(lines && strike?.actor)) lines = isDrone(victim) ? GENERIC_DRONE_FALLS : GENERIC_FALLS;
                    say(lines, { victim, user: strike?.actor });
                    break;
                }
                case 'down':
                    say(ALLY_FALLS, { victim: beat.victim });
                    break;
                case 'note': {
                    const match = /^(.+?) heals \d+ in the healing field\.$/.exec(beat.text || '');
                    if (match) healedInField.push(match[1]);
                    else if (beat.text) {
                        sentences.push(flavorCombatLog([beat.text]));
                        scene.previous = { subject: null, mentions: [] };
                    }
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

        // The next turn can pick up the enemy this one ended on, if it's still standing.
        if (memory && !(memory instanceof Set)) {
            const last = scene.last;
            memory.carried = last && last.alive !== false && isRankAndFile(last) ? { id: last.id } : null;
        }
        return sentences.filter(Boolean).join(' ');
    }

    return { narrateTurn };
}
