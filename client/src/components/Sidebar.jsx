import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Music, ListMusic, Plus, Trash2, X, Library, LogIn } from 'lucide-react';
import { usePlaylists } from '../context/PlaylistContext';
import { useAuth }      from '../context/AuthContext';

export function SidebarContent({ onClose }) {
  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();
  const { user, isLoggedIn } = useAuth();
  const [showInput, setShowInput] = React.useState(false);
  const [name, setName]           = React.useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim());
    setName(''); setShowInput(false);
  };

  const go = (path) => { navigate(path); onClose?.(); };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo + close button (mobile) */}
      <div style={{ padding:'20px 16px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#8B5CF6,#06B6D4)', borderRadius:'11px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(139,92,246,0.4)', flexShrink:0 }}>
            <Music size={18} color="#fff" />
          </div>
          <div>
            <p className="playit-logo" style={{ fontSize:'18px', lineHeight:'1', letterSpacing:'-1px' }}>PLAYIT</p>
            <p style={{ color:'rgba(167,139,250,0.7)', fontSize:'10px', fontWeight:'700', letterSpacing:'1.5px' }}>INDIAN MUSIC</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', padding:'4px' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding:'0 10px', marginBottom:'4px' }}>
        {[
          { to:'/', label:'Home', Icon:Home, exact:true },
          { to:'/search', label:'Search', Icon:Search, exact:false },
        ].map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to} to={to} end={exact}
            onClick={() => onClose?.()}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'9px',
              color: isActive ? '#F0EAFF' : 'rgba(255,255,255,0.5)', textDecoration:'none',
              fontSize:'14px', fontWeight:'600',
              background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
              transition:'all 0.2s', marginBottom:'2px',
            })}
          >
            {({ isActive }) => <><Icon size={17} color={isActive ? '#8B5CF6' : undefined} />{label}</>}
          </NavLink>
        ))}
      </nav>

      <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'4px 16px 12px' }} />

      {/* Library — shown only when logged in */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 10px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px', marginBottom:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
            <Library size={13} color="rgba(255,255,255,0.4)" />
            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'11px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase' }}>Your Library</span>
          </div>
          {/* Only show + button when logged in */}
          {isLoggedIn && (
            <button onClick={() => setShowInput(v => !v)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', padding:'3px', borderRadius:'4px', transition:'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        {/* Not logged in — prompt */}
        {!isLoggedIn ? (
          <div style={{ padding:'20px 10px', textAlign:'center', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'10px', margin:'0 4px' }}>
            <LogIn size={22} color="rgba(255,255,255,0.2)" style={{ marginBottom:'8px' }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px', lineHeight:'1.6', marginBottom:'12px' }}>
              Sign in to see your<br/>playlists &amp; library
            </p>
            <button
              onClick={() => go('/account')}
              style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'8px', padding:'7px 16px', color:'#A78BFA', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(139,92,246,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(139,92,246,0.15)'; }}
            >
              Sign In to PLAYIT
            </button>
          </div>
        ) : (
          <>
            {/* New playlist input */}
            {showInput && (
              <div style={{ padding:'0 4px', marginBottom:'10px' }}>
                <input autoFocus value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') handleCreate(); if(e.key==='Escape'){setShowInput(false);setName('');} }}
                  placeholder="Playlist name..."
                  style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'8px 12px', color:'#fff', fontSize:'13px', fontFamily:'inherit', outline:'none', marginBottom:'6px', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#8B5CF6'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.12)'}
                />
                <button onClick={handleCreate} disabled={!name.trim()}
                  style={{ width:'100%', background: name.trim() ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)':'rgba(139,92,246,0.2)', border:'none', borderRadius:'8px', padding:'8px', color:'#fff', fontSize:'12px', fontWeight:'700', cursor: name.trim()?'pointer':'not-allowed', fontFamily:'inherit', transition:'background 0.2s' }}>
                  Create
                </button>
              </div>
            )}

            {/* Playlist list */}
            {playlists.length === 0 ? (
              <div style={{ padding:'20px 10px', textAlign:'center', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'10px', margin:'0 4px' }}>
                <ListMusic size={22} color="rgba(255,255,255,0.2)" style={{ marginBottom:'8px' }} />
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px', lineHeight:'1.5' }}>No playlists yet.<br/>Click + to create one.</p>
              </div>
            ) : playlists.map(pl => (
              <div key={pl.id}
                onClick={() => { navigate(`/playlist/${pl.id}`); onClose?.(); }}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'8px', cursor:'pointer', transition:'background 0.2s', marginBottom:'2px' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; const d=e.currentTarget.querySelector('.delbtn'); if(d) d.style.opacity='1'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; const d=e.currentTarget.querySelector('.delbtn'); if(d) d.style.opacity='0'; }}
              >
                <div style={{ width:'36px', height:'36px', borderRadius:'7px', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                  {pl.songs[0]?.image
                    ? <img src={pl.songs[0].image} alt={pl.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                    : <ListMusic size={14} color="#8B5CF6" />
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:'rgba(255,255,255,0.9)', fontSize:'13px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pl.name}</p>
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'11px' }}>{pl.songs.length} {pl.songs.length===1?'song':'songs'}</p>
                </div>
                <button className="delbtn" onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.25)', display:'flex', padding:'3px', borderRadius:'4px', opacity:0, transition:'opacity 0.2s,color 0.2s', flexShrink:0 }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.25)'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Desktop sidebar wrapper
export default function Sidebar({ collapsed }) {
  return (
    <div className="sidebar" style={{ width: collapsed ? '64px' : '240px', minWidth: collapsed ? '64px' : '240px' }}>
      {!collapsed && <SidebarContent />}
      {collapsed && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'20px', gap:'20px' }}>
          <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#8B5CF6,#06B6D4)', borderRadius:'11px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Music size={18} color="#000" />
          </div>
          <NavLink to="/" end style={({ isActive }) => ({ color: isActive ? '#8B5CF6' : 'rgba(255,255,255,0.4)', display:'flex' })}>
            {({ isActive }) => <Home size={20} color={isActive ? '#8B5CF6' : undefined} />}
          </NavLink>
          <NavLink to="/search" style={({ isActive }) => ({ color: isActive ? '#8B5CF6' : 'rgba(255,255,255,0.4)', display:'flex' })}>
            {({ isActive }) => <Search size={20} color={isActive ? '#8B5CF6' : undefined} />}
          </NavLink>
        </div>
      )}
    </div>
  );
}
