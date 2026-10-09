# Roadmap: from capstone to final version

**Goal:** a stable, fun co-op cyberpunk RPG that 1–6 friends can play start to finish in the browser,
with a real story, named villains, NPCs and choices that matter. It runs on Heroku (server) and
Netlify (client) for about $5/month plus a small AI bill only when people play.

**How we work**
- Claude writes code, fixes and automated tests. Bryson playtests.
- Every phase ends with a short manual test checklist.
- Free AI (Gemini, or the offline mock) in development; paid AI (Claude) only in production.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 0: Setup (manual, Bryson)

Step-by-step instructions with exact commands: [DEPLOYMENT.md](DEPLOYMENT.md).

- [x] New GitHub repo `BSutton17/CyberLock` (history kept, secrets scrubbed)
- [ ] Gemini API key in `Server/.env`
- [ ] Heroku: log in, Eco plan, remove old config vars, set new ones, deploy
- [ ] Netlify: import repo, set `VITE_API_URL`, name the site
- [ ] Google OAuth client (origins `http://localhost:5180` and the Netlify URL), set `GOOGLE_CLIENT_ID`
- [ ] Later: Anthropic key with a spend limit for production narration
- [ ] Review and merge `overnight/phase1` into `main`

---

## Phase 1: Playable anywhere ✅ code complete (needs your accounts to deploy)

- [x] Repo cleanup; Python AI archived on `archive/python-ai`; root scripts (`npm run setup`, `npm run dev`, `npm test`)
- [x] Test foundation (Vitest), GitHub Actions CI (tests, build, lint)
- [x] Narrator module in the server: mock / Gemini / Claude providers, lore, campaign outline, style guide
- [x] Google sign-in + dev guest login; database removed
- [x] Heroku `Procfile` + root `package.json`, `netlify.toml`, `.env.example` files, CORS from env
- [x] "Waking up the server" screen
- [x] Bug sweep: turn order, deaths, AFK/disconnects, level-ups, ready gates, admin, rooms, reconnect,
      spawning, abilities, enemy AI, listener leaks (details in `OVERNIGHT_REPORT.md`)

**Manual checklist:** see `OVERNIGHT_REPORT.md` → "What to test in the morning".

---

## Phase 2: Combat that works by design (server-authoritative) ✅ code complete

- [x] Combat rules moved to `shared/combat` (abilities, effects, enemy AI, encounters) plus a new engine
- [x] Server owns combat: clients send intents (move, attack, ability, end turn); the server checks
      turn, range, cooldowns and action economy, runs enemy turns, and broadcasts `combat_state`
- [x] Snapshot events removed (clients can no longer send health or enemy state)
- [x] Zones work by position when they tick (Feels Like Home, Toxic Mist, Blizzard)
- [x] Every ability tested through the engine; bots play story fights over real sockets
      (`Server/scripts/botFight.js`)
- [ ] Break up `Main.jsx` (now ~2,900 lines, was ~5,800) into components and hooks
- [ ] Grow the bot script into a balance simulator (Phase 4)

## Phase 3: A real story (partly started tonight)

- [x] Campaign outline per side, named villains, recurring NPCs (DRAFT; needs your edits)
- [x] World state in every prompt, story memory, rotating decision owners, party-name guard
- [ ] Story flags: let specific choices change later scenes (e.g. sparing an NPC brings them back)
- [x] Personal dialogue: NPCs speak to one party member, who answers for themselves; NPCs remember
- [x] Offline narrator that can carry a whole campaign without an AI
- [ ] NPC conversations: players type to NPCs during story beats (separate from the rules helper)
- [ ] Boss mid-fight lines in their own voice
- [ ] Two full playthroughs per side to tune prompts with a real model

## Phase 4: Balance & content

- [x] Balance simulator and report (`docs/BALANCE.md`)
- [x] Enemy scaling for 1–6 players, tuned by simulation; bots to fill empty seats
- [x] Ability tuning within each slot (buffs only)
- [ ] Shop: designed but never wired into the encounter flow
- [ ] Re-run `scripts/balance.js` after playtests and re-tune

## Phase 5: Polish & release

- [ ] Onboarding / first-fight hints
- [ ] Production AI choice by side-by-side test; spend cap
- [ ] Optional save/resume (needs a database again)
- [ ] Mobile layout pass
- [ ] Tag `v1.0`

---

## Open questions

| Question | Needed by |
|---|---|
| ~~Keep 2 decisions between fights, or go back to 3?~~ Three (answered) | done |
| Are the drafted boss bios and campaign acts the story you want? | Phase 3 |
| ~~Save/resume across sessions?~~ Not for now (answered) | — |
| Do the two sides share a middle act or stay separate? | Phase 3 |
| Mobile support? | Phase 5 |
