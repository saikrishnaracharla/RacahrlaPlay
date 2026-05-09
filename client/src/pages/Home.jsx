import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flame, Heart, Zap, Headphones, Sunrise, Moon,
  Coffee, Radio, Music2, TrendingUp,
  Globe, ChevronDown, Check, Clock, ChevronRight, ChevronLeft,
  WifiOff, RefreshCw,
} from 'lucide-react';
import SongCard from '../components/SongCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import { fetchSections } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';

/* ─── Config ─────────────────────────────────────────────────────────────── */
const LANGUAGES = [
  { id:'all',       label:'All Languages' },
  { id:'hindi',     label:'Hindi' },
  { id:'telugu',    label:'Telugu' },
  { id:'tamil',     label:'Tamil' },
  { id:'malayalam', label:'Malayalam' },
  { id:'kannada',   label:'Kannada' },
  { id:'punjabi',   label:'Punjabi' },
];

const GENRE_CHIPS = [
  { id:'trending',   label:'Trending',   icon:Flame,       color:'#ff6b6b' },
  { id:'romantic',   label:'Romantic',   icon:Heart,       color:'#f472b6' },
  { id:'party',      label:'Party',      icon:Zap,         color:'#fbbf24' },
  { id:'workout',    label:'Workout',    icon:Headphones,  color:'#f97316' },
  { id:'devotional', label:'Devotional', icon:Sunrise,     color:'#a78bfa' },
  { id:'chill',      label:'Chill',      icon:Coffee,      color:'#34d399' },
  { id:'sad',        label:'Sad',        icon:Moon,        color:'#60a5fa' },
  { id:'indie',      label:'Indie',      icon:Radio,       color:'#c084fc' },
  { id:'90s',        label:'90s Hits',   icon:Music2,      color:'#fb923c' },
  { id:'telugu',     label:'Telugu',     icon:TrendingUp,  color:'#fde047' },
  { id:'tamil',      label:'Tamil',      icon:TrendingUp,  color:'#86efac' },
  { id:'punjabi',    label:'Punjabi',    icon:TrendingUp,  color:'#fdba74' },
];

const FILTER_CHIPS = ['All', 'Music', 'Podcasts'];

