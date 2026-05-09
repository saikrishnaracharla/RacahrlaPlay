/**
 * client/src/services/api.js  — SAAVN ONLY (no iTunes/Deezer previews)
 *
 * MUSIC STRATEGY — 3 Saavn sources, all return FULL songs:
 *
 *  1. saavn.dev  (BROWSER → direct, CORS-enabled, Indian servers)
 *     Called directly from the browser — user is likely in India →
 *     no geo-blocking, full 320kbps songs, fast.
 *
 *  2. /saavn/*   (BROWSER → our backend → saavn.sumit.co proxy)
 *     Backend adds browser headers to bypass CF. May be rate-limited.
 *
 *  3. /jio/search  (BROWSER → our backend → jiosaavn.com/api.php + DES)
 *     Direct JioSaavn API. Works if Vercel IP is not geo-blocked.
 *
 * NO iTunes. NO Deezer. If all Saavn sources fail → empty list (not previews).
 *
 * AUTH — always goes through Express backend (/auth/*).
 */
import axios from 'axios';

// ─── Session-level client cache (10-min TTL) ─────────────────────────────────
const CACHE_TTL    = 10 * 60 * 1000;
const CACHE_PREFIX = 'rp:v4:saavn';
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

// ─── HTTP clients ─────────────────────────────────────────────────────────────

