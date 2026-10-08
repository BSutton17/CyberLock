# Deploying CyberLock

The client goes to **Netlify** and the server goes to **Heroku**, both from this one repository.
Everything below is a one-time setup. After that, pushing to `main` redeploys both.

Do the steps in order: some later steps need URLs from earlier ones.

---

## 1. Gemini API key (free AI for testing)

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Click **Get API key → Create API key**.
3. Locally: copy `Server/.env.example` to `Server/.env` and set:
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key
   ```
   Keep the key out of chat and out of git (`.env` files are ignored).

Free-tier limits change often. If you hit them, the game falls back to pre-written narration
instead of breaking.

## 2. Heroku (server)

You already have an app called **cs-capstone** (this repo has a `heroku` git remote for it, and the
old login page pointed at `https://cs-capstone-491b8f4e8664.herokuapp.com`). Reuse it.

```bash
heroku login
heroku apps:info -a cs-capstone        # confirm you own it and note the "Web URL"
```

**Use the Eco plan:** Account → Billing → subscribe to Eco ($5/month for 1000 dyno hours,
shared by all your Eco apps). Then make the web dyno an Eco dyno:

```bash
heroku ps:type web=eco -a cs-capstone
```

**Remove the old settings** (database, Python AI tunnel). Only unset the ones that exist:

```bash
heroku config -a cs-capstone
heroku config:unset DB_TYPE MYSQL_HOST MYSQL_USER MYSQL_PASSWORD MYSQL_DB AI_API_URL AI_API_KEY CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET JWT_REFRESH_SECRET CLIENT_URL -a cs-capstone
```

**Set the new settings.** You will fill in the Netlify URL and Google client ID after steps 3–4,
so start with these:

```bash
heroku config:set -a cs-capstone \
  NODE_ENV=production \
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  AI_PROVIDER=gemini \
  GEMINI_API_KEY=your-gemini-key
```

**Deploy.** Pick one:

- **GitHub integration (recommended):** Heroku dashboard → cs-capstone → Deploy → GitHub →
  connect `BSutton17/CyberLock` → enable **Automatic deploys** from `main` with
  **Wait for CI to pass**.
- **From your computer:** from the repository root (not the `Server` folder):
  ```bash
  git push heroku main
  ```

Heroku reads the root `package.json` and `Procfile`: it installs only the server's production
dependencies and runs `npm start`.

Check it: open `https://<your-heroku-url>/api/health`. You should see `{"status":"ok",...}`.

> The `Server/` folder contains an old, separate `.git` folder from when only the server was pushed
> to Heroku. It is no longer needed and can be deleted (`Server/.git`). Don't run git commands
> from inside `Server/` until you delete it, or they will act on that old repository.

## 3. Netlify (client)

1. [app.netlify.com](https://app.netlify.com/) → **Add new site → Import an existing project** →
   GitHub → `BSutton17/CyberLock`.
2. Netlify reads `netlify.toml`, so leave the build settings as detected
   (base `Client`, command `npm run build`, publish `dist`).
3. **Site configuration → Environment variables** → add
   `VITE_API_URL` = your Heroku URL, e.g. `https://cs-capstone-491b8f4e8664.herokuapp.com`
   (no trailing slash).
4. **Site configuration → Site details → Change site name** to something like `cyberlock`
   (your URL becomes `https://cyberlock.netlify.app`).
5. **Deploys → Trigger deploy** so the build picks up `VITE_API_URL`.

Now tell the server to accept requests from that URL:

```bash
heroku config:set ALLOWED_ORIGINS=https://cyberlock.netlify.app -a cs-capstone
```

## 4. Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project (e.g. "CyberLock").
2. **APIs & Services → OAuth consent screen**: User type **External**, app name, your email as
   support and developer contact. Keep the default scopes (no extra scopes needed).
3. While the app is in **Testing**, only accounts listed under **Test users** can sign in. Add yours
   and your friends'. When you're ready for anyone to sign in, click **Publish app** (basic sign-in
   scopes don't require Google's review).
4. **Credentials → Create credentials → OAuth client ID** → type **Web application**.
   Under **Authorized JavaScript origins** add exactly:
   - `http://localhost:5180`
   - `https://cyberlock.netlify.app` (your Netlify URL)

   No redirect URIs are needed.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`; it is public, not a secret) and set it:
   ```bash
   heroku config:set GOOGLE_CLIENT_ID=your-client-id -a cs-capstone
   ```
   And locally in `Server/.env`: `GOOGLE_CLIENT_ID=your-client-id`.

The Google button appears automatically once the server has a client ID. Guest login stays
available locally and is off in production (set `ALLOW_GUEST_LOGIN=true` on Heroku if you want it).

## 5. Claude for production narration

When you want the best narration:

1. [console.anthropic.com](https://console.anthropic.com/) → create an API key.
2. **Billing → set a monthly spend limit** before playing.
3. ```bash
   heroku config:set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=your-key -a cs-capstone
   ```

Defaults use Claude Sonnet 5.5 for both story beats and combat lines. To cut costs, use Claude
Haiku 4.5 for the short combat lines:

```bash
heroku config:set ANTHROPIC_COMBAT_MODEL=claude-haiku-4-5 -a cs-capstone
```

Routine combat turns never call the AI (the game's own text is used); only notable moments do, at
most `AI_COMBAT_LINES_PER_MINUTE` (default 12) per minute.

## 6. Smoke test after deploying

- [ ] `https://<heroku-url>/api/health` returns `status: ok` and the narrator you configured
- [ ] The Netlify site loads, shows "Waking up the server" if Heroku was asleep, then the sign-in page
- [ ] Sign in with Google works on the Netlify site
- [ ] Two people can join the same room and reach the first fight
- [ ] Narration appears and decision buttons show who decides

## Environment variable reference

All server variables are documented in [`Server/.env.example`](../Server/.env.example) and
[`Server/config.js`](../Server/config.js).
