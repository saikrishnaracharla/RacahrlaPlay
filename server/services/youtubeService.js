/**
 * server/services/youtubeService.js
 *
 * YouTube search via yt-search (actively maintained, works in 2024/2025).
 * Returns a videoId + our own /stream-proxy URL that pipes audio through backend.
 *
 * WHY proxy approach:
 *  - ytdl-core, ytsr, Invidious direct stream URLs all broken/unreliable
 *  - yt-search WORKS for finding video IDs (scrapes YouTube search)
 *  - We proxy the audio through /stream-proxy?id=VIDEO_ID
 *    The backend fetches from YouTube/Invidious and pipes to client
 *  - Client gets a stable URL that always works (no expiry, no CORS)
 */

const yts   = require('yt-search');
const cache = require('../cache/nodeCache');

/**
 * Search YouTube and return video metadata.
 * The streamUrl will be our own /stream-proxy endpoint.
 * @param {string} query  e.g. "Akhiyaan Gulaab Mitraz"
 * @returns {Promise<{videoId, streamUrl, duration, title}>}
 */
async function getYouTubeStream(query) {
  const cacheKey = `yt:v3:search:${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const results = await yts(query + ' audio');
  const videos  = (results.videos || []).filter(v => v.seconds > 60); // skip very short clips
  
  if (!videos.length) throw new Error(`No YouTube results for: ${query}`);

  const video = videos[0];
  const result = {
    videoId:   video.videoId,
    streamUrl: null, // filled in by the caller (/stream endpoint)
    duration:  video.seconds,
    title:     video.title,
  };

  cache.set(cacheKey, result, 12 * 60 * 60); // 12h (videoId doesn't change)
  console.log(`✅ yt-search: "${query}" → ${video.videoId} (${video.seconds}s)`);
  return result;
}

module.exports = { getYouTubeStream };
