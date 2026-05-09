import React, { useState, useEffect } from 'react';
import {
  Play, Pause, ListEnd, ListPlus, FolderPlus,
  FileText, X, ChevronRight, Music, Heart, Check, Plus
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';

export default function SongBottomSheet({ song, songs = [], index = 0, onClose }) {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { playlists, addToPlaylist, addToQueue, createPlaylist } = usePlaylists();
  const [view, setView] = useState('main'); // 'main' | 'playlists' | 'create'
  const [newName, setNewName] = useState('');
  const [liked, setLiked] = useState(false);

  const isActive = currentSong?.id === song?.id;

  // Close on back button / escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePlay = () => {
    if (isActive) { togglePlay(); }
    else { playSong(song, songs, index); }
    onClose();
  };

  const handleAddToQueue = () => { addToQueue(song); onClose(); };

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(playlistId, song);
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim(), song);
    setNewName('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="sheet-panel">
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:'36px', height:'4px', borderRadius:'99px', background:'rgba(255,255,255,0.2)' }} />
        </div>

        {/* ── Song Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width:'54px', height:'54px', borderRadius:'10px', overflow:'hidden', flexShrink:0, background:'var(--bg-card)' }}>
            {song?.image
              ? <img src={song.image} alt={song.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1a1a2e,#16213e)' }}><Music size={22} color="var(--green)" /></div>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:'#fff', fontSize:'15px', fontWeight:'700', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song?.title}</p>
            <p style={{ color:'var(--text-muted)', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song?.artist}</p>
          </div>
          <button onClick={() => setLiked(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', color: liked ? '#f472b6' : 'var(--text-muted)' }}>
            <Heart size={20} fill={liked ? '#f472b6' : 'none'} />
          </button>
        </div>

        {/* ── MAIN VIEW ── */}
        {view === 'main' && (
          <div style={{ paddingBottom:'16px' }}>
            {/* Big Play/Pause */}
            <button
              className="sheet-item primary"
              onClick={handlePlay}
              style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'4px' }}
            >
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(29,185,84,0.4)' }}>
                {isActive && isPlaying
                  ? <Pause size={18} color="#000" fill="#000" />
                  : <Play size={18} color="#000" fill="#000" style={{ marginLeft:'2px' }} />
                }
              </div>
              <span style={{ fontSize:'16px', fontWeight:'700' }}>
                {isActive && isPlaying ? 'Pause' : isActive ? 'Resume' : 'Play Now'}
              </span>
            </button>

            <button className="sheet-item" onClick={handleAddToQueue}>
              <ListEnd size={20} />
              Add to Queue
            </button>

            <button className="sheet-item" onClick={() => setView('playlists')}>
              <ListPlus size={20} />
              <span style={{ flex:1, textAlign:'left' }}>Add to Playlist</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>

            <button className="sheet-item" onClick={() => setView('create')}>
              <FolderPlus size={20} />
              Create Playlist with this Song
            </button>

            <button className="sheet-item" onClick={onClose}>
              <FileText size={20} />
              Show Lyrics
            </button>
          </div>
        )}

        {/* ── PLAYLIST PICKER ── */}
        {view === 'playlists' && (
          <div style={{ paddingBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => setView('main')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'4px' }}>
                <X size={18} />
              </button>
              <span style={{ color:'#fff', fontSize:'15px', fontWeight:'700' }}>Add to Playlist</span>
            </div>

            {playlists.length === 0 ? (
              <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:'14px' }}>
                No playlists yet.
                <br />
                <button onClick={() => setView('create')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--green)', fontSize:'13px', fontWeight:'600', marginTop:'8px', fontFamily:'inherit' }}>
                  + Create one
                </button>
              </div>
            ) : playlists.map(pl => (
              <button key={pl.id} className="sheet-item" onClick={() => handleAddToPlaylist(pl.id)}>
                <div style={{ width:'40px', height:'40px', borderRadius:'8px', background:'rgba(29,185,84,0.12)', border:'1px solid rgba(29,185,84,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ListPlus size={16} color="var(--green)" />
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <p style={{ color:'#fff', fontSize:'14px', fontWeight:'600' }}>{pl.name}</p>
                  <p style={{ color:'var(--text-muted)', fontSize:'11px' }}>{pl.songs.length} songs</p>
                </div>
                <Check size={16} color="var(--text-muted)" style={{ opacity: pl.songs.find(s => s.id === song?.id) ? 1 : 0 }} />
              </button>
            ))}

            <button className="sheet-item" onClick={() => setView('create')} style={{ borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:'4px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'8px', border:'1.5px dashed rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Plus size={18} color="var(--text-muted)" />
              </div>
              New Playlist
            </button>
          </div>
        )}

        {/* ── CREATE PLAYLIST ── */}
        {view === 'create' && (
          <div style={{ padding:'16px 20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <button onClick={() => setView('main')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'4px' }}>
                <X size={18} />
              </button>
              <span style={{ color:'#fff', fontSize:'15px', fontWeight:'700' }}>New Playlist</span>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Playlist name..."
              style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'12px 16px', color:'#fff', fontSize:'15px', fontFamily:'inherit', outline:'none', marginBottom:'14px' }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{ width:'100%', background: newName.trim() ? 'var(--green)' : 'rgba(29,185,84,0.3)', border:'none', borderRadius:'10px', padding:'14px', color:'#000', fontSize:'15px', fontWeight:'700', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', transition:'background 0.2s' }}
            >
              Create & Add Song
            </button>
          </div>
        )}
      </div>
    </>
  );
}
