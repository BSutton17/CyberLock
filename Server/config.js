// All server configuration comes from environment variables (Heroku config vars in production,
// Server/.env locally). See Server/.env.example for the full list.
import dotenv from 'dotenv';

dotenv.config();

const env = process.env;

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value) =>
  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test' || !!env.VITEST;

const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production';

export const config = {
  isProduction,
  isTest,
  port: toInt(env.PORT, 3001),

  // Origins allowed to call the API and open sockets. In development every origin is allowed so
  // phones on the same Wi-Fi can join. In production list your Netlify URL (comma separated).
  allowedOrigins: toList(env.ALLOWED_ORIGINS),

  auth: {
    jwtSecret: env.JWT_SECRET || (isProduction ? '' : DEV_JWT_SECRET),
    sessionTtl: env.SESSION_TTL || '7d',
    googleClientId: env.GOOGLE_CLIENT_ID || '',
    // Guest login lets friends without Google accounts play (and makes local multiplayer testing
    // easy). On unless ALLOW_GUEST_LOGIN=false.
    guestLoginEnabled: env.ALLOW_GUEST_LOGIN ? env.ALLOW_GUEST_LOGIN !== 'false' : true
  },

  ai: {
    // mock | gemini | anthropic | openai-compatible
    provider: (env.AI_PROVIDER || 'mock').toLowerCase(),
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-flash-latest',
    // Thinking depth for Gemini models that support it. Empty string sends nothing.
    geminiReasoningEffort: env.GEMINI_REASONING_EFFORT ?? 'low',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    // Story beats get the stronger model; quick combat lines can use a cheaper one.
    anthropicStoryModel: env.ANTHROPIC_STORY_MODEL || 'claude-sonnet-5-5',
    anthropicCombatModel: env.ANTHROPIC_COMBAT_MODEL || env.ANTHROPIC_STORY_MODEL || 'claude-sonnet-5-5',
    openAiCompatibleBaseUrl: env.AI_BASE_URL || '',
    openAiCompatibleApiKey: env.AI_API_KEY || '',
    openAiCompatibleModel: env.AI_MODEL || '',
    requestTimeoutMs: toInt(env.AI_TIMEOUT_MS, 20000),
    // Fake latency for the offline mock so the UI behaves like it will with a real model.
    mockDelayMs: toInt(env.MOCK_AI_DELAY_MS, 400),
    // The mock writes combat lines instantly; wait a moment so a line lands after the move it describes.
    mockCombatDelayMs: toInt(env.MOCK_AI_COMBAT_DELAY_MS, 900),
    // Story decisions between fights before the next fight starts.
    decisionsPerInterlude: toInt(env.STORY_DECISIONS_PER_INTERLUDE, 3),
    // Routine combat turns use the game's own summary text; only notable moments go to the AI,
    // and at most this many per minute (protects free-tier rate limits).
    // AI-written combat lines per minute; other turns use template narration. Kept low for free tiers.
    combatLinesPerMinute: toInt(env.AI_COMBAT_LINES_PER_MINUTE, 6)
  },

  timing: {
    // Pause after a player ends their turn so the turn's narration can be read.
    allyTurnAdvanceDelayMs: toInt(env.ALLY_TURN_ADVANCE_DELAY_MS, 1200),
    // A player whose action is spent and who cannot move is moved on after this pause.
    autoEndTurnDelayMs: toInt(env.AUTO_END_TURN_DELAY_MS, 1500),
    // Pause before the first enemy acts when an enemy is fastest at combat start.
    combatStartEnemyDelayMs: toInt(env.COMBAT_START_ENEMY_DELAY_MS, 3000),
    // Enemy pacing: "thinking" before acting, after walking before striking, and after the turn.
    enemyThinkMs: toInt(env.ENEMY_THINK_MS, 700),
    enemyAttackDelayMs: toInt(env.ENEMY_ATTACK_DELAY_MS, 350),
    enemyTurnEndDelayMs: toInt(env.ENEMY_TURN_END_DELAY_MS, 1000),
    // Pause between one enemy's turn and the next unit's.
    enemyTurnAdvanceDelayMs: toInt(env.ENEMY_TURN_ADVANCE_DELAY_MS, 0),
    // Multiplier for how long the server waits on movement animations (0 = don't wait).
    animationScale: 1,
    // A player's turn is ended automatically after this long.
    allyTurnTimeoutMs: toInt(env.ALLY_TURN_TIMEOUT_MS, 40000),
    // Pause before each step a bot party member takes, so players can follow it.
    botStepMs: toInt(env.BOT_STEP_MS, 900),
    // How long a player has to answer a personal moment before their character stays silent.
    dialogueTimeoutMs: toInt(env.DIALOGUE_TIMEOUT_MS, 60000),
    // How long a disconnected player keeps their seat before being removed.
    disconnectGraceMs: toInt(env.DISCONNECT_GRACE_MS, 60000)
  }
};

// With the offline mock narrator there is no AI latency to pace the fight, so turns would fly by.
// Slow things down, unless a value was set explicitly in the environment.
const MOCK_PACING = {
  allyTurnAdvanceDelayMs: ['ALLY_TURN_ADVANCE_DELAY_MS', 2200],
  autoEndTurnDelayMs: ['AUTO_END_TURN_DELAY_MS', 2000],
  enemyThinkMs: ['ENEMY_THINK_MS', 1300],
  enemyAttackDelayMs: ['ENEMY_ATTACK_DELAY_MS', 600],
  enemyTurnEndDelayMs: ['ENEMY_TURN_END_DELAY_MS', 1600],
  enemyTurnAdvanceDelayMs: ['ENEMY_TURN_ADVANCE_DELAY_MS', 1200],
  botStepMs: ['BOT_STEP_MS', 1500]
};

export function applyMockPacing(timing, environment = env) {
  const paced = { ...timing };
  for (const [key, [envName, value]] of Object.entries(MOCK_PACING)) {
    if (environment[envName] === undefined || environment[envName] === '') paced[key] = value;
  }
  return paced;
}

if (config.ai.provider === 'mock') config.timing = applyMockPacing(config.timing);

export function validateConfig() {
  const problems = [];
  if (!config.auth.jwtSecret) {
    problems.push('JWT_SECRET must be set in production.');
  }
  if (config.isProduction && config.allowedOrigins.length === 0) {
    problems.push('ALLOWED_ORIGINS should list your client URL in production (e.g. https://your-site.netlify.app).');
  }
  if (!config.auth.googleClientId && !config.auth.guestLoginEnabled) {
    problems.push('Neither GOOGLE_CLIENT_ID nor guest login is enabled, so nobody can sign in.');
  }
  return problems;
}
