import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Use relative URL — goes through Vite proxy / Vercel rewrite to backend
const API = '/auth';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('racharla_token'));
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('racharla_token');
    if (!saved) { setLoading(false); return; }

    fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then(r => {
        if (r.status === 401) {
          // Only clear token when server explicitly rejects it
          localStorage.removeItem('racharla_token');
          return null;
        }
        return r.json();
      })
      .then(d => {
        if (d?.user) {
          setUser(d.user);
          setToken(saved);
        }
        // On any other error (network, 500) we KEEP the token
        // so the user stays "logged in" optimistically
      })
      .catch(() => {
        // Network offline / server down — keep user logged in
        // Restore minimal user object from token payload if possible
        try {
          const payload = JSON.parse(atob(saved.split('.')[1]));
          if (payload?.id || payload?.userId) {
            setUser({
              id:       payload.id || payload.userId,
              username: payload.username || 'User',
              email:    payload.email    || '',
            });
            setToken(saved);
          }
        } catch {
          // Token not a JWT — leave user logged out
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('racharla_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res  = await fetch(`${API}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('racharla_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('racharla_token');
    setToken(null);
    setUser(null);
  }, []);

  // ── Authenticated fetch helper ────────────────────────────────────────────
  const authFetch = useCallback((url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
        Authorization: `Bearer ${token}`,
      },
    }),
  [token]);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, authFetch,
      isLoggedIn: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
