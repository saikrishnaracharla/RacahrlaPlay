import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, Music, MoreVertical, ListMusic, Shuffle } from 'lucide-react';
import { usePlaylists } from '../context/PlaylistContext';
import { usePlayer } from '../context/PlayerContext';
import { useBottomSheet } from '../context/BottomSheetContext';

const V  = '#8B5CF6';
const V2 = '#A78BFA';

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, syncing, removeFromPlaylist, deletePlaylist } = usePlaylists();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { openSheet } = useBottomSheet();
  const [activeMenu, setActiveMenu] = useState(null);

  // ── Loading state while playlists sync from server ────────────────────────
  if (syncing && playlists.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: `3px solid rgba(139,92,246,0.2)`, borderTop: `3px solid ${V}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '14px' }}>Loading playlist…</p>
      </div>
    );
  }

  const playlist = playlists.find(p => p.id === id || p._id?.toString() === id);

  if (!playlist) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <ListMusic size={48} color="rgba(139,92,246,0.3)" style={{ marginBottom: '16px' }} />
        <p style={{ color: 'rgba(167,139,250,0.5)', marginBottom: '16px' }}>Playlist not found.</p>
        <button onClick={() => navigate('/playlists')}
          style={{ background: V, border: 'none', borderRadius: '99px', padding: '10px 24px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          My Playlists
        </button>
      </div>
    );
  }

  const playAll = (shuffle = false) => {
    if (!playlist.songs.length) return;
    const songs = shuffle ? [...playlist.songs].sort(() => Math.random() - 0.5) : playlist.songs;
    playSong(songs[0], songs, 0);
  };

  const handleDeletePlaylist = () => { deletePlaylist(id); navigate('/playlists'); };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(180deg,rgba(139,92,246,0.18) 0%,transparent 100%)`, padding: '20px 0 32px', marginBottom: '8px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.6)', fontFamily: 'inherit', fontSize: '14px', marginBottom: '20px', padding: '6px 0' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(167,139,250,0.6)'}>
          <ArrowLeft size={18}/> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Playlist art */}
          <div style={{ width: 'clamp(100px,15vw,140px)', height: 'clamp(100px,15vw,140px)', borderRadius: '16px', background: `linear-gradient(135deg,rgba(139,92,246,0.3),rgba(6,182,212,0.1))`, border: `1px solid rgba(139,92,246,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {playlist.songs[0]?.image
              ? <img src={playlist.songs[0].image} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} onError={e => e.target.style.display = 'none'} />
              : <ListMusic size={44} color={V2}/>
            }
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Playlist</p>
            <h1 style={{ fontFamily: 'var(--brand-font)', fontSize: 'clamp(22px,4vw,36px)', fontWeight: '800', color: '#F0EAFF', marginBottom: '8px', lineHeight: '1.2' }}>{playlist.name}</h1>
            <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '13px', marginBottom: '20px' }}>{playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => playAll(false)} disabled={!playlist.songs.length}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg,${V},#6D28D9)`, border: 'none', borderRadius: '99px', padding: '12px 24px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: playlist.songs.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: playlist.songs.length ? 1 : 0.5, transition: 'transform 0.15s,box-shadow 0.15s', boxShadow: `0 4px 20px rgba(139,92,246,0.4)` }}
                onMouseEnter={e => { if(playlist.songs.length) e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <Play size={17} fill="#fff" color="#fff"/> Play All
              </button>

              <button onClick={() => playAll(true)} disabled={!playlist.songs.length}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.1)', border: `1px solid rgba(139,92,246,0.25)`, borderRadius: '99px', padding: '11px 20px', color: V2, fontWeight: '600', fontSize: '14px', cursor: playlist.songs.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: playlist.songs.length ? 1 : 0.5, transition: 'background 0.2s' }}
                onMouseEnter={e => { if(playlist.songs.length) e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}>
                <Shuffle size={15}/> Shuffle
              </button>

              <button onClick={handleDeletePlaylist}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '99px', padding: '11px 16px', color: '#f87171', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s,border-color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}>
                <Trash2 size={14}/> Delete Playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(139,92,246,0.12)', marginBottom: '20px' }} />

      {/* ── Songs list ── */}
      {playlist.songs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(167,139,250,0.4)' }}>
          <Music size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No songs yet</p>
          <p style={{ fontSize: '13px' }}>Go browse and add songs to this playlist</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '12px', padding: '0 14px 10px', borderBottom: '1px solid rgba(139,92,246,0.08)', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(167,139,250,0.35)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</span>
            <span style={{ color: 'rgba(167,139,250,0.35)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</span>
            <span style={{ width: '32px' }} />
          </div>

          {playlist.songs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            const menuOpen = activeMenu === song.id;
            return (
              <div key={`${song.id}-${idx}`}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '12px', alignItems: 'center', padding: '8px 14px', borderRadius: '10px', transition: 'background 0.15s', position: 'relative', cursor: 'pointer', background: menuOpen ? 'rgba(139,92,246,0.07)' : 'transparent' }}
                onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; }}
                onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => openSheet(song, playlist.songs, idx)}>

                <div style={{ textAlign: 'center', color: isActive ? V2 : 'rgba(167,139,250,0.35)', fontSize: '13px' }}>
                  {isActive && isPlaying
                    ? <div className="eq" style={{ justifyContent: 'center' }}><span/><span/><span/></div>
                    : <span>{idx + 1}</span>
                  }
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {song.image
                      ? <img src={song.image} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      : <Music size={16} color={V}/>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: isActive ? V2 : '#F0EAFF', fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                    <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</p>
                  </div>
                </div>

                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); setActiveMenu(menuOpen ? null : song.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.35)', padding: '6px', display: 'flex', borderRadius: '6px', transition: 'color 0.2s,background 0.2s', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = V2; e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.35)'; e.currentTarget.style.background = 'none'; }}>
                    <MoreVertical size={16}/>
                  </button>

                  {menuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setActiveMenu(null)}/>
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'rgba(17,0,32,0.98)', border: `1px solid rgba(139,92,246,0.2)`, borderRadius: '12px', zIndex: 201, minWidth: '190px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', overflow: 'hidden', animation: 'fadeInUp 0.15s ease' }}>
                        {[
                          { label: 'Play Now', color: V2, action: () => { playSong(song, playlist.songs, idx); setActiveMenu(null); } },
                          { label: 'More Options…', color: 'rgba(167,139,250,0.6)', action: () => { openSheet(song, playlist.songs, idx); setActiveMenu(null); } },
                          null,
                          { label: 'Remove from Playlist', color: '#f87171', action: () => { removeFromPlaylist(id, song.id); setActiveMenu(null); } },
                        ].map((item, i) => item === null
                          ? <div key={i} style={{ height: '1px', background: 'rgba(139,92,246,0.1)', margin: '3px 0' }}/>
                          : (
                            <button key={i} onClick={() => { setActiveMenu(null); item.action(); }}
                              style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: item.color, fontSize: '13px', fontWeight: '500', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              {item.label}
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
