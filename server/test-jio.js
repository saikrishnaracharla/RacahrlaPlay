/**
 * Test script: Verify des.js DES decryption works end-to-end
 * Run: node test-jio.js
 */
const DES  = require('des.js');
const axios = require('axios');
const https = require('https');

const KEY_BYTES = Buffer.from('38346591', 'ascii');

function decryptUrl(enc) {
  if (!enc) return null;
  try {
    const cipherBuf = Buffer.from(enc, 'base64');
    const des       = DES.ECB.instantiate(DES.DES);
    const decipher  = des.create({ type: 'decrypt', key: KEY_BYTES });
    const plainBuf  = Buffer.from(decipher.update(cipherBuf));

    // Strip PKCS5 padding
    const lastByte = plainBuf[plainBuf.length - 1];
    let url;
    if (lastByte > 0 && lastByte <= 8) {
      url = plainBuf.slice(0, plainBuf.length - lastByte).toString('utf8').trim();
    } else {
      url = plainBuf.toString('utf8').replace(/\0+$/, '').trim();
    }

    if (!url.startsWith('http')) return 'NOT_URL: ' + url.substring(0, 50);
    return url.replace(/_96\.mp4|_160\.mp4|_48\.mp4/, '_320.mp4');
  } catch(e) {
    return 'ERR: ' + e.message;
  }
}

const agent = new https.Agent({ keepAlive: true });
const client = axios.create({
  timeout: 12000,
  httpsAgent: agent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.jiosaavn.com/',
  }
});

async function main() {
  console.log('Node:', process.version, '| OpenSSL:', process.versions.openssl);
  
  const r = await client.get('https://www.jiosaavn.com/api.php', { params: {
    __call: 'search.getResults', _format: 'json', _marker: '0',
    api_version: '4', ctx: 'web6dot0', q: 'akhiyaan gulaab mitraz', p: 1, n: 3,
  }});
  
  const results = (r.data && r.data.results) || [];
  console.log('Search results:', results.length);
  
  for (const s of results.slice(0, 2)) {
    const mi = s.more_info || {};
    const enc = mi.encrypted_media_url;
    console.log('\nSong:', s.title);
    console.log('enc (first 60):', enc && enc.substring(0, 60));
    console.log('DECRYPTED:', decryptUrl(enc));
    console.log('Duration from API:', mi.duration, 'sec');
    console.log('320kbps flag:', mi['320kbps']);
  }
}

main().catch(e => console.error('FATAL:', e.message, e.stack));
