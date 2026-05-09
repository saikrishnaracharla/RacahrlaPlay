require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const { connect, isConnected, lastError } = require('./db');
const musicRoutes  = require('./routes/music');
const authRoutes   = require('./routes/auth');
const saavnProxy   = require('./routes/saavnProxy');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authLimiter } = require('./middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (Vercel / Render / Railway) ───────────────────────────────────
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);
    // Allow all vercel.app subdomains (preview deploys)
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods:      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Connect DB on every cold start (cached for warm invocations) ──────────────
// WHY: Vercel serverless doesn't keep state between invocations.
//      This middleware ensures MongoDB is connected before any route runs.
app.use(async (req, res, next) => {
  if (!isConnected()) await connect();
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const connected = isConnected();
  res.json({
    status:   'ok',
    message:  '🎵 Racharlaplay API running',
    database: connected ? 'MongoDB Atlas ✅' : 'Disconnected ❌',
    dbError:  connected ? null : (lastError() || 'Unknown - check Vercel logs'),
    mongoUri: process.env.MONGODB_URI ? `set (${process.env.MONGODB_URI.slice(0, 30)}...)` : 'NOT SET ❌',
    node:     process.version,
    uptime:   Math.round(process.uptime()) + 's',
    env:      process.env.NODE_ENV || 'development',
    musicMode: 'full-song-saavn-fallback',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api',   musicRoutes);
app.use('/auth',  authLimiter, authRoutes);
// WHY /saavn: client routes /saavn/* here so the backend (with browser-like
// headers) forwards to saavn.sumit.co — bypassing Cloudflare that blocks
// requests originating from Vercel edge servers.
app.use('/saavn', saavnProxy);

// ── JioSaavn direct search endpoint ──────────────────────────────────────────
// WHY: Exposes our DES-decrypting jioSaavnDirect service over /jio/search
// so the client can call it directly for full songs without going through
// the full musicService chain.
const jio = require('./services/jioSaavnDirect');

app.get('/jio/search', async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });
  try {
    const data = await jio.search(query.trim(), +page, Math.min(+limit, 30));
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ success: true, total: data.total, page: +page, results: data.songs || [] });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message, results: [] });
  }
});

app.get('/jio/trending', async (req, res) => {
  const { query = 'bollywood top songs 2024', limit = 20 } = req.query;
  try {
    const songs = await jio.trending(query, Math.min(+limit, 30));
    res.setHeader('Cache-Control', 'public, max-age=180');
    res.json({ success: true, results: songs || [] });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message, results: [] });
  }
});


// ── YouTube audio endpoints ───────────────────────────────────────────────────
const { getYouTubeStream } = require('./services/youtubeService');
const ytdl = require('@distube/ytdl-core');

// GET /stream?q=Song+Title+Artist
// Returns { videoId, duration, title } — client uses videoId to play via /stream-proxy
app.get('/stream', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q (query) is required' });
  try {
    const data = await getYouTubeStream(q);
    // Build the proxy URL the client will use to stream audio
    const proxyUrl = `/stream-proxy?id=${encodeURIComponent(data.videoId)}`;
    res.setHeader('Cache-Control', 'public, max-age=43200'); // 12h (videoId stable)
    res.json({ success: true, ...data, streamUrl: proxyUrl });
  } catch (err) {
    console.error(`❌ /stream failed for "${q}": ${err.message}`);
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /stream-proxy?id=VIDEO_ID
// Pipes YouTube audio through our server so the client doesn't need CORS or stream URL hacks.
// Uses @distube/ytdl-core with headers that bypass bot detection.
app.get('/stream-proxy', async (req, res) => {
  const id = (req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id (videoId) is required' });

  try {
    const url  = `https://www.youtube.com/watch?v=${id}`;
    const opts = {
      quality: 'highestaudio',
      filter:  'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Cookie': '', // empty cookie — public videos don't need auth
        },
      },
    };

    // Set headers before piping
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = ytdl(url, opts);
    stream.on('error', (err) => {
      console.error(`❌ stream-proxy error for ${id}: ${err.message}`);
      if (!res.headersSent) res.status(502).json({ error: err.message });
    });
    stream.pipe(res);
  } catch (err) {
    console.error(`❌ /stream-proxy failed for ${id}: ${err.message}`);
    res.status(502).json({ error: err.message });
  }
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);



// ── Local dev server (NOT used by Vercel — Vercel uses module.exports) ────────
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    await connect();
    console.log(`\n🎵 Racharlaplay Server  → http://localhost:${PORT}`);
    console.log(`📡 Saavn API Base       : ${process.env.SAAVN_API_BASE}`);
    console.log(`🌍 Node                 : ${process.version}\n`);
  });
}

// ── Export for Vercel serverless ──────────────────────────────────────────────
module.exports = app;
