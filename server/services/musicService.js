/**
 * server/services/musicService.js — ORCHESTRATOR
 *
 * Fallback Chain (in order):
 *   1. jioSaavnDirect  → Calls JioSaavn's own internal API (api.php) with DES
 *                         decryption. Full 320kbps streams. No 3rd-party dep.
 *   2. saavn wrappers  → saavn.sumit.co / mirrors (if #1 fails for any reason)
 *   3. iTunes          → 30s previews (absolute last resort)
 *   4. Deezer          → 30s previews (last-last resort)
 *
 * WHY #1 first: The shared API wrappers get rate-limited/CF-blocked under load.
 * JioSaavn's own API has effectively unlimited capacity (it serves their website).
 */
const saavn   = require('./saavnService');
const jio     = require('./jioSaavnDirect');
const itunes  = require('./itunesService');
const deezer  = require('./deezerService');
const cache   = require('../cache/nodeCache');

// Only disable previews if explicitly set (default: allow as last resort)
const ALLOW_PREVIEW_FALLBACKS = process.env.DISABLE_PREVIEW_FALLBACKS !== 'true';

function hasSongs(r) {
  if (!r) return false;
  if (Array.isArray(r)) return r.length > 0;
  return (r.songs?.length > 0) || (r.results?.length > 0);
}

function toArray(r) {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  return r.songs || r.results || [];
}

async function tryChain(label, fns) {
  for (let i = 0; i < fns.length; i++) {
    const [name, fn] = fns[i];
    try {
      const result = await fn();
      if (hasSongs(result)) {
        console.log(`✅ [${label}] served by ${name}`);
        return result;
      }
      console.warn(`⚠️  [${label}] ${name} returned empty, trying next...`);
    } catch (err) {
      console.warn(`⚠️  [${label}] ${name} failed (${err.message}), trying next...`);
    }
  }
  console.error(`❌ [${label}] all sources failed`);
  return { total: 0, songs: [] };
}

// ─── Genre → iTunes/Deezer query map ────────────────────────────────────────
const LANG_GENRE = {
  hindi:     'bollywood', telugu: 'telugu film',
  tamil:     'kollywood',  punjabi: 'bhangra punjabi',
  kannada:   'sandalwood', malayalam: 'malayalam film',
};

async function search(query, page = 1, limit = 20) {
  const chain = [
    // PRIMARY: JioSaavn's own API with DES decryption → full 320kbps songs
    ['jio-direct', () => jio.search(query, page, limit)],
    // SECONDARY: 3rd-party Saavn wrappers (may be rate-limited)
    ['saavn-wrapper', () => saavn.search(query, page, limit)],
  ];

  if (ALLOW_PREVIEW_FALLBACKS) {
    chain.push(
      ['itunes-preview', () => itunes.search(query, limit)],
      ['deezer-preview', () => deezer.search(query, limit)],
    );
  }

  return tryChain(`search:${query}`, chain);
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
  const query = QUERIES[lang] || `${lang} trending songs 2024`;
  const genre = LANG_GENRE[lang] || lang;

  const chain = [
    // PRIMARY: JioSaavn direct
    ['jio-direct', () => jio.trending(query, limit)],
    // SECONDARY: 3rd-party wrapper
    ['saavn-wrapper', () => saavn.trending(lang, limit)],
  ];

  if (ALLOW_PREVIEW_FALLBACKS) {
    chain.push(
      ['itunes-preview', () => itunes.trending(genre, limit)],
      ['deezer-preview', () => deezer.trending(genre, limit)],
    );
  }

  return tryChain(`trending:${lang}`, chain);
}

async function song(id) {
  // Try JioSaavn direct first, then saavn wrapper
  try {
    const s = await jio.songById(id);
    if (s) return s;
  } catch {}
  try { return await saavn.song(id); }
  catch { return null; }
}

async function suggestions(id) {
  try { return await saavn.suggestions(id); }
  catch { return []; }
}

async function albums(query, limit = 10) {
  try { return await saavn.albums(query, limit); }
  catch { return []; }
}

function cacheStats() { return cache.stats(); }

module.exports = { search, trending, song, suggestions, albums, cacheStats, toArray };
