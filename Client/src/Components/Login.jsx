import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/Login.css';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'https://cs-capstone-491b8f4e8664.herokuapp.com');

const DEV_MOBILE_BYPASS = import.meta.env.DEV && window.location.hostname !== 'localhost';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter username, 2 = answer question
  const [forgotUsername, setForgotUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Security question setup state (shown after login for existing users)
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [setupQuestion, setSetupQuestion] = useState('');
  const [setupAnswer, setSetupAnswer] = useState('');

  const { login, register, setSecurityQuestion: saveSecurityQuestion } = useAuth();
  const navigate = useNavigate();

  // On mobile/LAN in dev mode, skip login entirely
  useEffect(() => {
    if (DEV_MOBILE_BYPASS) navigate('/home');
  }, []);

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
          if (!result.securityQuestionSet) {
            setShowSecuritySetup(true);
          } else {
            navigate('/home');
          }
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
          setShowSecuritySetup(true);
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

  const SECURITY_QUESTIONS = [
    'What was the name of your first pet?',
    'What city were you born in?',
    'What is your favorite movie?',
    'What was your childhood nickname?',
    'What is the name of your favorite teacher?',
  ];

  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername }),
      });
      const data = await response.json();
      if (response.ok) {
        setSecurityQuestion(data.securityQuestion);
        setForgotStep(2);
      } else {
        setError(data.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep2 = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername,
          securityAnswer,
          newPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setForgotSuccess(data.message);
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotUsername('');
        setSecurityAnswer('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setError(data.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySetup = async (e) => {
    e.preventDefault();
    setError('');

    if (!setupQuestion || !setupAnswer) {
      setError('Please select a question and provide an answer');
      return;
    }
    if (setupAnswer.trim().length < 2) {
      setError('Answer must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await saveSecurityQuestion(setupQuestion, setupAnswer);
      if (result.success) {
        navigate('/home');
      } else {
        setError(result.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Security question setup modal (shown after login for existing users without one)
  if (showSecuritySetup) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Set Up Security Question</h1>
          <p className="setup-description">
            Please set a security question so you can reset your password if you forget it.
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSecuritySetup}>
            <div className="form-group">
              <label htmlFor="setupQuestion">Security Question</label>
              <select
                id="setupQuestion"
                value={setupQuestion}
                onChange={(e) => setSetupQuestion(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Select a question...</option>
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="setupAnswer">Your Answer</label>
              <input
                id="setupAnswer"
                type="text"
                value={setupAnswer}
                onChange={(e) => setSetupAnswer(e.target.value)}
                placeholder="Enter your answer"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>

          <div className="toggle-mode">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="link-button"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password flow
  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Reset Password</h1>

          {error && <div className="error-message">{error}</div>}

          {forgotStep === 1 && (
            <form onSubmit={handleForgotStep1}>
              <div className="form-group">
                <label htmlFor="forgotUsername">Username</label>
                <input
                  id="forgotUsername"
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Loading...' : 'Next'}
              </button>
            </form>
          )}

          {forgotStep === 2 && (
            <form onSubmit={handleForgotStep2}>
              <p className="security-question-display">{securityQuestion}</p>

              <div className="form-group">
                <label htmlFor="securityAnswer">Your Answer</label>
                <input
                  id="securityAnswer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="toggle-mode">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotStep(1);
                setError('');
                setForgotUsername('');
                setSecurityAnswer('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              className="link-button"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {forgotSuccess && <div className="success-message">{forgotSuccess}</div>}

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

        {isLogin && (
          <div className="forgot-password-link">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError('');
                setForgotSuccess('');
              }}
              className="link-button"
            >
              Forgot Password?
            </button>
          </div>
        )}

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
