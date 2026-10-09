import { describe, it, expect } from 'vitest';
import { flavorCombatLog, scrubNumbers } from './combatFlavor.js';

const context = {
  enemies: [
    { name: 'Enforcer Soldier', tier: 'generic' },
    { name: 'Enforcer Drone', tier: 'generic' },
    { name: 'The Architect', tier: 'boss' }
  ]
};
const first = () => 0;

describe('combat flavor', () => {
  it('turns a weapon hit into a line about the weapon, with no numbers', () => {
    const text = flavorCombatLog(['Patchwork hits Enforcer Soldier with the Drone for 18 damage.'], context, first);
    expect(text).toBe('Patchwork sends the drone zooming at the Enforcer Soldier, landing a solid blow.');
  });

  it('has a fitting death for drones and for everyone else', () => {
    expect(flavorCombatLog(['Enforcer Drone falls.'], context, first)).toBe("The Enforcer Drone's lights flicker for a moment before it drops lifelessly to the ground.");
    expect(flavorCombatLog(['Enforcer Soldier falls.'], context, first)).toBe("The Enforcer Soldier crumples and doesn't get back up.");
  });

  it('calls bosses by name, without "the"', () => {
    expect(flavorCombatLog(['The Architect hits Leo for 30 damage.'], context, first)).toBe('The Architect catches Leo with a brutal blow.');
  });

  it('writes one sentence per action', () => {
    const text = flavorCombatLog([
      'Leo hits Enforcer Soldier with the Energy Sword for 40 damage.',
      'Enforcer Soldier falls.'
    ], context, first);
    expect(text.split(/(?<=[.!?])\s+/)).toHaveLength(2);
    expect(text).not.toMatch(/\d/);
  });

  it('never leaves a number in anything it does not recognise', () => {
    const lines = [
      'Livewire casts Love! Leo, Patchwork are healed for 12 HP!',
      'Livewire gave Leo +15 speed for 2 turns!',
      'Shipment uses Defensive Jab on Enforcer Soldier for 31 damage and lowers Resistance by 15!',
      'Patchwork heals 5 in the healing field.',
      'Enforcer Soldier chokes in the toxic mist for 22 damage.'
    ];
    const text = flavorCombatLog(lines, context, first);
    expect(text).not.toMatch(/\d/);
    expect(text).toContain('Patchwork catches a breath in the healing field.');
    expect(text).toContain('The Enforcer Soldier chokes in the toxic mist.');
  });

  it('scrubs numbers out of AI narration too', () => {
    expect(scrubNumbers('Leo heals for 12 HP.')).toBe('Leo heals.');
    expect(scrubNumbers('The blast deals 40 damage to the drone.')).toBe('The blast deals damage to the drone.');
    expect(scrubNumbers('No numbers here.')).toBe('No numbers here.');
  });
});
