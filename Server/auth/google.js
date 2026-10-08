// Verifies the ID token that "Sign in with Google" gives the browser.
import { OAuth2Client } from 'google-auth-library';
import { sanitizeDisplayName } from './session.js';

export function createGoogleVerifier(clientId) {
  if (!clientId) {
    return async () => {
      throw new Error('Google sign-in is not configured on this server (GOOGLE_CLIENT_ID is missing).');
    };
  }

  const client = new OAuth2Client(clientId);

  return async (idToken) => {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload?.sub) {
      throw new Error('Google did not return an account id.');
    }
    if (payload.email_verified === false) {
      throw new Error('Please verify your Google email address first.');
    }

    const emailName = typeof payload.email === 'string' ? payload.email.split('@')[0] : '';
    return {
      id: `google:${payload.sub}`,
      name: sanitizeDisplayName(payload.given_name || payload.name || emailName),
      provider: 'google',
      ...(payload.picture ? { picture: payload.picture } : {})
    };
  };
}
