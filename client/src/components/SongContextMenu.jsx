import React, { useState, useEffect, useRef } from 'react';
import {
  Play, ListPlus, FolderPlus, ListEnd, Disc3,
  FileText, X, Check, Plus
} from 'lucide-react';
import { usePlaylists } from '../context/PlaylistContext';
import { usePlayer } from '../context/PlayerContext';

export default function SongContextMenu({ song, songs = [], index = 0, position, onClose }) {
  const { playlists, addToPlaylist, addToQueue, createPlaylist } = usePlaylists();
  const { playSong } = usePlayer();
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  // Clamp position so menu doesn't go off screen
  const { x, y } = position || { x: 0, y: 0 };
  const menuW = 220;
  const menuH = 320;
  const left = Math.min(x, window.innerWidth - menuW - 12);
  const top = Math.min(y, window.innerHeight - menuH - 12);

  const handlePlayNow = () => {
    playSong(song, songs, index);
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue(song);
    onClose();
  };

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(playlistId, song);
    onClose();
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), song);
    setNewPlaylistName('');
    onClose();
  };

  const MenuItem = ({ icon: Icon, label, onClick, color, danger }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: danger ? '#ef4444' : (color || 'var(--text-secondary)'),
        fontSize: '13px',
        fontWeight: '500',
        fontFamily: 'inherit',
        textAlign: 'left',
        borderRadius: '6px',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.07)';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = danger ? '#ef4444' : (color || 'var(--text-secondary)');
      }}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 8000,
        }}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          width: `${menuW}px`,
          background: '#1e1e2e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          zIndex: 9000,
          overflow: 'hidden',
          animation: 'fadeInUp 0.15s ease',
        }}
      >
        {/* Song header */}
        <div
          style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {song?.image && (
            <img
              src={song.image}
              alt={song.title}
              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
              onError={e => e.target.style.display = 'none'}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song?.title}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song?.artist}
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ padding: '6px' }}>
          {!showPlaylistPicker && !showCreateInput && (
            <>
              <MenuItem icon={Play} label="Play Now" color="var(--green)" onClick={handlePlayNow} />
              <MenuItem icon={ListEnd} label="Add to Queue" onClick={handleAddToQueue} />

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />

              <MenuItem
                icon={ListPlus}
                label="Add to Playlist"
                onClick={() => setShowPlaylistPicker(true)}
              />
              <MenuItem
                icon={FolderPlus}
                label="Create New Playlist"
                onClick={() => setShowCreateInput(true)}
              />

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />

              <MenuItem icon={Disc3} label="View Album" onClick={() => { onClose(); }} />
              <MenuItem icon={FileText} label="Show Lyrics" onClick={() => { setShowLyrics(true); onClose(); }} />
            </>
          )}

          {/* Playlist Picker */}
          {showPlaylistPicker && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                <button onClick={() => setShowPlaylistPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600' }}>Choose Playlist</span>
              </div>

              {playlists.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '12px 14px', textAlign: 'center' }}>
                  No playlists yet. Create one!
                </p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', borderRadius: '6px', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pl.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
                      {pl.songs.length} songs
                    </span>
                  </button>
                ))
              )}

              <div style={{ padding: '4px 6px 2px' }}>
                <button
                  onClick={() => { setShowPlaylistPicker(false); setShowCreateInput(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '8px 14px', background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={13} /> New Playlist
                </button>
              </div>
            </>
          )}

          {/* Create Playlist Input */}
          {showCreateInput && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
                <button onClick={() => setShowCreateInput(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600' }}>New Playlist</span>
              </div>
              <div style={{ padding: '0 6px 6px' }}>
                <input
                  autoFocus
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreatePlaylist(); if (e.key === 'Escape') setShowCreateInput(false); }}
                  placeholder="Playlist name..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px',
                    fontFamily: 'inherit', outline: 'none', marginBottom: '8px',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--green)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  style={{
                    width: '100%', background: newPlaylistName.trim() ? 'var(--green)' : 'rgba(29,185,84,0.3)',
                    border: 'none', borderRadius: '8px', padding: '9px', color: '#000',
                    fontSize: '13px', fontWeight: '700', cursor: newPlaylistName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'background 0.2s',
                  }}
                >
                  <Check size={14} /> Create & Add
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
