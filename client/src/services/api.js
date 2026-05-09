/**
 * client/src/services/api.js
 *
 * Music calls go to /api/* (Express backend).
 * Backend tries saavn.sumit.co → if blocked, auto-falls back to Deezer.
 * This means music ALWAYS loads regardless of saavn CF blocks.
 *
 * Auth calls go to /auth/* (same Express backend).
 */
import axios from 'axios';

// ─── Session-level client cache (10-min TTL) ─────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000;
function cKey(url, p) { return `rp:${url}:${JSON.stringify(p||{})}` }
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
const http = axios.create({ baseURL: '', timeout: 25000 });
http.interceptors.response.use(
  r => r.data,
  err => Promise.reject(new Error(
    err.response?.data?.error || err.response?.data?.message || err.message
  ))
);

// ─── Music API — server handles saavn → Deezer fallback ──────────────────────
export async function searchSongs(query, page = 1, limit = 20) {
  if (!query?.trim()) return { success: true, total: 0, page, results: [] };
  const key = cKey('search', { query, page, limit });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    const data = await http.get('/api/search', { params: { query: query.trim(), page, limit } });
    // Backend already returns normalized { success, total, results }
    const out = {
      success: data?.success ?? true,
      total:   data?.total   || (data?.results?.length ?? 0),
      page,
      results: data?.results || [],
    };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    console.error('searchSongs:', err.message);
    return { success: false, total: 0, page, results: [], error: err.message };
  }
}

export async function getTrending(lang = 'hindi', limit = 20) {
  const key = cKey('trending', { lang, limit });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    const data = await http.get('/api/trending', { params: { lang, limit } });
    const out  = { success: true, language: lang, results: data?.results || [] };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [], error: err.message };
  }
}

export async function getSongDetails(id) {
  const key = cKey('song', { id });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    const data = await http.get(`/api/song/${id}`);
    const out  = { success: true, song: data?.song || data };
    cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, song: null, error: err.message };
  }
}

export async function getSuggestions(id) {
  const key = cKey('suggest', { id });
  const hit = cGet(key);
  if (hit) return hit;
  try {
    const data = await http.get('/api/suggestions', { params: { id } });
    const out  = { success: true, results: data?.results || [] };
    if (out.results.length > 0) cSet(key, out);
    return out;
  } catch (err) {
    return { success: false, results: [], error: err.message };
  }
}

export async function searchAlbums(query, limit = 10) {
  try {
    const data = await http.get('/api/albums', { params: { query, limit } });
    return { success: true, results: data?.results || [] };
  } catch {
    return { success: false, results: [] };
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authRegister = (u, e, p) => http.post('/auth/register', { username:u, email:e, password:p });
export const authLogin    = (e, p)    => http.post('/auth/login',    { email:e, password:p });
export const authMe       = (token)   => http.get('/auth/me',        { headers:{ Authorization:`Bearer ${token}` } });
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
