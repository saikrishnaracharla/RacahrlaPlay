/**
 * server/utils/httpClient.js
 *
 * WHY: A shared, pre-configured Axios instance with full browser-like headers.
 * Cloudflare inspects User-Agent, Referer, Accept-Language, and sec-fetch-*
 * headers. Missing any of them flags the request as bot traffic.
 * Using a single shared instance also enables keep-alive connection pooling
 * which reduces TCP handshake overhead on every request.
 */
const axios = require('axios');
const https = require('https');

// Keep-alive agent reuses TCP connections → faster, looks like real browser
const agent = new https.Agent({
  keepAlive: true,
  timeout: 20000,
});

// Rotate user-agent strings to look less like a single bot
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Build a browser-mimicking Axios instance for a given base URL.
 * WHY: Each service (saavn, deezer, audius) needs its own baseURL but
 * shares the same header strategy.
 */
function buildClient(baseURL, referer = 'https://www.google.com/') {
  return axios.create({
    baseURL,
    timeout: 18000,
    httpsAgent: agent,
    headers: {
      'User-Agent':      randomUA(),
      'Accept':          'application/json, text/plain, */*',
      'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer':         referer,
      'Origin':          new URL(referer).origin,
      'sec-ch-ua':       '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile':'?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest':  'empty',
      'sec-fetch-mode':  'cors',
      'sec-fetch-site':  'cross-site',
      'Cache-Control':   'no-cache',
      'Pragma':          'no-cache',
    },
  });
}

module.exports = { buildClient, randomUA };
