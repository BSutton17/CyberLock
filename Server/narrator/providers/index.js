import { createMockProvider } from './mock.js';
import { createOpenAiCompatibleProvider, GEMINI_OPENAI_BASE_URL } from './openaiCompatible.js';
import { createAnthropicProvider } from './anthropic.js';

// Builds the provider named by AI_PROVIDER. Falls back to the offline mock (with a warning) when
// the chosen provider is missing its API key, so local development never breaks.
export function createProvider(aiConfig, { logger = console } = {}) {
  const provider = aiConfig.provider;

  try {
    if (provider === 'gemini') {
      return createOpenAiCompatibleProvider({
        name: 'gemini',
        baseUrl: GEMINI_OPENAI_BASE_URL,
        apiKey: aiConfig.geminiApiKey,
        model: aiConfig.geminiModel,
        reasoningEffort: aiConfig.geminiReasoningEffort,
        timeoutMs: aiConfig.requestTimeoutMs
      });
    }

    if (provider === 'anthropic' || provider === 'claude') {
      return createAnthropicProvider({
        apiKey: aiConfig.anthropicApiKey,
        storyModel: aiConfig.anthropicStoryModel,
        combatModel: aiConfig.anthropicCombatModel,
        timeoutMs: aiConfig.requestTimeoutMs
      });
    }

    if (provider === 'openai-compatible') {
      return createOpenAiCompatibleProvider({
        name: 'openai-compatible',
        baseUrl: aiConfig.openAiCompatibleBaseUrl,
        apiKey: aiConfig.openAiCompatibleApiKey,
        model: aiConfig.openAiCompatibleModel,
        timeoutMs: aiConfig.requestTimeoutMs
      });
    }
  } catch (error) {
    logger.warn(`[AI] ${error.message}. Falling back to the offline mock narrator.`);
    return createMockProvider({ delayMs: aiConfig.mockDelayMs });
  }

  if (provider !== 'mock') {
    logger.warn(`[AI] Unknown AI_PROVIDER "${provider}". Using the offline mock narrator.`);
  }
  return createMockProvider({ delayMs: aiConfig.mockDelayMs });
}
