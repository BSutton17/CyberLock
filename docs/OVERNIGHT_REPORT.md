# Overnight report (2026-10-08)

All work is on the branch **`overnight/phase1`** in `BSutton17/CyberLock` (7 commits, CI green).
`main` is untouched, so review and play-test before merging.

**In one paragraph:** The game now runs on your machine with one command and no accounts or keys.
The server was rebuilt into small tested modules, the AI moved into the server (Gemini for testing,
Claude for production, offline mock by default), and sign-in is Google or guest with no database.
I fixed every bug I could find in turns, deaths, reconnects, level-ups, spawning, decision buttons,
abilities and the enemy AI. The narrator now knows who is in the party and follows a
three-act campaign with named villains and NPCs. Tests went from 0 to 335 (144 server, 191 client).
What's left for you is the account setup in [DEPLOYMENT.md](DEPLOYMENT.md), playtesting, and the
questions at the end.

---

## Try it in 5 minutes

```bash
git fetch origin
git switch overnight/phase1
npm run setup
npm run dev
```

Open **http://localhost:5180** (the port changed from 5173, see below), click **Play as guest**,
and start a room. Open a private window, sign in as a second guest, and join with the room code.
The narrator runs offline with placeholder text. Put a Gemini key in `Server/.env` to hear the real
one (see [DEPLOYMENT.md §1](DEPLOYMENT.md)).

---

## What changed

### Running locally
- One command (`npm run dev`) starts server and client; `npm run setup` installs everything.
- Works with no `.env` at all: guest login + offline narrator.
- Removed SQLite, MySQL and bcrypt. The native `sqlite3` package is a common cause of Windows
  install failures.
- Client dev server moved to **port 5180**. On this machine another Vite project ("E-Football") was
  running on 5173, and on Windows `localhost:5173` reached that app instead of CyberLock.

### Sign-in
- **Sign in with Google**: the server verifies Google's token and issues its own session; no
  passwords and no database. Guest sign-in for testing (off in production unless enabled).
- The app explains when the Heroku server is waking up instead of showing a bare "Loading..." for
  up to 30 seconds.

### Multiplayer and reconnecting
- The client **rejoins your game automatically after any reconnect** (refresh, Wi-Fi blip, server
  waking). Before, a dropped connection left you in a room the server no longer associated with you.
- Story progress and the **pending decision are restored from the server** after a reconnect, even
  from another device.
- A "Reconnecting..." banner; clear errors for unknown rooms, full rooms and taken names.
- **Leave Game actually leaves.** It used to send a reserved Socket.IO event the server never saw.
- Room codes come from the server and are unique. Before, two groups could get the same random code.
- The admin is tracked and handed over when the admin leaves; only the admin can start the game.
- Two players can no longer grab the same character at the same moment.
- Ready checks (character select, attributes, abilities, level-up) no longer hang forever when a
  player who hadn't readied leaves.

### Combat and death
- **Combat stalled** when an enemy killed a player who had already acted that round (the turn
  pointer slid off the acting enemy). Fixed.
- **Players silently lost their turn** when an enemy died during its own turn. Fixed.
- Players killed by damage-over-time stayed in the turn order, so their turn came up and stalled. Fixed.
- **Enemies kept attacking corpses**: a 0-HP player looked like the easiest target. Fixed.
- AFK or disconnected players' turns now end automatically (45s, or 5s if disconnected).
- The 25-second freeze when an enemy goes first is now 6 seconds; the 5-second pause after each
  player's turn is now 2.5 (both configurable).
- Enemies can't spawn on a player's tile, and players can't start a fight in the enemy half.

### Level-ups (the "level cap" bug)
- Root cause: refreshing during level-up sent you back to the Level Up screen, and the server
  trusted whatever level and stats the client sent, so you could level twice and spend points twice.
- The server now owns level-ups: one per encounter, levels and point budget validated, max level 5
  enforced. Max-level characters see a waiting screen instead of free points, and an all-max party
  skips the screen.

### Abilities and enemy AI
- Enemy healers' heals and heal-over-time **did nothing**; now they work. Healers only heal when someone is hurt.
- Burn and poison cast by enemies now hurt players; "healing prevented" (Poison Apple) is respected.
- Bonus health now absorbs ability damage, not just weapon hits.
- **Blizzard left enemies permanently slowed** (slow applied twice, removed once).
- **Counter** expired before the enemies' turn, so it never reflected anything; now it does.
- **Flash Step** (a bonus action) now speeds you up on the turn you use it.
- **Zen's** heal never applied; now it heals supports 25% of max HP.
- A failed **Charge** no longer chips 1 damage.
- Fixed the wrong numbers in Cursed (35%), EMP (2 turns) and Murus Fictilis (+35/+30) messages.
- Ranged enemies shoot from range instead of walking into melee.
- Data: Operations Handler used the Field Tech image and had an invalid behavior; it's now a
  support unit with its own sprite.

### The AI narrator
- Runs inside the Node server; the Python service is archived on `archive/python-ai`.
- **Knows the party**: every request lists exactly who is in it (callsign, real name, pronouns,
  role, level). If the model names someone else anyway, it's asked to rewrite, or the sentence is dropped.
