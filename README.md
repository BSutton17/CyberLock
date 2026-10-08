# CyberLock

A co-op cyberpunk tactics RPG for 1–6 players in the browser. Pick a crew, choose a side in a
city owned by three corporations, and fight through a ten-battle campaign on a tactical grid
while an AI game master narrates the story, voices the characters, and puts the crew's big
decisions in each player's hands.

- **Client**: React + Vite (deployed to Netlify)
- **Server**: Node.js + Express + Socket.IO (deployed to Heroku), including the AI narrator
- **AI**: offline mock for development, Google Gemini (free tier) for testing, Claude for production

## Quick start (local)

You need **Node.js 24**. No accounts or API keys are required to play locally.

```bash
npm run setup     # installs everything (root, Server, Client)
npm run dev       # starts the server (port 3001) and the client (port 5180)
```

Open **http://localhost:5180**, choose **Play as guest**, and start a room. To test multiplayer
on one computer, open a second browser or a private/incognito window and join with the room code.
Phones on the same Wi-Fi can join at `http://<your-computer's-IP>:5180`.

By default the narrator runs offline (`AI_PROVIDER=mock`) with simple placeholder text. To hear
the real narrator for free, get a Gemini API key from [Google AI Studio](https://aistudio.google.com/),
then:

```bash
cp Server/.env.example Server/.env
# edit Server/.env:  AI_PROVIDER=gemini  and  GEMINI_API_KEY=your-key
```

## Scripts

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run setup` | Install all dependencies |
| `npm run dev` | Server (auto-restarts on changes) + client (hot reload) |
| `npm test` | All server and client tests |
| `npm run lint` | Lint the client |
| `npm run build` | Production build of the client |
| `npm start` | Start the server in production mode (what Heroku runs) |

## Project layout

```
cs-capstone/
├── Client/                     React app
│   └── src/
│       ├── Components/         Auth, socket context, global socket events, login
│       ├── GameComponents/     Lobby, character select/builder, level up, main game
│       │   └── Main/           The game screen: story panel and the combat board
│       └── Utils/
├── shared/                     Game rules used by both sides (see docs/COMBAT.md)
│   ├── combat/                 Abilities, effects, enemy AI, encounters, the combat engine
│   └── data/                   Characters and enemies
├── Server/
│   ├── index.js                Entry point
│   ├── app.js                  Builds the HTTP + Socket.IO server
│   ├── config.js               Every environment variable, documented
│   ├── auth/                   Google sign-in verification and session tokens
│   ├── game/                   Rooms, spawning, level ups
│   ├── combat/                 Tests for the shared combat rules
│   ├── sockets/                Socket event handlers; combat.js runs each room's fight
│   ├── scripts/botFight.js     Bots play story fights over real sockets (stall + balance checks)
│   └── narrator/               The AI game master (see docs/AI_NARRATOR.md)
├── docs/                       Roadmap, deployment guide, narrator guide, reports
├── netlify.toml                Client deploy settings
└── Procfile                    Server deploy settings (Heroku)
```

## Configuration

- Server settings: [`Server/.env.example`](Server/.env.example). Every variable is optional locally.
- Client settings: [`Client/.env.example`](Client/.env.example). Only `VITE_API_URL`, and only when deployed.

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step Heroku (server) and Netlify
(client) setup, Google sign-in, and AI provider configuration.

## The AI narrator

The game decides the structure (when fights happen, who owns a decision, where the story is in
the campaign); the model writes the prose. Lore, characters, villains and the campaign outline are
plain data files you can edit. See **[docs/AI_NARRATOR.md](docs/AI_NARRATOR.md)**.

## Tests

```bash
npm test
```

The server suite includes Socket.IO integration tests that run real clients against the server
(turn order, deaths, reconnects, level ups, lobby flow). The client suite covers every ability,
the enemy AI, and renders the main game screen. CI runs both on every push.

## Troubleshooting

- **The page shows a different app** – another project may be using the port. CyberLock's client
  runs on 5180 to avoid the common Vite port 5173.
- **"Waking up the server"** – the Heroku Eco server sleeps after 30 minutes idle; the first visit
  takes 10–20 seconds.
- **Installs and the first test run are slow** – the project lives in OneDrive, which slows down
  reading thousands of small files. Moving it outside OneDrive (e.g. `C:\dev\cyberlock`) makes
  `npm install` and the first test run much faster.
- **Stuck in an old room after a server restart** – the game notices and returns you to the home
  screen; if not, use *Leave Game* or clear the site's local storage.

## Team

This began as a senior capstone project.

Bryson Sutton · Aiden Carrera · Angel Santiago-Molina · Beau Lamoreaux · Sean Scott · Broderick Mains

## License

ISC
