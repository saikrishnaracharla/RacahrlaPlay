/**
 * server/services/itunesService.js
 *
 * WHY iTunes as fallback:
 *  - Official Apple API, no auth, no Cloudflare
 *  - Returns 30s preview MP3 URLs (always playable)
 *  - Excellent Indian music catalogue (Bollywood, Punjabi, Tamil, Telugu)
 *  - country=IN filter returns region-appropriate results
 *  - Rate limit: 20 req/min per IP — very lenient
 *  - CONFIRMED WORKING from our server IP
 */
const { buildClient } = require('../utils/httpClient');
const cache           = require('../cache/nodeCache');

const client = buildClient('https://itunes.apple.com', 'https://music.apple.com/');

function normItunes(s) {
  if (!s?.trackId || !s.previewUrl) return null;
  return {
    id:        `it_${s.trackId}`,
    source:    'itunes',
    title:     s.trackName || 'Unknown',
    artist:    s.artistName || 'Unknown Artist',
    album:     s.collectionName || '',
    duration:  Math.round((s.trackTimeMillis || 0) / 1000),
    image:     (s.artworkUrl100 || '').replace('100x100', '500x500'),
    streamUrl: s.previewUrl,   // 30-second AAC preview
    year:      s.releaseDate?.slice(0, 4) || '',
    language:  '',
    hasLyrics: false,
    playCount: 0,
    label:     s.recordLabel || '',
    genre:     s.primaryGenreName || '',
  };
}

async function search(query, limit = 20) {
  const key = `itunes:search:${query}:${limit}`;
  return cache.wrap(key, async () => {
    const r     = await client.get('/search', {
      params: { term: query, country: 'IN', media: 'music', limit, explicit: 'No' },
    });
    const songs = (r.data?.results || []).map(normItunes).filter(Boolean);
    return { total: songs.length, songs };
  }, cache.TTLS.SEARCH);
}

async function trending(genre = 'bollywood', limit = 20) {
  const key = `itunes:trending:${genre}:${limit}`;
  return cache.wrap(key, async () => {
    const r    = await client.get('/search', {
      params: { term: genre, country: 'IN', media: 'music', limit, explicit: 'No' },
    });
    return (r.data?.results || []).map(normItunes).filter(Boolean);
  }, cache.TTLS.TRENDING);
}

module.exports = { search, trending };