- **Has a story**: three acts per side, each ending with a named villain, plus recurring NPCs.
  The opening uses the scenario openers from the old prompts (the market bombing, the checkpoint).
- **Decisions rotate between players**: each one goes to the player who ranked the fitting
  attribute highest, rotating so everyone gets turns, and the options fit that skill.
- **Tone**: a style guide with banned clichés ("neon-soaked", "the air crackles", "What do you do?").
- **Memory**: a running "story so far" and the recent decisions go into each prompt.
- **Cheap and fast combat**: routine turns use the game's own text instantly; only kills,
  abilities and bosses go to the model, capped per minute (protects Gemini's free-tier limits).
- **Never stalls**: every path has pre-written fallback text and options.
- The final boss now gets an ending narration on the THE END screen.

### UI
- Character select has a visible **"Play as ..."** button (it was double-tap only).
- The decision banner says **"Your call (Spy)"** or **"Leo (bryson) decides (Spy)"**.
- The turn banner names the acting enemy; HP shows whole numbers.
- The Ultimate card shows its range and scaling like the other abilities.
- Login page restyled to match the game.

### Code health
- `Server/index.js` (2,000 lines) split into `config`, `auth`, `game` (pure rules), `sockets`, `narrator`.
- `Events.jsx` removed every listener for an event (not just its own) and re-subscribed constantly,
  which randomly broke other screens' listeners. Fixed.
- About 230 lines of dead code removed from `Main.jsx`. Lint: 75 problems → 0 errors (28 style warnings left).
- Dependencies: removed unused (`axios`, a stray `Router` package, `typewriter-effect`); 0 known
  vulnerabilities in production dependencies (React Router upgraded to v7).
- 335 tests. The server suite runs real socket clients against the server; the client suite runs
  every ability, the enemy AI, the sign-in flow, and renders the main game screen.

### Git
- The new repo keeps the full history, minus a committed `.env` (JWT secrets, a MySQL password),
  old `database.db` files containing about 10 email addresses and password hashes, and a committed
  `node_modules`. **The repo is public**, so check that none of the old teammates' secrets are
  still in use anywhere.
- `Server/` contains an old nested `.git` (your old Heroku push repo); it's safe to delete. See DEPLOYMENT.md.
- The `SeniorCapstone-Ai-API/` folder is still on your disk (ignored by git). It's archived, so you
  can delete it.

---

## What I couldn't verify

- **A real model.** Gemini and Claude calls are tested against faked APIs, and I confirmed the
  request formats against the current docs, but I couldn't call them without keys. The first real
  run may need prompt tweaks.
- **Clicking through the game in a browser.** I don't have a browser here. I rendered the main
  screen in a simulated DOM and drove the decision and reconnect flows, and ran real socket clients
  against the server, but a human playthrough is the real test.
- **Google sign-in end to end**, which needs your OAuth client.

---

## What to test in the morning

- [ ] `npm run dev`, then two guests in two windows reach the first fight
- [ ] Faction choice: only the decision owner's buttons work; the other player sees who decides
- [ ] Refresh mid-fight: you come back into the fight with your turn intact
- [ ] Refresh during a story decision: the same buttons come back
- [ ] Let an enemy kill a player who already acted: combat keeps going
- [ ] Go AFK on your turn: it ends by itself after ~45s
- [ ] Level up, refresh on the level-up screen: you don't get a second level
- [ ] Try Counter, Flash Step, Blizzard, Zen
- [ ] With a Gemini key: does the narration feel like a story? Does it ever name a character not in the party?
- [ ] Leave Game, then rejoin with the code

---

## Decisions I made that you should review

1. **Two decisions between fights** (the old service used three). Change with `STORY_DECISIONS_PER_INTERLUDE=3`.
2. **Draft lore**: the Macro Hull, Genisis and rebel boss bios, the NPCs, and the three acts per side
   are mine (in `Server/narrator/lore.js` and `campaign.js`). Rewrite freely.
3. **Narration uses callsigns** ("Shipment") because that's what players see, mentioning real
   names ("Dax Slater") occasionally. The old prompt banned callsigns, which contradicted the UI.
4. **Ability semantics**: Counter and Flash Step changed as described above; Flood of Frost keeps
   its low damage (I made the listed number match it rather than doubling it).
5. **Operations Handler** became a support unit (it mirrors Division Strategist on the rebel side).
6. **Dead players are revived after a won fight**, as before. Only all players dying ends the game.
7. **The shop is not wired in.** Its handlers were never connected to any encounter; I removed the
   dead client code (it's in git history) and the narrator still supports shop scenes for later.

## Questions for you

1. Should guest sign-in be available in production for friends without Google, or Google-only?
2. Two or three decisions between fights?
3. Do you want a database later for save/resume, or are single-sitting campaigns fine?
4. Should the campaign end differently depending on choices (multiple endings), or one ending per side?
5. OK to delete `Server/.git` and the local `SeniorCapstone-Ai-API/` folder?

## Biggest remaining risk

Combat still trusts browsers to compute damage and send whole-state snapshots. Tonight's fixes
removed every stall I could find and test, but the durable fix is Phase 2 in the
[roadmap](ROADMAP.md): move the rules (already extracted and tested) to the server and have
clients send intents. I'd start there after you've played a few sessions.
