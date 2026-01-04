import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setPartner(data.partner);
      setSettings(data.settings);
    } catch (err) {
      // Not authenticated
      setUser(null);
      setPartner(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setError(null);
    try {
      const data = await api.post('/auth/login', { username, password });
      setUser(data.user);
      setSettings(data.settings);
      // Fetch partner info
      await checkAuth();
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setPartner(null);
      setSettings(null);
    }
  };

  const updateSettings = useCallback(async (newSettings) => {
    const data = await api.patch('/settings', newSettings);
    if (data.success) {
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
    return data;
  }, []);

  const toggleHeavyMode = useCallback(async () => {
    const data = await api.post('/settings/toggle-heavy');
    setSettings(prev => ({ ...prev, heavyModeEnabled: data.heavyModeEnabled }));
    return data.heavyModeEnabled;
  }, []);

  const value = {
    user,
    partner,
    settings,
    loading,
    error,
    login,
    logout,
    checkAuth,
    updateSettings,
    toggleHeavyMode,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

