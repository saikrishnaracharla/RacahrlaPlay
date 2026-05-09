import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, MoreVertical, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, Share2, ListMusic, Music, Plus, X
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function MobileFullPlayer({ onClose }) {
  const {
    currentSong, isPlaying, isLoading, duration, currentTime, isRepeat, isShuffle,
    togglePlay, playNext, playPrev, seek, toggleRepeat, toggleShuffle,
  } = usePlayer();
  const { playlists, addSongToPlaylist } = usePlaylists();

  const [imgError,   setImgError]   = useState(false);
  const [liked,      setLiked]      = useState(false);
  const [drag,       setDrag]       = useState(false);
  const [dragVal,    setDragVal]    = useState(0);
  const [showMenu,   setShowMenu]   = useState(false);
  const [showAddPl,  setShowAddPl]  = useState(false);
  const [visible,    setVisible]    = useState(false);
  const barRef = useRef(null);

  // Mount animation
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => { setImgError(false); }, [currentSong]);

  const pct        = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayPct = drag ? dragVal : pct;

  const getBarPct = (e) => {
    const b = barRef.current;
    if (!b || !duration) return 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const r = b.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 100;
  };

  // Drag/touch seek
  useEffect(() => {
    if (!drag) return;
    const up = (e) => { seek((getBarPct(e) / 100) * duration); setDrag(false); };
    const mv = (e) => setDragVal(getBarPct(e));
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', mv, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', mv);
      window.removeEventListener('touchend', up);
    };
  }, [drag, duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  if (!currentSong) return null;

  const imgSrc = imgError ? null : currentSong.image;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0e0e14',
      display: 'flex', flexDirection: 'column',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.28s cubic-bezier(0.32,0,0.14,1)',
      overflowY: 'auto',
    }}>

      {/* Background art blur */}
      {imgSrc && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `url(${imgSrc})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.25) saturate(1.5)',
          transform: 'scale(1.1)',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, padding: '0 24px 32px' }}>

        {/* ── Top Bar ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '52px', paddingBottom: '16px' }}>
          <button onClick={handleClose} style={iconBtnStyle}>
            <ChevronDown size={28} color="#fff" />
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Now Playing
            </p>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong.album || 'Racharlaplay'}
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={iconBtnStyle}>
              <MoreVertical size={24} color="#fff" />
            </button>

            {/* 3-dot Menu */}
            {showMenu && (
              <div style={{
                position: 'absolute', top: '40px', right: 0, width: '210px',
                background: '#282828', borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 100,
              }}>
                {[
                  { label: 'Add to playlist', icon: <Plus size={16}/>, action: () => { setShowMenu(false); setShowAddPl(true); } },
                  { label: liked ? 'Remove from Liked' : 'Like song', icon: <Heart size={16} fill={liked?'#f472b6':'none'} color={liked?'#f472b6':'#fff'}/>, action: () => { setLiked(v=>!v); setShowMenu(false); } },
                  { label: 'Share', icon: <Share2 size={16}/>, action: () => setShowMenu(false) },
                  { label: 'Close', icon: <X size={16}/>, action: () => setShowMenu(false) },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px', color: '#fff', fontSize: '14px', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Album Art ───────────────────────────── */}
        <div style={{
          width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden',
          background: '#1a1a2e', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          margin: '8px 0 28px', flexShrink: 0,
        }}>
          {imgSrc
            ? <img src={imgSrc} alt={currentSong.title} onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }}>
                <Music size={80} color="#1DB954" />
              </div>
          }
        </div>

        {/* ── Song Info + Like ────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: '#fff', fontSize: '20px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
              {currentSong.title}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong.artist}
            </p>
          </div>
          <button onClick={() => setLiked(v => !v)} style={{ ...iconBtnStyle, marginLeft: '16px' }}>
            <Heart size={24} color={liked ? '#f472b6' : 'rgba(255,255,255,0.5)'}
              fill={liked ? '#f472b6' : 'none'} style={{ transition: 'all 0.2s' }} />
          </button>
        </div>

        {/* ── Progress Bar ────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div
            ref={barRef}
            onMouseDown={e => { setDrag(true); setDragVal(getBarPct(e)); }}
            onTouchStart={e => { setDrag(true); setDragVal(getBarPct(e)); }}
            style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', position: 'relative', cursor: 'pointer' }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${displayPct}%`, background: '#fff', borderRadius: '99px' }} />
            <div style={{
              position: 'absolute', left: `calc(${displayPct}% - 7px)`, top: '50%',
              transform: 'translateY(-50%)', width: '14px', height: '14px',
              background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px rgba(255,255,255,0.4)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{fmt(currentTime)}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* ── Controls ────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button onClick={toggleShuffle} style={{ ...iconBtnStyle, opacity: isShuffle ? 1 : 0.45 }}>
            <Shuffle size={22} color={isShuffle ? '#1DB954' : '#fff'} />
          </button>
          <button onClick={playPrev} style={iconBtnStyle}>
            <SkipBack size={32} color="#fff" fill="#fff" />
          </button>
          <button onClick={togglePlay} style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#fff',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 24px rgba(255,255,255,0.25)', transition: 'transform 0.15s', flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isLoading
              ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : isPlaying
                ? <Pause size={28} color="#000" fill="#000" />
                : <Play  size={28} color="#000" fill="#000" style={{ marginLeft: '3px' }} />
            }
          </button>
          <button onClick={playNext} style={iconBtnStyle}>
            <SkipForward size={32} color="#fff" fill="#fff" />
          </button>
          <button onClick={toggleRepeat} style={{ ...iconBtnStyle, opacity: isRepeat ? 1 : 0.45 }}>
            <Repeat size={22} color={isRepeat ? '#1DB954' : '#fff'} />
          </button>
        </div>

        {/* ── Bottom Row ──────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={iconBtnStyle} onClick={() => setShowAddPl(true)}>
            <Plus size={22} color="rgba(255,255,255,0.5)" />
          </button>
          <button style={iconBtnStyle}>
            <Share2 size={20} color="rgba(255,255,255,0.5)" />
          </button>
          <button style={iconBtnStyle}>
            <ListMusic size={20} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* ── Add to Playlist sheet ───────────────── */}
        {showAddPl && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end',
          }} onClick={() => setShowAddPl(false)}>
            <div style={{
              width: '100%', background: '#1a1a2e', borderRadius: '16px 16px 0 0',
              padding: '20px 0 40px', maxHeight: '60vh', overflowY: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: '700', padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                Add to Playlist
              </p>
              {playlists.length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', padding: '20px', textAlign: 'center' }}>No playlists yet</p>
                : playlists.map(pl => (
                  <button key={pl.id} onClick={() => { addSongToPlaylist(pl.id, currentSong); setShowAddPl(false); }}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '15px', padding: '14px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <ListMusic size={18} color="#1DB954" />
                    {pl.name}
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px', borderRadius: '50%',
};
