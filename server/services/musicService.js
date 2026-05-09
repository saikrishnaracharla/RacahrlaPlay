/**
 * server/services/musicService.js — ORCHESTRATOR (Saavn-only)
 *
 * Source chain — ALL return full JioSaavn songs (no 30s previews):
 *   1. jioSaavnDirect → Calls jiosaavn.com/api.php + DES decryption (PRIMARY)
 *                        Full 320kbps streams, no 3rd-party dependency.
 *   2. saavnService   → saavn.sumit.co wrapper (FALLBACK if #1 fails)
 *
 * iTunes / Deezer are COMPLETELY REMOVED — they only give 30s previews.
 * If both Saavn sources fail, return empty results (better than playing wrong content).
 */
const jio   = require('./jioSaavnDirect');
const saavn = require('./saavnService');
const cache = require('../cache/nodeCache');

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  for (const [name, fn] of fns) {
    try {
      const result = await fn();
      if (hasSongs(result)) {
        console.log(`✅ [${label}] served by ${name}`);
        return result;
      }
      console.warn(`⚠️  [${label}] ${name} returned empty`);
    } catch (err) {
      console.warn(`⚠️  [${label}] ${name} failed: ${err.message}`);
    }
  }
  console.error(`❌ [${label}] all Saavn sources failed — returning empty`);
  return { total: 0, songs: [], results: [] };
}

// ── Trending query map ────────────────────────────────────────────────────────
const TRENDING_QUERIES = {
  hindi:     'bollywood hits 2024 arijit singh',
  telugu:    'telugu hits 2024 pushpa allu arjun',
  tamil:     'tamil hits 2024 anirudh',
  malayalam: 'malayalam hits 2024',
  kannada:   'kannada hits 2024 yash',
  punjabi:   'punjabi hits 2024 diljit dosanjh',
};

// ── Public API ────────────────────────────────────────────────────────────────

async function search(query, page = 1, limit = 20) {
  return tryChain(`search:${query}`, [
    ['jio-direct',    () => jio.search(query, page, limit)],
    ['saavn-wrapper', () => saavn.search(query, page, limit)],
  ]);
}

async function trending(lang = 'hindi', limit = 20) {
  const query = TRENDING_QUERIES[lang] || `${lang} hits 2024`;
  return tryChain(`trending:${lang}`, [
    ['jio-direct',    () => jio.trending(query, limit)],
    ['saavn-wrapper', () => saavn.trending(lang, limit)],
  ]);
}

async function song(id) {
  try {
    const s = await jio.songById(id);
    if (s) return s;
  } catch (e) {
    console.warn(`⚠️  jio.songById(${id}) failed: ${e.message}`);
  }
  try {
    return await saavn.song(id);
  } catch (e) {
    console.warn(`⚠️  saavn.song(${id}) failed: ${e.message}`);
    return null;
  }
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
