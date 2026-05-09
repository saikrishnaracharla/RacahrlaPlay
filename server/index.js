require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const { connect, isConnected } = require('./db');
const musicRoutes = require('./routes/music');
const authRoutes  = require('./routes/auth');
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
  res.json({
    status:   'ok',
    message:  '🎵 Racharlaplay API running',
    database: isConnected() ? 'MongoDB Atlas ✅' : 'Disconnected ❌',
    node:     process.version,
    uptime:   Math.round(process.uptime()) + 's',
    env:      process.env.NODE_ENV || 'development',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api',  musicRoutes);
app.use('/auth', authLimiter, authRoutes);

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
