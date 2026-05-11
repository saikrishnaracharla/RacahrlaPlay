import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus, ArrowLeft,
  LogOut, Settings, Headphones, Heart, ListMusic, ChevronRight, Shield, Play
} from 'lucide-react';

/* ── Reusable Input ─────────────────────────────────────────────────────── */
function Input({ icon: Icon, type = 'text', placeholder, value, onChange, right }) {
  return (
    <div style={{ position: 'relative', marginBottom: '14px' }}>
      <Icon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(167,139,250,0.4)', pointerEvents: 'none' }} />
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'rgba(139,92,246,0.07)', border: '1.5px solid rgba(139,92,246,0.18)', borderRadius: '12px', color: '#F0EAFF', fontFamily: 'inherit', fontSize: '14px', outline: 'none', padding: '13px 40px 13px 42px', transition: 'all 0.2s', boxSizing: 'border-box' }}
        onFocus={e => { e.target.style.border = '1.5px solid #8B5CF6'; e.target.style.background = 'rgba(139,92,246,0.12)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
        onBlur={e =>  { e.target.style.border = '1.5px solid rgba(139,92,246,0.18)'; e.target.style.background = 'rgba(139,92,246,0.07)'; e.target.style.boxShadow = 'none'; }}
      />
      {right && <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>{right}</div>}
    </div>
  );
}

/* ── Logged-in Profile View ─────────────────────────────────────────────── */
function ProfileView({ user, logout, navigate }) {
  const initial     = (user.username || user.email || 'U').slice(0, 2).toUpperCase();
  const menuItems   = [
    { icon: <Headphones size={17}/>, label: 'Listening History', sub: 'See what you\'ve played' },
    { icon: <Heart size={17}/>,      label: 'Liked Songs',       sub: 'Your favourites',         onClick: () => navigate('/') },
    { icon: <ListMusic size={17}/>,  label: 'My Playlists',      sub: 'Manage your playlists',   onClick: () => navigate('/') },
    { icon: <Settings size={17}/>,   label: 'Settings',          sub: 'App preferences' },
    { icon: <Shield size={17}/>,     label: 'Privacy',           sub: 'Manage your data' },
  ];

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '24px 16px 40px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>

      {/* Back */}
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'inherit', padding: '4px 0', marginBottom: '24px' }}>
        <ArrowLeft size={14} /> Back to Home
      </button>

      {/* Avatar + Name */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px', fontWeight: '900', color: '#fff', boxShadow: '0 12px 36px rgba(139,92,246,0.45)', border: '3px solid rgba(139,92,246,0.4)', fontFamily: 'var(--brand-font)' }}>
          {initial}
        </div>
        <h1 style={{ fontFamily: 'var(--brand-font)', fontWeight: '900', fontSize: '24px', color: '#F0EAFF', marginBottom: '4px', letterSpacing: '-0.3px' }}>
          {user.username || 'Music Lover'}
        </h1>
        <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '13px' }}>{user.email}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '99px', padding: '4px 14px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6', boxShadow: '0 0 6px #8B5CF6' }} />
          <span style={{ color: '#A78BFA', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>ACTIVE</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[['0', 'Played'], ['0', 'Playlists'], ['0', 'Liked']].map(([val, label]) => (
          <div key={label} style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '14px', padding: '16px 12px', textAlign: 'center' }}>
            <p style={{ color: '#F0EAFF', fontSize: '22px', fontWeight: '800', fontFamily: 'var(--brand-font)', marginBottom: '4px' }}>{val}</p>
            <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '11px', fontWeight: '600' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
        {menuItems.map((item, i) => (
          <button key={item.label} onClick={item.onClick}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', fontFamily: 'inherit', borderBottom: i < menuItems.length - 1 ? '1px solid rgba(139,92,246,0.08)' : 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <div style={{ color: 'rgba(167,139,250,0.5)', flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ color: '#F0EAFF', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{item.label}</p>
              <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: '12px' }}>{item.sub}</p>
            </div>
            <ChevronRight size={16} color="rgba(139,92,246,0.3)" />
          </button>
        ))}
      </div>

      {/* Sign Out */}
      <button onClick={() => { logout(); navigate('/'); }}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontFamily: 'inherit', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}>
        <LogOut size={16} /> Sign Out of PLAYIT
      </button>
    </div>
  );
}

/* ── Auth Form ──────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const { login, register, user, isLoggedIn, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState('login');
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  // ── Loading state — show spinner while restoring session ──────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.2)', borderTop: '3px solid #8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '14px' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Already logged in → show profile ─────────────────────────────────────
  if (isLoggedIn && user) {
    return <ProfileView user={user} logout={logout} navigate={navigate} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset(); setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        setSuccess('Welcome back! 🎵');
      } else {
        if (!username.trim()) { setError('Username is required'); setSubmitting(false); return; }
        const u = await register(username.trim(), email, password);
        setSuccess(`Welcome to PLAYIT, ${u.username}! 🎶`);
      }
      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      setError(err.message.includes('fetch') ? 'Cannot connect to server. Check your connection.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Back */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '8px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'inherit', padding: '4px 0' }}>
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '22px', padding: '32px 28px', boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(139,92,246,0.45)' }}>
            <Play size={24} color="#fff" fill="#fff" />
          </div>
          <h1 className="playit-logo" style={{ fontSize: '28px', marginBottom: '4px' }}>PLAYIT</h1>
          <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: '13px' }}>{tab === 'login' ? 'Sign in to your account' : 'Create your free account'}</p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'rgba(139,92,246,0.1)', borderRadius: '12px', padding: '4px', marginBottom: '24px', gap: '4px' }}>
          {[['login', 'Sign In'], ['register', 'Register']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); reset(); }}
              style={{ flex: 1, padding: '9px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '13px', transition: 'all 0.22s', background: tab === id ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'transparent', color: tab === id ? '#fff' : 'rgba(167,139,250,0.5)', boxShadow: tab === id ? '0 4px 12px rgba(139,92,246,0.4)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <Input icon={User} placeholder="Username" value={username} onChange={v => { setUsername(v); reset(); }} />
          )}
          <Input icon={Mail} type="email" placeholder="Email address" value={email} onChange={v => { setEmail(v); reset(); }} />
          <Input icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={v => { setPassword(v); reset(); }}
            right={
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.4)', display: 'flex', padding: 0 }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            }
          />

          {error   && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#f87171', fontSize: '13px' }}>⚠️ {error}</div>}
          {success && <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#A78BFA', fontSize: '13px' }}>✓ {success}</div>}

          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: submitting ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', fontFamily: 'inherit', fontWeight: '800', fontSize: '15px', cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.22s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '-0.2px', boxShadow: submitting ? 'none' : '0 6px 20px rgba(139,92,246,0.45)' }}>
            {submitting
              ? <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }} />
              : tab === 'login' ? <><LogIn size={16}/> Sign In</> : <><UserPlus size={16}/> Create Account</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(167,139,250,0.35)', fontSize: '13px' }}>
          {tab === 'login' ? "New to PLAYIT? " : 'Already have an account? '}
          <button onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); reset(); }}
            style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '13px', padding: 0 }}>
            {tab === 'login' ? 'Create free account' : 'Sign In'}
          </button>
        </p>

        <p style={{ textAlign: 'center', marginTop: '14px', color: 'rgba(167,139,250,0.2)', fontSize: '11px', lineHeight: '1.5' }}>
          Guest mode works without signing in.<br/>Sign in to sync playlists across sessions.
        </p>
      </div>
    </div>
  );
}
