import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const API_BASE = process.env.MUSIC_API_BASE;
const API_KEY = process.env.MUSIC_API_KEY || '';
const AUTH_HEADER = process.env.MUSIC_API_AUTH_HEADER || '';
const SEARCH_QUERY = process.env.MUSIC_API_SEARCH_QUERY || 'kesariya';
const SAMPLE_TRACK_ID = process.env.MUSIC_API_TRACK_ID || '';
const SAMPLE_ALBUM_ID = process.env.MUSIC_API_ALBUM_ID || '';
const SAMPLE_PLAYLIST_ID = process.env.MUSIC_API_PLAYLIST_ID || '';
const CONCURRENCY = Number(process.env.MUSIC_API_CONCURRENCY || 8);
const STABILITY_ROUNDS = Number(process.env.MUSIC_API_STABILITY_ROUNDS || 24);

if (!API_BASE) {
  console.error('Missing MUSIC_API_BASE. Example: $env:MUSIC_API_BASE="https://api.example.com"');
  process.exit(1);
}

const base = API_BASE.replace(/\/+$/, '');
const headers = {
  Accept: 'application/json',
  'User-Agent': 'RacharlaPlay-Audit/1.0',
};

if (AUTH_HEADER && API_KEY) headers[AUTH_HEADER] = API_KEY;
else if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

const candidates = [
  { name: 'search:q', path: `/search?q=${encodeURIComponent(SEARCH_QUERY)}` },
  { name: 'search:query', path: `/search?query=${encodeURIComponent(SEARCH_QUERY)}` },
  { name: 'track', path: SAMPLE_TRACK_ID ? `/track/${encodeURIComponent(SAMPLE_TRACK_ID)}` : '/track' },
  { name: 'audio-features', path: SAMPLE_TRACK_ID ? `/audio-features/${encodeURIComponent(SAMPLE_TRACK_ID)}` : '/audio-features' },
  { name: 'platforms', path: '/platforms' },
  { name: 'albums', path: SAMPLE_ALBUM_ID ? `/albums/${encodeURIComponent(SAMPLE_ALBUM_ID)}` : `/albums?query=${encodeURIComponent(SEARCH_QUERY)}` },
  { name: 'playlists', path: SAMPLE_PLAYLIST_ID ? `/playlists/${encodeURIComponent(SAMPLE_PLAYLIST_ID)}` : `/playlists?query=${encodeURIComponent(SEARCH_QUERY)}` },
];

function looksLikeJson(contentType = '') {
  return contentType.includes('application/json') || contentType.includes('+json');
}

function flatten(value, prefix = '', out = {}) {
  if (Array.isArray(value)) {
    value.slice(0, 3).forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      flatten(nested, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = value;
  return out;
}

function includesAny(flat, names) {
  const keys = Object.keys(flat).map(k => k.toLowerCase());
  return names.some(name => keys.some(k => k.endsWith(name) || k.includes(`.${name}`) || k.includes(name)));
}

function findValues(flat, patterns) {
  return Object.entries(flat)
    .filter(([key, value]) => {
      const k = key.toLowerCase();
      return patterns.some(pattern => k.includes(pattern)) && typeof value === 'string' && value;
    })
    .map(([key, value]) => ({ key, value }))
    .slice(0, 10);
}

function detectDataQuality(json) {
  const flat = flatten(json);
  const directUrls = findValues(flat, ['stream', 'media_url', 'mediaurl', 'download', 'preview', 'audio', 'mp3', 'm4a', 'aac']);
  const platformLinks = findValues(flat, ['spotify', 'deezer', 'youtube', 'soundcloud', 'platform', 'external']);

  return {
    hasTitle: includesAny(flat, ['title', 'name', 'song', 'trackname']),
    hasArtist: includesAny(flat, ['artist', 'artists', 'singer', 'singers']),
    hasAlbum: includesAny(flat, ['album', 'albumname']),
    hasAlbumArt: includesAny(flat, ['image', 'images', 'artwork', 'cover', 'albumart']),
    hasIsrc: includesAny(flat, ['isrc']),
    hasTrackId: includesAny(flat, ['id', 'trackid', 'track_id']),
    hasDuration: includesAny(flat, ['duration', 'duration_ms', 'durationms']),
    hasPopularity: includesAny(flat, ['popularity', 'rank', 'playcount', 'play_count']),
    hasAudioFeatures: includesAny(flat, ['danceability', 'energy', 'tempo', 'valence', 'acousticness', 'instrumentalness']),
    directUrls,
    platformLinks,
  };
}

async function timedFetch(url, init = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init.headers || {}) },
      redirect: 'follow',
    });
    const elapsedMs = Math.round(performance.now() - started);
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let json = null;
    if (looksLikeJson(contentType)) {
      try { json = JSON.parse(text); } catch {}
    }
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      contentType,
      cors: {
        allowOrigin: response.headers.get('access-control-allow-origin'),
        allowMethods: response.headers.get('access-control-allow-methods'),
        allowHeaders: response.headers.get('access-control-allow-headers'),
      },
      bytes: text.length,
      json,
      sample: json ? undefined : text.slice(0, 300),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Math.round(performance.now() - started),
      error: error.message,
    };
  }
}