/** Build section configs — only 3 sections per genre to avoid rate-limiting */
function buildSections(genreId, langLabel) {
  const L = (!langLabel || langLabel === 'All Languages') ? '' : langLabel;
  const p = L ? `${L} ` : '';

  const S = {
    trending: [
      { key:'s1', title:'🔥 Trending Now',       icon:Flame,      color:'#ff6b6b', query:`${p}top bollywood hits 2024` },
      { key:'s2', title:'⚡ Chart Toppers',       icon:Zap,        color:'#fbbf24', query:`${p}number one songs 2024` },
      { key:'s3', title:'🎵 New Releases',        icon:Music2,     color:'#a78bfa', query:`${p}new songs 2024 latest` },
    ],
    romantic: [
      { key:'s1', title:'❤️ Romantic Hits',       icon:Heart,      color:'#f472b6', query:`${p}romantic love songs arijit 2024` },
      { key:'s2', title:'💕 Soft Melodies',       icon:Heart,      color:'#f472b6', query:`${p}soft romantic bollywood songs` },
      { key:'s3', title:'🌙 Late Night Feels',    icon:Moon,       color:'#60a5fa', query:`${p}night romantic songs heartbreak` },
    ],
    party: [
      { key:'s1', title:'🎉 Party Anthems',       icon:Zap,        color:'#fbbf24', query:`${p}party anthems dj bollywood 2024` },
      { key:'s2', title:'🔊 Club Bangers',        icon:Zap,        color:'#fb923c', query:`${p}club dance songs beats 2024` },
      { key:'s3', title:'💃 Dance Hits',          icon:Headphones, color:'#fde047', query:`${p}dance hits india garba navratri` },
    ],
    workout: [
      { key:'s1', title:'💪 Workout Power',       icon:Headphones, color:'#f97316', query:`${p}workout gym motivation songs 2024` },
      { key:'s2', title:'🏃 Running Playlist',    icon:Zap,        color:'#fbbf24', query:`${p}running jogging energy beats` },
      { key:'s3', title:'🥊 High Intensity',      icon:Flame,      color:'#ff6b6b', query:`${p}high intensity workout songs fast` },
    ],
    devotional: [
      { key:'s1', title:'🙏 Bhajans & Devotional',icon:Sunrise,    color:'#a78bfa', query:`${p}bhajan devotional songs 2024` },
      { key:'s2', title:'🕉️ Shiva Songs',         icon:Sunrise,    color:'#a78bfa', query:`${p}shiva lord mahadev songs` },
      { key:'s3', title:'🌸 Hanuman Bhajans',     icon:Music2,     color:'#f97316', query:`${p}hanuman chalisa bhajan` },
    ],
    chill: [
      { key:'s1', title:'☕ Chill Vibes',         icon:Coffee,     color:'#34d399', query:`${p}chill lo-fi acoustic songs` },
      { key:'s2', title:'🌿 Study & Focus',       icon:Coffee,     color:'#34d399', query:`${p}study focus background music calm` },
      { key:'s3', title:'🌙 Night Chill',         icon:Moon,       color:'#60a5fa', query:`${p}night chill relax songs` },
    ],
    sad: [
      { key:'s1', title:'😔 Sad Songs',           icon:Moon,       color:'#60a5fa', query:`${p}sad emotional songs hindi` },
      { key:'s2', title:'💔 Heartbreak',          icon:Heart,      color:'#f472b6', query:`${p}heartbreak breakup songs` },
      { key:'s3', title:'🌧️ Rainy Day Mood',      icon:Moon,       color:'#60a5fa', query:`${p}rainy day sad songs mood` },
    ],
    indie: [
      { key:'s1', title:'🎸 Indie Gems',          icon:Radio,      color:'#c084fc', query:`${p}indie hindi songs 2024` },
      { key:'s2', title:'🎤 Singer-Songwriters',  icon:Radio,      color:'#c084fc', query:`${p}singer songwriter independent music india` },
      { key:'s3', title:'🌟 Rising Artists',      icon:TrendingUp, color:'#a78bfa', query:`${p}new indie artists india 2024` },
    ],
    '90s': [
      { key:'s1', title:'📼 90s Blockbusters',    icon:Music2,     color:'#fb923c', query:`${p}90s hindi blockbuster songs classic` },
      { key:'s2', title:'🌟 Evergreen Hits',      icon:Music2,     color:'#fbbf24', query:`${p}evergreen hindi songs retro classic` },
      { key:'s3', title:'🎤 Kumar Sanu Era',      icon:Music2,     color:'#fb923c', query:`${p}kumar sanu udit narayan 90s songs` },
    ],
    telugu: [
      { key:'s1', title:'🌟 Telugu Chartbusters', icon:TrendingUp, color:'#fde047', query:'trending telugu songs 2024' },
      { key:'s2', title:'🔥 Pushpa Fever',        icon:Flame,      color:'#ff6b6b', query:'pushpa 2 telugu songs allu arjun 2024' },
      { key:'s3', title:'💛 DSP Beats',           icon:Music2,     color:'#fde047', query:'devi sri prasad telugu songs 2024' },
    ],
    tamil: [
      { key:'s1', title:'🎵 Kollywood Hits',      icon:TrendingUp, color:'#86efac', query:'trending tamil songs 2024 anirudh' },
      { key:'s2', title:'🔥 Thalapathy Mass',     icon:Flame,      color:'#ff6b6b', query:'vijay thalapathy tamil songs mass 2024' },
      { key:'s3', title:'🎸 Anirudh Anthems',     icon:Music2,     color:'#86efac', query:'anirudh ravichander tamil songs 2024' },
    ],
    punjabi: [
      { key:'s1', title:'🎉 Punjabi Hits',        icon:TrendingUp, color:'#fdba74', query:'best punjabi songs diljit 2024' },
      { key:'s2', title:'🎊 Bhangra Beats',       icon:Zap,        color:'#fbbf24', query:'bhangra punjabi songs dance 2024' },
      { key:'s3', title:'🌟 Diljit Dosanjh',      icon:Music2,     color:'#fdba74', query:'diljit dosanjh punjabi songs 2024' },
    ],
  };

  return S[genreId] || S.trending;

}

