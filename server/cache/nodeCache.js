/**
 * server/cache/nodeCache.js
 *
 * WHY: In-memory cache with configurable TTL. Prevents hitting external APIs
 * repeatedly. Same query served from RAM in <1ms instead of waiting 800ms+
 * for a network round-trip. Stops Cloudflare from seeing repeated identical
 * requests from our IP (the #1 trigger for rate-limit bans).
 */
const NodeCache = require('node-cache');

// stdTTL: default 1 hour — search results rarely change faster than that
// checkperiod: background sweep every 10 min to free expired memory
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600, useClones: false });

const TTLS = {
  SEARCH:   3600,   //  1 hour — search results
  TRENDING: 7200,   //  2 hours — trending lists change slowly
  ALBUM:    86400,  // 24 hours — album metadata never changes
  SONG:     86400,  // 24 hours — song metadata & stream URL
  SUGGEST:  1800,   // 30 min  — suggestions
};

module.exports = {
  get:  (key)        => cache.get(key),
  set:  (key, val, ttl) => cache.set(key, val, ttl || TTLS.SEARCH),
  del:  (key)        => cache.del(key),
  flush:()           => cache.flushAll(),
  stats:()           => cache.getStats(),
  TTLS,

  /** Wrap an async fn with cache-aside pattern */
  async wrap(key, fn, ttl) {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const result = await fn();
    if (result !== null && result !== undefined) cache.set(key, result, ttl || TTLS.SEARCH);
    return result;
  },
};
