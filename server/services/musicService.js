/**
 * server/services/musicService.js — ORCHESTRATOR
 *
 * Fallback Chain:
 *   1. saavn.sumit.co  → 320kbps full streams, Indian music (best quality)
 *   2. iTunes          → 30s previews, confirmed working, great Indian catalogue
 *   3. Deezer          → 30s previews, backup to iTunes
 *
 * If saavn is CF-blocked (happens after repeated requests), iTunes takes over
 * immediately — music ALWAYS loads.
 */
const saavn  = require('./saavnService');
const itunes = require('./itunesService');
const deezer = require('./deezerService');
const cache  = require('../cache/nodeCache');

const ALLOW_PREVIEW_FALLBACKS = process.env.ALLOW_PREVIEW_FALLBACKS === 'true';

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
    ['saavn', () => saavn.search(query, page, limit)],
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
  const genre = LANG_GENRE[lang] || lang;
  const chain = [
    ['saavn', () => saavn.trending(lang, limit)],
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
  // Only saavn has full song details — if blocked, return null gracefully
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
