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


// ── YouTube audio stream endpoint ─────────────────────────────────────────────
// GET /stream?q=Song+Title+Artist
// Returns a full audio stream URL sourced from YouTube via ytdl-core.
// The browser plays this URL directly (Google CDN) — full songs, no 30s limit.
const { getYouTubeStream } = require('./services/youtubeService');

app.get('/stream', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q (query) is required' });
  try {
    const stream = await getYouTubeStream(q);
    res.setHeader('Cache-Control', 'public, max-age=14400'); // 4h
    res.json({ success: true, ...stream });
  } catch (err) {
    console.error(`❌ /stream failed for "${q}": ${err.message}`);
    res.status(502).json({ success: false, error: err.message });
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
