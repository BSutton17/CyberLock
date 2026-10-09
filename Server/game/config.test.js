import { describe, it, expect } from 'vitest';
import { applyMockPacing } from '../config.js';
import { createMockProvider } from '../narrator/providers/mock.js';

describe('mock mode pacing', () => {
  const base = { allyTurnAdvanceDelayMs: 1200, enemyThinkMs: 700, enemyTurnAdvanceDelayMs: 0, botStepMs: 900, allyTurnTimeoutMs: 40000 };

  it('slows turns down when the offline narrator is used', () => {
    const paced = applyMockPacing(base, {});
    expect(paced.allyTurnAdvanceDelayMs).toBeGreaterThan(base.allyTurnAdvanceDelayMs);
    expect(paced.enemyThinkMs).toBeGreaterThan(base.enemyThinkMs);
    expect(paced.enemyTurnAdvanceDelayMs).toBeGreaterThan(0);
    expect(paced.botStepMs).toBeGreaterThan(base.botStepMs);
    expect(paced.allyTurnTimeoutMs).toBe(40000); // turn limits are untouched
  });

  it('keeps any value set explicitly in the environment', () => {
    expect(applyMockPacing(base, { ENEMY_THINK_MS: '50' }).enemyThinkMs).toBe(700);
  });

  it('lets a combat line arrive a moment after the move it describes', async () => {
    const provider = createMockProvider({ delayMs: 0, combatDelayMs: 60 });
    const started = Date.now();
    await provider.generate({ kind: 'combat', hints: { summary: 'Leo repositions.' } });
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
  });
});
