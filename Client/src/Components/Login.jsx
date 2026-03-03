import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/Login.css';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'https://cs-capstone-491b8f4e8664.herokuapp.com');

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkServerConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (!isMounted) return;
        setIsServerConnected(response.ok);
      } catch (connectionError) {
        if (!isMounted) return;
        setIsServerConnected(false);
      }
    };

    checkServerConnection();
    const intervalId = setInterval(checkServerConnection, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isServerConnected) {
      setError('Server is offline. Please try again in a moment.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!username || !password) {
          setError('Username and password are required');
          setLoading(false);
          return;
        }

        const result = await login(username, password);
        if (result.success) {
          navigate('/home');
        } else {
          setError(result.message);
        }
      } else {
        // Register
        if (!username || !email || !password || !confirmPassword) {
          setError('All fields are required');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const result = await register(username, email, password);
        if (result.success) {
          navigate('/home');
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isLogin ? 'Login' : 'Create Account'}</h1>

        {!isServerConnected && (
          <div className="server-status-warning" role="status" aria-live="polite">
            Not connected to server. Login and signup are temporarily unavailable.
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="link-button"
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