/* ─── HorizontalRow Component ────────────────────────────────────────────── */
function HorizontalRow({ title, icon: Icon, iconColor, songs, loading, isMobile }) {
  const ref = useRef(null);
  const scroll = dir => ref.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

  const cardW = isMobile ? 148 : 175;

  if (!loading && songs.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', padding:'0 2px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          {Icon && <Icon size={15} color={iconColor} />}
          <h2 style={{ color:'#fff', fontSize: isMobile ? '16px' : '18px', fontWeight:'700', letterSpacing:'-0.2px' }}>{title}</h2>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:'4px' }}>
            <button onClick={() => scroll(-1)} style={arrowBtn}><ChevronLeft size={16}/></button>
            <button onClick={() => scroll(1)}  style={arrowBtn}><ChevronRight size={16}/></button>
          </div>
        )}
      </div>

      {/* Scroll track */}
      <div ref={ref} className="no-sb"
        style={{ display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'6px', scrollSnapType:'x mandatory' }}>
        {loading
          ? Array.from({length: isMobile ? 4 : 7}).map((_, i) =>
              <div key={i} style={{ flexShrink:0, width:`${cardW}px`, scrollSnapAlign:'start' }}><SkeletonCard/></div>)
          : songs.slice(0, isMobile ? 12 : 18).map((s, i) => (
              <div key={`${s.id}-${i}`} style={{ flexShrink:0, width:`${cardW}px`, scrollSnapAlign:'start' }}>
                <SongCard song={s} songs={songs} index={i} layout="grid"/>
              </div>
          ))
        }
        {/* End spacer — prevents empty right edge */}
        <div style={{ flexShrink:0, width:'4px' }} />
      </div>
    </div>
  );
}
const arrowBtn = { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'50%', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.7)', transition:'all 0.15s' };

