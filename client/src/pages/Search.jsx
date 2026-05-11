import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, X, Clock, TrendingUp, Music2, Flame, Mic2 } from 'lucide-react';
import SongCard from '../components/SongCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { searchSongs } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

function useIsMobile(bp = 640) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return m;
}

const MAX_RECENT  = 8;
const DEBOUNCE_MS = 600;

const POPULAR_SEARCHES = [
  { label: 'Arijit Singh',        emoji: '🎤' },
  { label: 'Kesariya',            emoji: '🎵' },
  { label: 'Diljit Dosanjh',      emoji: '🥁' },
  { label: 'Shreya Ghoshal',      emoji: '🎶' },
  { label: 'A R Rahman',          emoji: '🎼' },
  { label: 'Anirudh Ravichander', emoji: '🎹' },
  { label: 'Sid Sriram',          emoji: '🎸' },
  { label: 'Pushpa 2',            emoji: '🔥' },
  { label: 'Karan Aujla',         emoji: '🎤' },
  { label: 'AP Dhillon',          emoji: '🎵' },
];

const BROWSE_CATEGORIES = [
  { label: 'Bollywood Hits',   color: '#e11d48', bg: 'linear-gradient(135deg,#e11d48,#9f1239)', emoji: '🎬' },
  { label: 'Punjabi',          color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#b45309)', emoji: '🥁' },
  { label: 'Romantic',         color: '#ec4899', bg: 'linear-gradient(135deg,#ec4899,#9d174d)', emoji: '💕' },
  { label: 'Party Anthems',    color: '#8b5cf6', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', emoji: '🎉' },
  { label: 'Devotional',       color: '#f97316', bg: 'linear-gradient(135deg,#f97316,#c2410c)', emoji: '🙏' },
  { label: 'Indie',            color: '#06b6d4', bg: 'linear-gradient(135deg,#06b6d4,#0e7490)', emoji: '🎸' },
  { label: 'Tamil',            color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#065f46)', emoji: '🎵' },
  { label: 'Lofi & Chill',     color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#4338ca)', emoji: '🌙' },
];

export default function Search() {
  const isMobile = useIsMobile();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('raaga_recent_searches') || '[]'); }
    catch { return []; }
  });

  const inputRef    = useRef(null);
  const debouncedQ  = useDebounce(query, DEBOUNCE_MS);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const data = await searchSongs(q.trim(), 1, 30);
      setResults(data.results || []);
      const updated = [q.trim(), ...recentSearches.filter(r => r !== q.trim())].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      localStorage.setItem('raaga_recent_searches', JSON.stringify(updated));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  useEffect(() => { doSearch(debouncedQ); }, [debouncedQ]);

  const handleClear = () => {
    setQuery(''); setResults([]); setHasSearched(false); setError(null);
    inputRef.current?.focus();
  };

  const handleQuickSearch = (q) => { setQuery(q); doSearch(q); };

  const removeRecent = (item) => {
    const updated = recentSearches.filter(r => r !== item);
    setRecentSearches(updated);
    localStorage.setItem('raaga_recent_searches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('raaga_recent_searches');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  doSearch(query);
    if (e.key === 'Escape') handleClear();
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>

      {/* ── Search Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--brand-font)', fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#fff', marginBottom: '16px', letterSpacing: '-0.3px' }}>
          Search
        </h1>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '640px' }}>
          {/* Glow when focused */}
          {focused && (
            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '99px', background: 'linear-gradient(135deg,rgba(29,185,84,0.4),rgba(29,185,84,0.1))', filter: 'blur(8px)', zIndex: 0, pointerEvents: 'none' }} />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SearchIcon
              size={17}
              color={focused ? 'var(--green)' : 'var(--text-muted)'}
              style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2, transition: 'color 0.2s' }}
            />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Songs, artists, albums…"
              className="search-input-enhanced"
              style={{ paddingRight: query ? '48px' : '20px' }}
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={handleClear}
                id="search-clear-btn"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', zIndex: 2 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Live result count while typing */}
        {!loading && hasSearched && results.length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px', paddingLeft: '4px' }}>
            <span style={{ color: 'var(--green)', fontWeight: '700' }}>{results.length}</span> results for "<span style={{ color: 'var(--text-secondary)' }}>{query}</span>"
          </p>
        )}
      </div>

      {/* ── Empty State (no query) ─────────────────────────────────────── */}
      {!query && !hasSearched && (
        <div>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} color="var(--text-muted)" />
                  <h2 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recent</h2>
                </div>
                <button onClick={clearAllRecent} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontFamily: 'inherit', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Clear all
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recentSearches.map((item) => (
                  <div key={item} className="recent-chip">
                    <button onClick={() => handleQuickSearch(item)} className="recent-chip-btn">
                      <Clock size={11} color="var(--text-muted)" />
                      {item}
                    </button>
                    <button onClick={() => removeRecent(item)} className="recent-chip-x">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular Artists / Searches */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <TrendingUp size={14} color="var(--green)" />
              <h2 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Trending</h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {POPULAR_SEARCHES.map(({ label, emoji }) => (
                <button
                  key={label}
                  id={`popular-${label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleQuickSearch(label)}
                  className="trending-chip"
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
          </section>

          {/* Browse Categories */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Music2 size={14} color="var(--text-muted)" />
              <h2 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Browse Categories</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '10px' }}>
              {BROWSE_CATEGORIES.map(({ label, bg, emoji }) => (
                <button
                  key={label}
                  onClick={() => handleQuickSearch(label)}
                  className="browse-category-btn"
                  style={{ background: bg }}
                >
                  <span style={{ fontSize: isMobile ? '28px' : '32px' }}>{emoji}</span>
                  <span className="browse-category-label">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && (
        isMobile
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-card)', animation: 'shimmer-pulse 1.6s ease-in-out infinite', animationDelay: `${i * 80}ms` }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#1e1e30', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '13px', width: '65%', background: '#1e1e30', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ height: '11px', width: '42%', background: '#18182a', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          : <div className="songs-grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {!loading && error && <ErrorMessage message={error} onRetry={() => doSearch(query)} />}

      {/* ── No Results ────────────────────────────────────────────────── */}
      {!loading && !error && hasSearched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '72px 24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎵</div>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', marginBottom: '8px', fontFamily: 'var(--brand-font)' }}>
            No results for "{query}"
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', maxWidth: '260px', margin: '0 auto 20px' }}>
            Try a different spelling or search for a similar artist or song name.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {POPULAR_SEARCHES.slice(0, 4).map(({ label, emoji }) => (
              <button key={label} onClick={() => handleQuickSearch(label)} className="trending-chip">
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {!loading && !error && results.length > 0 && (
        isMobile
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {results.map((song, idx) => (
                <div key={`${song.id}-${idx}`} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx, 8) * 30}ms`, animationFillMode: 'both' }}>
                  <SongCard song={song} songs={results} index={idx} layout="list" />
                </div>
              ))}
            </div>
          : <div className="songs-grid">
              {results.map((song, idx) => (
                <div key={`${song.id}-${idx}`} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx, 10) * 40}ms`, animationFillMode: 'both' }}>
                  <SongCard song={song} songs={results} index={idx} layout="grid" />
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
