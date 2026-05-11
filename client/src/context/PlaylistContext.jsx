/**
 * PlaylistContext.jsx
 * - Logged IN:  playlists stored in MongoDB via /auth/playlists/* API
 *              (synced across all devices!)
 * - Logged OUT: playlists stored in localStorage (guest mode)
 * On first login, localStorage playlists are merged into the backend.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext(null);

/* ── localStorage helpers (guest mode) ─────────────────────────────────── */
const LS_KEY   = () => 'playit_guest_playlists';
const lsLoad   = () => { try { return JSON.parse(localStorage.getItem(LS_KEY()) || '[]'); } catch { return []; } };
const lsSave   = (pl) => { try { localStorage.setItem(LS_KEY(), JSON.stringify(pl)); } catch {} };
const lsClear  = () => { try { localStorage.removeItem(LS_KEY()); } catch {} };

/* ── API helpers ─────────────────────────────────────────────────────────── */
function buildHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(url, opts = {}) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

function normalizePlaylist(pl) {
  return { ...pl, id: pl.id || pl._id?.toString() };
}

export function PlaylistProvider({ children }) {
  const { user, token, isLoggedIn } = useAuth();

  const [playlists, setPlaylists] = useState([]);
  const [queue,     setQueue]     = useState([]);
  const [toast,     setToast]     = useState(null);
  const [syncing,   setSyncing]   = useState(false);
  const syncedRef = useRef(false);   // prevent double-sync

  /* ── Toast helper ─────────────────────────────────────────────────────── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  /* ── Load playlists when auth state changes ───────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn || !token) {
      // Guest mode: load from localStorage
      setPlaylists(lsLoad());
      syncedRef.current = false;
      return;
    }

    // Logged in: fetch from backend
    (async () => {
      setSyncing(true);
      try {
        const data = await apiFetch('/auth/playlists', { headers: buildHeaders(token) });
        const serverPlaylists = (data.playlists || []).map(normalizePlaylist);

        // First-time login: sync any guest playlists to backend
        if (!syncedRef.current) {
          syncedRef.current = true;
          const guestPlaylists = lsLoad();
          if (guestPlaylists.length > 0) {
            // Merge guest playlists into backend (skip if name already exists)
            const serverNames = new Set(serverPlaylists.map(p => p.name.toLowerCase()));
            const toMigrate   = guestPlaylists.filter(p => !serverNames.has(p.name.toLowerCase()));

            if (toMigrate.length > 0) {
              const migrated = await Promise.all(toMigrate.map(async (gp) => {
                try {
                  const res = await apiFetch('/auth/playlists', {
                    method: 'POST', headers: buildHeaders(token),
                    body: JSON.stringify({ name: gp.name }),
                  });
                  const newPl = normalizePlaylist(res.playlist);
                  // Add songs
                  for (const song of (gp.songs || [])) {
                    await apiFetch(`/auth/playlists/${newPl.id}/songs`, {
                      method: 'POST', headers: buildHeaders(token),
                      body: JSON.stringify({ song }),
                    }).catch(() => {});
                  }
                  return { ...newPl, songs: gp.songs || [] };
                } catch { return null; }
              }));

              const validMigrated = migrated.filter(Boolean);
              if (validMigrated.length) {
                showToast(`✓ Synced ${validMigrated.length} playlist${validMigrated.length > 1 ? 's' : ''} from this device`);
              }
              lsClear(); // Clear guest playlists after migration

              // Refetch to get final state
              const refreshed = await apiFetch('/auth/playlists', { headers: buildHeaders(token) });
              setPlaylists((refreshed.playlists || []).map(normalizePlaylist));
              return;
            }
            lsClear();
          }
        }

        setPlaylists(serverPlaylists);
      } catch (e) {
        console.warn('⚠️ Failed to load playlists from server:', e.message);
        // Fallback to localStorage if server unreachable
        setPlaylists(lsLoad());
      } finally {
        setSyncing(false);
      }
    })();
  }, [isLoggedIn, token]);

  /* ── Create playlist ──────────────────────────────────────────────────── */
  const createPlaylist = useCallback(async (name, song = null) => {
    if (!name?.trim()) return;

    if (!isLoggedIn || !token) {
      // Guest mode
      const pl = { id: Date.now().toString(), name: name.trim(), songs: song ? [song] : [], createdAt: new Date().toISOString() };
      setPlaylists(prev => { const n = [pl, ...prev]; lsSave(n); return n; });
      showToast(`Playlist "${name}" created`);
      return pl;
    }

    try {
      const res = await apiFetch('/auth/playlists', {
        method: 'POST', headers: buildHeaders(token),
        body: JSON.stringify({ name: name.trim() }),
      });
      const pl = normalizePlaylist(res.playlist);

      // If a song was passed, add it immediately
      if (song) {
        await apiFetch(`/auth/playlists/${pl.id}/songs`, {
          method: 'POST', headers: buildHeaders(token),
          body: JSON.stringify({ song }),
        }).catch(() => {});
        pl.songs = [song];
      }

      setPlaylists(prev => [pl, ...prev]);
      showToast(`Playlist "${name}" created`);
      return pl;
    } catch (e) {
      showToast(`Failed: ${e.message}`);
    }
  }, [isLoggedIn, token, showToast]);

  /* ── Add song to playlist ─────────────────────────────────────────────── */
  const addToPlaylist = useCallback(async (playlistId, song) => {
    if (!song || !playlistId) return;

    if (!isLoggedIn || !token) {
      let added = false;
      let name  = '';
      setPlaylists(prev => {
        const n = prev.map(pl => {
          if (pl.id !== playlistId) return pl;
          name = pl.name;
          if (pl.songs.find(s => s.id === song.id)) return pl;
          added = true;
          return { ...pl, songs: [...pl.songs, song] };
        });
        lsSave(n);
        return n;
      });
      setTimeout(() => showToast(added ? `Added to "${name}"` : `Already in "${name}"`), 50);
      return;
    }

    try {
      await apiFetch(`/auth/playlists/${playlistId}/songs`, {
        method: 'POST', headers: buildHeaders(token),
        body: JSON.stringify({ song }),
      });
      setPlaylists(prev => prev.map(pl => {
        if (pl.id !== playlistId) return pl;
        if (pl.songs.find(s => s.id === song.id)) { showToast(`Already in "${pl.name}"`); return pl; }
        showToast(`Added to "${pl.name}"`);
        return { ...pl, songs: [...pl.songs, song] };
      }));
    } catch (e) {
      showToast(`Failed: ${e.message}`);
    }
  }, [isLoggedIn, token, showToast]);

  /* ── Remove song from playlist ────────────────────────────────────────── */
  const removeFromPlaylist = useCallback(async (playlistId, songId) => {
    if (!isLoggedIn || !token) {
      setPlaylists(prev => {
        const n = prev.map(pl => pl.id !== playlistId ? pl : { ...pl, songs: pl.songs.filter(s => s.id !== songId) });
        lsSave(n);
        return n;
      });
      return;
    }
    try {
      await apiFetch(`/auth/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE', headers: buildHeaders(token) });
      setPlaylists(prev => prev.map(pl => pl.id !== playlistId ? pl : { ...pl, songs: pl.songs.filter(s => s.id !== songId) }));
    } catch (e) {
      showToast(`Failed: ${e.message}`);
    }
  }, [isLoggedIn, token, showToast]);

  /* ── Delete playlist ──────────────────────────────────────────────────── */
  const deletePlaylist = useCallback(async (playlistId) => {
    if (!isLoggedIn || !token) {
      setPlaylists(prev => { const n = prev.filter(pl => pl.id !== playlistId); lsSave(n); return n; });
      showToast('Playlist deleted');
      return;
    }
    try {
      await apiFetch(`/auth/playlists/${playlistId}`, { method: 'DELETE', headers: buildHeaders(token) });
      setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
      showToast('Playlist deleted');
    } catch (e) {
      showToast(`Failed: ${e.message}`);
    }
  }, [isLoggedIn, token, showToast]);

  /* ── Queue ────────────────────────────────────────────────────────────── */
  const addToQueue = useCallback((song) => {
    if (!song) return;
    setQueue(prev => prev.find(s => s.id === song.id) ? prev : [...prev, song]);
    showToast(`"${song.title}" added to queue`);
  }, [showToast]);
  const removeFromQueue = useCallback((songId) => setQueue(prev => prev.filter(s => s.id !== songId)), []);
  const clearQueue      = useCallback(() => { setQueue([]); showToast('Queue cleared'); }, [showToast]);

  return (
    <PlaylistContext.Provider value={{
      playlists, queue, syncing,
      createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist,
      addToQueue, removeFromQueue, clearQueue,
    }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
          color: '#fff', padding: '10px 22px', borderRadius: '99px',
          fontSize: '13px', fontWeight: '700', zIndex: 9999,
          boxShadow: '0 8px 32px rgba(139,92,246,0.4)', whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.25s ease',
        }}>
          {toast}
        </div>
      )}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylists must be inside PlaylistProvider');
  return ctx;
}
