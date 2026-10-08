// Where the game server lives.
// - Local dev: defaults to port 5000 on the same host (works from phones on your Wi-Fi too).
// - Netlify: set VITE_API_URL to your Heroku app URL in the site's environment variables.
const devDefault = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';

export const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? devDefault : '')).replace(/\/+$/, '');

if (!API_URL && typeof console !== 'undefined') {
  console.error('[CONFIG] VITE_API_URL is not set. Set it to your server URL in your hosting environment.');
}
