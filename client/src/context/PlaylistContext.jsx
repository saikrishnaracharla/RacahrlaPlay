import React, { createContext, useContext, useState, useCallback } from 'react';

const PlaylistContext = createContext(null);

const load = () => { try { return JSON.parse(localStorage.getItem('raaga_playlists') || '[]'); } catch { return []; } };
const save = (p) => { try { localStorage.setItem('raaga_playlists', JSON.stringify(p)); } catch {} };

export function PlaylistProvider({ children }) {
  const [playlists, setPlaylists] = useState(load);
  const [queue, setQueue] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const createPlaylist = useCallback((name, song = null) => {
    const pl = { id: Date.now().toString(), name: name.trim(), songs: song ? [song] : [], createdAt: new Date().toISOString() };
    setPlaylists(prev => { const u = [pl, ...prev]; save(u); return u; });
    showToast(`Playlist "${name}" created!`);
    return pl;
  }, []);

  const addToPlaylist = useCallback((playlistId, song) => {
    if (!song || !playlistId) return;
    let added = false;
    let playlistName = '';
    setPlaylists(prev => {
      const u = prev.map(pl => {
        if (pl.id !== playlistId) return pl;
        playlistName = pl.name;
        if (pl.songs.find(s => s.id === song.id)) { return pl; }
        added = true;
        return { ...pl, songs: [...pl.songs, song] };
      });
      save(u);
      return u;
    });
    // Use setTimeout so state is updated before toast
    setTimeout(() => {
      showToast(added ? `Added to "${playlistName}"` : `Already in "${playlistName}"`);
    }, 50);
  }, []);

  const removeFromPlaylist = useCallback((playlistId, songId) => {
    setPlaylists(prev => { const u = prev.map(pl => pl.id !== playlistId ? pl : { ...pl, songs: pl.songs.filter(s => s.id !== songId) }); save(u); return u; });
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists(prev => { const u = prev.filter(pl => pl.id !== playlistId); save(u); return u; });
    showToast('Playlist deleted');
  }, []);

  const addToQueue = useCallback((song) => {
    if (!song) return;
    setQueue(prev => prev.find(s => s.id === song.id) ? prev : [...prev, song]);
    showToast(`"${song.title}" added to queue`);
  }, []);

  const removeFromQueue = useCallback((songId) => setQueue(prev => prev.filter(s => s.id !== songId)), []);
  const clearQueue = useCallback(() => { setQueue([]); showToast('Queue cleared'); }, []);

  return (
    <PlaylistContext.Provider value={{ playlists, queue, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, addToQueue, removeFromQueue, clearQueue }}>
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
