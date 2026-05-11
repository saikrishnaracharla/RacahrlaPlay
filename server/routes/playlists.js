/**
 * server/routes/playlists.js
 * Full CRUD playlist API backed by MongoDB.
 * All routes require JWT auth (verifyToken middleware).
 */
const express  = require('express');
const router   = express.Router();
const Playlist = require('../models/Playlist');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All playlist routes are auth-gated
router.use(verifyToken);

/* ── Helper: get userId as ObjectId-safe string ─────────────────────────── */
const uid = (req) => req.user.id || req.user.userId || req.user._id;

/* ── GET /api/playlists — list all playlists for current user ─────────────── */
router.get('/', asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ userId: uid(req) }).sort({ created_at: -1 });
  res.json({ success: true, playlists });
}));

/* ── POST /api/playlists — create playlist ────────────────────────────────── */
router.post('/', asyncHandler(async (req, res) => {
  const { name, song } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Playlist name is required' });

  const pl = await Playlist.create({
    userId: uid(req),
    name:   name.trim(),
    songs:  song ? [song] : [],
  });
  res.status(201).json({ success: true, playlist: pl });
}));

/* ── PUT /api/playlists/:id — rename playlist ─────────────────────────────── */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name } = req.body;
  const pl = await Playlist.findOneAndUpdate(
    { _id: req.params.id, userId: uid(req) },
    { name: name.trim() },
    { new: true }
  );
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });
  res.json({ success: true, playlist: pl });
}));

/* ── DELETE /api/playlists/:id — delete playlist ─────────────────────────── */
router.delete('/:id', asyncHandler(async (req, res) => {
  const pl = await Playlist.findOneAndDelete({ _id: req.params.id, userId: uid(req) });
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });
  res.json({ success: true, message: 'Playlist deleted' });
}));

/* ── POST /api/playlists/:id/songs — add song to playlist ────────────────── */
router.post('/:id/songs', asyncHandler(async (req, res) => {
  const song = req.body;
  if (!song?.id) return res.status(400).json({ error: 'Song id is required' });

  const pl = await Playlist.findOne({ _id: req.params.id, userId: uid(req) });
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  const already = pl.songs.some(s => s.id === song.id);
  if (!already) {
    pl.songs.push(song);
    await pl.save();
  }
  res.json({ success: true, playlist: pl, alreadyExists: already });
}));

/* ── DELETE /api/playlists/:id/songs/:songId — remove song ───────────────── */
router.delete('/:id/songs/:songId', asyncHandler(async (req, res) => {
  const pl = await Playlist.findOne({ _id: req.params.id, userId: uid(req) });
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  pl.songs = pl.songs.filter(s => s.id !== req.params.songId);
  await pl.save();
  res.json({ success: true, playlist: pl });
}));

/* ── POST /api/playlists/sync — bulk sync from localStorage ──────────────── */
router.post('/sync', asyncHandler(async (req, res) => {
  const { playlists: localPlaylists } = req.body;
  if (!Array.isArray(localPlaylists)) return res.status(400).json({ error: 'playlists array required' });

  const userId = uid(req);

  // Upsert each local playlist by name (merge songs)
  const results = await Promise.all(localPlaylists.map(async (lp) => {
    let pl = await Playlist.findOne({ userId, name: lp.name });
    if (!pl) {
      pl = await Playlist.create({ userId, name: lp.name, songs: lp.songs || [] });
    } else {
      // Merge songs — skip duplicates
      const existingIds = new Set(pl.songs.map(s => s.id));
      const newSongs    = (lp.songs || []).filter(s => !existingIds.has(s.id));
      if (newSongs.length) { pl.songs.push(...newSongs); await pl.save(); }
    }
    return pl;
  }));

  res.json({ success: true, playlists: results });
}));

module.exports = router;
