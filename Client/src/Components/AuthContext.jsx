import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, waitForServer } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cyberlock_token';
const USER_KEY = 'cyberlock_user';

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
};

export const getStoredToken = () => readStorage(TOKEN_KEY);

const readStoredUser = () => {
  try {
    return JSON.parse(readStorage(USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(true);
  // checking -> online | waking (Heroku dyno starting) -> online | offline
  const [serverStatus, setServerStatus] = useState('checking');
  const [authConfig, setAuthConfig] = useState({ googleClientId: null, guestLoginEnabled: false });

  const saveSession = useCallback((nextToken, nextUser) => {
    writeStorage(TOKEN_KEY, nextToken);
    writeStorage(USER_KEY, nextUser ? JSON.stringify(nextUser) : null);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    saveSession(null, null);
  }, [saveSession]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const online = await waitForServer({
        onWaiting: () => setServerStatus('waking'),
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setServerStatus(online ? 'online' : 'offline');

      if (online) {
        try {
          setAuthConfig(await apiFetch('/api/auth/config'));
        } catch {
          // Leave defaults; the login page shows what it can.
        }

        const storedToken = getStoredToken();
        if (storedToken) {
          try {
            const { user: verifiedUser } = await apiFetch('/api/auth/me', { token: storedToken });
            saveSession(storedToken, verifiedUser);
          } catch (error) {
            if (error.status === 401) saveSession(null, null);
          }
        }
      }

      setLoading(false);
    })();

    return () => controller.abort();
  }, [saveSession]);

  const signInWithGoogle = useCallback(async (credential) => {
    const { token: nextToken, user: nextUser } = await apiFetch('/api/auth/google', { method: 'POST', body: { credential } });
    saveSession(nextToken, nextUser);
    return nextUser;
  }, [saveSession]);

  const signInAsGuest = useCallback(async (name) => {
    const { token: nextToken, user: nextUser } = await apiFetch('/api/auth/guest', { method: 'POST', body: { name } });
    saveSession(nextToken, nextUser);
    return nextUser;
  }, [saveSession]);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    serverStatus,
    authConfig,
    signInWithGoogle,
    signInAsGuest,
    logout
  }), [user, token, loading, serverStatus, authConfig, signInWithGoogle, signInAsGuest, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
