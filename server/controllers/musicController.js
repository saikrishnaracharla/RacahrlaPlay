/**
 * server/controllers/musicController.js — thin HTTP layer
 */
const music            = require('../services/musicService');
const { asyncHandler } = require('../middleware/errorHandler');

// Flatten result shape — service returns {total,songs} OR an array
function normalise(data) {
  if (!data) return { total: 0, results: [] };
  if (Array.isArray(data)) return { total: data.length, results: data };
  const results = data.songs || data.results || [];
  return { total: data.total || results.length, results };
}

exports.searchSongs = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

  const data = await music.search(query.trim(), +page, Math.min(+limit, 30));
  const { total, results } = normalise(data);

  res.json({ success: true, total, page: +page, results });
});

exports.getTrending = asyncHandler(async (req, res) => {
  const { lang = 'hindi', limit = 20 } = req.query;
  const data = await music.trending(lang, Math.min(+limit, 30));
  const { results } = normalise(data);
  res.json({ success: true, language: lang, results });
});

exports.getSongDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const song = await music.song(id);
  if (!song) return res.status(404).json({ error: 'Song not found or API unavailable' });
  res.json({ success: true, song });
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const results = await music.suggestions(id);
  res.json({ success: true, results: results || [] });
});

exports.searchAlbums = asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'query is required' });
  const results = await music.albums(query, +limit);
  res.json({ success: true, results: results || [] });
});

exports.getHealth = asyncHandler(async (req, res) => {
  const stats = music.cacheStats();
  res.json({
    status: 'ok',
    message: '🎵 Racharlaplay API running',
    cache: { hits: stats.hits, misses: stats.misses, keys: stats.keys },
    uptime: Math.round(process.uptime()) + 's',
  });
});