/* ─── Jump Back In ─────────────────────────────────────────────────────────── */
function JumpBackIn({ isMobile }) {
  const history = (() => {
    try { return JSON.parse(localStorage.getItem('racharla_history') || '[]').slice(0, 8); }
    catch { return []; }
  })();
  if (history.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? '22px' : '28px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'12px' }}>
        <Clock size={15} color="rgba(255,255,255,0.5)"/>
        <h2 style={{ color:'#fff', fontSize: isMobile ? '16px' : '18px', fontWeight:'700' }}>Jump Back In</h2>
      </div>
      {isMobile ? (
        /* 2×N compact tiles on mobile */
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          {history.slice(0,6).map((s, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.07)', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', padding:'6px 8px 6px 6px', overflow:'hidden', cursor:'pointer', transition:'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
              <div style={{ width:'44px', height:'44px', borderRadius:'6px', flexShrink:0, overflow:'hidden', background:'#16162a' }}>
                {s.image && <img src={s.image} alt={s.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
              </div>
              <span style={{ fontSize:'11px', fontWeight:'700', color:'#fff', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:'1.3' }}>{s.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'4px' }} className="no-sb">
          {history.map((s, i) => (
            <div key={i} style={{ flexShrink:0, width:'175px' }}>
              <SongCard song={s} songs={history} index={i} layout="grid"/>
            </div>
          ))}
          <div style={{ flexShrink:0, width:'4px' }}/>
        </div>
      )}
    </div>
  );
}

/* ─── Main Home Page ─────────────────────────────────────────────────────── */
export default function Home() {
  const isMobile = useIsMobile();
  const [activeGenre, setActiveGenre] = useState('trending');
  const [activeLang,  setActiveLang]  = useState('all');
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sections, setSections]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const selLang   = LANGUAGES.find(l => l.id === activeLang);
  const genreChip = GENRE_CHIPS.find(g => g.id === activeGenre) || GENRE_CHIPS[0];

  // True when all non-loading sections came back empty (API unavailable)
  const allEmpty = !loading && sections.length > 0 && sections.every(s => !s.loading && (!s.results || s.results.length === 0));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const configs = buildSections(activeGenre, selLang?.label);
    setSections(configs.map(c => ({ ...c, results: [], loading: true })));

    fetchSections(configs, (loaded) => {
      if (cancelled) return;
      setSections(prev => prev.map(s => s.key === loaded.key ? { ...loaded, loading: false } : s));
    }, 800).then(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeGenre, activeLang, retryCount]);

  return (
    <div className="anim-fade">
      {/* ── Mobile filter chips ── */}
      {isMobile && (
        <div className="no-sb" style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'12px', marginBottom:'4px' }}>
          {FILTER_CHIPS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{ display:'flex', alignItems:'center', padding:'7px 18px', borderRadius:'99px', flexShrink:0, border:'none', background: activeFilter===f ? '#fff' : 'rgba(255,255,255,0.12)', color: activeFilter===f ? '#000' : '#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', whiteSpace:'nowrap' }}>
              {f}
            </button>
          ))}
          <div style={{ flexShrink:0, width:'4px' }}/>
        </div>
      )}

      {/* ── Genre + Language Row ── */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'11px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase' }}>Browse by Genre</p>
          {/* Language Dropdown */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowLangDrop(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 12px', borderRadius:'99px', background: activeLang!=='all' ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.08)', border:`1.5px solid ${activeLang!=='all' ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`, color: activeLang!=='all' ? 'var(--green)' : 'rgba(255,255,255,0.6)', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              <Globe size={13}/>
              {selLang?.label || 'Language'}
              <ChevronDown size={12} style={{ transform: showLangDrop ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
            </button>
            {showLangDrop && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setShowLangDrop(false)}/>
                <div className="lang-dropdown">
                  {LANGUAGES.map(l => (
                    <button key={l.id} className={`lang-opt ${activeLang===l.id?'sel':''}`}
                      onClick={() => { setActiveLang(l.id); setShowLangDrop(false); }}>
                      {l.label}
                      {activeLang===l.id && <Check size={13} color="var(--green)"/>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Genre chips */}
        <div className="no-sb" style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
          {GENRE_CHIPS.map(g => {
            const Icon = g.icon;
            const active = g.id === activeGenre;
            return (
              <button key={g.id} onClick={() => setActiveGenre(g.id)}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'99px', flexShrink:0, border:`1.5px solid ${active ? g.color : 'rgba(255,255,255,0.1)'}`, background: active ? `${g.color}22` : 'rgba(255,255,255,0.05)', color: active ? g.color : 'rgba(255,255,255,0.55)', fontSize:'12px', fontWeight: active?'700':'500', cursor:'pointer', fontFamily:'inherit', boxShadow: active ? `0 4px 14px ${g.color}28` : 'none', transition:'all 0.2s', whiteSpace:'nowrap' }}>
                <Icon size={12}/>{g.label}
              </button>
            );
          })}
          <div style={{ flexShrink:0, width:'4px' }}/>
        </div>
      </div>

      {/* ── Jump Back In ── */}
      <JumpBackIn isMobile={isMobile}/>

      {/* ── API Unavailable Banner ── */}
      {allEmpty && (
        <div style={{ textAlign:'center', padding:'40px 20px', background:'rgba(255,255,255,0.03)', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', margin:'8px 0 24px' }}>
          <WifiOff size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom:'14px' }}/>
          <h3 style={{ color:'rgba(255,255,255,0.6)', fontSize:'16px', fontWeight:'700', marginBottom:'8px' }}>Music is loading...</h3>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'13px', marginBottom:'20px', maxWidth:'280px', margin:'0 auto 20px' }}>
            The music API is warming up or temporarily rate-limited. This usually clears in 1–2 minutes.
          </p>
          <button onClick={() => setRetryCount(c => c + 1)}
            style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 22px', borderRadius:'99px', background:'var(--green)', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'14px', color:'#000' }}>
            <RefreshCw size={15}/> Retry Now
          </button>
        </div>
      )}

      {/* ── Curated Sections ── */}
      {sections.map(sec => (
        <HorizontalRow
          key={sec.key}
          title={sec.title}
          icon={sec.icon}
          iconColor={sec.color}
          songs={sec.results || []}
          loading={sec.loading}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}
