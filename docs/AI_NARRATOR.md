# The AI narrator

The narrator lives in `Server/narrator/`. It replaced the old Python service (archived on the
`archive/python-ai` branch).

## The rule: the game owns the facts, the model writes the words

The game code decides:

- **Structure**: faction choice → opening fight → a few decisions → next fight, through ten fights
  ([`campaign.js`](../Server/narrator/campaign.js) maps each fight to an act, a location and a setup).
- **Who decides**: each decision gets an attribute (Medic, Spy, Crook...) owned by the player who
  ranked it highest. Ownership rotates so every player gets the spotlight
  ([`decisions.js`](../Server/narrator/decisions.js)).
- **Facts**: the real party (names, roles, levels), the chosen side, the current act, the story so
  far and recent decisions are sent with every request
  ([`prompts.js`](../Server/narrator/prompts.js) → `buildStateBlock`).

The model writes narration, NPC dialogue, and two options that fit the deciding character's
attribute, and returns them as JSON.

## Files you can edit

| File | What's in it |
|---|---|
| `lore.js` | World, the nine playable characters (callsign, real name, pronouns, bio), villains, recurring NPCs, locations, opening scenes |
| `campaign.js` | The three acts per side, each fight's location and setup, endings |
| `prompts.js` | Style guide (voice, banned clichés, examples) and the system prompts |
| `fallbacks.js` | Pre-written text and options used when the AI is unavailable |

Boss bios and NPCs marked **DRAFT** were written to fill gaps. Rewrite them however you like.
Character names in `lore.js` must match the names players see in `shared/data/characters.js`.

## Safety nets

- **Party check**: if narration mentions a playable character who isn't in the party, the
  narrator asks the model to rewrite it once, then strips the offending sentences (or uses fallback text).
- **Fallbacks**: any error or timeout returns pre-written narration with sensible options, so the
  game never stalls on the AI.
- **Combat budget**: routine turns (moves, plain attacks) use the game's own summary text. Only
  notable moments (kills, abilities, bosses) go to the model, at most
  `AI_COMBAT_LINES_PER_MINUTE` per minute.
- **One at a time**: story events for a room are processed in order, so double clicks or two
  players' clients can't skip a story step.

## Providers

Set `AI_PROVIDER` in `Server/.env` (local) or Heroku config vars:

| Value | Use | Needs |
|---|---|---|
| `mock` (default) | Offline development and tests; simple placeholder text | Nothing |
| `gemini` | Free-tier testing with a real model | `GEMINI_API_KEY` (model: `GEMINI_MODEL`, default `gemini-flash-latest`) |
| `anthropic` | Production quality | `ANTHROPIC_API_KEY` (models: `ANTHROPIC_STORY_MODEL` / `ANTHROPIC_COMBAT_MODEL`, default `claude-sonnet-5-5`) |
| `openai-compatible` | Any other OpenAI-style API (Groq, OpenRouter...) | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |

If a key is missing, the server logs a warning and uses the mock, so it never fails to start.

## Tuning

| Setting | Default | Effect |
|---|---|---|
| `STORY_DECISIONS_PER_INTERLUDE` | 2 | Decisions between fights (the old Python service used 3) |
| `AI_COMBAT_LINES_PER_MINUTE` | 12 | Cap on AI-written combat commentary |
| `AI_TIMEOUT_MS` | 20000 | Give up on a model call and use fallback text |
| `MOCK_AI_DELAY_MS` | 400 | Fake latency for the offline narrator |

## Seeing what the model sees

The narrator tests in `Server/narrator/storyEngine.test.js` use a scripted fake model and assert on
the prompt contents. They are the quickest way to check a prompt change: edit, then run
`npm test --prefix Server`.
