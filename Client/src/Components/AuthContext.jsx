import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://cs-capstone-491b8f4e8664.herokuapp.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken && storedUser) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Setup axios interceptor to add token to requests
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }, [accessToken]);

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        email,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens and user info
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens and user info
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken) {
        return { success: false };
      }

      const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
        refreshToken,
      });

      const { accessToken: newAccessToken } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);

      return { success: true, accessToken: newAccessToken };
    } catch (error) {
      // Refresh failed, logout user
      logout();
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await axios.post(`${API_URL}/api/auth/logout`, { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);

      // Remove auth header
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    register,
    login,
    logout,
    refreshAccessToken,
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
