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
| `prompts.js` | Style guide (voice, dialogue, fights, banned clichés, examples; modeled on the author's own prose) and the system prompts. Both Claude and Gemini read the same guide |
| `fallbacks.js` | Pre-written text and options used when the AI is unavailable |
| `mockStory.js` | The offline narrator's story pieces: scene details, situations and options per attribute, consequences, villain entrances and exits, endings |
| `combatFlavor.js` | Templates that turn the combat log into narration (weapon lines, deaths), used for routine turns |
| `dialogue.js` | Personal dialogue: what NPCs say to one party member, the answers, and how each NPC reacts |

Boss bios and NPCs marked **DRAFT** were written to fill gaps. Rewrite them however you like.
Character names in `lore.js` must match the names players see in `shared/data/characters.js`.

## Safety nets

- **Party check**: if narration mentions a playable character who isn't in the party, the
  narrator asks the model to rewrite it once, then strips the offending sentences (or uses fallback text).
- **Fallbacks**: any error or timeout returns pre-written narration with sensible options, so the
  game never stalls on the AI.
- **Combat budget**: routine turns (moves, plain attacks) are narrated from templates
  (`combatFlavor.js`: "Patchwork sends the drone zooming at the Enforcer Soldier, landing a solid
  blow."). Only notable moments (kills, abilities, bosses) go to the model, at most
  `AI_COMBAT_LINES_PER_MINUTE` per minute, one sentence per action.
- **No numbers**: narration never states damage, healing or stat amounts; anything the model
  slips in is scrubbed. The combat log keeps the numbers.
- **Busy or out of quota**: a busy model (503) or rate limit (429) is retried twice. A spent quota
  is not retried; the narrator stops calling it until the wait the provider asks for has passed
  (one minute if it doesn't say) and uses fallback text meanwhile.
- **One at a time**: story events for a room are processed in order, so double clicks or two
  players' clients can't skip a story step.

## Providers

Set `AI_PROVIDER` in `Server/.env` (local) or Heroku config vars:

| Value | Use | Needs |
|---|---|---|
| `mock` (default) | Offline play and tests: a story assembled from hand-written pieces (see below), slower combat pacing | Nothing |
| `gemini` | Free-tier testing with a real model | `GEMINI_API_KEY` (model: `GEMINI_MODEL`, default `gemini-flash-latest`) |
| `anthropic` | Production quality | `ANTHROPIC_API_KEY` (models: `ANTHROPIC_STORY_MODEL` / `ANTHROPIC_COMBAT_MODEL`, default `claude-sonnet-5-5`) |
| `openai-compatible` | Any other OpenAI-style API (Groq, OpenRouter...) | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |

If a key is missing, the server logs a warning and uses the mock, so it never fails to start.

## Tuning

| Setting | Default | Effect |
|---|---|---|
| `STORY_DECISIONS_PER_INTERLUDE` | 2 | Decisions between fights (the old Python service used 3) |
| `AI_COMBAT_LINES_PER_MINUTE` | 6 | Cap on AI-written combat commentary |
| `AI_TIMEOUT_MS` | 20000 | Give up on a model call and use fallback text |
| `MOCK_AI_DELAY_MS` | 400 | Fake latency for the offline narrator |
| `MOCK_AI_COMBAT_DELAY_MS` | 900 | How long after a move the offline narrator's combat line arrives |

With `AI_PROVIDER=mock`, combat also runs slower (turn changes, enemy thinking, bot steps) so it can
be followed without AI latency to pace it. Any timing set explicitly in `.env` still wins.

## The offline narrator

Without an AI, `mockStory.js` builds each story beat from hand-written pieces chosen to fit what
the game knows: who is in the party (each character has a reason for being at the opening), the
side they joined, the act and its villain, where they are, and what was just decided. Every
decision situation has its own two options (three per attribute), each choice plays out as a clean
success, a complication, or a success with a cost, villains get entrance and send-off lines, and the
ending recalls the party's actual first and last decisions. It remembers recent lines so it doesn't
repeat itself. Add situations or lines there to give it more range.

## Personal moments (dialogue)

Personal moments are told inside the narration. After every fight (and after about a third of group
decisions) one party member gets a moment of their own, of one of two kinds:

- **An NPC asks them something.** The narration ends with the NPC turning to them: *A checkpoint
  guard steps into the party's path and looks straight at Livewire. "Why are you here?"*
- **They get to ask an NPC something.** *Ines Calder is picking through the wreck of her stall...
  Livewire has a moment to ask her something.*

Everyone sees the choices where the story choices go; only that player can pick. There's a
straight option, a pushy or defiant one, and a special one if they rank a fitting attribute in their
top three (a Politician can answer "We came to save someone"). The next narration tells what they
said and how the NPC took it, then brings up the group's decision, which waits until then. If they
don't answer within `DIALOGUE_TIMEOUT_MS` (default 60 s), their character stays silent and the story
moves on. Answers never move the group; they change how the NPC feels about the party
(`npcAttitudes`), and every later prompt lists those feelings and what was said so the model can
let it show. Bots never get personal moments. The moments live in `dialogue.js`; add more there.

## Seeing what the model sees

The narrator tests in `Server/narrator/storyEngine.test.js` use a scripted fake model and assert on
the prompt contents. They are the quickest way to check a prompt change: edit, then run
`npm test --prefix Server`.
