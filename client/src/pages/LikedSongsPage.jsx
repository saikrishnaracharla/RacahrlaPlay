import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useBottomSheet } from '../context/BottomSheetContext';

const V  = '#8B5CF6';
const V2 = '#A78BFA';

export default function LikedSongsPage() {
  const navigate  = useNavigate();
  const { token, isLoggedIn } = useAuth();
  const { currentSong, isPlaying, playSong } = usePlayer();
  const { openSheet } = useBottomSheet();

  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !token) { setLoading(false); return; }
    fetch('/auth/likes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSongs(d.likes || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token, isLoggedIn]);

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '8px 0 80px' }}>

      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.5)', fontFamily: 'inherit', fontSize: '14px', marginBottom: '20px', padding: '6px 0' }}
        onMouseEnter={e => e.currentTarget.style.color = '#F0EAFF'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(167,139,250,0.5)'}>
        <ArrowLeft size={18}/> Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', padding: '24px', background: 'linear-gradient(135deg,rgba(244,114,182,0.12),rgba(139,92,246,0.08))', borderRadius: '20px', border: '1px solid rgba(244,114,182,0.15)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: 'linear-gradient(135deg,#f472b6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Heart size={32} color="#fff" fill="#fff"/>
        </div>
        <div>
          <p style={{ color: 'rgba(244,114,182,0.6)', fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Collection</p>
          <h1 style={{ fontFamily: 'var(--brand-font)', fontSize: '28px', fontWeight: '900', color: '#F0EAFF', marginBottom: '4px' }}>Liked Songs</h1>
          <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '13px' }}>{loading ? '…' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}</p>
        </div>
      </div>

      {/* Not logged in */}
      {!isLoggedIn && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Heart size={48} color="rgba(244,114,182,0.2)" style={{ marginBottom: '16px' }}/>
          <h3 style={{ color: '#F0EAFF', fontSize: '18px', marginBottom: '8px' }}>Sign in to see liked songs</h3>
          <button onClick={() => navigate('/account')}
            style={{ background: `linear-gradient(135deg,${V},#6D28D9)`, border: 'none', borderRadius: '12px', padding: '12px 24px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign In
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoggedIn && loading && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid rgba(139,92,246,0.2)`, borderTop: `3px solid ${V}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(167,139,250,0.4)' }}>Loading liked songs…</p>
        </div>
      )}

      {/* Error */}
      {error && <p style={{ color: '#f87171', textAlign: 'center', padding: '40px' }}>{error}</p>}

      {/* Empty */}
      {!loading && !error && isLoggedIn && songs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Heart size={48} color="rgba(244,114,182,0.2)" style={{ marginBottom: '16px' }}/>
          <h3 style={{ color: '#F0EAFF', fontSize: '18px', marginBottom: '8px' }}>No liked songs yet</h3>
          <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '14px' }}>Tap the ♥ heart on any song while it plays to save it here.</p>
        </div>
      )}

      {/* Song list */}
      {songs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {songs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div key={song.id || idx}
                onClick={() => openSheet(song, songs, idx)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '12px', background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(139,92,246,0.1)' : 'transparent'}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {song.image
                    ? <img src={song.image} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'}/>
                    : <Music size={20} color={V}/>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isActive ? V2 : '#F0EAFF', fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</p>
                </div>
                <Heart size={16} color="#f472b6" fill="#f472b6"/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
