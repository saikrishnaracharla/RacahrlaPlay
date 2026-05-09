/**
 * client/src/services/api.js — SAAVN ONLY, browser-direct calls
 *
 * MUSIC STRATEGY — tries multiple Saavn API instances directly from the browser.
 * The browser sends real browser headers → no geo-blocking, no CORS issues
 * since all these APIs are public with CORS enabled.
 *
 * Source chain (all browser-direct, no backend dependency):
 *  1. saavn.sumit.co  — primary public Saavn API wrapper
 *  2. jiosaavn-api-privatechal.vercel.app — mirror instance
 *  3. /api/search   — our own backend (last resort, backend chain)
 *
 * NO iTunes. NO Deezer. NO 30s previews.
 * AUTH always goes through Express backend (/auth/*).
 */
import axios from 'axios';

// ─── Session cache (10-min TTL) ───────────────────────────────────────────────
const CACHE_TTL    = 10 * 60 * 1000;
const CACHE_PREFIX = 'rp:v5:saavn';
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
function cSet(k, v) {
  try { sessionStorage.setItem(k, JSON.stringify({ data: v, ts: Date.now() })); } catch {}
}

// ─── HTTP clients ─────────────────────────────────────────────────────────────

// Backend (auth + last-resort music)
const http = axios.create({ baseURL: '', timeout: 20000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// Direct browser calls to public Saavn API instances (CORS-enabled)
// WHY direct: the browser has real TLS fingerprint, APIs have CORS headers
// List ordered by reliability — we try them in order
const SAAVN_INSTANCES = [
  'https://saavn.sumit.co/api',
  'https://jiosaavn-api-privatechal.vercel.app/api',
  'https://saavn-api-tan.vercel.app/api',
].map(baseURL => axios.create({ baseURL, timeout: 12000 }));

// ─── Normalizer ───────────────────────────────────────────────────────────────
function pickUrl(arr, qualities) {
  if (!Array.isArray(arr)) return null;
  for (const q of qualities) {
    const f = arr.find(x => x.quality === q);
    if (f?.url) return f.url;
  }
  return arr[arr.length - 1]?.url || null;
}
function cleanText(str) {
  return (str || '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'").replace(/<[^>]+>/g, '').trim();
}
function normalizeSaavn(s) {
  if (!s?.id) return null;
  const streamUrl = pickUrl(s.downloadUrl, ['320kbps', '160kbps', '96kbps']);
  if (!streamUrl) return null;
  return {
    id:        s.id,
    source:    'saavn',
    title:     cleanText(s.name || s.title || ''),
    artist:    cleanText(
      s.artists?.primary?.map(a => a.name).join(', ') ||
      s.primaryArtists || s.subtitle?.split(' - ')[0] || 'Unknown Artist'
    ),
    album:     cleanText(s.album?.name || s.album || ''),
    duration:  Number(s.duration) || 0,
    image:     pickUrl(s.image, ['500x500', '150x150']) ||
               'https://placehold.co/300x300/0e0e14/1DB954?text=%F0%9F%8E%B5',
    streamUrl,
    year:      s.year || '',
    language:  s.language || '',
    hasLyrics: !!s.hasLyrics,
    playCount: s.playCount || 0,
    label:     s.label || '',
  };
}

// Normalize songs from our backend jio-direct (already normalized)
function normalizeBackend(s) {
  if (!s?.streamUrl || !s?.id) return null;
  return { ...s, source: 'saavn' };
}

function saavnOnly(songs = []) {
  return songs.filter(s => s?.streamUrl && s.source === 'saavn');
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

// ─── Try each Saavn instance in order ────────────────────────────────────────
async function trySaavnInstances(path, params) {
  for (let i = 0; i < SAAVN_INSTANCES.length; i++) {
    try {
      const r    = await SAAVN_INSTANCES[i].get(path, { params });
      const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
      if (songs.length > 0) {
        console.log(`✅ saavn-instance[${i}] served ${path}`);
        return { songs, total: r.data?.data?.total || songs.length };
      }
    } catch (err) {
      console.warn(`⚠️ saavn-instance[${i}] (${SAAVN_INSTANCES[i].defaults.baseURL}) failed: ${err.message}`);
    }
  }
  return null;
}

// ─── Music API: search ────────────────────────────────────────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Try all Saavn API instances directly from browser
  const direct = await trySaavnInstances('/search/songs', { query: query.trim(), page, limit });
  if (direct) {
    const out = { success: true, total: direct.total, page, results: direct.songs };
    cSet(key, out);
    return out;
  }

  // Last resort: our Express backend (tries jio-direct → saavn mirrors)
  try {
    const data = await http.get('/api/search', { params: { query: query.trim(), page, limit } });
    const results = saavnOnly((data?.results || []).map(s => normalizeBackend(s) || s));
    const out = { success: true, total: data?.total || results.length, page, results };
    if (results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    console.error('❌ All sources failed for search:', query, err.message);
    return { success: false, total: 0, page, results: [] };
  }
}

// ─── Music API: trending ──────────────────────────────────────────────────────
export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;

  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;

  // Try all Saavn API instances directly from browser
  const direct = await trySaavnInstances('/search/songs', { query: q, page: 1, limit });
  if (direct) {
    const out = { success: true, language: lang, results: direct.songs };
    cSet(key, out);
    return out;
  }

  // Backend fallback
  try {
    const data = await http.get('/api/trending', { params: { lang, limit } });
    const results = saavnOnly((data?.results || []).map(s => normalizeBackend(s) || s));
    const out = { success: true, language: lang, results };
    if (results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    console.error('❌ All sources failed for trending:', lang, err.message);
    return { success: false, results: [] };
  }
}

// ─── Song details ─────────────────────────────────────────────────────────────
export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;

  for (let i = 0; i < SAAVN_INSTANCES.length; i++) {
    try {
      const r    = await SAAVN_INSTANCES[i].get(`/songs/${id}`);
      const raw  = r.data?.data;
      const s    = Array.isArray(raw) ? raw[0] : raw;
      const song = normalizeSaavn(s);
      if (song?.streamUrl) {
        const out = { success: true, song };
        cSet(key, out);
        return out;
      }
    } catch {}
  }

  try {
    const data = await http.get(`/api/song/${id}`);
    const song = normalizeBackend(data?.song || data);
    if (song?.streamUrl) {
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

  for (let i = 0; i < SAAVN_INSTANCES.length; i++) {
    try {
      const r     = await SAAVN_INSTANCES[i].get(`/songs/${id}/suggestions`);
      const songs = (r.data?.data || []).map(normalizeSaavn).filter(Boolean);
      if (songs.length) {
        const out = { success: true, results: songs };
        cSet(key, out);
        return out;
      }
    } catch {}
  }

  try {
    const data  = await http.get('/api/suggestions', { params: { id } });
    const songs = saavnOnly(data?.results || []);
    if (songs.length) {
      const out = { success: true, results: songs };
      cSet(key, out);
      return out;
    }
  } catch {}

  return { success: false, results: [] };
}

// ─── Albums ───────────────────────────────────────────────────────────────────
export async function searchAlbums(query, limit = 10) {
  for (const instance of SAAVN_INSTANCES) {
    try {
      const r = await instance.get('/search/albums', { params: { query, limit } });
      const results = r.data?.data?.results || [];
      if (results.length) return { success: true, results };
    } catch {}
  }
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
