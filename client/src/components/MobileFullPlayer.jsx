import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, MoreVertical, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, Share2, ListMusic, Music, Plus, X,
  Mic2, AlignLeft
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/* ── Lyrics fetcher (lyrics.ovh — free, no key) ─────────────────────── */
const lyricsCache = new Map();
async function fetchLyrics(artist, title) {
  const key = `${artist}::${title}`;
  if (lyricsCache.has(key)) return lyricsCache.get(key);
  try {
    // Clean up feat. / ft. from title before fetching
    const cleanTitle = title.replace(/\(feat\.?.*?\)/i, '').replace(/\(ft\.?.*?\)/i, '').replace(/feat\.?.*/i, '').trim();
    const cleanArtist = artist.split(',')[0].split('&')[0].trim();
    const r = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) throw new Error('Not found');
    const data = await r.json();
    const lyrics = data.lyrics || '';
    lyricsCache.set(key, lyrics);
    return lyrics;
  } catch {
    lyricsCache.set(key, null);
    return null;
  }
}

/* ── Tab button ─────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '10px 0',
        color: active ? '#fff' : 'rgba(255,255,255,0.35)',
        fontSize: '12px', fontWeight: active ? '700' : '500',
        fontFamily: 'inherit', letterSpacing: '0.4px',
        borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  );
}

export default function MobileFullPlayer({ onClose }) {
  const {
    currentSong, isPlaying, isLoading, duration, currentTime, isRepeat, isShuffle,
    togglePlay, playNext, playPrev, seek, toggleRepeat, toggleShuffle,
  } = usePlayer();
  const { playlists, addSongToPlaylist } = usePlaylists();

  const [imgError,  setImgError]  = useState(false);
  const [liked,     setLiked]     = useState(false);
  const [drag,      setDrag]      = useState(false);
  const [dragVal,   setDragVal]   = useState(0);
  const [showMenu,  setShowMenu]  = useState(false);
  const [showAddPl, setShowAddPl] = useState(false);
  const [visible,   setVisible]   = useState(false);
  const [tab,       setTab]       = useState('player'); // 'player' | 'lyrics'
  const [lyrics,    setLyrics]    = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError,   setLyricsError]   = useState(false);

  const barRef = useRef(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => { setImgError(false); setLiked(false); }, [currentSong]);

  // Fetch lyrics when tab = lyrics or song changes
  useEffect(() => {
    if (!currentSong || tab !== 'lyrics') return;
    if (lyrics !== null && lyricsCache.has(`${currentSong.artist}::${currentSong.title}`)) return;
    setLyricsLoading(true);
    setLyricsError(false);
    fetchLyrics(currentSong.artist || '', currentSong.title || '').then(l => {
      setLyrics(l);
      setLyricsError(!l);
      setLyricsLoading(false);
    });
  }, [tab, currentSong]);

  // Reset lyrics state when song changes
  useEffect(() => { setLyrics(null); setLyricsError(false); }, [currentSong]);

  const pct        = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayPct = drag ? dragVal : pct;

  const getBarPct = (e) => {
    const b = barRef.current;
    if (!b || !duration) return 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const r = b.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 100;
  };

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
      background: '#0a0a12',
      display: 'flex', flexDirection: 'column',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.3s cubic-bezier(0.32,0,0.14,1)',
      overflowY: 'hidden',
    }}>

      {/* Blurred background art */}
      {imgSrc && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `url(${imgSrc})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(72px) brightness(0.18) saturate(2)',
          transform: 'scale(1.15)',
          pointerEvents: 'none',
        }} />
      )}
      {/* gradient overlay for readability */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(to bottom, rgba(10,10,18,0.4) 0%, rgba(10,10,18,0.85) 60%, rgba(10,10,18,0.98) 100%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'hidden' }}>

        {/* ── Top Bar ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 24px 12px' }}>
          <button onClick={handleClose} style={iconBtnStyle}>
            <ChevronDown size={28} color="#fff" />
          </button>

          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
              Now Playing
            </p>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong.album || 'Racharlaplay'}
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={iconBtnStyle}>
              <MoreVertical size={22} color="rgba(255,255,255,0.7)" />
            </button>

            {showMenu && (
              <div style={{ position: 'absolute', top: '44px', right: 0, width: '220px', background: '#1e1e2e', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 100, border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { label: 'Add to playlist', icon: <Plus size={15}/>,   action: () => { setShowMenu(false); setShowAddPl(true); } },
                  { label: liked ? 'Unlike' : 'Like song', icon: <Heart size={15} fill={liked?'#f472b6':'none'} color={liked?'#f472b6':'#fff'}/>, action: () => { setLiked(v=>!v); setShowMenu(false); } },
                  { label: 'View Lyrics',  icon: <Mic2 size={15}/>,    action: () => { setTab('lyrics'); setShowMenu(false); } },
                  { label: 'Share',        icon: <Share2 size={15}/>,   action: () => setShowMenu(false) },
                  { label: 'Close menu',   icon: <X size={15}/>,        action: () => setShowMenu(false) },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', color: '#fff', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Bar ──────────────────────────────── */}
        <div style={{ display: 'flex', margin: '0 24px 4px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Tab active={tab === 'player'} onClick={() => setTab('player')} icon={<Music size={13}/>} label="Player" />
          <Tab active={tab === 'lyrics'} onClick={() => setTab('lyrics')} icon={<Mic2  size={13}/>} label="Lyrics" />
        </div>

        {/* ── PLAYER TAB ───────────────────────────── */}
        {tab === 'player' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 24px 32px', overflowY: 'auto' }}>

            {/* Album Art */}
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', background: '#1a1a2e', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', margin: '12px 0 24px', flexShrink: 0, transition: 'transform 0.3s', transform: isPlaying ? 'scale(1.02)' : 'scale(1)' }}>
              {imgSrc
                ? <img src={imgSrc} alt={currentSong.title} onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }}>
                    <Music size={80} color="#1DB954" />
                  </div>
              }
            </div>

            {/* Song Info + Like */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: '#fff', fontSize: '21px', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px', fontFamily: 'var(--brand-font)', letterSpacing: '-0.3px' }}>
                  {currentSong.title}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentSong.artist}
                </p>
              </div>
              <button onClick={() => setLiked(v => !v)} style={{ ...iconBtnStyle, marginLeft: '16px' }}>
                <Heart size={24} color={liked ? '#f472b6' : 'rgba(255,255,255,0.4)'} fill={liked ? '#f472b6' : 'none'} style={{ transition: 'all 0.25s', transform: liked ? 'scale(1.15)' : 'scale(1)' }} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div
                ref={barRef}
                onMouseDown={e => { setDrag(true); setDragVal(getBarPct(e)); }}
                onTouchStart={e => { setDrag(true); setDragVal(getBarPct(e)); }}
                style={{ height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px', position: 'relative', cursor: 'pointer', marginBottom: '8px' }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${displayPct}%`, background: 'linear-gradient(to right, var(--green), #1ed760)', borderRadius: '99px', transition: drag ? 'none' : 'width 0.5s linear' }} />
                <div style={{ position: 'absolute', left: `calc(${displayPct}% - 8px)`, top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px rgba(29,185,84,0.6)', transition: drag ? 'none' : 'left 0.5s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600' }}>{fmt(currentTime)}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600' }}>{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <button onClick={toggleShuffle} style={{ ...iconBtnStyle, opacity: isShuffle ? 1 : 0.4 }}>
                <Shuffle size={22} color={isShuffle ? '#1DB954' : '#fff'} />
              </button>
              <button onClick={playPrev} style={iconBtnStyle} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <SkipBack size={32} color="#fff" fill="#fff" />
              </button>
              <button onClick={togglePlay} style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg,#1DB954,#17a349)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(29,185,84,0.5)', transition: 'transform 0.15s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {isLoading
                  ? <div style={{ width: '22px', height: '22px', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : isPlaying
                    ? <Pause size={30} color="#000" fill="#000" />
                    : <Play size={30} color="#000" fill="#000" style={{ marginLeft: '3px' }} />
                }
              </button>
              <button onClick={playNext} style={iconBtnStyle} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <SkipForward size={32} color="#fff" fill="#fff" />
              </button>
              <button onClick={toggleRepeat} style={{ ...iconBtnStyle, opacity: isRepeat ? 1 : 0.4 }}>
                <Repeat size={22} color={isRepeat ? '#1DB954' : '#fff'} />
              </button>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: '4px' }}>
              <button style={actionBtnStyle} onClick={() => setShowAddPl(true)}>
                <Plus size={20} color="rgba(255,255,255,0.5)" />
                <span>Add to List</span>
              </button>
              <button style={actionBtnStyle} onClick={() => setTab('lyrics')}>
                <AlignLeft size={20} color="rgba(255,255,255,0.5)" />
                <span>Lyrics</span>
              </button>
              <button style={actionBtnStyle}>
                <Share2 size={20} color="rgba(255,255,255,0.5)" />
                <span>Share</span>
              </button>
              <button style={actionBtnStyle}>
                <ListMusic size={20} color="rgba(255,255,255,0.5)" />
                <span>Queue</span>
              </button>
            </div>
          </div>
        )}

        {/* ── LYRICS TAB ──────────────────────────── */}
        {tab === 'lyrics' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 80px' }}>

            {/* Song name reminder */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {imgSrc && <img src={imgSrc} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.artist}</p>
              </div>
            </div>

            {lyricsLoading && (
              <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--green)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Fetching lyrics…</p>
              </div>
            )}

            {!lyricsLoading && lyricsError && (
              <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                <Mic2 size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: '16px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Lyrics not found</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', lineHeight: '1.5' }}>
                  Could not find lyrics for this song.<br/>This may be a regional or instrumental track.
                </p>
              </div>
            )}

            {!lyricsLoading && lyrics && (
              <div>
                <pre style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', lineHeight: '1.85', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'Inter', sans-serif", margin: 0 }}>
                  {lyrics}
                </pre>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '32px', textAlign: 'center' }}>Lyrics provided by lyrics.ovh</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add to Playlist sheet ─────────────────── */}
      {showAddPl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowAddPl(false)}>
          <div style={{ width: '100%', background: '#1a1a28', borderRadius: '20px 20px 0 0', padding: '20px 0 40px', maxHeight: '65vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: '800' }}>Add to Playlist</p>
              <button onClick={() => setShowAddPl(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
            </div>
            {playlists.length === 0
              ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', padding: '24px', textAlign: 'center' }}>No playlists yet. Create one from the sidebar.</p>
              : playlists.map(pl => (
                <button key={pl.id} onClick={() => { addSongToPlaylist(pl.id, currentSong); setShowAddPl(false); }}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '15px', padding: '15px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#1DB954,#0f9d58)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ListMusic size={18} color="#000" />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', marginBottom: '2px' }}>{pl.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{pl.songs?.length || 0} songs</p>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px', borderRadius: '50%', transition: 'transform 0.15s',
};

const actionBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
  color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '600',
  fontFamily: 'inherit', letterSpacing: '0.3px', padding: '8px 12px',
  borderRadius: '10px', transition: 'all 0.2s',
};
