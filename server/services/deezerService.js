/**
 * server/services/deezerService.js
 *
 * WHY Deezer as fallback:
 *  - Official public REST API — no auth required for basic search
 *  - No Cloudflare protection (CDN71 standard, not bot-protect mode)
 *  - Returns 30-second preview MP3 URLs (always streamable)
 *  - Rich Indian music catalogue (Bollywood, Kollywood, Bhangra)
 *  - Rate limit: 50 req/5s per IP — very generous compared to saavn
 *
 * Limitation: preview URLs are 30 seconds only. Full streams need OAuth.
 * But for fallback when saavn is down, 30s preview is better than silence.
 */
const { buildClient } = require('../utils/httpClient');
const { fromDeezer }  = require('../utils/songNormalizer');
const cache           = require('../cache/nodeCache');

const client = buildClient('https://api.deezer.com', 'https://www.deezer.com/');

async function deezerGet(url, params = {}) {
  const r = await client.get(url, { params });
  if (r.data?.error) throw new Error(r.data.error.message || 'Deezer error');
  return r.data;
}

async function search(query, limit = 20) {
  const key = `deezer:search:${query}:${limit}`;
  return cache.wrap(key, async () => {
    const data  = await deezerGet('/search', { q: query, limit });
    const songs = (data?.data || []).map(fromDeezer).filter(Boolean);
    return { total: data?.total || songs.length, songs };
  }, cache.TTLS.SEARCH);
}

async function trending(genre = 'bollywood', limit = 20) {
  const key = `deezer:trending:${genre}:${limit}`;
  return cache.wrap(key, async () => {
    const data = await deezerGet('/search', { q: genre, limit });
    return (data?.data || []).map(fromDeezer).filter(Boolean);
  }, cache.TTLS.TRENDING);
}

module.exports = { search, trending };
