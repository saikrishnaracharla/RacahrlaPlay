/**
 * server/routes/music.js
 */
const express       = require('express');
const router        = express.Router();
const ctrl          = require('../controllers/musicController');
const { musicLimiter, searchLimiter } = require('../middleware/rateLimiter');

// Apply general music rate-limit to all music routes
router.use(musicLimiter);

router.get('/search',      searchLimiter, ctrl.searchSongs);   // GET /api/search?query=...
router.get('/trending',    ctrl.getTrending);                  // GET /api/trending?lang=hindi
router.get('/song/:id',    ctrl.getSongDetails);               // GET /api/song/:id
router.get('/suggestions', ctrl.getSuggestions);               // GET /api/suggestions?id=...
router.get('/albums',      ctrl.searchAlbums);                 // GET /api/albums?query=...
router.get('/health',      ctrl.getHealth);                    // GET /api/health (cache stats)

module.exports = router;
