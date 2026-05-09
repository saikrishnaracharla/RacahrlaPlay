/**
 * server/utils/songNormalizer.js
 *
 * WHY: Each API returns songs in a completely different shape.
 * Normalizing into a single schema means:
 *  1. Frontend only handles ONE format regardless of which API served it
 *  2. We can swap APIs without touching any UI code
 *  3. We can mix results from multiple APIs in one list
 */

function pickUrl(arr, qualities) {
  if (!Array.isArray(arr)) return null;
  for (const q of qualities) {
    const f = arr.find(x => x.quality === q);
    if (f?.url) return f.url;
  }
  return arr[arr.length - 1]?.url || null;
}

function cleanText(str) {
  return (str || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();
}

/** Normalize song from saavn.sumit.co format */
function fromSaavn(s) {
  if (!s?.id) return null;
  const streamUrl = pickUrl(s.downloadUrl, ['320kbps', '160kbps', '96kbps']);
  if (!streamUrl) return null; // skip songs without playable URL

  return {
    id:        s.id,
    source:    'saavn',
    title:     cleanText(s.name || s.title),
    artist:    cleanText(s.artists?.primary?.map(a => a.name).join(', ') || s.primaryArtists || s.subtitle?.split(' - ')[0] || 'Unknown Artist'),
    album:     cleanText(s.album?.name || s.album || ''),
    duration:  Number(s.duration) || 0,
    image:     pickUrl(s.image, ['500x500', '150x150']) || fallbackImg(),
    streamUrl,
    year:      s.year || '',
    language:  s.language || '',
    hasLyrics: !!s.hasLyrics,
    playCount: s.playCount || 0,
    label:     s.label || '',
    _raw:      undefined, // strip raw to save memory
  };
}

/** Normalize song from Deezer API */
function fromDeezer(s) {
  if (!s?.id || !s.preview) return null; // preview = 30s stream URL
  return {
    id:        `dz_${s.id}`,
    source:    'deezer',
    title:     cleanText(s.title),
    artist:    cleanText(s.artist?.name || 'Unknown Artist'),
    album:     cleanText(s.album?.title || ''),
    duration:  s.duration || 0,
    image:     s.album?.cover_xl || s.album?.cover_big || s.album?.cover || fallbackImg(),
    streamUrl: s.preview, // 30-second preview (free, no auth)
    year:      '',
    language:  '',
    hasLyrics: false,
    playCount: s.rank || 0,
    label:     '',
  };
}

/** Normalize song from Audius API */
function fromAudius(s) {
  if (!s?.id) return null;
  return {
    id:        `au_${s.id}`,
    source:    'audius',
    title:     cleanText(s.title),
    artist:    cleanText(s.user?.name || 'Unknown Artist'),
    album:     '',
    duration:  s.duration || 0,
    image:     s.artwork?.['480x480'] || s.artwork?.['150x150'] || fallbackImg(),
    streamUrl: null, // constructed separately with Audius stream endpoint
    audiusId:  s.id,
    year:      s.release_date?.slice(0, 4) || '',
    language:  '',
    hasLyrics: false,
    playCount: s.play_count || 0,
    label:     s.genre || '',
  };
}

function fallbackImg() {
  return 'https://placehold.co/300x300/0e0e14/1DB954?text=🎵';
}

module.exports = { fromSaavn, fromDeezer, fromAudius, fallbackImg };
