import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Music, Heart, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';

function fmt(s) { if(!s||isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

export default function Player() {
  const { currentSong, isPlaying, isLoading, duration, currentTime, volume, isMuted, isRepeat, isShuffle, togglePlay, playNext, playPrev, seek, setVolume, toggleMute, toggleRepeat, toggleShuffle } = usePlayer();
  const { queue } = usePlaylists();
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [drag, setDrag] = useState(false);
  const [dragVal, setDragVal] = useState(0);
  const barRef = useRef(null);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayPct = drag ? dragVal : pct;

  useEffect(() => { setImgError(false); setLiked(false); }, [currentSong]);

  const getPct = (e) => {
    const b = barRef.current; if (!b || !duration) return 0;
    const r = b.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100;
  };
  useEffect(() => {
    if (!drag) return;
    const up = (e) => { seek((getPct(e)/100)*duration); setDrag(false); };
    const mv = (e) => setDragVal(getPct(e));
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [drag, duration]);

  const EmptyBar = () => (
    <div className="player-bar" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'var(--player-h)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', opacity:0.3 }}>
        <Music size={16} color="var(--text-muted)" />
        <span style={{ color:'var(--text-muted)', fontSize:'13px' }}>Pick a song to start</span>
      </div>
    </div>
  );

  if (!currentSong) return <EmptyBar />;

  const Art = () => (
    <div style={{ width:'48px', height:'48px', borderRadius:'9px', overflow:'hidden', flexShrink:0, background:'var(--bg-card)', boxShadow: isPlaying ? '0 0 0 2px var(--green)' : 'none', transition:'box-shadow 0.3s' }}>
      {!imgError && currentSong.image
        ? <img src={currentSong.image} alt={currentSong.title} onError={() => setImgError(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1a1a2e,#16213e)', display:'flex', alignItems:'center', justifyContent:'center' }}><Music size={20} color="var(--green)" /></div>
      }
    </div>
  );

  const iconBtn = (onClick, children, title, color) => (
    <button onClick={onClick} title={title} style={{ background:'none', border:'none', cursor:'pointer', color: color || 'var(--text-secondary)', display:'flex', padding:'4px', transition:'color 0.2s, transform 0.15s', flexShrink:0 }}
      onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.color=color||'var(--text-secondary)'; e.currentTarget.style.transform='scale(1)'; }}>
      {children}
    </button>
  );

  return (
    <div className="player-bar" style={{ height:'var(--player-h)' }}>
      {/* ── DESKTOP FULL ── */}
      <div className="player-desktop-full" style={{ display:'grid', gridTemplateColumns:'1fr minmax(280px,400px) 1fr', alignItems:'center', height:'100%', padding:'0 20px', gap:'12px' }}>
        {/* Left */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
          <Art />
          <div style={{ minWidth:0, flex:1 }}>
            <p style={{ color:'#fff', fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentSong.title}</p>
            <p style={{ color:'var(--text-muted)', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentSong.artist}</p>
          </div>
          <button onClick={() => setLiked(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color: liked?'#f472b6':'var(--text-muted)', display:'flex', padding:'4px', flexShrink:0, transition:'color 0.2s,transform 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            <Heart size={16} fill={liked?'#f472b6':'none'} />
          </button>
        </div>

        {/* Center */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            {iconBtn(toggleShuffle, <Shuffle size={14}/>, 'Shuffle', isShuffle?'var(--green)':undefined)}
            {iconBtn(playPrev, <SkipBack size={18}/>, 'Previous')}
            <button onClick={togglePlay} style={{ width:'38px', height:'38px', borderRadius:'50%', background:'var(--green)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(29,185,84,0.4)', transition:'transform 0.15s', flexShrink:0, opacity:isLoading?0.7:1 }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              {isLoading ? <div className="spin" style={{ width:'14px', height:'14px', border:'2px solid rgba(0,0,0,0.3)', borderTop:'2px solid #000', borderRadius:'50%' }}/> : isPlaying ? <Pause size={16} color="#000" fill="#000"/> : <Play size={16} color="#000" fill="#000" style={{ marginLeft:'2px' }}/>}
            </button>
            {iconBtn(playNext, <SkipForward size={18}/>, 'Next')}
            {iconBtn(toggleRepeat, <Repeat size={14}/>, 'Repeat', isRepeat?'var(--green)':undefined)}
          </div>
          {/* Progress */}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', width:'100%' }}>
            <span style={{ color:'var(--text-muted)', fontSize:'10px', minWidth:'28px', textAlign:'right' }}>{fmt(currentTime)}</span>
            <div ref={barRef} onMouseDown={e => { setDrag(true); setDragVal(getPct(e)); }}
              style={{ flex:1, height:'4px', background:'#2a2a40', borderRadius:'99px', cursor:'pointer', position:'relative' }}
              onMouseEnter={e=>e.currentTarget.style.height='5px'} onMouseLeave={e=>{ if(!drag) e.currentTarget.style.height='4px'; }}>
              <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${displayPct}%`, background:'var(--green)', borderRadius:'99px', pointerEvents:'none' }} />
              <div style={{ position:'absolute', left:`calc(${displayPct}% - 6px)`, top:'50%', transform:'translateY(-50%)', width:'12px', height:'12px', background:'#fff', borderRadius:'50%', boxShadow:'0 0 6px rgba(29,185,84,0.5)', opacity:drag?1:0, transition:'opacity 0.1s', pointerEvents:'none' }} />
            </div>
            <span style={{ color:'var(--text-muted)', fontSize:'10px', minWidth:'28px' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'8px' }}>
          {queue.length > 0 && <div style={{ display:'flex', alignItems:'center', gap:'4px' }} title={`${queue.length} in queue`}><ListMusic size={13} color="var(--text-muted)"/><span style={{ color:'var(--text-muted)', fontSize:'11px' }}>{queue.length}</span></div>}
          {iconBtn(toggleMute, isMuted||volume===0?<VolumeX size={16}/>:<Volume2 size={16}/>, isMuted?'Unmute':'Mute')}
          <div style={{ width:'76px', position:'relative' }}>
            <div style={{ height:'4px', background:'#2a2a40', borderRadius:'99px', position:'relative' }}>
              <div style={{ height:'100%', width:`${isMuted?0:volume*100}%`, background:'var(--green)', borderRadius:'99px', transition:'width 0.1s' }} />
              <input type="range" min="0" max="1" step="0.01" value={isMuted?0:volume} onChange={e=>setVolume(parseFloat(e.target.value))} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE COMPACT ── */}
      <div className="player-mobile-compact">
        {/* Art + info */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0, flex:1 }}>
          <Art />
          <div style={{ minWidth:0 }}>
            <p style={{ color:'#fff', fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentSong.title}</p>
            <p style={{ color:'var(--text-muted)', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentSong.artist}</p>
          </div>
        </div>

        {/* Mobile controls */}
        <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
          <button onClick={playPrev} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', padding:'6px' }}>
            <SkipBack size={20} />
          </button>
          <button onClick={togglePlay} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--green)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(29,185,84,0.4)' }}>
            {isPlaying ? <Pause size={18} color="#000" fill="#000"/> : <Play size={18} color="#000" fill="#000" style={{ marginLeft:'2px' }}/>}
          </button>
          <button onClick={playNext} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', padding:'6px' }}>
            <SkipForward size={20} />
          </button>
        </div>

        {/* Mobile progress bar at bottom */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3px', background:'#2a2a40' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'var(--green)', borderRadius:'99px' }} />
        </div>
      </div>
    </div>
  );
}
