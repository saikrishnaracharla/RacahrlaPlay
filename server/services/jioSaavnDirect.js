/**
 * server/services/jioSaavnDirect.js
 *
 * WHY this exists:
 *  All third-party Saavn API wrappers (saavn.sumit.co, saavn.dev, etc.) are
 *  shared public instances that get rate-limited and Cloudflare-blocked when
 *  traffic spikes. This service calls JioSaavn's own internal web API directly,
 *  the same way the official jiosaavn.com website does. We then decrypt the
 *  encrypted_media_url ourselves using DES-ECB to get the saavncdn.com CDN URL.
 *
 * STRATEGY:
 *  1. Call https://www.jiosaavn.com/api.php with the same parameters the
 *     official web player uses (ctx=web6dot0, api_version=4, etc.)
 *  2. Decrypt the `encrypted_media_url` field using DES key "38346591"
 *  3. Return a normalized song object identical to what saavnService.js returns
 *     (same shape — frontend doesn't know the difference)
 *
 * RATE LIMITS:
 *  JioSaavn's own API allows the same traffic that their website serves to
 *  millions of users. By mimicking a browser session we have effectively
 *  unlimited access.
 */

const axios         = require('axios');
const { buildClient }  = require('../utils/httpClient');
const { decryptUrl }   = require('../utils/jioDecrypt');
const cache            = require('../cache/nodeCache');

// JioSaavn's internal API — same as used by jiosaavn.com website
const JIO_BASE = 'https://www.jiosaavn.com/api.php';

// Use browser-like client targeting JioSaavn's own domain
const jioClient = buildClient('https://www.jiosaavn.com', 'https://www.jiosaavn.com/');
jioClient.defaults.timeout = 12000;

// Common params appended to every JioSaavn API call
const BASE_PARAMS = {
  _format:     'json',
  _marker:     '0',
  api_version: '4',
  ctx:         'web6dot0',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function cleanText(str = '') {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, '') // strip any HTML tags
    .trim();
}

function durationToSec(s) {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  const p = String(s).split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((t, n) => t * 60 + n, 0);
}

/**
 * Normalize a raw JioSaavn song object into our standard schema.
 * The raw object comes from JioSaavn's internal API (/api.php).
 */
function normalizeSong(raw) {
  if (!raw || !raw.id) return null;

  // Decrypt stream URL
  const streamUrl =
    decryptUrl(raw.encrypted_media_url) ||
    decryptUrl(raw.more_info?.encrypted_media_url);

  if (!streamUrl) return null; // no playable URL → skip

  // Pick best album art (try 500x500 → 150x150 → any)
  const imageBase = raw.image || '';
  const image = imageBase
    .replace('-50x50.jpg', '-500x500.jpg')
    .replace('-150x150.jpg', '-500x500.jpg')
    || 'https://placehold.co/300x300/0e0e14/1DB954?text=🎵';

  return {
    id:        raw.id,
    source:    'saavn',
    title:     cleanText(raw.song || raw.title || ''),
    artist:    cleanText(raw.primary_artists || raw.singers || raw.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', ') || 'Unknown Artist'),
    album:     cleanText(raw.album || raw.more_info?.album || ''),
    duration:  durationToSec(raw.duration),
    image,
    streamUrl,
    year:      raw.year ? String(raw.year) : '',
    language:  raw.language || '',
    hasLyrics: raw.has_lyrics === 'true' || raw.has_lyrics === true,
    playCount: Number(raw.play_count) || 0,
    label:     raw.label || '',
  };
}

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * Search JioSaavn's internal API directly
 */
async function searchDirect(query, page = 1, limit = 20) {
  const params = {
    ...BASE_PARAMS,
    __call:  'search.getResults',
    q:       query,
    p:       page,
    n:       limit,
  };

  const r = await jioClient.get('/api.php', { params });
  const results = r.data?.results || [];
  const songs = results.map(normalizeSong).filter(Boolean);
  return { total: Number(r.data?.total) || songs.length, songs };
}

/**
 * Get trending / top songs by search query
 */
async function trendingDirect(query, limit = 20) {
  const data = await searchDirect(query, 1, limit);
  return data.songs;
}

/**
 * Get full song details (with stream URL) by ID from JioSaavn
 */
async function songDetailsDirect(id) {
  const params = {
    ...BASE_PARAMS,
    __call:   'song.getDetails',
    pids:     id,
    // Request all bitrates so we can pick 320kbps
    bitrate:  '320',
  };

  const r = await jioClient.get('/api.php', { params });
  const raw = r.data?.[id] || Object.values(r.data || {})[0];
  return normalizeSong(raw);
}

// ── Exported cached functions ──────────────────────────────────────────────────

async function search(query, page = 1, limit = 20) {
  const key = `jio:search:${query}:${page}:${limit}`;
  return cache.wrap(key, async () => {
    const data = await searchDirect(query, page, limit);
    if (!data.songs.length) throw new Error('JioSaavn direct: empty results');
    return data;
  }, cache.TTLS?.SEARCH || 300);
}

async function trending(query, limit = 20) {
  const key = `jio:trending:${query}:${limit}`;
  return cache.wrap(key, async () => {
    const songs = await trendingDirect(query, limit);
    if (!songs.length) throw new Error('JioSaavn direct: empty trending');
    return songs;
  }, cache.TTLS?.TRENDING || 600);
}

async function songById(id) {
  const key = `jio:song:${id}`;
  return cache.wrap(key, () => songDetailsDirect(id), cache.TTLS?.SONG || 3600);
}

module.exports = { search, trending, songById, searchDirect, trendingDirect };
