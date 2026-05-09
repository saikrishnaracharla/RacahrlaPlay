import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, Music, MoreVertical, ListMusic, Shuffle } from 'lucide-react';
import { usePlaylists } from '../context/PlaylistContext';
import { usePlayer } from '../context/PlayerContext';
import { useBottomSheet } from '../context/BottomSheetContext';

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, removeFromPlaylist, deletePlaylist } = usePlaylists();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { openSheet } = useBottomSheet();
  const [activeMenu, setActiveMenu] = useState(null); // songId with open menu

  const playlist = playlists.find(p => p.id === id);

  if (!playlist) {
    return (
      <div style={{ padding:'40px 24px', textAlign:'center' }}>
        <ListMusic size={48} color="var(--text-muted)" style={{ marginBottom:'16px', opacity:0.4 }} />
        <p style={{ color:'var(--text-muted)', marginBottom:'16px' }}>Playlist not found.</p>
        <button onClick={() => navigate('/')} style={{ background:'var(--green)', border:'none', borderRadius:'99px', padding:'10px 24px', color:'#000', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Go Home</button>
      </div>
    );
  }

  const playAll = (shuffle = false) => {
    if (!playlist.songs.length) return;
    const songs = shuffle ? [...playlist.songs].sort(() => Math.random() - 0.5) : playlist.songs;
    playSong(songs[0], songs, 0);
  };

  const handleRemove = (songId, e) => {
    e.stopPropagation();
    removeFromPlaylist(id, songId);
    setActiveMenu(null);
  };

  const handleDeletePlaylist = () => {
    deletePlaylist(id);
    navigate('/');
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(180deg,rgba(29,185,84,0.18) 0%,transparent 100%)', padding:'20px 0 32px', marginBottom:'8px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontFamily:'inherit', fontSize:'14px', marginBottom:'20px', padding:'6px 0' }}
          onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}>
          <ArrowLeft size={18}/> Back
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
          {/* Playlist art */}
          <div style={{ width:'clamp(100px,15vw,140px)', height:'clamp(100px,15vw,140px)', borderRadius:'16px', background:'linear-gradient(135deg,rgba(29,185,84,0.3),rgba(29,185,84,0.08))', border:'1px solid rgba(29,185,84,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {playlist.songs[0]?.image
              ? <img src={playlist.songs[0].image} alt={playlist.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'16px', opacity:0.7 }} onError={e => e.target.style.display='none'} />
              : <ListMusic size={44} color="#1DB954"/>
            }
          </div>

          <div style={{ minWidth:0 }}>
            <p style={{ color:'var(--text-muted)', fontSize:'11px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'8px' }}>Playlist</p>
            <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'clamp(22px,4vw,36px)', fontWeight:'800', color:'#fff', marginBottom:'8px', lineHeight:'1.2' }}>{playlist.name}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>{playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}</p>

            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <button onClick={() => playAll(false)}
                disabled={!playlist.songs.length}
                style={{ display:'flex', alignItems:'center', gap:'8px', background:'#1DB954', border:'none', borderRadius:'99px', padding:'12px 24px', color:'#000', fontWeight:'700', fontSize:'14px', cursor: playlist.songs.length ? 'pointer':'not-allowed', fontFamily:'inherit', opacity: playlist.songs.length ? 1 : 0.5, transition:'transform 0.15s,box-shadow 0.15s', boxShadow:'0 4px 20px rgba(29,185,84,0.4)' }}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <Play size={17} fill="#000" color="#000"/> Play All
              </button>

              <button onClick={() => playAll(true)}
                disabled={!playlist.songs.length}
                style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'99px', padding:'11px 20px', color:'#fff', fontWeight:'600', fontSize:'14px', cursor: playlist.songs.length ? 'pointer':'not-allowed', fontFamily:'inherit', opacity: playlist.songs.length ? 1 : 0.5, transition:'background 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}>
                <Shuffle size={15}/> Shuffle
              </button>

              <button onClick={handleDeletePlaylist}
                style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'99px', padding:'11px 16px', color:'#ef4444', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', transition:'background 0.2s,border-color 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.1)';e.currentTarget.style.borderColor='#ef4444';}} onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.borderColor='rgba(239,68,68,0.3)';}}>
                <Trash2 size={14}/> Delete Playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', marginBottom:'20px' }} />

      {/* ── Songs list ── */}
      {playlist.songs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--text-muted)' }}>
          <Music size={48} style={{ marginBottom:'16px', opacity:0.3 }} />
          <p style={{ fontSize:'16px', marginBottom:'8px' }}>No songs yet</p>
          <p style={{ fontSize:'13px' }}>Go browse and add songs to this playlist</p>
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'28px 1fr auto', gap:'12px', padding:'0 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:'8px' }}>
            <span style={{ color:'var(--text-muted)', fontSize:'12px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>#</span>
            <span style={{ color:'var(--text-muted)', fontSize:'12px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Title</span>
            <span style={{ width:'32px' }} />
          </div>

          {playlist.songs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            const menuOpen = activeMenu === song.id;

            return (
              <div key={`${song.id}-${idx}`}
                style={{ display:'grid', gridTemplateColumns:'28px 1fr auto', gap:'12px', alignItems:'center', padding:'8px 14px', borderRadius:'8px', transition:'background 0.15s', position:'relative', cursor:'pointer', background: menuOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onMouseEnter={e => { if(!menuOpen) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if(!menuOpen) e.currentTarget.style.background='transparent'; }}
                onClick={() => openSheet(song, playlist.songs, idx)}
              >
                {/* Index / Equalizer */}
                <div style={{ textAlign:'center', color: isActive ? '#1DB954' : 'var(--text-muted)', fontSize:'13px' }}>
                  {isActive && isPlaying
                    ? <div className="eq" style={{ justifyContent:'center' }}><span/><span/><span/></div>
                    : <span>{idx + 1}</span>
                  }
                </div>

                {/* Art + info */}
                <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'7px', overflow:'hidden', flexShrink:0, background:'#16162a' }}>
                    {song.image
                      ? <img src={song.image} alt={song.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1a1a2e,#16213e)' }}><Music size={16} color="#1DB954"/></div>
                    }
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ color: isActive ? '#1DB954' : '#fff', fontSize:'14px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.title}</p>
                    <p style={{ color:'var(--text-muted)', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.artist}</p>
                  </div>
                </div>

                {/* 3-dot menu button */}
                <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(menuOpen ? null : song.id); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'6px', display:'flex', borderRadius:'6px', transition:'color 0.2s,background 0.2s', width:'32px', height:'32px', alignItems:'center', justifyContent:'center' }}
                    onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.style.background='rgba(255,255,255,0.08)';}}
                    onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='none';}}
                  >
                    <MoreVertical size={16}/>
                  </button>

                  {/* Dropdown menu */}
                  {menuOpen && (
                    <>
                      {/* backdrop to close */}
                      <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setActiveMenu(null)}/>
                      <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', zIndex:201, minWidth:'190px', boxShadow:'0 16px 40px rgba(0,0,0,0.5)', overflow:'hidden', animation:'fadeInUp 0.15s ease' }}>
                        {[
                          { label:'Play Now', color:'#1DB954', action: () => { playSong(song, playlist.songs, idx); setActiveMenu(null); } },
                          { label:'More Options…', color:'var(--text-secondary)', action: () => { openSheet(song, playlist.songs, idx); setActiveMenu(null); } },
                          null, // divider
                          { label:'Remove from Playlist', color:'#ef4444', action: (e) => handleRemove(song.id, { stopPropagation: () => {} }) },
                        ].map((item, i) => item === null
                          ? <div key={i} style={{ height:'1px', background:'rgba(255,255,255,0.07)', margin:'3px 0' }}/>
                          : (
                            <button key={i}
                              onClick={() => { setActiveMenu(null); item.action({ stopPropagation:()=>{} }); }}
                              style={{ display:'flex', alignItems:'center', width:'100%', padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:item.color, fontSize:'13px', fontWeight:'500', fontFamily:'inherit', textAlign:'left', transition:'background 0.15s' }}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
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
