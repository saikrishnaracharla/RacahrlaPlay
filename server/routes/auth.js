const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const mem      = require('../memStore');

const SECRET   = process.env.JWT_SECRET     || 'racharlaplay_secret';
const EXPIRES  = process.env.JWT_EXPIRES_IN || '7d';
const COLORS   = ['#1DB954','#f472b6','#fbbf24','#60a5fa','#a78bfa','#fb923c','#34d399'];
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

// ── GET /auth/status ──────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    dbAvailable: db.available,
    mode: db.available ? 'mysql' : 'memory',
    message: db.available
      ? 'Auth ready (MySQL)'
      : 'Auth ready (in-memory — data resets on server restart)',
  });
});

// ── POST /auth/register ────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hash         = await bcrypt.hash(password, 10);
  const avatar_color = randColor();

  try {
    if (db.available) {
      // ── MySQL path ──
      const [result] = await db.execute(
        'INSERT INTO users (username, email, password_hash, avatar_color) VALUES (?,?,?,?)',
        [username.trim(), email.trim().toLowerCase(), hash, avatar_color]
      );
      const userId = result.insertId;
      const likedId = require('crypto').randomUUID();
      await db.execute('INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)', [likedId, userId, 'Liked Songs']);
      const token = jwt.sign({ id: userId, username: username.trim(), email: email.trim().toLowerCase(), avatar_color }, SECRET, { expiresIn: EXPIRES });
      return res.status(201).json({ token, user: { id: userId, username: username.trim(), email: email.trim().toLowerCase(), avatar_color } });
    } else {
      // ── In-memory path ──
      const existing = await mem.findByEmail(email.trim());
      if (existing) return res.status(409).json({ error: 'That email is already taken' });
      const user  = await mem.createUser(username.trim(), email.trim(), hash, avatar_color);
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email, avatar_color }, SECRET, { expiresIn: EXPIRES });
      return res.status(201).json({
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar_color },
        warning: 'Using in-memory store — data will reset on server restart. Configure MySQL for persistence.',
      });
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.message.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already taken` });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// ── POST /auth/login ───────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    let user;
    if (db.available) {
      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      user = rows[0] || null;
    } else {
      user = await mem.findByEmail(email.trim());
    }
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, avatar_color: user.avatar_color },
      SECRET, { expiresIn: EXPIRES }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar_color: user.avatar_color } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ── GET /auth/me ───────────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    let user;
    if (db.available) {
      const [rows] = await db.execute('SELECT id, username, email, avatar_color, created_at FROM users WHERE id = ?', [req.user.id]);
      user = rows[0] || null;
    } else {
      user = await mem.findById(req.user.id);
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /auth/playlists ────────────────────────────────────────────────────────
router.get('/playlists', auth, async (req, res) => {
  try {
    if (db.available) {
      const [playlists] = await db.execute('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
      for (const pl of playlists) {
        const [songs] = await db.execute('SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC', [pl.id]);
        pl.songs = songs.map(s => ({ id: s.song_id, title: s.song_title, artist: s.song_artist, image: s.song_image }));
      }
      return res.json({ playlists });
    }
    // In-memory: playlists stored by userId
    const playlists = mem.getPlaylists(req.user.id);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// ── POST /auth/playlists ───────────────────────────────────────────────────────
router.post('/playlists', auth, async (req, res) => {
  const { name, id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const plId = id || require('crypto').randomUUID();
  try {
    if (db.available) {
      await db.execute('INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)', [plId, req.user.id, name]);
    } else {
      mem.addPlaylist(req.user.id, { id: plId, name, songs: [], created_at: new Date() });
    }
    res.status(201).json({ playlist: { id: plId, name, songs: [] } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// ── POST /auth/playlists/:id/songs ────────────────────────────────────────────
router.post('/playlists/:id/songs', auth, async (req, res) => {
  const { song } = req.body;
  if (!song?.id) return res.status(400).json({ error: 'song data required' });
  try {
    if (db.available) {
      const [[pos]] = await db.execute('SELECT IFNULL(MAX(position),0)+1 AS next FROM playlist_songs WHERE playlist_id=?', [req.params.id]);
      await db.execute(
        'INSERT IGNORE INTO playlist_songs (playlist_id, song_id, song_title, song_artist, song_image, position) VALUES (?,?,?,?,?,?)',
        [req.params.id, song.id, song.title, song.artist, song.image, pos.next]
      );
    } else {
      const playlists = mem.getPlaylists(req.user.id);
      const pl = playlists.find(p => p.id === req.params.id);
      if (pl && !pl.songs.find(s => s.id === song.id)) pl.songs.push({ id: song.id, title: song.title, artist: song.artist, image: song.image });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// ── DELETE /auth/playlists/:id/songs/:songId ──────────────────────────────────
router.delete('/playlists/:id/songs/:songId', auth, async (req, res) => {
  try {
    if (db.available) {
      await db.execute('DELETE FROM playlist_songs WHERE playlist_id=? AND song_id=?', [req.params.id, req.params.songId]);
    } else {
      const pl = mem.getPlaylists(req.user.id).find(p => p.id === req.params.id);
      if (pl) pl.songs = pl.songs.filter(s => s.id !== req.params.songId);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to remove song' }); }
});

// ── DELETE /auth/playlists/:id ────────────────────────────────────────────────
router.delete('/playlists/:id', auth, async (req, res) => {
  try {
    if (db.available) await db.execute('DELETE FROM playlists WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    else mem.deletePlaylist(req.user.id, req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete playlist' }); }
});

// ── GET /auth/likes ───────────────────────────────────────────────────────────
router.get('/likes', auth, async (req, res) => {
  try {
    if (db.available) {
      const [rows] = await db.execute('SELECT * FROM liked_songs WHERE user_id=? ORDER BY liked_at DESC', [req.user.id]);
      return res.json({ likes: rows.map(r => ({ id: r.song_id, title: r.song_title, artist: r.song_artist, image: r.song_image })) });
    }
    res.json({ likes: [] });
  } catch { res.status(500).json({ error: 'Failed to fetch likes' }); }
});

// ── POST /auth/likes/:songId ──────────────────────────────────────────────────
router.post('/likes/:songId', auth, async (req, res) => {
  const { song } = req.body;
  try {
    if (db.available) {
      const [existing] = await db.execute('SELECT id FROM liked_songs WHERE user_id=? AND song_id=?', [req.user.id, req.params.songId]);
      if (existing.length) {
        await db.execute('DELETE FROM liked_songs WHERE user_id=? AND song_id=?', [req.user.id, req.params.songId]);
        return res.json({ liked: false });
      }
      await db.execute(
        'INSERT IGNORE INTO liked_songs (user_id, song_id, song_title, song_artist, song_image) VALUES (?,?,?,?,?)',
        [req.user.id, req.params.songId, song?.title, song?.artist, song?.image]
      );
      return res.json({ liked: true });
    }
    res.json({ liked: false, warning: 'Likes require MySQL' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ── POST /auth/history ────────────────────────────────────────────────────────
router.post('/history', auth, async (req, res) => {
  const { song } = req.body;
  if (!song?.id) return res.status(400).json({ error: 'song required' });
  try {
    if (db.available) {
      await db.execute('INSERT INTO listening_history (user_id, song_id, song_title, song_artist, song_image) VALUES (?,?,?,?,?)',
        [req.user.id, song.id, song.title, song.artist, song.image]);
      await db.execute(
        `DELETE FROM listening_history WHERE user_id=? AND id NOT IN (
           SELECT id FROM (SELECT id FROM listening_history WHERE user_id=? ORDER BY played_at DESC LIMIT 50) t)`,
        [req.user.id, req.user.id]);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to record history' }); }
});

// ── GET /auth/history ─────────────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    if (db.available) {
      const [rows] = await db.execute(
        `SELECT song_id, song_title, song_artist, song_image, MAX(played_at) as played_at
         FROM listening_history WHERE user_id=?
         GROUP BY song_id, song_title, song_artist, song_image
         ORDER BY played_at DESC LIMIT 20`,
        [req.user.id]);
      return res.json({ history: rows.map(r => ({ id: r.song_id, title: r.song_title, artist: r.song_artist, image: r.song_image })) });
    }
    res.json({ history: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
