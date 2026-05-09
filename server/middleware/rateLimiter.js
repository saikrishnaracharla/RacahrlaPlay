/**
 * server/middleware/rateLimiter.js
 *
 * WHY rate-limit our own API:
 *  - Prevents a single client from accidentally hammering us (and by
 *    extension, the music APIs we proxy to)
 *  - Protects against abuse / bot scraping of our own endpoints
 *  - Reduces the risk of our IP getting banned by downstream APIs
 *    because our own rate limit kicks in first
 *
 * Limits chosen to be permissive for normal usage but block abuse:
 *  - Music search: 40 req/min (human max is ~5-10)
 *  - Auth: 10 req/min per IP (prevents brute-force)
 */
const rateLimit = require('express-rate-limit');

const musicLimiter = rateLimit({
  windowMs:         60 * 1000,  // 1 minute window
  max:              40,          // 40 requests per IP per minute
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health', // don't limit health checks
});

const authLimiter = rateLimit({
  windowMs:         60 * 1000,  // 1 minute window
  max:              10,          // 10 auth attempts per IP per minute
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many auth attempts. Try again in a minute.' },
});

const searchLimiter = rateLimit({
  windowMs:         1000,   // 1 second window
  max:              3,      // max 3 search requests per second (debounce enforced on client too)
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Search rate limit. Wait a moment.' },
});

module.exports = { musicLimiter, authLimiter, searchLimiter };
