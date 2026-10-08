import { describe, it, expect, vi } from 'vitest';
import { createOpenAiCompatibleProvider, GEMINI_OPENAI_BASE_URL } from './providers/openaiCompatible.js';
import { createAnthropicProvider } from './providers/anthropic.js';
import { createMockProvider } from './providers/mock.js';
import { createProvider } from './providers/index.js';
import { getDecisionOwner, chooseDecisionAttribute, normalizeAttribute } from './decisions.js';
import { parseJsonObject } from './json.js';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
});

const chatBody = (content) => ({ choices: [{ message: { content } }] });

describe('openai-compatible provider (Gemini)', () => {
  const baseConfig = { baseUrl: GEMINI_OPENAI_BASE_URL, apiKey: 'key-123', model: 'gemini-flash-latest' };

  it('posts a chat completion with the schema and returns the message text', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, chatBody('{"narration":"hi"}')));
    const provider = createOpenAiCompatibleProvider({ ...baseConfig, reasoningEffort: 'low', fetchImpl });

    const text = await provider.generate({
      kind: 'story',
      system: 'SYS',
      messages: [{ role: 'user', content: 'USER' }],
      schema: { type: 'object' },
      maxTokens: 500
    });

    expect(text).toBe('{"narration":"hi"}');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${GEMINI_OPENAI_BASE_URL}/chat/completions`);
    expect(init.headers.Authorization).toBe('Bearer key-123');
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([{ role: 'system', content: 'SYS' }, { role: 'user', content: 'USER' }]);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.reasoning_effort).toBe('low');
    expect(body.max_tokens).toBe(500);
  });

  it('retries once without optional parameters after a 400, and remembers that', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(400, { error: 'response_format not supported' }))
      .mockResolvedValue(jsonResponse(200, chatBody('{"answer":"ok"}')));
    const provider = createOpenAiCompatibleProvider({ ...baseConfig, reasoningEffort: 'low', fetchImpl });

    await expect(provider.generate({ kind: 'rules', system: 's', messages: [], schema: {} })).resolves.toBe('{"answer":"ok"}');
    const retryBody = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(retryBody.response_format).toBeUndefined();
    expect(retryBody.reasoning_effort).toBeUndefined();

    await provider.generate({ kind: 'rules', system: 's', messages: [], schema: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body).response_format).toBeUndefined();
  });

  it('throws with the status on other errors and on empty replies', async () => {
    const failing = createOpenAiCompatibleProvider({ ...baseConfig, fetchImpl: async () => jsonResponse(429, 'slow down') });
    await expect(failing.generate({ kind: 'story', system: 's', messages: [] })).rejects.toMatchObject({ status: 429 });

    const empty = createOpenAiCompatibleProvider({ ...baseConfig, fetchImpl: async () => jsonResponse(200, chatBody('')) });
    await expect(empty.generate({ kind: 'story', system: 's', messages: [] })).rejects.toThrow(/empty/);
  });

  it('requires a key, base URL and model', () => {
    expect(() => createOpenAiCompatibleProvider({ baseUrl: 'x', model: 'y' })).toThrow();
  });
});

describe('anthropic provider (Claude)', () => {
  const fakeClient = (response) => {
    const create = vi.fn(async () => response);
    return { client: { beta: { messages: { create } } }, create };
  };

  it('uses the story model at medium effort with structured output, caching and fallbacks', async () => {
    const { client, create } = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"narration":"x"}' }] });
    const provider = createAnthropicProvider({ client, storyModel: 'claude-sonnet-5-5', combatModel: 'claude-haiku-4-5' });

    const text = await provider.generate({ kind: 'story', system: 'SYS', messages: [{ role: 'user', content: 'u' }], schema: { type: 'object' }, maxTokens: 900 });

    expect(text).toBe('{"narration":"x"}');
    const request = create.mock.calls[0][0];
    expect(request.model).toBe('claude-sonnet-5-5');
    expect(request.fallbacks).toBe('default');
    expect(request.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(request.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: { type: 'object' } } });
    expect(request.max_tokens).toBeGreaterThan(900);
  });

  it('uses the combat model at low effort for combat lines', async () => {
    const { client, create } = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] });
    const provider = createAnthropicProvider({ client, storyModel: 'claude-sonnet-5-5', combatModel: 'claude-haiku-4-5' });
    await provider.generate({ kind: 'combat', system: 's', messages: [] });
    expect(create.mock.calls[0][0].model).toBe('claude-haiku-4-5');
    expect(create.mock.calls[0][0].output_config.effort).toBe('low');
  });

  it('throws on refusals and empty replies', async () => {
    const refused = createAnthropicProvider({ client: fakeClient({ stop_reason: 'refusal', content: [] }).client });
    await expect(refused.generate({ kind: 'story', system: 's', messages: [] })).rejects.toThrow(/declined/);

    const empty = createAnthropicProvider({ client: fakeClient({ stop_reason: 'max_tokens', content: [] }).client });
    await expect(empty.generate({ kind: 'story', system: 's', messages: [] })).rejects.toThrow(/empty/);
  });

  it('requires an API key', () => {
    expect(() => createAnthropicProvider({})).toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe('provider factory', () => {
  const quiet = { log: () => {}, warn: vi.fn() };

  it('falls back to the mock when a key is missing', () => {
    const provider = createProvider({ provider: 'gemini', geminiApiKey: '', geminiModel: 'm' }, { logger: quiet });
    expect(provider.name).toBe('mock');
    expect(quiet.warn).toHaveBeenCalled();
  });

  it('builds Gemini and Claude providers when configured', () => {
    expect(createProvider({ provider: 'gemini', geminiApiKey: 'k', geminiModel: 'gemini-flash-latest' }, { logger: quiet }).name).toBe('gemini');
    expect(createProvider({ provider: 'anthropic', anthropicApiKey: 'k', anthropicStoryModel: 'claude-sonnet-5-5' }, { logger: quiet }).name).toBe('anthropic');
    expect(createProvider({ provider: 'mock' }, { logger: quiet }).name).toBe('mock');
  });
});

describe('mock provider', () => {
  it('returns valid JSON for every kind', async () => {
    const provider = createMockProvider();
    for (const kind of ['story', 'combat', 'rules']) {
      expect(parseJsonObject(await provider.generate({ kind, hints: {} }))).not.toBeNull();
    }
  });
});

describe('decisions', () => {
  const attributes = {
    a: ['Medic', 'Spy', 'Politician'],
    b: ['Spy', 'Medic', 'Politician'],
    c: ['Crook', 'Navigator', 'Politician']
  };

  it('normalizes attribute names', () => {
    expect(normalizeAttribute(' Politician ')).toBe('politician');
    expect(normalizeAttribute('wizard')).toBeNull();
  });

  it('gives a decision to whoever ranked the attribute highest, ties to the earlier player', () => {
    expect(getDecisionOwner('spy', ['a', 'b', 'c'], attributes)).toBe('b');
    expect(getDecisionOwner('Politician', ['a', 'b', 'c'], attributes)).toBe('a');
    expect(getDecisionOwner('electrician', ['a', 'b', 'c'], attributes)).toBeNull();
  });

  it('rotates decisions so everyone gets a turn', () => {
    const history = [];
    const owners = [];
    for (let i = 0; i < 3; i++) {
      const choice = chooseDecisionAttribute({ players: ['a', 'b', 'c'], attributesByPlayer: attributes, history });
      owners.push(choice.owner);
      history.push(choice);
    }
    expect(new Set(owners)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('prefers connected players and returns null without attribute data', () => {
    const choice = chooseDecisionAttribute({ players: ['a', 'b', 'c'], attributesByPlayer: attributes, connectedPlayers: ['c'] });
    expect(choice.owner).toBe('c');
    expect(chooseDecisionAttribute({ players: ['a'], attributesByPlayer: {} })).toBeNull();
  });
});

describe('parseJsonObject', () => {
  it('reads plain, fenced, and embedded JSON', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('Sure! {"a":1} hope that helps')).toEqual({ a: 1 });
    expect(parseJsonObject('[1,2]')).toBeNull();
    expect(parseJsonObject('nope')).toBeNull();
  });
});
