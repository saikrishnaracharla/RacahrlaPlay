import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Music, Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

function Input({ icon: Icon, type='text', placeholder, value, onChange, right }) {
  return (
    <div style={{ position:'relative', marginBottom:'14px' }}>
      <Icon size={16} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', pointerEvents:'none' }} />
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#fff', fontFamily:'inherit', fontSize:'14px', outline:'none', padding:'13px 40px 13px 42px', transition:'all 0.2s', boxSizing:'border-box' }}
        onFocus={e => { e.target.style.border='1.5px solid var(--green)'; e.target.style.background='rgba(255,255,255,0.1)'; }}
        onBlur={e => { e.target.style.border='1.5px solid rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.07)'; }}
      />
      {right && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)' }}>{right}</div>}
    </div>
  );
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('login');   // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        setSuccess('Welcome back! 🎵');
      } else {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
        const user = await register(username.trim(), email, password);
        setSuccess(`Welcome to Racharlaplay, ${user.username}! 🎶`);
      }
      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError') || err.message.includes('fetch')) {
        setError('Cannot connect to server. Please make sure the backend is running (cd server && npm run dev).');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>

      {/* Back */}
      <div style={{ width:'100%', maxWidth:'400px', marginBottom:'8px' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', fontFamily:'inherit', padding:'4px 0' }}>
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:'400px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'32px 28px', boxShadow:'0 24px 60px rgba(0,0,0,0.5)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ width:'52px', height:'52px', background:'linear-gradient(135deg,#1DB954,#0f9d58)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 8px 24px rgba(29,185,84,0.35)' }}>
            <Music size={24} color="#000" />
          </div>
          <h1 style={{ fontFamily:"'Exo 2',Rajdhani,sans-serif", fontWeight:'900', fontSize:'24px', color:'#fff', letterSpacing:'-0.3px', marginBottom:'4px' }}>Racharlaplay</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px' }}>{tab === 'login' ? 'Sign in to your account' : 'Create your account'}</p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'3px', marginBottom:'24px', gap:'3px' }}>
          {[['login','Sign In'],['register','Register']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); reset(); }}
              style={{ flex:1, padding:'9px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'13px', transition:'all 0.2s', background: tab===id ? '#1DB954' : 'transparent', color: tab===id ? '#000' : 'rgba(255,255,255,0.5)' }}>
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
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex', padding:0 }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            }
          />

          {/* Error / Success */}
          {error && (
            <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', color:'#f87171', fontSize:'13px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background:'rgba(29,185,84,0.12)', border:'1px solid rgba(29,185,84,0.25)', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', color:'#4ade80', fontSize:'13px' }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'none', background: loading ? 'rgba(29,185,84,0.5)' : 'linear-gradient(135deg,#1DB954,#17a349)', color:'#000', fontFamily:'inherit', fontWeight:'800', fontSize:'15px', cursor: loading ? 'wait' : 'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', letterSpacing:'-0.2px' }}>
            {loading ? (
              <div className="spin" style={{ width:'18px', height:'18px', border:'2px solid rgba(0,0,0,0.3)', borderTop:'2px solid #000', borderRadius:'50%' }} />
            ) : tab === 'login' ? (
              <><LogIn size={16} /> Sign In</>
            ) : (
              <><UserPlus size={16} /> Create Account</>
            )}
          </button>
        </form>

        {/* Switch hint */}
        <p style={{ textAlign:'center', marginTop:'20px', color:'rgba(255,255,255,0.35)', fontSize:'13px' }}>
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setTab(tab==='login'?'register':'login'); reset(); }}
            style={{ background:'none', border:'none', color:'var(--green)', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'13px', padding:0 }}>
            {tab === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>

        {/* Guest note */}
        <p style={{ textAlign:'center', marginTop:'14px', color:'rgba(255,255,255,0.2)', fontSize:'11px', lineHeight:'1.5' }}>
          Guest mode works without signing in.<br/>
          Sign in to sync playlists across devices.
        </p>
      </div>
    </div>
  );
}
