/**
 * server/services/saavnService.js
 *
 * WHY: Isolating saavn.sumit.co calls into a service means:
 *  - Clean separation from controller logic
 *  - Cache-aside applied at service level (not in routes)
 *  - Retry logic with exponential backoff in ONE place
 *  - Easy to mock in tests
 *
 * CF-BYPASS STRATEGY: We queue requests so we never send >1 concurrent
 * request to saavn. Cloudflare's heuristic watches request velocity.
 * A single sequential client looks like a human browsing, not a scraper.
 */
const { buildClient } = require('../utils/httpClient');
const { fromSaavn, fromLegacySaavn } = require('../utils/songNormalizer');
const cache           = require('../cache/nodeCache');

const BASE = process.env.SAAVN_API_BASE || 'https://saavn.sumit.co/api';
const client = buildClient(BASE, 'https://www.jiosaavn.com/');
client.defaults.timeout = 8000; // fail fast → triggers fallback sooner

const LEGACY_BASE = process.env.SAAVN_LEGACY_API_BASE || 'https://jiosaavn-api.vercel.app';
const legacyClient = buildClient(LEGACY_BASE, 'https://www.jiosaavn.com/');
legacyClient.defaults.timeout = 12000;

// ── Simple request queue — serialises calls to one at a time ─────────────────
// WHY: Parallel requests from same IP trigger CF rate-limit instantly.
// Sequential requests with gaps look human-like.
let _queue = Promise.resolve();
function enqueue(fn) {
  _queue = _queue.then(() => fn()).catch(() => null);
  return _queue;
}

const DELAY_BETWEEN = 600; // ms between successive API calls
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function saavnGet(url, params = {}, retries = 1) {
  return enqueue(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        const r = await client.get(url, { params });
        await sleep(DELAY_BETWEEN);
        return r.data;
      } catch (err) {
        const status = err.response?.status;
        if (status === 429 || status === 403 || err.code === 'ERR_CF_1027') {
          // CF block — no point retrying, skip to fallback immediately
          console.warn(`⚠️  Saavn CF blocked (${status}) — skipping to fallback`);
          throw err;
        } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          throw err;
        } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          console.warn(`⚠️  Saavn timeout — skipping to fallback`);
          throw err;
        } else if (i < retries) {
          await sleep(2000);
        } else {
          throw err;
        }
      }
    }
    return null;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function legacyGet(url, params = {}) {
  const r = await legacyClient.get(url, { params });
  if (r.data?.status === false) throw new Error(r.data?.message || 'Legacy Saavn error');
  return r.data;
}

async function legacySong(id) {
  const data = await legacyGet('/song', { id });
  return fromLegacySaavn(data);
}

async function legacySearch(query, limit = 20) {
  const data = await legacyGet('/search', { query });
  const results = (data?.results || []).slice(0, limit);
  const songs = [];

  for (const item of results) {
    try {
      const song = await legacySong(item.id);
      if (song) songs.push(song);
    } catch (err) {
      console.warn(`Legacy Saavn song failed (${item.id}): ${err.message}`);
    }
  }

  return { total: data?.results?.length || songs.length, songs };
}

async function search(query, page = 1, limit = 20) {
  const key = `saavn:search:${query}:${page}:${limit}`;
  return cache.wrap(key, async () => {
    try {
      const data = await saavnGet('/search/songs', { query, page, limit });
      const songs = (data?.data?.results || []).map(fromSaavn).filter(Boolean);
      if (songs.length) return { total: data?.data?.total || songs.length, songs };
    } catch (err) {
      console.warn(`Primary Saavn search failed (${err.message}), trying legacy full-song API`);
    }

    return legacySearch(query, limit);
  }, cache.TTLS.SEARCH);
}

async function trending(lang = 'hindi', limit = 20) {
  const QUERIES = {
    hindi:     'bollywood top songs 2024 arijit singh',
    telugu:    'telugu blockbuster 2024 pushpa allu arjun',
    tamil:     'kollywood superhit 2024 anirudh',
    malayalam: 'malayalam superhit 2024',
    kannada:   'kannada sandalwood 2024 yash',
    punjabi:   'punjabi top 2024 diljit dosanjh',
  };
  const q   = QUERIES[lang] || `${lang} trending songs 2024`;
  const key = `saavn:trending:${lang}:${limit}`;
  return cache.wrap(key, async () => {
    try {
      const data = await saavnGet('/search/songs', { query: q, page: 1, limit });
      const songs = (data?.data?.results || []).map(fromSaavn).filter(Boolean);
      if (songs.length) return songs;
    } catch (err) {
      console.warn(`Primary Saavn trending failed (${err.message}), trying legacy full-song API`);
    }

    return (await legacySearch(q, limit)).songs;
  }, cache.TTLS.TRENDING);
}

async function song(id) {
  const key = `saavn:song:${id}`;
  return cache.wrap(key, async () => {
    try {
      const data = await saavnGet(`/songs/${id}`);
      const raw  = data?.data;
      const s    = Array.isArray(raw) ? raw[0] : raw;
      const song = fromSaavn(s);
      if (song) return song;
    } catch (err) {
      console.warn(`Primary Saavn song failed (${err.message}), trying legacy full-song API`);
    }

    return legacySong(id);
  }, cache.TTLS.SONG);
}

async function suggestions(id, limit = 10) {
  const key = `saavn:suggest:${id}`;
  return cache.wrap(key, async () => {
    const data = await saavnGet(`/songs/${id}/suggestions`);
    return (data?.data || []).map(fromSaavn).filter(Boolean).slice(0, limit);
  }, cache.TTLS.SUGGEST);
}

async function albums(query, limit = 10) {
  const key = `saavn:albums:${query}:${limit}`;
  return cache.wrap(key, async () => {
    const data = await saavnGet('/search/albums', { query, limit });
    return data?.data?.results || [];
  }, cache.TTLS.ALBUM);
}

module.exports = { search, trending, song, suggestions, albums };
