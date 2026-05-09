/**
 * server/routes/auth.js — MongoDB / Mongoose version
 */
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { isConnected } = require('../db');
const User     = require('../models/User');
const Playlist = require('../models/Playlist');
const LikedSong= require('../models/LikedSong');
const History  = require('../models/History');

const SECRET  = process.env.JWT_SECRET     || 'racharlaplay_secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const COLORS  = ['#1DB954','#f472b6','#fbbf24','#60a5fa','#a78bfa','#fb923c','#34d399'];
const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// ── JWT middleware ─────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
module.exports.authMiddleware = auth;

// DB guard — returns 503 if MongoDB not connected
function dbGuard(req, res, next) {
  if (!isConnected()) return res.status(503).json({ error: 'Database unavailable. Please try again.' });
  next();
}

// ── GET /auth/status ──────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const ok = isConnected();
  res.json({
    dbAvailable: ok,
    mode:        ok ? 'mongodb' : 'disconnected',
    message:     ok ? 'Auth ready (MongoDB Atlas)' : 'Database not connected',
  });
});

// ── POST /auth/register ────────────────────────────────────────────────────────
router.post('/register', dbGuard, async (req, res) => {
  const { username, email, password } = req.body;
  if (!username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash         = await bcrypt.hash(password, 10);
    const avatar_color = randColor();

    const user = await User.create({
      username:     username.trim(),
      email:        email.trim().toLowerCase(),
      password_hash: hash,
      avatar_color,
    });

    // Auto-create "My Favorites" playlist for new user
    await Playlist.create({ userId: user._id, name: 'My Favorites', songs: [] });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, avatar_color: user.avatar_color },
      SECRET, { expiresIn: EXPIRES }
    );

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email, avatar_color: user.avatar_color },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.email ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already taken` });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// ── POST /auth/login ───────────────────────────────────────────────────────────
router.post('/login', dbGuard, async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, avatar_color: user.avatar_color },
      SECRET, { expiresIn: EXPIRES }
    );
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, avatar_color: user.avatar_color },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ── GET /auth/me ───────────────────────────────────────────────────────────────
router.get('/me', auth, dbGuard, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { ...user, id: user._id } });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /auth/playlists ────────────────────────────────────────────────────────
router.get('/playlists', auth, dbGuard, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user.id }).sort({ created_at: 1 }).lean();
    res.json({ playlists: playlists.map(pl => ({ ...pl, id: pl._id })) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// ── POST /auth/playlists ───────────────────────────────────────────────────────
router.post('/playlists', auth, dbGuard, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  try {
    const pl = await Playlist.create({ userId: req.user.id, name: name.trim(), songs: [] });
    res.status(201).json({ playlist: { id: pl._id, name: pl.name, songs: [] } });
  } catch {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// ── POST /auth/playlists/:id/songs ────────────────────────────────────────────
router.post('/playlists/:id/songs', auth, dbGuard, async (req, res) => {
  const { song } = req.body;
  if (!song?.id) return res.status(400).json({ error: 'song data required' });
  try {
    // Only add if not already in playlist (by song.id)
    await Playlist.updateOne(
      { _id: req.params.id, userId: req.user.id, 'songs.id': { $ne: song.id } },
      { $push: { songs: {
        id: song.id, title: song.title, artist: song.artist,
        image: song.image, streamUrl: song.streamUrl, duration: song.duration, source: song.source,
      }}}
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// ── DELETE /auth/playlists/:id/songs/:songId ──────────────────────────────────
router.delete('/playlists/:id/songs/:songId', auth, dbGuard, async (req, res) => {
  try {
    await Playlist.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $pull: { songs: { id: req.params.songId } } }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove song' });
  }
});

// ── DELETE /auth/playlists/:id ────────────────────────────────────────────────
router.delete('/playlists/:id', auth, dbGuard, async (req, res) => {
  try {
    await Playlist.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// ── GET /auth/likes ───────────────────────────────────────────────────────────
router.get('/likes', auth, dbGuard, async (req, res) => {
  try {
    const likes = await LikedSong.find({ userId: req.user.id }).sort({ likedAt: -1 }).lean();
    res.json({ likes: likes.map(l => ({ id: l.songId, title: l.title, artist: l.artist, image: l.image, streamUrl: l.streamUrl, source: l.source })) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// ── POST /auth/likes/:songId — toggle like ────────────────────────────────────
router.post('/likes/:songId', auth, dbGuard, async (req, res) => {
  const { song } = req.body;
  try {
    const existing = await LikedSong.findOne({ userId: req.user.id, songId: req.params.songId });
    if (existing) {
      await LikedSong.deleteOne({ _id: existing._id });
      return res.json({ liked: false });
    }
    await LikedSong.create({
      userId:    req.user.id,
      songId:    req.params.songId,
      title:     song?.title,
      artist:    song?.artist,
      image:     song?.image,
      streamUrl: song?.streamUrl,
      source:    song?.source,
    });
    res.json({ liked: true });
  } catch (err) {
    console.error('Toggle like error:', err.message);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ── POST /auth/history ────────────────────────────────────────────────────────
router.post('/history', auth, dbGuard, async (req, res) => {
  const { song } = req.body;
  if (!song?.id) return res.status(400).json({ error: 'song required' });
  try {
    await History.create({
      userId: req.user.id, songId: song.id,
      title:  song.title, artist: song.artist, image: song.image,
      streamUrl: song.streamUrl, source: song.source,
    });
    // Keep only 50 most recent per user
    const all = await History.find({ userId: req.user.id }).sort({ playedAt: -1 }).skip(50).select('_id');
    if (all.length) await History.deleteMany({ _id: { $in: all.map(h => h._id) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to record history' });
  }
});

// ── GET /auth/history ─────────────────────────────────────────────────────────
router.get('/history', auth, dbGuard, async (req, res) => {
  try {
    // Deduplicate by songId — last played wins
    const history = await History
      .find({ userId: req.user.id })
      .sort({ playedAt: -1 })
      .limit(100)
      .lean();

    // Deduplicate by songId client-side
    const seen = new Set();
    const unique = history.filter(h => {
      if (seen.has(h.songId)) return false;
      seen.add(h.songId);
      return true;
    }).slice(0, 20);

    res.json({ history: unique.map(h => ({ id: h.songId, title: h.title, artist: h.artist, image: h.image, streamUrl: h.streamUrl, source: h.source })) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