async function testEndpoint(endpoint) {
  const url = `${base}${endpoint.path}`;
  const get = await timedFetch(url);
  const options = await timedFetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': AUTH_HEADER || (API_KEY ? 'authorization' : 'content-type'),
    },
  });

  return {
    ...endpoint,
    url,
    get,
    options,
    quality: get.json ? detectDataQuality(get.json) : null,
  };
}

async function stabilityProbe(path) {
  const url = `${base}${path}`;
  const batches = [];
  let blocked = 0;
  let rateLimited = 0;
  let failed = 0;

  for (let i = 0; i < STABILITY_ROUNDS; i += CONCURRENCY) {
    const count = Math.min(CONCURRENCY, STABILITY_ROUNDS - i);
    const results = await Promise.all(Array.from({ length: count }, () => timedFetch(url)));
    for (const result of results) {
      if (result.status === 403 || result.status === 1020) blocked += 1;
      if (result.status === 429) rateLimited += 1;
      if (!result.ok) failed += 1;
    }
    batches.push(...results.map(({ status, elapsedMs, ok, error }) => ({ status, elapsedMs, ok, error })));
  }

  const latencies = batches.map(r => r.elapsedMs).sort((a, b) => a - b);
  const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] || 0;
  return {
    rounds: STABILITY_ROUNDS,
    concurrency: CONCURRENCY,
    failed,
    blocked,
    rateLimited,
    p95Ms: p95,
    statuses: batches.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

const endpointResults = [];
for (const endpoint of candidates) {
  endpointResults.push(await testEndpoint(endpoint));
}

const firstWorking = endpointResults.find(r => r.get.ok)?.path || candidates[0].path;
const stability = await stabilityProbe(firstWorking);

const report = {
  generatedAt: new Date().toISOString(),
  apiBase: base,
  searchQuery: SEARCH_QUERY,
  endpointResults,
  stability,
  summary: {
    workingEndpoints: endpointResults.filter(r => r.get.ok).map(r => r.name),
    brokenEndpoints: endpointResults.filter(r => !r.get.ok).map(r => ({ name: r.name, status: r.get.status, error: r.get.error })),
    hasPlayableDirectAudio: endpointResults.some(r => r.quality?.directUrls?.some(u => /\.(mp3|m4a|aac|mp4)(\?|$)/i.test(u.value))),
    hasOnlyPlatformLinks: endpointResults.some(r => r.quality?.platformLinks?.length) &&
      !endpointResults.some(r => r.quality?.directUrls?.some(u => /\.(mp3|m4a|aac|mp4)(\?|$)/i.test(u.value))),
  },
};

await writeFile('music-api-audit-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
