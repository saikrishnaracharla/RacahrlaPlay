/**
 * Full end-to-end test of jioSaavnDirect + jioDecrypt
 * Run: node test-jio-full.js
 */
process.chdir(__dirname);

async function main() {
  console.log('=== Loading jioSaavnDirect service ===');
  const jio = require('./services/jioSaavnDirect');

  console.log('\n=== Testing search ===');
  const result = await jio.searchDirect('akhiyaan gulaab mitraz', 1, 5);
  console.log('Total songs returned:', result.songs.length);
  
  for (const s of result.songs) {
    console.log('\n✅ Song:', s.title, 'by', s.artist);
    console.log('   Duration:', s.duration, 'sec (', Math.round(s.duration/60), 'min)');
    console.log('   streamUrl:', s.streamUrl && s.streamUrl.substring(0, 80));
    console.log('   source:', s.source);
    console.log('   Is full song (>30s)?', s.duration > 30 ? 'YES ✅' : 'NO ❌ (PREVIEW)');
  }

  console.log('\n=== Testing trending ===');
  const trending = await jio.trendingDirect('bollywood top songs 2024 arijit singh', 5);
  console.log('Trending songs:', trending.length);
  for (const s of trending.slice(0, 3)) {
    console.log(`  - ${s.title} (${s.duration}s) → ${s.streamUrl && s.streamUrl.substring(0, 60)}`);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
});
