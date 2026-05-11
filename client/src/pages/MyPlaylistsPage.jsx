import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic, Plus, Trash2, ChevronRight, Music } from 'lucide-react';
import { usePlaylists } from '../context/PlaylistContext';
import { useAuth } from '../context/AuthContext';

const V  = '#8B5CF6';
const V2 = '#A78BFA';

export default function MyPlaylistsPage() {
  const navigate = useNavigate();
  const { playlists, syncing, createPlaylist, deletePlaylist } = usePlaylists();
  const { isLoggedIn } = useAuth();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const pl = await createPlaylist(newName.trim());
    setNewName(''); setCreating(false);
    if (pl?.id) navigate(`/playlist/${pl.id}`);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '8px 0 48px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--brand-font)', fontSize: '28px', fontWeight: '900', color: '#F0EAFF', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            My Playlists
          </h1>
          <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '13px' }}>
            {syncing ? 'Syncing…' : `${playlists.length} playlist${playlists.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg,${V},#6D28D9)`, border: 'none', borderRadius: '12px', padding: '10px 18px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px rgba(139,92,246,0.4)`, transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
          <Plus size={16}/> New Playlist
        </button>
      </div>

      {/* ── Create Playlist Form ── */}
      {creating && (
        <div style={{ background: 'rgba(139,92,246,0.07)', border: `1.5px solid rgba(139,92,246,0.25)`, borderRadius: '14px', padding: '18px', marginBottom: '20px', animation: 'fadeInUp 0.2s ease' }}>
          <p style={{ color: V2, fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Create New Playlist</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
              placeholder="Playlist name…"
              style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '10px 14px', color: '#F0EAFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => { e.target.style.border = `1.5px solid ${V}`; e.target.style.boxShadow = `0 0 0 3px rgba(139,92,246,0.12)`; }}
              onBlur={e  => { e.target.style.border = '1.5px solid rgba(139,92,246,0.2)'; e.target.style.boxShadow = 'none'; }}
            />
            <button onClick={handleCreate} disabled={!newName.trim()}
              style={{ background: newName.trim() ? V : 'rgba(139,92,246,0.3)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.2s' }}>
              Create
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'rgba(167,139,250,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {syncing && playlists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid rgba(139,92,246,0.2)`, borderTop: `3px solid ${V}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '14px' }}>Loading your playlists…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!syncing && playlists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(139,92,246,0.08)', border: `1px solid rgba(139,92,246,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ListMusic size={36} color={`rgba(139,92,246,0.4)`} />
          </div>
          <h3 style={{ color: '#F0EAFF', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No playlists yet</h3>
          <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '14px', marginBottom: '24px' }}>
            {isLoggedIn ? 'Create your first playlist to save songs.' : 'Sign in to create and sync playlists.'}
          </p>
          {!isLoggedIn && (
            <button onClick={() => navigate('/account')}
              style={{ background: `linear-gradient(135deg,${V},#6D28D9)`, border: 'none', borderRadius: '12px', padding: '12px 24px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px rgba(139,92,246,0.4)` }}>
              Sign In
            </button>
          )}
        </div>
      )}

      {/* ── Playlists grid/list ── */}
      {playlists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playlists.map(pl => (
            <div key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.1)`, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.1)'; e.currentTarget.style.transform = 'none'; }}>

              {/* Art */}
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: `linear-gradient(135deg,rgba(139,92,246,0.25),rgba(6,182,212,0.1))`, border: `1px solid rgba(139,92,246,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {pl.songs?.[0]?.image
                  ? <img src={pl.songs[0].image} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                  : <ListMusic size={22} color={V2}/>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#F0EAFF', fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{pl.name}</p>
                <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '12px' }}>{pl.songs?.length || 0} {pl.songs?.length === 1 ? 'song' : 'songs'}</p>
              </div>

              {/* Delete btn */}
              <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.4)', display: 'flex', padding: '6px', borderRadius: '8px', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.4)'; e.currentTarget.style.background = 'none'; }}>
                <Trash2 size={15}/>
              </button>

              <ChevronRight size={16} color="rgba(139,92,246,0.3)" style={{ flexShrink: 0 }}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
