// Quick test: does youtubeService work?
process.chdir(__dirname);
const { getYouTubeStream } = require('./services/youtubeService');

async function main() {
  console.log('Testing YouTube stream for: Akhiyaan Gulaab Mitraz');
  try {
    const result = await getYouTubeStream('Akhiyaan Gulaab Mitraz');
    console.log('✅ SUCCESS:', JSON.stringify({
      videoId: result.videoId,
      duration: result.duration,
      streamUrl: result.streamUrl?.substring(0, 80) + '...',
      title: result.title,
    }, null, 2));
  } catch (e) {
    console.error('❌ FAILED:', e.message);
  }
}
main();
