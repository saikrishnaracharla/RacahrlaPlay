require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const musicRoutes = require('./routes/music');
const authRoutes  = require('./routes/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authLimiter } = require('./middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security: trust proxy for rate-limiter when deployed on Render/Railway ────
app.set('trust proxy', 1);

// ── CORS — allow Vercel deploy + local dev ────────────────────────────────────
const ALLOWED = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // e.g. https://racharlaplay.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods:      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
}));

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Health check (no auth, no rate limit) ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    message: '🎵 Racharlaplay API running',
    node:    process.version,
    uptime:  Math.round(process.uptime()) + 's',
    env:     process.env.NODE_ENV || 'development',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api',  musicRoutes);
app.use('/auth', authLimiter, authRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🎵 Racharlaplay Server  → http://localhost:${PORT}`);
  console.log(`📡 Saavn API Base       : ${process.env.SAAVN_API_BASE}`);
  console.log(`💾 DB                   : ${process.env.MYSQL_DATABASE}@${process.env.MYSQL_HOST}`);
  console.log(`🌍 Node                 : ${process.version}\n`);
});

module.exports = app;
