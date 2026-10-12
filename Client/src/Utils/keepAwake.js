// Keeps the game server awake while people are playing.
//
// The server runs on a Heroku eco dyno, which goes to sleep after 30 minutes without a new web
// request. An open game connection (the socket) doesn't count as one, so a long game used to put
// the server to sleep halfway through, and every game in progress was lost with it. While a
// player is in a game, their browser pings the server's health check every few minutes.

export const KEEP_AWAKE_INTERVAL_MS = 5 * 60 * 1000;

/** Starts pinging `${apiUrl}/api/health`; returns a function that stops it. */
export function keepServerAwake(apiUrl, { intervalMs = KEEP_AWAKE_INTERVAL_MS, fetchImpl = globalThis.fetch } = {}) {
    if (!apiUrl || typeof fetchImpl !== 'function') return () => {};
    const ping = () => {
        fetchImpl(`${apiUrl}/api/health`, { cache: 'no-store' }).catch(() => {});
    };
    const timer = setInterval(ping, intervalMs);
    return () => clearInterval(timer);
}
