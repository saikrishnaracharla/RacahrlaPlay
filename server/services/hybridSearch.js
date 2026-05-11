/**
 * server/services/hybridSearch.js
 *
 * Hybrid Playback Engine:
 *  1. MusicBrainz API  → canonical metadata (title, artist, album, year, cover art)
 *  2. YouTube Data API v3 → videoId for full-length playback via IFrame
 *
 * REQUIRES env var: YOUTUBE_API_KEY
 * Get free key at: https://console.cloud.google.com → Enable "YouTube Data API v3"
 * Free quota: 10,000 units/day  (each search = 100 units → 100 free searches/day)
 */

const axios = require('axios');
const cache = require('../cache/nodeCache');

const MB_BASE = 'https://musicbrainz.org/ws/2';
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

const mbClient = axios.create({
  baseURL:  MB_BASE,
  timeout:  8000,
  headers: {
    'User-Agent': 'RacharlaPlay/1.0 (contact@racharlaplay.app)',
    'Accept':     'application/json',
  },
});

const ytClient = axios.create({ baseURL: YT_BASE, timeout: 8000 });

// ─── Step 1: MusicBrainz ─────────────────────────────────────────────────────
async function searchMusicBrainz(query) {
  const key    = `mb:v1:${query}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const r          = await mbClient.get('/recording', { params: { query, limit: 5, fmt: 'json' } });
  const recordings = r.data?.recordings || [];
  if (!recordings.length) throw new Error(`MusicBrainz: no results for "${query}"`);

  const rec    = recordings[0];
  const artist = rec['artist-credit']?.[0]?.artist?.name
              || rec['artist-credit']?.[0]?.name
              || 'Unknown Artist';
  const title  = rec.title || query;
  const album  = rec.releases?.[0]?.title  || '';
  const year   = rec.releases?.[0]?.date?.substring(0, 4) || '';
  const mbid   = rec.id;

  // Cover Art Archive
  let coverArt = null;
  const releaseId = rec.releases?.[0]?.id;
  if (releaseId) {
    try {
      const ca = await axios.get(`https://coverartarchive.org/release/${releaseId}`, { timeout: 5000 });
      coverArt  = ca.data?.images?.[0]?.thumbnails?.large || ca.data?.images?.[0]?.image || null;
    } catch { /* cover not found — ok */ }
  }

  const result = { title, artist, album, year, coverArt, mbid };
  cache.set(key, result, 86400); // 24 h
  return result;
}

// ─── Step 2: YouTube Data API v3 ─────────────────────────────────────────────
async function searchYouTube(title, artist, album = '') {
  const YT_KEY = process.env.YOUTUBE_API_KEY;
  if (!YT_KEY) throw new Error('YOUTUBE_API_KEY env var not set');

  const key    = `yt:v2:${artist}:${title}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const queries = [
    `${artist} ${title} official audio`,
    `${artist} ${title} ${album}`,
    `${artist} ${title}`,
  ];

  const BAD = /karaoke|cover|nightcore|slowed|reverb|sped up|lyrics only/i;

  for (const q of queries) {
    try {
      const r = await ytClient.get('/search', {
        params: {
          key:             YT_KEY,
          q,
          part:            'snippet',
          type:            'video',
          videoCategoryId: '10',   // Music
          maxResults:      5,
          videoEmbeddable: 'true',
        },
      });

      const items = r.data?.items || [];
      if (!items.length) continue;

      const best = items.find(i => !BAD.test(i.snippet.title)) || items[0];
      const result = {
        videoId:      best.id.videoId,
        ytTitle:      best.snippet.title,
        channelTitle: best.snippet.channelTitle,
        embedUrl:     `https://www.youtube.com/embed/${best.id.videoId}`,
        playerUrl:    `https://www.youtube.com/embed/${best.id.videoId}?autoplay=1&rel=0&modestbranding=1`,
      };

      cache.set(key, result, 43200); // 12 h
      console.log(`✅ YouTube: "${title}" → ${result.videoId}`);
      return result;

    } catch (e) {
      if (e.response?.status === 403) throw new Error('YouTube API quota exceeded or invalid API key');
      console.warn(`⚠️ YouTube query "${q}" failed: ${e.message}`);
    }
  }

  throw new Error(`YouTube: no results for "${title}" by "${artist}"`);
}

// ─── Combined Hybrid Search ───────────────────────────────────────────────────
async function hybridSearch(query) {
  const key    = `hybrid:v1:${query}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let mbData;
  try {
    mbData = await searchMusicBrainz(query);
  } catch (e) {
    console.warn(`⚠️ MusicBrainz failed, using raw query: ${e.message}`);
    mbData = { title: query, artist: '', album: '', year: '', coverArt: null, mbid: null };
  }

  const ytData = await searchYouTube(mbData.title, mbData.artist, mbData.album);
  const result = { ...mbData, ...ytData };

  cache.set(key, result, 21600); // 6 h
  return result;
}

// ─── Lightweight: enrich known song with YouTube videoId ─────────────────────
async function enrichWithYouTube(title, artist) {
  try {
    return await searchYouTube(title, artist);
  } catch (e) {
    console.warn(`⚠️ enrichWithYouTube failed for "${title}": ${e.message}`);
    return null;
  }
}

module.exports = { hybridSearch, enrichWithYouTube, searchMusicBrainz, searchYouTube };
