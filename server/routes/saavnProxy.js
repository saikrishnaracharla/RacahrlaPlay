/**
 * server/routes/saavnProxy.js
 *
 * WHY this exists:
 *  - Client's Vercel edge rewrite (/saavn/* → saavn.sumit.co) makes the
 *    request from Vercel's server IPs, which Cloudflare detects as bot traffic
 *    and returns 403 / CF challenge pages.
 *  - This Express route makes the same request BUT uses the pre-configured
 *    httpClient that adds full browser-like headers (User-Agent, Referer,
 *    sec-fetch-*, etc.) which satisfies Cloudflare's heuristic checks.
 *  - Additionally, the sequential request queue in saavnService already
 *    throttles calls to look human-like.
 *
 * Usage: client calls /saavn/search/songs?... → this proxy forwards it
 *        to https://saavn.sumit.co/api/search/songs?...
 */

const express = require('express');
const router  = express.Router();
const { buildClient } = require('../utils/httpClient');

// Multiple Saavn API mirrors — tried in order until one responds
const SAAVN_MIRRORS = [
  process.env.SAAVN_API_BASE || 'https://saavn.sumit.co/api',
  'https://saavn.dev/api',
  'https://jiosaavn-api-privatechal.vercel.app/api',
];

// Build one client per mirror
const mirrorClients = SAAVN_MIRRORS.map(base =>
  buildClient(base, 'https://www.jiosaavn.com/')
);

/**
 * Proxy ALL /saavn/* requests to saavn API mirrors.
 * Tries each mirror in order; returns first successful response.
 */
router.all('/*', async (req, res) => {
  // Strip the leading /saavn prefix to get the actual API path
  const apiPath = req.path; // already stripped by express mount
  const params  = req.query;

  let lastError = null;

  for (let i = 0; i < mirrorClients.length; i++) {
    const client = mirrorClients[i];
    const mirror = SAAVN_MIRRORS[i];
    try {
      const response = await client.get(apiPath, {
        params,
        timeout: 10000,
        // Forward response as-is (don't transform)
        responseType: 'json',
      });

      // Attach CORS header so browser accepts it
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=120'); // 2-min cache
      return res.json(response.data);

    } catch (err) {
      const status = err.response?.status;
      lastError = err;
      console.warn(`⚠️  Saavn proxy mirror[${i}] (${mirror}) failed: ${status || err.message}`);

      // CF hard-block — try next mirror immediately
      if (status === 403 || status === 429 || status === 503) continue;
      // Network error — try next mirror
      if (!err.response) continue;
      // Other 4xx (bad request etc.) — don't bother retrying
      break;
    }
  }

  console.error('❌ All Saavn proxy mirrors failed:', lastError?.message);
  res.status(502).json({
    error: 'Music API temporarily unavailable',
    detail: lastError?.message,
  });
});

module.exports = router;
