/**
 * client/src/services/api.js — YouTube-powered full songs
 *
 * HOW IT WORKS:
 *  1. Song discovery/search: Saavn APIs (for Indian music catalog + artwork)
 *  2. Actual audio playback: YouTube via our /stream backend endpoint
 *     - Backend uses ytdl-core to get audio-only stream URL from YouTube
 *     - Google CDN serves full-length audio (no 30s limit, no CORS issues)
 *
 * FLOW when a song card is clicked:
 *  a) Show song metadata from Saavn (title, artist, image) immediately
 *  b) Fetch YouTube stream URL in background: GET /stream?q=Title+Artist
 *  c) HTML5 Audio plays the Google CDN URL — full song, always works
 *
 * AUTH always goes through Express backend (/auth/*).
 */
import axios from 'axios';

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_PREFIX = 'rp:v6:yt';
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
  try { sessionStorage.setItem(k, JSON.stringify({ data: v, ts: Date.now() })); } catch { }
}

// ─── HTTP clients ─────────────────────────────────────────────────────────────
// Backend base URL — used directly for stream endpoints (bypasses Vercel rewrite)
const BACKEND = 'https://racahrla-play.vercel.app';

const http = axios.create({ baseURL: '', timeout: 25000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// All Saavn calls go through OUR BACKEND PROXY at /saavn/*
// Vercel rewrites /saavn/* → racahrla-play.vercel.app/saavn/*
// The backend proxy adds browser-like headers and handles Cloudflare — no CORS!
const saavnProxy = axios.create({ baseURL: '', timeout: 14000 });
saavnProxy.interceptors.response.use(r => r.data, err => Promise.reject(err));

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

// Normalize a song from Saavn — NOTE: streamUrl will be REPLACED with YouTube URL on play
function normalizeSaavn(s) {
  if (!s?.id) return null;
  // Use Saavn URL as initial streamUrl (may be 30s) — YouTube URL will replace it on play
  const saavnUrl = pickUrl(s.downloadUrl, ['320kbps', '160kbps', '96kbps']);
  return {
    id: s.id,
    source: 'saavn',
    title: cleanText(s.name || s.title || ''),
    artist: cleanText(
      s.artists?.primary?.map(a => a.name).join(', ') ||
      s.primaryArtists || s.subtitle?.split(' - ')[0] || 'Unknown Artist'
    ),
    album: cleanText(s.album?.name || s.album || ''),
    duration: Number(s.duration) || 0,
    image: pickUrl(s.image, ['500x500', '150x150']) ||
      'https://placehold.co/300x300/0C0018/8B5CF6?text=🎵',
    streamUrl: saavnUrl || `__pending__`, // replaced by YouTube URL on play
    year: s.year || '',
    language: s.language || '',
    hasLyrics: !!s.hasLyrics,
    playCount: s.playCount || 0,
    label: s.label || '',
    _needsYtStream: true, // flag to trigger YouTube stream fetch on play
  };
}

// ─── YouTube stream fetcher ───────────────────────────────────────────────────
/**
 * Get full YouTube audio stream URL for a song.
 * Called by PlayerContext when a song is about to play.
 * Returns the streamUrl to replace the Saavn/placeholder URL.
 */
export async function getYouTubeStreamUrl(title, artist) {
  const q = `${title} ${artist} official audio`.trim();
  const key = cKey('yt', { q });
  const hit = cGet(key);
  if (hit) return hit;

  try {
    // Call backend DIRECTLY — bypass Vercel rewrite (which has query-string edge cases)
    // Backend CORS allows *.vercel.app so this works cross-domain
    const r = await axios.get(`${BACKEND}/stream`, { params: { q }, timeout: 20000 });
    const data = r.data;
    if (data?.streamUrl) {
      // Backend returns relative "/stream-proxy?id=..." — make it absolute
      // so the <audio> element can reach it from racharlaplay.vercel.app
      const streamUrl = data.streamUrl.startsWith('/')
        ? `${BACKEND}${data.streamUrl}`
        : data.streamUrl;
      const result = { streamUrl, duration: data.duration };
      // Cache 4 hours (YouTube URLs expire after ~6h)
      cSet(key, result);
      return result;
    }
  } catch (err) {
    console.warn('⚠️ YouTube stream fetch failed:', err.message);
  }
  return null;
}

// ─── Saavn discovery via backend proxy ────────────────────────────────────────
// Calls go to /saavn/* → Vercel rewrite → racahrla-play.vercel.app/saavn/*
// Backend proxy adds User-Agent/Referer headers to bypass Cloudflare.
async function saavnGet(path, params) {
  try {
    const r = await saavnProxy.get(`/saavn${path}`, { params });
    const results = r.data?.results || r.data?.data?.results || r.results || r || [];
    const songs = (Array.isArray(results) ? results : [])
      .map(normalizeSaavn)
      .filter(s => s && s.title);
    if (songs.length > 0) return { songs, total: r.data?.data?.total || songs.length };
  } catch (err) {
    console.warn('⚠️ saavn proxy failed:', err.message);
  }
  return null;
}

// Legacy shim so existing callers still work
async function trySaavnInstances(path, params) {
  return saavnGet(path, params);
}

const TRENDING_QUERIES = {
  hindi: 'bollywood hits 2024 arijit singh',
  telugu: 'telugu hits 2024 pushpa allu arjun',
  tamil: 'tamil hits 2024 anirudh',
  malayalam: 'malayalam hits 2024',
  kannada: 'kannada hits 2024 yash',
  punjabi: 'punjabi hits 2024 diljit dosanjh',
};

// ─── Music API: search ────────────────────────────────────────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;

  // Try Saavn instances (for metadata)
  const direct = await trySaavnInstances('/search/songs', { query: query.trim(), page, limit });
  if (direct) {
    const out = { success: true, total: direct.total, page, results: direct.songs };
    cSet(key, out);
    return out;
  }

  // Backend fallback
  try {
    const data = await http.get('/api/search', { params: { query: query.trim(), page, limit } });
    const results = (data?.results || []).filter(s => s?.title);
    const out = { success: true, total: data?.total || results.length, page, results };
    if (results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    console.error('❌ All search sources failed:', err.message);
    return { success: false, total: 0, page, results: [] };
  }
}

// ─── Music API: trending ──────────────────────────────────────────────────────
export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;

  const q = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  const direct = await trySaavnInstances('/search/songs', { query: q, page: 1, limit });
  if (direct) {
    const out = { success: true, language: lang, results: direct.songs };
    cSet(key, out);
    return out;
  }

  try {
    const data = await http.get('/api/trending', { params: { lang, limit } });
    const results = (data?.results || []).filter(s => s?.title);
    const out = { success: true, language: lang, results };
    if (results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [] };
  }
}

// ─── Song details ─────────────────────────────────────────────────────────────
export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;

  try {
    const r = await saavnProxy.get(`/saavn/songs/${id}`);
    const raw = r.data?.data || r.data;
    const s = Array.isArray(raw) ? raw[0] : raw;
    const song = normalizeSaavn(s);
    if (song) { const out = { success: true, song }; cSet(key, out); return out; }
  } catch { }
  return { success: false, song: null };
}

// ─── Suggestions ──────────────────────────────────────────────────────────────
export async function getSuggestions(id) {
  const key = cKey('suggest', { id });
  const hit = cGet(key);
  if (hit) return hit;

  try {
    const r = await saavnProxy.get(`/saavn/songs/${id}/suggestions`);
    const songs = (r.data?.data || []).map(normalizeSaavn).filter(s => s?.title);
    if (songs.length) { const out = { success: true, results: songs }; cSet(key, out); return out; }
  } catch { }
  return { success: false, results: [] };
}

// ─── Albums ───────────────────────────────────────────────────────────────────
export async function searchAlbums(query, limit = 10) {
  try {
    const r = await saavnProxy.get('/saavn/search/albums', { params: { query, limit } });
    const results = r.data?.data?.results || r.data?.results || [];
    if (results.length) return { success: true, results };
  } catch { }
  return { success: false, results: [] };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authRegister = (u, e, p) => http.post('/auth/register', { username: u, email: e, password: p });
export const authLogin = (e, p) => http.post('/auth/login', { email: e, password: p });
export const authMe = (token) => http.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
export const authStatus = () => http.get('/auth/status');

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
