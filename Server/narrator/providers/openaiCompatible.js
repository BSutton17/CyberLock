// Works with any OpenAI-style /chat/completions API. Gemini exposes one at
// https://generativelanguage.googleapis.com/v1beta/openai (pass your Gemini key as the API key).

export const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

export function createOpenAiCompatibleProvider({
  name = 'openai-compatible',
  baseUrl,
  apiKey,
  model,
  reasoningEffort = '',
  timeoutMs = 20000,
  fetchImpl = globalThis.fetch
}) {
  if (!baseUrl || !apiKey || !model) {
    throw new Error(`${name}: baseUrl, apiKey and model are required`);
  }
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

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

      let result = await callOnce(buildBody());

      if (!result.ok && result.status === 400 && (supportsStructuredOutput || supportsReasoningEffort)) {
        // Retry once without the optional parameters.
        supportsStructuredOutput = false;
        supportsReasoningEffort = false;
        result = await callOnce(buildBody());
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
