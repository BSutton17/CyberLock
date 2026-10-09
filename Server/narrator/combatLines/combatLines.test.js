import { describe, it, expect } from 'vitest';
import { MOVEMENT, ABILITY_LINES, FINAL_BLOWS, WEAPON_HITS, WEAPON_KILLS, createCombatNarrator, damageTier, displayName } from './index.js';
import { ABILITIES } from '../../../shared/combat/abilities.js';
import CharactersData from '../../../shared/data/characters.js';
import EnemiesData from '../../../shared/data/enemies.js';

const characters = CharactersData.characters;
const enemies = EnemiesData.enemies;
const partyWeapons = [...new Set(characters.map(c => c.weapon.name))];
const enemyWeapons = [...new Set(enemies.map(e => e.weapon.name))];

// Abilities that can deal the last point of damage to an enemy.
const DAMAGING = ['quick_jab', 'sparkshot', 'shadow_strike', 'defensive_jab', 'way_too_close', 'charge', 'flood_of_frost',
    'battery_drain', 'counter', 'emp', 'executioners_judgment', 'fireball', 'poison_apple', 'toxic_mist', 'vine_whip', 'white_phospherus'];
const TARGETED = new Set(['single-enemy', 'ally', 'relocate']);

// Every line in the bank with where it lives, for the checks that apply to all of them.
function allLines() {
    const out = [];
    const walk = (node, path) => {
        if (Array.isArray(node)) node.forEach((line, i) => out.push({ line, where: `${path}[${i}]` }));
        else Object.entries(node).forEach(([key, value]) => walk(value, path ? `${path}.${key}` : key));
    };
    walk({ MOVEMENT, ABILITY_LINES, FINAL_BLOWS, WEAPON_HITS, WEAPON_KILLS }, '');
    return out;
}

// Placeholder names, with pronoun forms folded in: {target.their} counts as "target".
const placeholders = (line) => [...line.matchAll(/\{(\w+)(?:\.(they|them|their|self))?\}/g)].map(m => m[1]);

