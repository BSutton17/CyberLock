import { useAuth } from './AuthContext';

const STATUS_TEXT = {
  checking: 'Connecting to the server...',
  waking: 'Waking up the server. This can take up to 20 seconds the first time...',
  offline: 'The server is not responding. Try again in a minute.',
  online: 'Loading...'
};

// Shown while the app checks the server and the saved session.
function LoadingScreen() {
  const { serverStatus } = useAuth();
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <p>{STATUS_TEXT[serverStatus] || STATUS_TEXT.checking}</p>
    </div>
  );
}

export default LoadingScreen;
