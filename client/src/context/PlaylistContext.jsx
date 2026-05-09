import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext(null);

// User-scoped storage key — each user gets their own playlists
const storageKey = (userId) => userId ? `raaga_playlists_${userId}` : null;
const load = (userId) => {
  const key = storageKey(userId);
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const save = (userId, playlists) => {
  const key = storageKey(userId);
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(playlists)); } catch {}
};

export function PlaylistProvider({ children }) {
  const { user } = useAuth();
  const userId   = user?.id || user?.userId || null;

  // Reload playlists whenever the logged-in user changes
  const [playlists, setPlaylists] = useState([]);
  const [queue,     setQueue]     = useState([]);
  const [toast,     setToast]     = useState(null);

  useEffect(() => {
    // When user changes (login/logout/switch), load their playlists
    setPlaylists(load(userId));
    setQueue([]);
  }, [userId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updatePlaylists = (updater) => {
    setPlaylists(prev => {
      const next = updater(prev);
      save(userId, next);
      return next;
    });
  };

  const createPlaylist = useCallback((name, song = null) => {
    const pl = {
      id:        Date.now().toString(),
      name:      name.trim(),
      songs:     song ? [song] : [],
      createdAt: new Date().toISOString(),
    };
    updatePlaylists(prev => [pl, ...prev]);
    showToast(`Playlist "${name}" created!`);
    return pl;
  }, [userId]);

  const addToPlaylist = useCallback((playlistId, song) => {
    if (!song || !playlistId) return;
    let added = false;
    let playlistName = '';
    updatePlaylists(prev => prev.map(pl => {
      if (pl.id !== playlistId) return pl;
      playlistName = pl.name;
      if (pl.songs.find(s => s.id === song.id)) return pl;
      added = true;
      return { ...pl, songs: [...pl.songs, song] };
    }));
    setTimeout(() => {
      showToast(added ? `Added to "${playlistName}"` : `Already in "${playlistName}"`);
    }, 50);
  }, [userId]);

  const removeFromPlaylist = useCallback((playlistId, songId) => {
    updatePlaylists(prev =>
      prev.map(pl => pl.id !== playlistId ? pl : { ...pl, songs: pl.songs.filter(s => s.id !== songId) })
    );
  }, [userId]);

  const deletePlaylist = useCallback((playlistId) => {
    updatePlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    showToast('Playlist deleted');
  }, [userId]);

  const addToQueue = useCallback((song) => {
    if (!song) return;
    setQueue(prev => prev.find(s => s.id === song.id) ? prev : [...prev, song]);
    showToast(`"${song.title}" added to queue`);
  }, []);

  const removeFromQueue = useCallback((songId) => setQueue(prev => prev.filter(s => s.id !== songId)), []);
  const clearQueue      = useCallback(() => { setQueue([]); showToast('Queue cleared'); }, []);

  return (
    <PlaylistContext.Provider value={{
      playlists, queue,
      createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist,
      addToQueue, removeFromQueue, clearQueue,
    }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
          background: '#1DB954', color: '#000', padding: '10px 22px', borderRadius: '99px',
          fontSize: '13px', fontWeight: '700', zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
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