describe('the combat line bank', () => {
    it('has the planned 2,086 lines', () => {
        expect(allLines()).toHaveLength(2086);
    });

    it('gives every character and enemy ten moves: four advancing, three retreating, three regrouping', () => {
        for (const unit of [...characters, ...enemies]) {
            const set = MOVEMENT[unit.id];
            expect(set, unit.id).toBeTruthy();
            expect(set.advance, unit.id).toHaveLength(4);
            expect(set.retreat, unit.id).toHaveLength(3);
            expect(set.regroup, unit.id).toHaveLength(3);
            for (const line of [...set.advance, ...set.retreat, ...set.regroup]) {
                expect(line, unit.id).toContain('{user}');
                expect(line, unit.id).toContain('{other}');
                expect(placeholders(line).every(p => ['user', 'other'].includes(p)), line).toBe(true);
            }
        }
    });

    it('gives every ability eight lines, naming a target only when the ability has one', () => {
        for (const ability of Object.values(ABILITIES)) {
            const lines = ABILITY_LINES[ability.id];
            expect(lines, ability.id).toHaveLength(8);
            for (const line of lines) {
                expect(line, ability.id).toContain('{user}');
                expect(placeholders(line).every(p => ['user', 'target'].includes(p)), line).toBe(true);
                if (!TARGETED.has(ability.targetType)) expect(/\{target[}.]/.test(line), line).toBe(false);
            }
        }
    });

    it('has two final blows for every damaging ability against every enemy', () => {
        expect(Object.keys(FINAL_BLOWS).sort()).toEqual([...DAMAGING].sort());
        for (const abilityId of DAMAGING) {
            for (const enemy of enemies) {
                const lines = FINAL_BLOWS[abilityId][enemy.id];
                expect(lines, `${abilityId} vs ${enemy.id}`).toHaveLength(2);
                for (const line of lines) {
                    expect(line).toContain('{victim}');
                    expect(placeholders(line).every(p => ['user', 'victim'].includes(p)), line).toBe(true);
                }
            }
        }
    });

    it('has six hits per damage tier for party weapons and four for enemy weapons', () => {
        for (const weapon of partyWeapons) {
            for (const tier of ['low', 'medium', 'high']) expect(WEAPON_HITS[weapon]?.[tier], `${weapon} ${tier}`).toHaveLength(6);
        }
        for (const weapon of enemyWeapons) {
            for (const tier of ['low', 'medium', 'high']) expect(WEAPON_HITS[weapon]?.[tier], `${weapon} ${tier}`).toHaveLength(4);
        }
        for (const line of Object.values(WEAPON_HITS).flatMap(tiers => Object.values(tiers).flat())) {
            expect(line).toContain('{user}');
            expect(line).toContain('{target}');
            expect(placeholders(line).every(p => ['user', 'target'].includes(p)), line).toBe(true);
        }
    });

    it('has three kills per party weapon against every enemy', () => {
        for (const weapon of partyWeapons) {
            for (const enemy of enemies) {
                const lines = WEAPON_KILLS[weapon]?.[enemy.id];
                expect(lines, `${weapon} vs ${enemy.id}`).toHaveLength(3);
                for (const line of lines) {
                    expect(line).toContain('{user}');
                    expect(line).toContain('{victim}');
                    expect(placeholders(line).every(p => ['user', 'victim'].includes(p)), line).toBe(true);
                }
            }
        }
    });

    it('never repeats a line', () => {
        const seen = new Map();
        const repeats = [];
        for (const { line, where } of allLines()) {
            if (seen.has(line)) repeats.push(`${where} = ${seen.get(line)}`);
            else seen.set(line, where);
        }
        expect(repeats).toEqual([]);
    });

    it('never states numbers, and every line ends like a sentence', () => {
        for (const { line, where } of allLines()) {
            expect(/\d/.test(line), `${where}: ${line}`).toBe(false);
            expect(/[.!?]["”]?$/.test(line), `${where}: ${line}`).toBe(true);
        }
    });

    it('stays clear of the phrases the style guide bans', () => {
        const banned = /neon-soaked|neon-drenched|neon-lit|the air crackles|electric tension|palpable|tapestry|symphony|dance of|testament to|shrouded|embark|delve|intricate|pulsing with|little did they know|a chill runs down|fate|destiny/i;
        const offenders = allLines().filter(({ line }) => banned.test(line)).map(({ where, line }) => `${where}: ${line}`);
        expect(offenders).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Telling a turn
// ---------------------------------------------------------------------------

const shipment = { id: 'bryson', name: 'Shipment', key: 'offensive_tank_1', side: 'ally', boss: false };
const soldier = { id: 'enforcer_soldier_1', name: 'Enforcer Soldier', key: 'enforcer_soldier', side: 'enemy', boss: false };
const architect = { id: 'enforcer_the_architect_1', name: 'The Architect', key: 'enforcer_the_architect', side: 'enemy', boss: true };
const weaponStrike = { kind: 'weapon', actorId: 'bryson', weapon: 'Hammer', actor: shipment };

describe('narrating a turn', () => {
    it('tells a move, a bonus action and a weapon kill as three sentences, in order', () => {
        const narrator = createCombatNarrator({ random: () => 0 });
        const text = narrator.narrateTurn([
            { kind: 'move', actor: shipment, direction: 'advance', other: soldier },
            { kind: 'ability', abilityId: 'rallying_guard', actor: shipment, target: null },
            { kind: 'weapon', actor: shipment, target: soldier, weapon: 'Hammer', share: 0.5 },
            { kind: 'kill', victim: soldier, strike: weaponStrike }
        ]);
        const [move, bonus, kill] = [MOVEMENT.offensive_tank_1.advance[0], ABILITY_LINES.rallying_guard[0], WEAPON_KILLS.Hammer.enforcer_soldier[0]];
        const fill = (line) => line.replace(/\{user\}/g, 'Shipment').replace(/\{user\.their\}/g, 'his').replace(/\{other\}|\{victim\}/g, 'the Enforcer Soldier');
        expect(text).toBe([fill(move), fill(bonus), fill(kill)].map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));
    });

    it('uses the character name, never the player account, and "the" for rank-and-file enemies', () => {
        const text = createCombatNarrator({ random: () => 0 }).narrateTurn([
            { kind: 'weapon', actor: shipment, target: soldier, weapon: 'Hammer', share: 0.05 }
        ]);
        expect(text).toContain('Shipment');
        expect(text).not.toContain('bryson');
        expect(text).toContain('the Enforcer Soldier');
        expect(displayName(architect)).toBe('The Architect');
    });

    it('capitalizes a name that starts a later sentence', () => {
        const line = ABILITY_LINES.charge.find(l => /\. \{target\}/.test(l));
        const narrator = createCombatNarrator({ random: () => ABILITY_LINES.charge.indexOf(line) / 8 });
        const text = narrator.narrateTurn([{ kind: 'ability', abilityId: 'charge', actor: shipment, target: soldier }]);
        expect(text).toContain('. The Enforcer Soldier');
    });

    it('picks hit lines by how hard the hit was', () => {
        expect(damageTier(0.05)).toBe('low');
        expect(damageTier(0.2)).toBe('medium');
        expect(damageTier(0.5)).toBe('high');
        const text = createCombatNarrator({ random: () => 0 }).narrateTurn([
            { kind: 'weapon', actor: shipment, target: soldier, weapon: 'Hammer', share: 0.6 }
        ]);
        expect(text).toBe(WEAPON_HITS.Hammer.high[0].replace('{user}', 'Shipment').replace('{target}', 'the Enforcer Soldier'));
    });

    it('credits a kill to a lingering effect with that ability\'s final blow', () => {
        const text = createCombatNarrator({ random: () => 0 }).narrateTurn([
            { kind: 'kill', victim: soldier, strike: { kind: 'ability', abilityId: 'poison_apple', actorId: 'bryson', actor: shipment } }
        ]);
        expect(text).toBe(FINAL_BLOWS.poison_apple.enforcer_soldier[0].replace(/\{user\}/g, 'Shipment').replace(/\{victim\}/g, 'the Enforcer Soldier')
            .replace(/^./, c => c.toUpperCase()));
    });

    it('does not repeat a line while fresh ones are left', () => {
        const narrator = createCombatNarrator({ random: () => 0 });
        const memory = new Set();
        const said = new Set();
        for (let i = 0; i < 4; i++) {
            said.add(narrator.narrateTurn([{ kind: 'move', actor: shipment, direction: 'advance', other: soldier }], { memory }));
        }
        expect(said.size).toBe(4);
    });

    it("uses each unit's own pronouns", () => {
        const leo = { id: 'p1', name: 'Leo', key: 'aggressive_dps_2', side: 'ally', boss: false };
        const trueNorth = { id: 'p2', name: 'True North', key: 'jack_of_all_trades_support_3', side: 'ally', boss: false };
        const drone = { id: 'd1', name: 'Enforcer Drone', key: 'enforcer_drone', side: 'enemy', boss: false };
        const line = ABILITY_LINES.shadow_strike.find(l => l.includes('{target.their} ribs'));
        const narrator = createCombatNarrator({ random: () => ABILITY_LINES.shadow_strike.indexOf(line) / 8 });
        expect(narrator.narrateTurn([{ kind: 'ability', abilityId: 'shadow_strike', actor: drone, target: leo }])).toContain('Leo finds out where with his ribs.');
        const guard = ABILITY_LINES.guarded_breath.find(l => l.includes('{user.self}'));
        const guarding = createCombatNarrator({ random: () => ABILITY_LINES.guarded_breath.indexOf(guard) / 8 });
        expect(guarding.narrateTurn([{ kind: 'ability', abilityId: 'guarded_breath', actor: trueNorth, target: leo }])).toContain('herself');
    });
});
