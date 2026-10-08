# Roadmap: from capstone to final version

**Goal:** a stable, fun co-op cyberpunk RPG that a group of 1–6 friends can play start to finish in the browser, with a real story, named villains, NPCs, and choices that matter. It runs on Heroku (server) + Netlify (client) for about $5/month plus a small AI bill only when people play.

**How we work**
- Claude writes all code, fixes, and automated tests. Bryson does manual playtesting.
- Every phase ends with a short **manual test checklist**. A phase is done when its automated tests pass *and* the checklist passes.
- Work happens on feature branches cut from `MergeTest-fixed` (the newest code). Nothing merges with failing tests.
- Free AI (Gemini free tier, or a mock narrator) during development. Paid AI only in production.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 0: Setup (manual, Bryson)

Things that need your accounts, money, or logins. Claude can't do these.

- [ ] **Repo ownership.** `origin` is `SeanS-git/SeniorCapstone`. Heroku and Netlify need admin access to the GitHub repo to auto-deploy. Either fork it to your own GitHub account (recommended) or get Sean to make you an admin. Let your teammates know you're continuing the project.
- [ ] **Heroku.** Run `heroku login`. Check whether the existing `cs-capstone` app (already a git remote here) is yours. If not, create a new app. Turn on the Eco dynos plan under Account → Billing. Send Claude the app's URL.
- [ ] **Netlify.** Create an account and import the repo (the first build may fail; that's fine). Rename the site to the name you want, e.g. `cyberlock.netlify.app`. Send Claude the URL.
- [ ] **Google sign-in.** In Google Cloud Console: create a project → OAuth consent screen (External, app name, your email, default scopes only) → Credentials → OAuth client ID → *Web application*. Authorized JavaScript origins: `http://localhost:5173` and your Netlify URL. No redirect URIs needed. Add your test Google accounts under *Test users*. Send Claude the **Client ID** (it's public, not a secret).
- [ ] **Gemini API key.** In Google AI Studio → *Get API key*. Don't paste it in chat. Claude will create `server/.env.example` and you'll copy it to `server/.env` and fill it in.
- [ ] **Optional now, needed by Phase 5:** Anthropic Console account with a monthly spend limit, for production narration.
- [ ] **Optional:** install the GitHub CLI (`winget install GitHub.cli`, then `gh auth login`) so Claude can open PRs for you.
- [ ] **Optional:** ask whoever owns `cyber-lock.online` whether you can point it at Netlify later.

---

## Phase 1: Playable anywhere

Get the game running on Heroku + Netlify with a free AI, with no teammate's PC involved.

**1.1 Repo cleanup**
- [ ] Commit the untracked `SeniorCapstone-Ai-API/` folder to an `archive/python-ai` branch so it's never lost, then remove it from the working tree
- [ ] Restructure into `client/` + `server/` with npm workspaces and root scripts (`npm run dev`, `npm test`, `npm run build`)
- [ ] Discard the stray `package-lock.json` change

**1.2 Test foundation**
- [ ] Vitest set up for server and client; `npm test` at the root runs everything
- [ ] GitHub Actions CI runs tests on every push and PR

**1.3 Narrator module (replaces the Python service)**
- [ ] `server/narrator/` with provider adapters: `mock`, `gemini` (OpenAI-compatible), `anthropic`; chosen by `AI_PROVIDER`
- [ ] Port lore, characters, scenario openers, and the current story flow from Python into the server
- [ ] Keep the existing `ai_request` / `ai_message` socket contract so the client barely changes yet
- [ ] Tests: flow-rule tests with the mock provider; adapter tests with mocked HTTP

**1.4 Google login**
- [ ] `POST /api/auth/google` verifies the Google ID token and issues the game JWT; Socket.IO connections require the JWT
- [ ] Sign in with Google button; dev-only guest login for local multiplayer testing
- [ ] Remove registration, passwords, bcrypt, SQLite/MySQL, and the refresh-token table
- [ ] Players identified by Google account ID, not display name
- [ ] Tests: auth route (Google verification mocked), socket auth middleware

**1.5 Deployment**
- [ ] Remove the Cloudflare Access headers, `cyber-lock.online`/LAN-IP CORS entries, and server-side serving of the client
- [ ] Allowed origins read from an `ALLOWED_ORIGINS` env var; `.env.example` for server and client
- [ ] Heroku: `start` uses `node` (not nodemon), Node version pinned via `engines`, `/api/health` endpoint
- [ ] Netlify: `netlify.toml` (base `client/`, SPA redirect, `VITE_API_URL`)
- [ ] "Waking up the server…" screen while the Eco dyno starts
- [ ] Claude writes exact `heroku config:set` commands for you to run

**1.6 Quick bug fixes**
- [ ] Level cap: no level-up screen or stat points at max level; stat caps are real caps
- [ ] One encounter table (delete the unused Python copy); one shared `MAX_CHARACTER_LEVEL`
- [ ] Skipped turn when an enemy dies during its own turn
- [ ] Turn delays (5s between turns, 25s at combat start) become config values with shorter defaults
- [ ] Each fix gets a regression test

**Manual checklist:** sign in with Google on the Netlify URL from two browsers → create room → pick characters → play through the first 3 encounters including a level-up → narration appears (Gemini) → close everything, return after 30+ min, server wakes and a new game works.

---

## Phase 2: Combat that works (server-authoritative)

Root cause of most combat bugs: browsers send whole-state snapshots and the last one wins, and enemy turns run inside a browser. Fix that structurally.

- [ ] **2.1 Characterization tests first.** Capture what abilities, damage, healing, buffs/debuffs, cooldowns, turn order, spawning, and enemy AI do today, so the move doesn't silently change the rules
- [ ] **2.2 Extract a pure combat engine** into `shared/` (from `AbilityLogic.jsx`, `AbilityStore.jsx`, `EnemyCombat.jsx`, turn-order and spawn code in `server/index.js`): plain functions `(state, action) → newState`
- [ ] **2.3 Server owns combat.** Clients send intents (`move`, `use_ability`, `end_turn`). The server validates (whose turn, range, cooldown, collision), applies the engine, and broadcasts state. Enemy turns run on the server. Remove all `updatedEnemies` / `updatedPlayerCharacters` snapshot events
- [ ] **2.4 Reconnect = resync.** A rejoining player gets the full current state from the server
- [ ] **2.5 Break up `Main.jsx`** (~6,000 lines) into components + hooks; the client just renders server state
- [ ] **2.6 Headless combat simulator** (a script that runs fights with no UI), used later for balance

**Manual checklist:** 3-player fight where everyone acts quickly and one player refreshes mid-combat; abilities of every type work; enemy turns happen with all players idle; no frozen turns, no revived enemies, no overlapping spawns.

---

## Phase 3: A real story

The game owns the facts; the AI writes the words.

- [ ] **3.1 Campaign design (you + Claude).** Claude drafts, you decide: per-faction story mapped onto the 10 encounters (3 acts → final boss), each boss a named villain with a motive, a recurring NPC cast (start from the rebel commander, Enforcer captain, and witnesses in the existing scenario openers), and endings. Stored as data files, not prompts
- [ ] **3.2 World state on the server:** real party roster, faction, act/beat, story flags from choices, NPC relationships, rolling "story so far" summary. Sent with every AI call
- [ ] **3.3 Beat-driven flow** replaces the hard-coded "3 choices then fight" loop. Each beat has a location, NPCs present, objective, and the decision's attribute owner. Ownership rotates so every character gets decisions. Options are written to fit the owner's attribute. Choices set flags that later beats react to
- [ ] **3.4 Prompt rewrite:** short style guide plus example passages, banned-cliché list, structured output instead of regex cleanup, consistent lengths
- [ ] **3.5 Combat narration:** once per round (not per turn), built from the real combat log; bosses get mid-fight taunts in their own voice
- [ ] **3.6 NPC conversations:** players can talk to NPCs during story beats; the rules-help chatbot stays separate
- [ ] **3.7 Fact guard + tests:** reject and regenerate narration that names characters not in the party or contradicts the world state; snapshot tests of prompt construction; a small scripted "story run" test using the mock narrator

**Manual checklist:** full playthrough on each faction; NPCs recur and remember earlier choices; narration never names a character who isn't in the party; it reads like a story, not a GPS.

---

## Phase 4: Balance & content

- [ ] Level curve: 4 level-ups across 10 encounters reaching level 5 at the finale (verify, then tune)
- [ ] Enemy scaling by party size (1–6) tuned with the headless simulator (target win rates per encounter type)
- [ ] Shop economy and item value
- [ ] Ability tuning per character so every character is worth picking
- [ ] Fill content gaps the playthroughs reveal (more beats, NPC lines, boss phases)

**Manual checklist:** solo, 2-player, and 4+-player runs feel fair; no character is dead weight.

---

## Phase 5: Polish & release

- [ ] Onboarding: short tutorial or first-fight hints; clear "whose decision is this" UI for attribute choices
- [ ] Error states: AI down → fallback text, server asleep → wake screen, disconnects → clear rejoin
- [ ] Production AI choice: test a fixed set of scenes on Gemini vs Claude Haiku vs Claude Sonnet, pick per call type, set the spend cap
- [ ] Optional: save/resume campaigns (would need a database: Heroku Postgres or a free hosted Postgres)
- [ ] Rewrite README (setup, architecture, deploy) to match reality
- [ ] Tag `v1.0`

**Release checklist:** a fresh group of friends can sign in, play the full campaign, and reach an ending without you explaining anything.

---

## Open questions (decide as we go)

| Question | Needed by | Notes |
|---|---|---|
| Fork the repo or get admin on Sean's? | Phase 0 | Affects where Heroku/Netlify connect |
| Target length of one full campaign run? | Phase 3 | Drives the number of beats; one sitting vs. multiple |
| Save/resume across sessions? | Phase 3 | If yes, we need a database again (Phase 5 item) |
| Do the two factions share a middle act or stay fully separate? | Phase 3 | Fully separate = roughly double the writing |
| Mobile support? | Phase 5 | The grid combat UI would need work |
| Which paid model in production? | Phase 5 | Decided by side-by-side testing, not guesswork |

## Risks

- **Phase 2 is the biggest change.** Mitigation: characterization tests before moving any logic, and moving it one system at a time.
- **Free AI tier limits change without notice.** Mitigation: the provider is an env var and the mock narrator needs no network.
- **Heroku Eco sleeps and restarts daily**, wiping in-memory games. Acceptable for v1; save/resume (Phase 5) would solve it.
