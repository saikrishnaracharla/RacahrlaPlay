/**
 * server/services/jioSaavnDirect.js
 *
 * WHY this exists:
 *  All third-party Saavn API wrappers (saavn.sumit.co, saavn.dev, etc.) are
 *  shared public instances that get rate-limited and Cloudflare-blocked under load.
 *  This service calls JioSaavn's own internal web API directly, the same way the
 *  official jiosaavn.com website does. We then decrypt the encrypted_media_url
 *  ourselves using DES-ECB (via des.js pure JS library) to get the saavncdn.com
 *  CDN URL — full songs, no 3rd-party dependency.
 *
 * KEY FINDINGS from testing (Node.js v22 / OpenSSL 3):
 *  1. The `encrypted_media_url` is in `song.more_info.encrypted_media_url`,
 *     NOT in the top-level song object.
 *  2. Node.js crypto does NOT support des-ecb in OpenSSL 3 → use des.js (pure JS).
 *  3. search.getResults returns full song data INCLUDING encrypted URLs — no 2nd call needed.
 *
 * RATE LIMITS:
 *  JioSaavn's own API allows the same traffic their website serves to millions.
 *  We mimic a browser session with matching headers.
 */

const { buildClient } = require('../utils/httpClient');
const { decryptUrl }  = require('../utils/jioDecrypt');
const cache           = require('../cache/nodeCache');

// JioSaavn's internal API — same endpoint used by jiosaavn.com website
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
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Normalize a raw JioSaavn song object from search.getResults into our schema.
 *
 * IMPORTANT: the search API puts most data inside `more_info`, including the
 * encrypted_media_url. The top-level object only has id, title, image, etc.
 */
function normalizeSong(raw) {
  if (!raw || !raw.id) return null;

  const mi = raw.more_info || {};

  // Decrypt stream URL from more_info (where JioSaavn search results put it)
  const streamUrl = decryptUrl(mi.encrypted_media_url)
    || decryptUrl(mi.encrypted_cache_url);

  if (!streamUrl) {
    // If no stream URL, this song can't be played — skip it
    return null;
  }

  // Image: prefer the provided image, upgrade to higher resolution
  const rawImage = raw.image || '';
  const image = rawImage
    ? rawImage.replace(/-150x150\.jpg$/, '-500x500.jpg')
               .replace(/-50x50\.jpg$/,  '-500x500.jpg')
    : 'https://placehold.co/300x300/0e0e14/1DB954?text=%F0%9F%8E%B5';

  // Artists: try artistMap first, then fallback to plain strings
  const artistMap = mi.artistMap || {};
  const primaryArtists = artistMap.primary_artists || [];
  const artistName = primaryArtists.length > 0
    ? primaryArtists.map(a => a.name).join(', ')
    : cleanText(mi.music || mi.singers || mi.primary_artists || raw.subtitle?.split(' - ')[0] || 'Unknown Artist');

  return {
    id:        raw.id,
    source:    'saavn',
    title:     cleanText(raw.title || raw.song || ''),
    artist:    artistName,
    album:     cleanText(mi.album || ''),
    duration:  Number(mi.duration) || 0,
    image,
    streamUrl,
    year:      raw.year || '',
    language:  raw.language || '',
    hasLyrics: mi.has_lyrics === 'true' || mi.has_lyrics === true,
    playCount: Number(raw.play_count) || 0,
    label:     mi.label || '',
  };
}

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * Search JioSaavn's internal API directly.
 * Uses search.getResults which returns full song data including encrypted URLs.
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
  const results = (r.data && r.data.results) || [];
  const songs = results.map(normalizeSong).filter(Boolean);

  console.log(`[jio-direct] search "${query}": ${results.length} raw → ${songs.length} with stream URLs`);

  return { total: Number(r.data && r.data.total) || songs.length, songs };
}

/**
 * Get trending songs by search query
 */
async function trendingDirect(query, limit = 20) {
  const data = await searchDirect(query, 1, limit);
  return data.songs;
}

// ── Exported cached functions ──────────────────────────────────────────────────

async function search(query, page = 1, limit = 20) {
  const key = `jio:search:${query}:${page}:${limit}`;
  return cache.wrap(key, async () => {
    const data = await searchDirect(query, page, limit);
    if (!data.songs.length) throw new Error('JioSaavn direct: empty results');
    return data;
  }, cache.TTLS && cache.TTLS.SEARCH || 300);
}

async function trending(query, limit = 20) {
  const key = `jio:trending:${query}:${limit}`;
  return cache.wrap(key, async () => {
    const songs = await trendingDirect(query, limit);
    if (!songs.length) throw new Error('JioSaavn direct: empty trending');
    return songs;
  }, cache.TTLS && cache.TTLS.TRENDING || 600);
}

async function songById(id) {
  const key = `jio:song:${id}`;
  return cache.wrap(key, async () => {
    // Use song.getDetails to get by ID
    const params = {
      ...BASE_PARAMS,
      __call: 'song.getDetails',
      pids:   id,
    };
    const r = await jioClient.get('/api.php', { params });
    const songs = (r.data && r.data.songs) || [];
    return normalizeSong(songs[0]);
  }, cache.TTLS && cache.TTLS.SONG || 3600);
}

module.exports = { search, trending, songById, searchDirect, trendingDirect };
