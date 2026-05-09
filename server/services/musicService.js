/**
 * server/services/musicService.js — ORCHESTRATOR (Saavn-only, no previews)
 *
 * Backend source chain — ALL return full JioSaavn songs:
 *   1. jioSaavnDirect → jiosaavn.com/api.php + DES (works if Vercel IP not geo-blocked)
 *   2. saavnService   → saavn.sumit.co + mirrors including saavn.dev
 *
 * NOTE: The primary music source is actually the CLIENT-SIDE saavn.dev call
 * (see client/src/services/api.js). This backend chain is only used when the
 * browser-direct calls to saavn.dev fail (e.g. CORS issues on some browsers).
 *
 * iTunes / Deezer are completely removed — they only give 30s previews.
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
  console.error(`❌ [${label}] all backend Saavn sources failed`);
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
