import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, X, Clock, TrendingUp, Music2 } from 'lucide-react';
import SongCard from '../components/SongCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { searchSongs } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

// Hook: detect mobile screen
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return isMobile;
}

const MAX_RECENT  = 8;
const DEBOUNCE_MS = 700; // WHY 700ms: saavn rate-limit triggers on bursts; 700ms means user must pause before we call

const POPULAR_SEARCHES = [
  'Kesariya', 'Pushpa', 'Arjit Singh', 'Anirudh Ravichander',
  'Diljit Dosanjh', 'Sid Sriram', 'Shreya Ghoshal', 'A R Rahman',
];

export default function Search() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('raaga_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchSongs(q.trim(), 1, 30);
      setResults(data.results || []);

      // Save to recent searches
      const updated = [q.trim(), ...recentSearches.filter(r => r !== q.trim())].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      localStorage.setItem('raaga_recent_searches', JSON.stringify(updated));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  // Fire search whenever debounced query changes
  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery]);

  const handleInputChange = (e) => setQuery(e.target.value);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleQuickSearch = (q) => {
    setQuery(q);
    doSearch(q);
  };

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
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ── Search Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '28px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '20px',
          }}
        >
          Search
        </h1>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <SearchIcon
            size={18}
            color="var(--text-muted)"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search songs, artists, albums..."
            className="search-input"
            style={{ paddingRight: query ? '44px' : '20px' }}
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              onClick={handleClear}
              id="search-clear-btn"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── No Query State ────────────────────────────────────────────── */}
      {!query && !hasSearched && (
        <div>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} color="var(--text-muted)" />
                  <h2 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Recent Searches
                  </h2>
                </div>
                <button
                  onClick={clearAllRecent}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  Clear all
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '99px',
                      padding: '6px 12px 6px 14px',
                    }}
                  >
                    <button
                      onClick={() => handleQuickSearch(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      {item}
                    </button>
                    <button
                      onClick={() => removeRecent(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '1px',
                        display: 'flex',
                        lineHeight: 1,
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={15} color="var(--green)" />
              <h2 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Popular Searches
              </h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  id={`popular-${item.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleQuickSearch(item)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '99px',
                    padding: '8px 16px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--green)';
                    e.currentTarget.style.color = 'var(--green)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Skeletons ─────────────────────────────────────────── */}
      {loading && (
        isMobile
          ? <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', borderRadius:'10px', background:'var(--bg-card)', animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${i*80}ms` }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'6px', background:'#2a2a40', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ height:'13px', width:'70%', background:'#2a2a40', borderRadius:'4px', marginBottom:'7px' }} />
                    <div style={{ height:'11px', width:'45%', background:'#1e1e30', borderRadius:'4px' }} />
                  </div>
                </div>
              ))}
            </div>
          : <div className="songs-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <ErrorMessage message={error} onRetry={() => doSearch(query)} />
      )}

      {/* ── No Results ────────────────────────────────────────────────── */}
      {!loading && !error && hasSearched && results.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)',
          }}
        >
          <Music2 size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '8px' }}>
            No results for "{query}"
          </h3>
          <p style={{ fontSize: '13px' }}>
            Try searching with a different spelling or keyword
          </p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {!loading && !error && results.length > 0 && (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {results.length} results for "
            <span style={{ color: 'var(--text-secondary)' }}>{query}</span>"
          </p>

          {isMobile
            ? /* ── Mobile: List layout ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {results.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    className="anim-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 8) * 30}ms`, animationFillMode: 'both' }}
                  >
                    <SongCard song={song} songs={results} index={idx} layout="list" />
                  </div>
                ))}
              </div>
            : /* ── Desktop: Grid layout ── */
              <div className="songs-grid">
                {results.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    className="anim-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 10) * 40}ms`, animationFillMode: 'both' }}
                  >
                    <SongCard song={song} songs={results} index={idx} layout="grid" />
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}