// Backend (auth + fallback music)
const http = axios.create({ baseURL: '', timeout: 20000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// saavn.dev — CORS-enabled public API, called directly from browser
// WHY direct: browser is in India → no geo-block, no rate-limit from server IP
const saavnDev = axios.create({
  baseURL: 'https://saavn.dev/api',
  timeout: 14000,
});

// saavn.sumit.co via our backend proxy (Vercel edge adds browser headers)
const saavnProxy = axios.create({ baseURL: '/saavn', timeout: 12000 });

// ─── Normalizers ──────────────────────────────────────────────────────────────

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

// Normalize song from saavn.dev / saavn.sumit.co (same response shape)
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

// Normalize songs from our backend's jio-direct service (already normalized shape)
function normalizeBackend(s) {
  if (!s?.streamUrl || !s?.id) return null;
  return { ...s, source: 'saavn' }; // ensure source tag
}

// Only accept songs with a stream URL from Saavn (not previews)
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

// ─── Source 1: saavn.dev (browser-direct, CORS-enabled) ──────────────────────
async function devSearch(query, page = 1, limit = 20) {
  const r = await saavnDev.get('/search/songs', {
    params: { query, page, limit },
  });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('saavn.dev: no results');
  return { success: true, total: r.data?.data?.total || songs.length, page, results: songs };
}
async function devTrending(lang = 'hindi', limit = 20) {
  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  const r = await saavnDev.get('/search/songs', {
    params: { query: q, page: 1, limit },
  });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('saavn.dev trending: no results');
  return { success: true, language: lang, results: songs };
}

// ─── Source 2: saavn.sumit.co via backend proxy ───────────────────────────────
async function proxySearch(query, page = 1, limit = 20) {
  const r = await saavnProxy.get('/search/songs', { params: { query, page, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('saavn proxy: no results');
  return { success: true, total: r.data?.data?.total || songs.length, page, results: songs };
}
async function proxyTrending(lang = 'hindi', limit = 20) {
  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  const r = await saavnProxy.get('/search/songs', { params: { query: q, page: 1, limit } });
  const songs = (r.data?.data?.results || []).map(normalizeSaavn).filter(Boolean);
  if (!songs.length) throw new Error('saavn proxy trending: no results');
  return { success: true, language: lang, results: songs };
}

// ─── Source 3: JioSaavn direct via backend (DES decrypt) ─────────────────────
async function jioSearch(query, page = 1, limit = 20) {
  const r = await http.get('/jio/search', { params: { query, page, limit } });
  const results = (r?.results || []).map(normalizeBackend).filter(Boolean);
  if (!results.length) throw new Error('jio-direct: no results');
  return { success: true, total: r?.total || results.length, page, results };
}
async function jioTrending(lang = 'hindi', limit = 20) {
  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  const r = await http.get('/jio/trending', { params: { query: q, limit } });
  const results = (r?.results || []).map(normalizeBackend).filter(Boolean);
  if (!results.length) throw new Error('jio-direct trending: no results');
  return { success: true, language: lang, results };
}

// ─── Music API: search ────────────────────────────────────────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;

  const sources = [
    ['saavn.dev',     () => devSearch(query.trim(), page, limit)],
    ['saavn-proxy',   () => proxySearch(query.trim(), page, limit)],
    ['jio-direct',    () => jioSearch(query.trim(), page, limit)],
  ];

  for (const [name, fn] of sources) {
    try {
      const out = await fn();
      const results = saavnOnly(out.results || []);
      if (results.length > 0) {
        const final = { ...out, results };
        cSet(key, final);
        console.log(`✅ search served by ${name}`);
        return final;
      }
      console.warn(`⚠️ ${name}: empty results`);
    } catch (err) {
      console.warn(`⚠️ ${name} failed: ${err.message}`);
    }
  }

  console.error('❌ All Saavn sources failed for search:', query);
  return { success: false, total: 0, page, results: [] };
}

// ─── Music API: trending ──────────────────────────────────────────────────────
export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;

  const sources = [
    ['saavn.dev',     () => devTrending(lang, limit)],
    ['saavn-proxy',   () => proxyTrending(lang, limit)],
    ['jio-direct',    () => jioTrending(lang, limit)],
  ];

  for (const [name, fn] of sources) {
    try {
      const out = await fn();
      const results = saavnOnly(out.results || []);
      if (results.length > 0) {
        const final = { ...out, results };
        cSet(key, final);
        console.log(`✅ trending served by ${name}`);
        return final;
      }
      console.warn(`⚠️ ${name} trending: empty`);
    } catch (err) {
      console.warn(`⚠️ ${name} trending failed: ${err.message}`);
    }
  }

  console.error('❌ All Saavn sources failed for trending:', lang);
  return { success: false, results: [] };
}

// ─── Song details ─────────────────────────────────────────────────────────────
export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;

  // Try saavn.dev first (browser direct)
  try {
    const r    = await saavnDev.get(`/songs/${id}`);
    const raw  = r.data?.data;
    const s    = Array.isArray(raw) ? raw[0] : raw;
    const song = normalizeSaavn(s);
    if (song?.streamUrl) {
      const out = { success: true, song };
      cSet(key, out);
      return out;
    }
  } catch {}

  // Try saavn proxy
  try {
    const r    = await saavnProxy.get(`/songs/${id}`);
    const raw  = r.data?.data;
    const s    = Array.isArray(raw) ? raw[0] : raw;
    const song = normalizeSaavn(s);
    if (song?.streamUrl) {
      const out = { success: true, song };
      cSet(key, out);
      return out;
    }
  } catch {}

  // Backend fallback
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

  // saavn.dev
  try {
    const r     = await saavnDev.get(`/songs/${id}/suggestions`);
    const songs = (r.data?.data || []).map(normalizeSaavn).filter(Boolean);
    if (songs.length) { const out = { success: true, results: songs }; cSet(key, out); return out; }
  } catch {}

  // saavn proxy
  try {
    const r     = await saavnProxy.get(`/songs/${id}/suggestions`);
    const songs = (r.data?.data || []).map(normalizeSaavn).filter(Boolean);
    if (songs.length) { const out = { success: true, results: songs }; cSet(key, out); return out; }
  } catch {}

  // Backend
  try {
    const data  = await http.get('/api/suggestions', { params: { id } });
    const songs = saavnOnly(data?.results || []);
    if (songs.length) { const out = { success: true, results: songs }; cSet(key, out); return out; }
  } catch {}

  return { success: false, results: [] };
}

// ─── Albums ───────────────────────────────────────────────────────────────────
export async function searchAlbums(query, limit = 10) {
  try {
    const r = await saavnDev.get('/search/albums', { params: { query, limit } });
    const results = r.data?.data?.results || [];
    if (results.length) return { success: true, results };
  } catch {}
  try {
    const r = await saavnProxy.get('/search/albums', { params: { query, limit } });
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
