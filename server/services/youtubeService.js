/**
 * server/services/youtubeService.js
 *
 * Uses ytsr to search YouTube for a song, then ytdl-core to get
 * the audio-only stream URL. This gives FULL songs with no 30-second limit.
 *
 * WHY YouTube:
 *  - Every Indian song exists on YouTube (official VEVO/label channels)
 *  - Full-length audio, no geo-restrictions
 *  - ytdl-core extracts the audio track URL directly from YouTube
 *  - The browser then streams audio directly from Google's CDN
 */

const ytsr   = require('ytsr');
const ytdl   = require('ytdl-core');
const cache  = require('../cache/nodeCache');

/**
 * Search YouTube for a song, return the best audio stream URL.
 * @param {string} query  - e.g. "Akhiyaan Gulaab Mitraz"
 * @returns {Promise<{videoId, streamUrl, duration, title} | null>}
 */
async function getYouTubeStream(query) {
  const cacheKey = `yt:stream:${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Step 1: Search YouTube for the song
  const searchResults = await ytsr(query, { limit: 5 });
  const videos = (searchResults.items || []).filter(i => i.type === 'video');

  if (!videos.length) throw new Error(`No YouTube results for: ${query}`);

  // Pick the first result (most relevant)
  const video = videos[0];
  const videoId = video.id;

  // Step 2: Get audio stream info from ytdl-core
  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

  // Get best audio-only format (prefer opus/webm or mp4/aac)
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

  // Sort by bitrate (highest first)
  audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

  const bestAudio = audioFormats[0];
  if (!bestAudio) throw new Error(`No audio format found for videoId: ${videoId}`);

  const result = {
    videoId,
    streamUrl: bestAudio.url,
    duration:  Math.floor(Number(info.videoDetails.lengthSeconds)),
    title:     info.videoDetails.title,
    author:    info.videoDetails.author?.name,
    thumbnail: info.videoDetails.thumbnails?.pop()?.url,
    expiresAt: Date.now() + 5 * 60 * 60 * 1000, // URLs expire ~6h, cache for 5h
  };

  // Cache for 5 hours (YouTube stream URLs are time-limited)
  cache.set(cacheKey, result, 5 * 60 * 60);

  return result;
}

module.exports = { getYouTubeStream };
