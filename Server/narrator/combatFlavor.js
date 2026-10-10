// Turns the combat engine's plain log ("Patchwork hits Enforcer Drone with the Drone for 18
// damage.") into a line of narration ("Patchwork sends the drone zooming at the Enforcer Drone,
// landing a solid blow."). Used for the turns the AI narrator doesn't write and whenever it is
// unavailable. Narration never shows numbers; the combat log keeps those.

// How each weapon looks when it lands. {a} is the attacker, {b} the target.
const WEAPON_SHOTS = {
    'Hammer': ['{a} brings the hammer down on {b}', '{a} swings the hammer into {b}'],
    'Taser Shield': ['{a} slams the taser shield into {b}', '{a} drives the crackling shield into {b}'],
    'Ray Gun': ['{a} hurls a ball of blue fire at {b}', 'Blue flame leaps from {a}\'s hand into {b}'],
    'Energy Sword': ['{a}\'s energy sword carves into {b}', '{a} slips in close and slashes {b}'],
    'Shotgun': ['{a} unloads the shotgun into {b}', '{a} racks the shotgun and fires at {b}'],
    'Drone': ['{a} sends the drone zooming at {b}', '{a}\'s drone dives at {b}'],
    'Electric Guitar': ['{a} hits a chord and the shockwave rattles {b}', '{a} rips a riff that slams into {b}'],
    'Magic Energy': ['{a} hurls a crackle of energy at {b}', 'Energy spills from {a}\'s hands into {b}'],
    'Laptop': ['{a} fires a burst of code at {b}', '{a} types fast and something in {b}\'s gear sparks'],
};
const GENERIC_SHOTS = ['{a} lands a hit on {b} with the {w}', '{a} goes at {b} with the {w}'];

// How hard a hit felt, from the damage it did.
const impact = (amount) => (amount <= 8 ? 'a glancing blow' : amount <= 25 ? 'a solid blow' : 'a brutal blow');

const ENEMY_HITS = ['{e} catches {p} with {impact}', '{e} lunges at {p} and lands {impact}', '{e} gets through to {p} with {impact}'];
const DRONE_FALLS = ['{x}\'s lights flicker for a moment before it drops lifelessly to the ground.', '{x} sparks, sputters and crashes to the floor.'];
const ENEMY_FALLS = ['{x} crumples and doesn\'t get back up.', '{x} staggers, then hits the ground hard.', '{x} goes down and stays down.'];
const ALLY_FALLS = ['{x} hits the ground hard and doesn\'t get up.', '{x} drops to one knee, then collapses.'];

const pick = (list, random) => list[Math.floor(random() * list.length) % list.length];
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Removes damage, healing and other numbers from a line of narration.
 * "Leo heals for 12 HP" -> "Leo heals"; "gains +15 Speed for 2 turns" -> "gains Speed".
 */
export function scrubNumbers(text) {
    return String(text || '')
        .replace(/\s*\bfor \d+(\.\d+)? (?:damage|HP|health)(?: each)?/gi, '')
        .replace(/\s*\bfor \d+ (?:more )?turns?/gi, '')
        .replace(/\bby \d+(\.\d+)?%?/gi, '')
        .replace(/\b(\d+(\.\d+)?) (damage|HP)\b/gi, '$3')
        .replace(/[+-]?\d+(\.\d+)?%?\s*/g, '')
        .replace(/\s+([!.,?])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * @param {string[]} lines - the engine's log for one turn
 * @param {object} context - { party: [{ characterName }], enemies: [{ name, tier }] }
 * @param {() => number} [random]
 */
export function flavorCombatLog(lines, { enemies = [] } = {}, random = Math.random) {
    const bosses = new Set(enemies.filter(enemy => enemy.tier === 'boss').map(enemy => enemy.name));
    const enemyNames = new Set(enemies.map(enemy => enemy.name));
    // "the Enforcer Soldier", but bosses go by their own names.
    const named = (name) => (enemyNames.has(name) && !bosses.has(name) ? `the ${name}` : name);

    const out = [];
    for (const raw of lines) {
        const line = String(raw || '').trim();
        if (!line) continue;
        let match;

        if ((match = line.match(/^(.+?) hits (.+?) with the (.+?) for (\d+) damage\.$/))) {
            const [, a, b, weapon, amount] = match;
            const shot = fill(pick(WEAPON_SHOTS[weapon] || GENERIC_SHOTS, random), { a, b: named(b), w: weapon.toLowerCase() });
            out.push(`${capitalize(shot)}, landing ${impact(Number(amount))}.`);
        } else if ((match = line.match(/^(.+?) hits (.+?) for (\d+) damage\.$/))) {
            const [, e, p, amount] = match;
            out.push(`${capitalize(fill(pick(ENEMY_HITS, random), { e: named(e), p, impact: impact(Number(amount)) }))}.`);
        } else if ((match = line.match(/^(.+?) attacks (.+?), but the hit does nothing\.$/))) {
            out.push(`${match[2]} shrugs off ${named(match[1])}'s attack.`);
        } else if ((match = line.match(/^(.+?) falls\.$/))) {
            const x = named(match[1]);
            out.push(capitalize(fill(pick(/drone/i.test(match[1]) ? DRONE_FALLS : ENEMY_FALLS, random), { x })));
        } else if ((match = line.match(/^(.+?) goes down\.$/))) {
            out.push(fill(pick(ALLY_FALLS, random), { x: match[1] }));
        } else if ((match = line.match(/^(.+?) repositions\.$/))) {
            out.push(`${match[1]} shifts to a better position.`);
        } else if ((match = line.match(/^(.+?) advances\.$/))) {
            out.push(`${capitalize(named(match[1]))} closes in.`);
        } else if ((match = line.match(/^(.+?) heals \d+ in the healing field\.$/))) {
            out.push(`${match[1]} catches a breath in the healing field.`);
        } else if ((match = line.match(/^(.+?) chokes in the toxic mist for \d+ damage\.$/))) {
            out.push(`${capitalize(named(match[1]))} chokes in the toxic mist.`);
        } else {
            out.push(scrubNumbers(line));
        }
    }
    return out.filter(Boolean).join(' ');
}
