// Works with any OpenAI-style /chat/completions API. Gemini exposes one at
// https://generativelanguage.googleapis.com/v1beta/openai (pass your Gemini key as the API key).

export const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

// "Busy" (503) and "slow down" (429) usually clear within a second or two, so wait and try again.
const RETRYABLE_STATUSES = new Set([429, 503]);
export const DEFAULT_RETRY_DELAYS_MS = [1000, 2500];
// After a "quota exceeded" reply, stop asking for this long unless the reply says how long to wait.
export const QUOTA_BACKOFF_MS = 60_000;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// A spent quota (free-tier limit) won't clear in seconds, unlike a momentary rate limit.
const isQuotaExhausted = (result) => result.status === 429 && /quota/i.test(result.text || '');

// Gemini says how long to wait as e.g. "retryDelay": "37s".
function retryDelayMs(text) {
  const match = String(text || '').match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

export function createOpenAiCompatibleProvider({
  name = 'openai-compatible',
  baseUrl,
  apiKey,
  model,
  reasoningEffort = '',
  timeoutMs = 20000,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  sleep = wait,
  now = Date.now,
  fetchImpl = globalThis.fetch
}) {
  if (!baseUrl || !apiKey || !model) {
    throw new Error(`${name}: baseUrl, apiKey and model are required`);
  }
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  // While a spent quota recovers, fail straight away so the game uses its fallback text at once.
  let blockedUntil = 0;

  // Some models reject optional parameters; remember that and stop sending them.
  let supportsStructuredOutput = true;
  let supportsReasoningEffort = Boolean(reasoningEffort);

  const callOnce = async (body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    name,
    model,
    async generate({ kind, system, messages, schema, maxTokens = 1200, temperature = 0.9 }) {
      const buildBody = () => ({
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: maxTokens,
        temperature,
        ...(supportsStructuredOutput && schema
          ? { response_format: { type: 'json_schema', json_schema: { name: `${kind}_response`, schema, strict: true } } }
          : {}),
        ...(supportsReasoningEffort ? { reasoning_effort: reasoningEffort } : {})
      });

      if (now() < blockedUntil) {
        const error = new Error(`${name} is out of quota; trying again in ${Math.ceil((blockedUntil - now()) / 1000)}s`);
        error.status = 429;
        throw error;
      }

      let result = await callOnce(buildBody());

      if (!result.ok && result.status === 400 && (supportsStructuredOutput || supportsReasoningEffort)) {
        // Retry once without the optional parameters.
        supportsStructuredOutput = false;
        supportsReasoningEffort = false;
        result = await callOnce(buildBody());
      }

      for (const delayMs of retryDelaysMs) {
        if (result.ok || !RETRYABLE_STATUSES.has(result.status) || isQuotaExhausted(result)) break;
        await sleep(delayMs);
        result = await callOnce(buildBody());
      }

      if (isQuotaExhausted(result)) {
        blockedUntil = now() + (retryDelayMs(result.text) ?? QUOTA_BACKOFF_MS);
      }

      if (!result.ok) {
        const error = new Error(`${name} request failed with status ${result.status}: ${result.text.slice(0, 300)}`);
        error.status = result.status;
        throw error;
      }

      let payload;
      try {
        payload = JSON.parse(result.text);
      } catch {
        throw new Error(`${name} returned a non-JSON response`);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error(`${name} returned an empty message`);
      }
      return content;
    }
  };
}
