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
- **Combat never uses the AI**, with or without mock mode, so fights cost no credits. Every turn
  is told from 2,086 hand-written lines in `Server/narrator/combatLines/`, one sentence per action
  (a move, a bonus action and a weapon kill make three):

  | Lines | For | Count |
  |---|---|---|
  | `movement.js` | Each character and enemy: 4 advancing, 3 retreating, 3 regrouping with a teammate | 270 |
  | `abilities.js` | Each of the 47 abilities, whoever uses it | 376 |
  | `finalBlows*.js` | Each damaging ability finishing each enemy (2 each, 16 abilities x 18 enemies) | 576 |
  | `weaponHits.js` | Each weapon at low, medium and high damage (6 per tier for the party, 4 for enemies) | 378 |
  | `weaponKills.js` | Each party weapon finishing each enemy (3 each) | 486 |

  The engine records each turn as beats (who moved toward whom, which hits landed and how hard,
  what scored each kill, including poison and fire that finish someone later), and
  `combatLines/index.js` picks a line for each, avoiding lines the room heard recently. The next
  turn waits until the narration has been typed out and read.

  Names, articles and pronouns come from the fight's real state, not the line text:
  - Several of a kind standing: "an Enforcer Drone", "one of the Enforcer Drones", "the closest
    Enforcer Drone" (when the engine says it's the nearest), "another Enforcer Drone" for a second
    one; alone: "the Enforcer Drone"; the others fell: "the last Enforcer Drone"; once pointed
    out: "the enemy drone". Each individual is tracked by its id, within a turn and into the next.
  - A sentence that carries on with the same subject uses he / she / it (from the character's
    pronouns), never when someone else just mentioned shares that pronoun, never three in a row,
    and never "They" to open a sentence ("The tech fires" instead).
  - `narration.fights.test.js` plays whole simulated fights and checks every turn: placeholders,
    capitals, a/an, doubled words, "They" openers, bare "the" among several, pronoun runs. Tests check every character, enemy,
  ability and weapon has its full set, and that no line repeats or contains a number.
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
| `mock` (default) | Offline play and tests: a story assembled from hand-written pieces (see below) | Nothing |
| `gemini` | Free-tier testing with a real model | `GEMINI_API_KEY` (model: `GEMINI_MODEL`, default `gemini-flash-latest`) |
| `anthropic` | Production quality | `ANTHROPIC_API_KEY` (models: `ANTHROPIC_STORY_MODEL` for the story, `ANTHROPIC_COMBAT_MODEL` for the rules helper, default `claude-sonnet-5-5`) |
| `openai-compatible` | Any other OpenAI-style API (Groq, OpenRouter...) | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |

If a key is missing, the server logs a warning and uses the mock, so it never fails to start.

## Tuning

| Setting | Default | Effect |
|---|---|---|
| `STORY_DECISIONS_PER_INTERLUDE` | 2 | Decisions between fights (the old Python service used 3) |
| `AI_TIMEOUT_MS` | 20000 | Give up on a model call and use fallback text |
| `MOCK_AI_DELAY_MS` | 400 | Fake latency for the offline narrator |
| `COMBAT_NARRATION_DELAY_MS` | 900 | How long after a turn its combat narration arrives (all rooms) |

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

Everyone sees the choices where the story choices go; only that player can pick. Every answer is a
different approach: straight with them, pushing back, a sly angle, and a special one if they rank a
fitting attribute in their top three (a Politician can answer "We came to save someone"). The next
narration tells what they said and how the NPC took it, then brings up the group's decision, which
waits until then. If they don't answer within `DIALOGUE_TIMEOUT_MS` (default 60 s), their character
stays silent and the story moves on.

**Answers steer the story.** Each one starts its own thread (`lead`): a patrol on the party's trail,
a shortcut, a favor owed, a name worth chasing. Threads go into the story log and every later
prompt ("Open threads ... pay them off in the coming scenes"), so the model brings them back; the
offline narrator pays the newest one off in the next scene or fight intro. NPCs also remember how
they were treated (`npcAttitudes`). Bots never get personal moments.

**Where moments come from.** With a real model (Claude, Gemini), each moment is written fresh for
the scene that was just narrated: its own NPC, question and answers, checked for outsiders and
completeness. In mock mode, or if the model's moment doesn't fit, one of the 18 hand-written
moments in `dialogue.js` is used instead (add more there; tests check every answer has its own
reaction and thread).

## Decisions, bosses and the cast

- **Who decides.** Decisions rotate to whoever decided least recently, using whichever of their
  top three attributes was used least recently: a full team passes calls around, and a solo
  player cycles their top three instead of hearing "Politician" every time (`decisions.js`).
- **Bots get decisions too.** A bot's character takes their turn in the rotation like anyone
  else, so the story treats the call as theirs ("Ghost Shell's call (Electrician)"). A person
  presses the button for them: whichever person has decided least recently (`decidedBy` in the
  `decisionOwner` sent with each decision).
- **Moments never repeat the decision.** A personal moment is checked against the group decision
  that follows it; the AI is told to keep them about different things, and one that overlaps is
  swapped for a different moment.
- **Bosses are built up.** Every scene in an act lets the act's villain cast a shadow (an NPC
  mentions them, their face on a screen, their work in the street), strongly right before their
  fight. The offline narrator has five foreshadowing lines per boss in `mockStory.js`.
- **New names every game.** The recurring NPCs (the witness, the fixer, the rebel commander, the
  Division captain, the corporate director) are cast from name pools per game (`cast.js`). The
  narrator uses the original names internally and in prompts; everything players see gets the
  game's names.
- **Personal moments wait three minutes** (`DIALOGUE_TIMEOUT_MS`, default 180000), with a
  countdown on screen for the last 30 seconds.

## The story so far (Summarize button)

The in-game top bar has a **Summarize** button. It opens the story so far as one short paragraph
per act (Act I, then Act II, ...), up to the moment it is pressed, mid-act included.

To save credits it is only written when someone presses the button, never automatically. Each act
keeps its own record (story log entries, decisions, personal moments and won fights are tagged
with their act), and an act's paragraph is only rewritten when that act has news since it was last
written. A finished act costs one AI call; the current act one call per press when something has
happened since the last. Two presses at once share one write, and the result goes to the whole
room. In mock mode, or if the model fails, each paragraph is built from the game's own records.

## Seeing what the model sees

The narrator tests in `Server/narrator/storyEngine.test.js` use a scripted fake model and assert on
the prompt contents. They are the quickest way to check a prompt change: edit, then run
`npm test --prefix Server`.
