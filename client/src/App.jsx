import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { BottomSheetProvider } from './context/BottomSheetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar, { SidebarContent } from './components/Sidebar';
import Player from './components/Player';
import Home from './pages/Home';
import Search from './pages/Search';
import PlaylistPage from './pages/PlaylistPage';
import AuthPage from './pages/AuthPage';
import MyPlaylistsPage from './pages/MyPlaylistsPage';
import LikedSongsPage  from './pages/LikedSongsPage';
import HistoryPage     from './pages/HistoryPage';
import { Home as HomeIcon, Search as SearchIcon, Menu, ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react';

/* ── User Avatar Button (bottom nav) ── */
function AccountNavBtn() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  if (!isLoggedIn) return (
    <button className="bn-item" onClick={() => navigate('/account')} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
      <User size={22} /><span>Sign In</span>
    </button>
  );

  return (
    <button className="bn-item" onClick={() => navigate('/account')} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', color: '#fff', flexShrink: 0, boxShadow:'0 0 0 2px rgba(139,92,246,0.4)' }}>
        {user.username?.[0]?.toUpperCase() || 'U'}
      </div>
      <span style={{ maxWidth: '52px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
    </button>
  );
}

/* ── Sidebar user row ── */
function SidebarUserRow() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  if (!isLoggedIn) return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => navigate('/account')}
        style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--green)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '13px', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <User size={15} /> Sign In / Register
      </button>
    </div>
  );
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: user.avatar_color || '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', color: '#000', flexShrink: 0 }}>
        {user.username?.[0]?.toUpperCase() || 'U'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
      </div>
      <button onClick={() => { logout(); navigate('/'); }}
        title="Sign Out"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: '4px', borderRadius: '6px' }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
        <LogOut size={14} />
      </button>
    </div>
  );
}

/* ── App Layout ── */
function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500, animation: 'fadeIn 0.2s ease' }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(82vw,300px)', background: '#090910', borderRight: '1px solid rgba(255,255,255,0.08)', zIndex: 501, overflowY: 'auto', animation: 'slideInLeft 0.28s cubic-bezier(0.32,0.72,0,1)', display: 'flex', flexDirection: 'column' }}>
            <SidebarContent onClose={() => setDrawerOpen(false)} />
            <SidebarUserRow />
          </div>
        </>
      )}

      {/* Desktop Shell */}
      <div className="app-shell">
        {/* Sidebar */}
        <div className="sidebar-col">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Sidebar collapsed={collapsed} />
            {!collapsed && <SidebarUserRow />}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Main */}
        <main className="app-main">
          <div className="topnav-mobile">
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: '8px', flexShrink: 0 }}>
              <Menu size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <img src="/music-icon.svg" alt="PLAYIT" style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0, objectFit:'cover' }} />
              <span className="playit-logo" style={{ fontSize:'20px' }}>PLAYIT</span>
            </div>
          </div>

          <div className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/playlists" element={<MyPlaylistsPage />} />
              <Route path="/liked" element={<LikedSongsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/account" element={<AuthPage />} />
            </Routes>
          </div>
        </main>

        {/* Desktop player */}
        <div className="player-row">
          <Player />
        </div>
      </div>

      {/* Mobile player */}
      <div className="player-mobile-fixed">
        <Player />
      </div>

      {/* Mobile bottom nav — 3 items */}
      <nav className="bottomnav-mobile">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'bn-item active' : 'bn-item'}>
          <HomeIcon size={22} /><span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? 'bn-item active' : 'bn-item'}>
          <SearchIcon size={22} /><span>Search</span>
        </NavLink>
        <AccountNavBtn />
      </nav>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <PlaylistProvider>
            <BottomSheetProvider>
              <AppLayout />
            </BottomSheetProvider>
          </PlaylistProvider>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
