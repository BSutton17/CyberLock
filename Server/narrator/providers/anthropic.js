// Claude via the official SDK. Story beats use the story model at medium effort; anything else
// (the rules helper) uses the quicker model at low effort. Combat is never sent here: fights are
// narrated from hand-written lines (narrator/combatLines). The system prompt is cached between calls.
import Anthropic from '@anthropic-ai/sdk';

const EFFORT_BY_KIND = { story: 'medium', combat: 'low', rules: 'low' };

// The SDK itself retries busy/overloaded/rate-limited replies (429, 5xx, 529) with backoff and
// honors retry-after. Two retries matches the Gemini provider.
export const ANTHROPIC_MAX_RETRIES = 2;

export const createAnthropicClient = ({ apiKey, timeoutMs }) =>
  new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: ANTHROPIC_MAX_RETRIES });

export function createAnthropicProvider({
  apiKey,
  storyModel = 'claude-sonnet-5-5',
  combatModel = storyModel,
  timeoutMs = 20000,
  client = null
}) {
  if (!apiKey && !client) {
    throw new Error('anthropic: ANTHROPIC_API_KEY is required');
  }
  const anthropic = client || createAnthropicClient({ apiKey, timeoutMs });

  return {
    name: 'anthropic',
    model: storyModel,
    async generate({ kind, system, messages, schema, maxTokens = 1200 }) {
      const model = kind === 'story' ? storyModel : combatModel;
      const response = await anthropic.beta.messages.create({
        model,
        // Thinking tokens count toward max_tokens, so leave headroom above the reply length.
        max_tokens: maxTokens + 3000,
        // If a safety classifier declines, Anthropic re-runs the request on a fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages,
        output_config: {
          effort: EFFORT_BY_KIND[kind] || 'low',
          ...(schema ? { format: { type: 'json_schema', schema } } : {})
        }
      });

      if (response.stop_reason === 'refusal') {
        throw new Error('anthropic: request was declined');
      }

      const text = (response.content || [])
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim();

      if (!text) {
        throw new Error(`anthropic: empty response (stop_reason=${response.stop_reason})`);
      }
      return text;
    }
  };
}
