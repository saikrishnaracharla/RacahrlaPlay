import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Use relative URL — goes through Vite proxy to port 5000 (fixes CORS / Failed to fetch)
const API = '/auth';

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('racharla_token'));
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('racharla_token');
    if (!saved) { setLoading(false); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => r.json())
      .then(d => {
        if (d.user) { setUser(d.user); setToken(saved); }
        else { localStorage.removeItem('racharla_token'); }
      })
      .catch(() => localStorage.removeItem('racharla_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('racharla_token', data.token);
    setToken(data.token); setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res  = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('racharla_token', data.token);
    setToken(data.token); setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('racharla_token');
    setToken(null); setUser(null);
  }, []);

  const authFetch = useCallback((url, opts = {}) =>
    fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers, Authorization: `Bearer ${token}` } }),
  [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
