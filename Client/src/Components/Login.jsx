import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext';
import '../styles/Login.css';

const SERVER_STATUS_TEXT = {
  checking: 'Connecting to the server...',
  waking: 'Waking up the server. This can take up to 20 seconds the first time...',
  offline: 'The server is not responding. Try again in a minute.'
};

const Login = () => {
  const { isAuthenticated, loading, serverStatus, authConfig, signInWithGoogle, signInAsGuest } = useAuth();
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/home', { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const handleGoogle = async (credentialResponse) => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle(credentialResponse.credential);
    } catch (signInError) {
      setError(signInError.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async (event) => {
    event.preventDefault();
    if (!guestName.trim()) {
      setError('Pick a name first.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signInAsGuest(guestName.trim());
    } catch (signInError) {
      setError(signInError.message || 'Guest sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const online = serverStatus === 'online';
  const hasGoogle = online && !!authConfig.googleClientId;
  const hasGuest = online && authConfig.guestLoginEnabled;

  return (
    <div className="login-container">
      <div className="login-card">
        <img className="login-title-card" src="/ui/TitleCard.png" alt="CyberLock" />
        <h1>Sign in</h1>

        {!online && (
          <div className="server-status-warning" role="status" aria-live="polite">
            {SERVER_STATUS_TEXT[serverStatus]}
          </div>
        )}

        {error && <div className="error-message" role="alert">{error}</div>}

        {hasGoogle && (
          <div className="google-login">
            <GoogleOAuthProvider clientId={authConfig.googleClientId}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Google sign-in was cancelled or failed.')}
                theme="filled_black"
                shape="pill"
                text="signin_with"
              />
            </GoogleOAuthProvider>
          </div>
        )}

        {online && !hasGoogle && !hasGuest && (
          <p className="setup-description">Sign-in is not configured on this server yet.</p>
        )}

        {hasGuest && (
          <>
            {hasGoogle && <div className="login-divider"><span>or play as a guest</span></div>}
            <form onSubmit={handleGuest}>
              <div className="form-group">
                <label htmlFor="guest-name">Guest name</label>
                <input
                  id="guest-name"
                  type="text"
                  value={guestName}
                  maxLength={24}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="What should the crew call you?"
                  autoComplete="nickname"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Signing in...' : 'Play as guest'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
