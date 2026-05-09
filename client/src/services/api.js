/**
 * client/src/services/api.js
 *
 * MUSIC STRATEGY — 2-layer fallback:
 *
 *  1. Browser → saavn.sumit.co  (DIRECT, no proxy)
 *     Browsers have real TLS fingerprint → Cloudflare allows.
 *     Returns FULL songs (320kbps streams).
 *
 *  2. Browser → /api/* (Express backend)
 *     Backend → iTunes 30-second previews (guaranteed available).
 *     Only used if saavn direct call fails.
 *
 * AUTH — always goes through Express backend (/auth/*).
 */
import axios from 'axios';

// ─── Session-level client cache (10-min TTL) ─────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000;
function cKey(k, p) { return `rp:${k}:${JSON.stringify(p || {})}` }
function cGet(k) {
  try {
    const raw = sessionStorage.getItem(k);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(k); return null; }
    return data;
  } catch { return null; }
}
function cSet(k, data) {
  try { sessionStorage.setItem(k, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// ─── HTTP client → Express backend (fallback) ─────────────────────────────────
const http = axios.create({ baseURL: '', timeout: 20000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// ─── HTTP client → saavn.sumit.co DIRECT (primary) ───────────────────────────
// WHY /saavn not direct URL:
//  - Direct browser → saavn.sumit.co fails with CORS error in browser
//  - /saavn is proxied by Vite (dev) and Vercel edge (prod) — no CORS
//  - Vite proxy adds Referer/Origin headers so Cloudflare allows it
const SAAVN_BASE = '/saavn';
const saavnHttp  = axios.create({ baseURL: SAAVN_BASE, timeout: 12000 });

// ─── Saavn response normalizer (mirrors server/utils/songNormalizer.js) ───────
function pickUrl(arr, qualities) {
  if (!Array.isArray(arr)) return null;
  for (const q of qualities) {
    const f = arr.find(x => x.quality === q);
    if (f?.url) return f.url;
  }
  return arr[arr.length - 1]?.url || null;
}
function cleanText(str) {
  return (str || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();
}
function normalizeSaavn(s) {
  if (!s?.id) return null;
  const streamUrl = pickUrl(s.downloadUrl, ['320kbps', '160kbps', '96kbps']);
  if (!streamUrl) return null;
  return {
    id:        s.id,
    source:    'saavn',
    title:     cleanText(s.name || s.title),
    artist:    cleanText(s.artists?.primary?.map(a => a.name).join(', ') || s.primaryArtists || s.subtitle?.split(' - ')[0] || 'Unknown Artist'),
    album:     cleanText(s.album?.name || s.album || ''),
    duration:  Number(s.duration) || 0,
    image:     pickUrl(s.image, ['500x500', '150x150']) || 'https://placehold.co/300x300/0e0e14/1DB954?text=🎵',
    streamUrl,
    year:      s.year || '',
    language:  s.language || '',
    hasLyrics: !!s.hasLyrics,
    playCount: s.playCount || 0,
    label:     s.label || '',
  };
}

// ─── Saavn direct: search ─────────────────────────────────────────────────────
async function saavnSearchDirect(query, page = 1, limit = 20) {
  const r = await saavnHttp.get('/search/songs', { params: { query, page, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('No saavn results');
  return { success: true, total: r.data?.data?.total || songs.length, page, results: songs };
}

// ─── Saavn direct: trending ───────────────────────────────────────────────────
const TRENDING_QUERIES = {
  hindi:     'bollywood top songs 2024 arijit singh',
  telugu:    'telugu blockbuster 2024 pushpa allu arjun',
  tamil:     'kollywood superhit 2024 anirudh',
  malayalam: 'malayalam superhit 2024',
  kannada:   'kannada sandalwood 2024 yash',
  punjabi:   'punjabi top 2024 diljit dosanjh',
};
async function saavnTrendingDirect(lang = 'hindi', limit = 20) {
  const q = TRENDING_QUERIES[lang] || `${lang} trending songs 2024`;
  const r = await saavnHttp.get('/search/songs', { params: { query: q, page: 1, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('No saavn trending results');
  return { success: true, language: lang, results: songs };
}

// ─── Music API: search (saavn direct → backend fallback) ─────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Try saavn direct from browser first (full songs)
  try {
    const out = await saavnSearchDirect(query.trim(), page, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ Saavn direct failed, using backend fallback:', err.message);
  }

  // Fallback: Express backend → iTunes (30s previews)
  try {
    const data = await http.get('/api/search', { params: { query: query.trim(), page, limit } });
    const out  = {
      success: data?.success ?? true,
      total:   data?.total   || (data?.results?.length ?? 0),
      page,
      results: data?.results || [],
    };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    console.error('searchSongs backend also failed:', err.message);
    return { success: false, total: 0, page, results: [], error: err.message };
  }
}

// ─── Music API: trending (saavn direct → backend fallback) ────────────────────
export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Try saavn direct first
  try {
    const out = await saavnTrendingDirect(lang, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ Saavn trending direct failed, using backend:', err.message);
  }

  // Fallback
  try {
    const data = await http.get('/api/trending', { params: { lang, limit } });
    const out  = { success: true, language: lang, results: data?.results || [] };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [], error: err.message };
  }
}

// ─── Song details (saavn direct) ──────────────────────────────────────────────
export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    // Try saavn direct
    const r   = await saavnHttp.get(`/songs/${id}`);
    const raw = r.data?.data;
    const s   = Array.isArray(raw) ? raw[0] : raw;
    const song = normalizeSaavn(s);
    if (song) { const out = { success: true, song }; cSet(key, out); return out; }
  } catch {}
  // Fallback to backend
  try {
    const data = await http.get(`/api/song/${id}`);
    const out  = { success: true, song: data?.song || data };
    cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, song: null, error: err.message };
  }
}

// ─── Suggestions ──────────────────────────────────────────────────────────────
export async function getSuggestions(id) {
  const key = cKey('suggest', { id });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    const r    = await saavnHttp.get(`/songs/${id}/suggestions`);
    const songs = (r.data?.data || []).map(normalizeSaavn).filter(Boolean);
    if (songs.length) {
      const out = { success: true, results: songs };
      cSet(key, out); return out;
    }
  } catch {}
  try {
    const data = await http.get('/api/suggestions', { params: { id } });
    const out  = { success: true, results: data?.results || [] };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [], error: err.message };
  }
}

// ─── Albums ───────────────────────────────────────────────────────────────────
export async function searchAlbums(query, limit = 10) {
  try {
    const r = await saavnHttp.get('/search/albums', { params: { query, limit } });
    const results = r.data?.data?.results || [];
    if (results.length) return { success: true, results };
  } catch {}
  try {
    const data = await http.get('/api/albums', { params: { query, limit } });
    return { success: true, results: data?.results || [] };
  } catch {
    return { success: false, results: [] };
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authRegister = (u, e, p) => http.post('/auth/register', { username: u, email: e, password: p });
export const authLogin    = (e, p)    => http.post('/auth/login',    { email: e, password: p });
export const authMe       = (token)   => http.get('/auth/me',        { headers: { Authorization: `Bearer ${token}` } });
export const authStatus   = ()        => http.get('/auth/status');

// ─── Progressive sequential section loader (900ms stagger) ───────────────────
export async function fetchSections(sections, onProgress, delay = 900) {
  const out = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (i > 0) await new Promise(r => setTimeout(r, delay));
    const data = await searchSongs(s.query, 1, s.limit || 14);
    const item = { ...s, results: data.results || [], loading: false, error: data.error || null };
    out.push(item);
    onProgress?.(item);
  }
  return out;
}

export default http;
