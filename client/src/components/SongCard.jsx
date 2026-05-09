import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useBottomSheet } from '../context/BottomSheetContext';

export default function SongCard({ song, songs = [], index = 0, layout = 'grid' }) {
  const { currentSong, isPlaying, playSong, togglePlay, playNext, playPrev } = usePlayer();
  const { openSheet } = useBottomSheet();
  const [imgError, setImgError] = useState(false);

  const isActive = currentSong?.id === song?.id;
  const imgSrc = imgError ? null : song?.image;

  const handleCardClick = (e) => { e.stopPropagation(); openSheet(song, songs, index); };
  const handlePlayPause = (e) => { e.stopPropagation(); isActive ? togglePlay() : playSong(song, songs, index); };
  const handlePrev = (e) => { e.stopPropagation(); playPrev(); };
  const handleNext = (e) => { e.stopPropagation(); playNext(); };

  const Thumb = ({ size = 44 }) => (
    <div style={{ width:size, height:size, borderRadius: size > 44 ? '10px' : '6px', overflow:'hidden', flexShrink:0, background:'#16162a' }}>
      {imgSrc
        ? <img src={imgSrc} alt={song.title} onError={() => setImgError(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1a1a2e,#16213e)', display:'flex', alignItems:'center', justifyContent:'center' }}><Music size={size/2.5} color="#1DB954" /></div>
      }
    </div>
  );

  // ── LIST ──
  if (layout === 'list') {
    return (
      <div onClick={handleCardClick} className={`song-card ${isActive ? 'song-active' : ''}`}
        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'10px', cursor:'pointer' }}>
        <div style={{ width:'22px', textAlign:'center', color: isActive ? '#1DB954' : 'var(--text-muted)', fontSize:'12px', flexShrink:0 }}>
          {isActive && isPlaying ? <div className="eq" style={{ justifyContent:'center' }}><span/><span/><span/></div> : <span>{index + 1}</span>}
        </div>
        <Thumb size={44} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color: isActive ? '#1DB954' : '#fff', fontSize:'14px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.title}</p>
          <p style={{ color:'var(--text-muted)', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.artist}</p>
        </div>
      </div>
    );
  }

  // ── GRID ──
  return (
    <div className={`song-card ${isActive ? 'song-active' : ''}`} onClick={handleCardClick}>
      {/* Art */}
      <div style={{ position:'relative', paddingBottom:'100%', overflow:'hidden' }}>
        {imgSrc
          ? <img src={imgSrc} alt={song.title} onError={() => setImgError(true)} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a1a2e,#16213e)', display:'flex', alignItems:'center', justifyContent:'center' }}><Music size={40} color="#1DB954" /></div>
        }

        {/* Active overlay: inline prev/play/next */}
        {isActive && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.62)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' }}
            onClick={e => e.stopPropagation()}>
            {isPlaying && <div className="eq" style={{ transform:'scale(1.3)', marginBottom:'4px' }}><span/><span/><span/></div>}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <button onClick={handlePrev} style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <SkipBack size={13} color="#fff" fill="#fff"/>
              </button>
              <button onClick={handlePlayPause} style={{ width:'42px', height:'42px', borderRadius:'50%', background:'#1DB954', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(29,185,84,0.6)' }}>
                {isPlaying ? <Pause size={18} color="#000" fill="#000"/> : <Play size={18} color="#000" fill="#000" style={{ marginLeft:'2px' }}/>}
              </button>
              <button onClick={handleNext} style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <SkipForward size={13} color="#fff" fill="#fff"/>
              </button>
            </div>
          </div>
        )}

        {/* Hover play (non-active) */}
        {!isActive && (
          <button onClick={(e) => { e.stopPropagation(); playSong(song, songs, index); }}
            className="card-play-btn"
            style={{ position:'absolute', bottom:'8px', right:'8px', width:'42px', height:'42px', borderRadius:'50%', background:'#1DB954', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(29,185,84,0.55)', opacity:0, transition:'opacity 0.2s,transform 0.2s', transform:'translateY(6px)' }}
            aria-label={`Play ${song.title}`}>
            <Play size={18} color="#000" fill="#000" style={{ marginLeft:'2px' }}/>
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:'10px 12px 12px' }}>
        <p style={{ color: isActive ? '#1DB954' : '#fff', fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'3px' }} title={song.title}>{song.title}</p>
        <p style={{ color:'var(--text-muted)', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={song.artist}>{song.artist}</p>
      </div>

      <style>{`.song-card:hover .card-play-btn{opacity:1!important;transform:translateY(0)!important}`}</style>
    </div>
  );
}
