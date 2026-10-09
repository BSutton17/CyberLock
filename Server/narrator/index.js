import { createProvider } from './providers/index.js';
import { createMockProvider } from './providers/mock.js';
import { createNarrator } from './storyEngine.js';

export { createNarrator } from './storyEngine.js';
export { createProvider } from './providers/index.js';

export function createNarratorFromConfig(aiConfig, { logger = console } = {}) {
  const provider = createProvider(aiConfig, { logger });
  logger.log?.(`[AI] Narrator using ${provider.name}${provider.model && provider.model !== provider.name ? ` (${provider.model})` : ''}`);
  return createNarrator({
    provider,
    decisionsPerInterlude: aiConfig.decisionsPerInterlude,
    mockProvider: createMockProvider({ delayMs: aiConfig.mockDelayMs }),
    logger
  });
}
