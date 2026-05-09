/**
 * client/src/services/api.js  — SAAVN ONLY (no iTunes/Deezer previews)
 *
 * MUSIC STRATEGY — 2 Saavn sources, both return full songs:
 *
 *  1. /jio/search  → Backend calls jiosaavn.com/api.php + DES decrypt
 *                    Full 320kbps streams direct from saavncdn.com
 *
 *  2. /saavn/*     → Backend proxies to saavn.sumit.co with browser headers
 *                    Same Saavn content via 3rd-party wrapper
 *
 * NO iTunes. NO Deezer. If both Saavn sources fail → empty list (not previews).
 *
 * AUTH — always goes through Express backend (/auth/*).
 */
import axios from 'axios';

// ─── Session-level client cache (10-min TTL) ─────────────────────────────────
const CACHE_TTL    = 10 * 60 * 1000;
const CACHE_PREFIX = 'rp:v3:saavn';
function cKey(k, p) { return `${CACHE_PREFIX}:${k}:${JSON.stringify(p || {})}` }
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

// ─── HTTP client → Express backend ───────────────────────────────────────────
const http = axios.create({ baseURL: '', timeout: 20000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// ─── HTTP client → saavn.sumit.co proxy (via Vercel rewrite /saavn/*) ────────
const saavnHttp = axios.create({ baseURL: '/saavn', timeout: 12000 });

// ─── Saavn response normalizer ────────────────────────────────────────────────
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
    image:     pickUrl(s.image, ['500x500', '150x150']) || 'https://placehold.co/300x300/0e0e14/1DB954?text=%F0%9F%8E%B5',
    streamUrl,
    year:      s.year || '',
    language:  s.language || '',
    hasLyrics: !!s.hasLyrics,
    playCount: s.playCount || 0,
    label:     s.label || '',
  };
}

// Only accept songs that have a stream URL AND come from Saavn (full songs)
function saavnSongsOnly(songs = []) {
  return songs.filter(s => s?.streamUrl && (s.source === 'saavn' || s.source == null));
}

// ─── Trending query map ───────────────────────────────────────────────────────
const TRENDING_QUERIES = {
  hindi:     'bollywood hits 2024 arijit singh',
  telugu:    'telugu hits 2024 pushpa allu arjun',
  tamil:     'tamil hits 2024 anirudh',
  malayalam: 'malayalam hits 2024',
  kannada:   'kannada hits 2024 yash',
  punjabi:   'punjabi hits 2024 diljit dosanjh',
};

// ─── Layer 1: JioSaavn via our backend DES-decrypt service ───────────────────
async function jioSearch(query, page = 1, limit = 20) {
  const r = await http.get('/jio/search', { params: { query, page, limit } });
  const results = saavnSongsOnly(r?.results || []);
  if (!results.length) throw new Error('JioSaavn: no results');
  return { success: true, total: r?.total || results.length, page, results };
}
async function jioTrending(query, limit = 20) {
  const r = await http.get('/jio/trending', { params: { query, limit } });
  const results = saavnSongsOnly(r?.results || []);
  if (!results.length) throw new Error('JioSaavn trending: no results');
  return { success: true, results };
}

// ─── Layer 2: saavn.sumit.co via proxy ───────────────────────────────────────
async function saavnSearch(query, page = 1, limit = 20) {
  const r = await saavnHttp.get('/search/songs', { params: { query, page, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('Saavn proxy: no results');
  return { success: true, total: r.data?.data?.total || songs.length, page, results: songs };
}
async function saavnTrending(lang = 'hindi', limit = 20) {
  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  const r = await saavnHttp.get('/search/songs', { params: { query: q, page: 1, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('Saavn proxy trending: no results');
  return { success: true, language: lang, results: songs };
}

// ─── Music API: search ────────────────────────────────────────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Source 1: JioSaavn direct (DES decrypt → full songs)
  try {
    const out = await jioSearch(query.trim(), page, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ JioSaavn search failed:', err.message);
  }

  // Source 2: saavn.sumit.co proxy
  try {
    const out = await saavnSearch(query.trim(), page, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ Saavn proxy search failed:', err.message);
  }

  console.error('❌ All Saavn sources failed for search:', query);
  return { success: false, total: 0, page, results: [] };
}

// ─── Music API: trending ──────────────────────────────────────────────────────
export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Source 1: JioSaavn direct
  try {
    const q   = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
    const out = await jioTrending(q, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ JioSaavn trending failed:', err.message);
  }

  // Source 2: saavn proxy
  try {
    const out = await saavnTrending(lang, limit);
    if (out.results.length > 0) { cSet(key, out); return out; }
  } catch (err) {
    console.warn('⚠️ Saavn proxy trending failed:', err.message);
  }

  console.error('❌ All Saavn sources failed for trending:', lang);
  return { success: false, results: [] };
}

// ─── Song details ─────────────────────────────────────────────────────────────
export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;

  // Try saavn proxy directly
  try {
    const r   = await saavnHttp.get(`/songs/${id}`);
    const raw = r.data?.data;
    const s   = Array.isArray(raw) ? raw[0] : raw;
    const song = normalizeSaavn(s);
    if (song?.streamUrl) {
      const out = { success: true, song };
      cSet(key, out);
      return out;
    }
  } catch {}

  // Try JioSaavn via backend
  try {
    const data = await http.get(`/api/song/${id}`);
    const song = data?.song || data;
    if (song?.streamUrl && song.source === 'saavn') {
      const out = { success: true, song };
      cSet(key, out);
      return out;
    }
  } catch {}

  return { success: false, song: null, error: 'Song unavailable from Saavn' };
}

// ─── Suggestions ──────────────────────────────────────────────────────────────
export async function getSuggestions(id) {
  const key = cKey('suggest', { id });
  const hit = cGet(key);
  if (hit) return hit;

  // saavn proxy
  try {
    const r     = await saavnHttp.get(`/songs/${id}/suggestions`);
    const songs = (r.data?.data || []).map(normalizeSaavn).filter(Boolean);
    if (songs.length) {
      const out = { success: true, results: songs };
      cSet(key, out);
      return out;
    }
  } catch {}

  // Backend fallback (also Saavn-only now)
  try {
    const data = await http.get('/api/suggestions', { params: { id } });
    const out  = { success: true, results: saavnSongsOnly(data?.results || []) };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [] };
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

// ─── Progressive section loader ───────────────────────────────────────────────
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
