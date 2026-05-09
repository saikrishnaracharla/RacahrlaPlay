/**
 * server/utils/jioDecrypt.js
 *
 * JioSaavn stores song stream URLs as DES-ECB encrypted, base64-encoded strings.
 * The decryption key is a well-known static value reverse-engineered from
 * JioSaavn's own JavaScript client bundle.
 *
 * Algorithm: DES (Data Encryption Standard)
 * Mode:      ECB (Electronic Code Book — no IV)
 * Key:       "38346591"  (8-byte ASCII → 64-bit DES key)
 *
 * WHY we use des.js instead of Node's crypto module:
 *  Node.js v17+ / OpenSSL 3 disabled legacy DES-ECB cipher.
 *  crypto.createDecipheriv('des-ecb',...) throws:
 *    "error:0308010C:digital envelope routines::unsupported"
 *  des.js is a pure JavaScript DES implementation — works on all Node versions
 *  including v22 with OpenSSL 3. No legacy flags needed.
 *
 * CORRECT API (verified on Node v22):
 *  new des.DES({ type: 'decrypt', key: Buffer })
 *  NOT DES.ECB.instantiate(DES.DES) — that's wrong API.
 */

const des = require('des.js');

// Static 8-byte key used by JioSaavn client (reverse-engineered from their JS bundle)
const KEY_BYTES = Buffer.from('38346591', 'ascii');

/**
 * Decrypt a JioSaavn encrypted_media_url → plain CDN stream URL
 * @param {string} encryptedUrl - Base64-encoded DES-ECB ciphertext
 * @returns {string|null}       - Decrypted URL (upgraded to 320kbps), or null on failure
 */
function decryptUrl(encryptedUrl) {
  if (!encryptedUrl || typeof encryptedUrl !== 'string') return null;
  try {
    // 1. Base64-decode the encrypted string
    const cipherBuf = Buffer.from(encryptedUrl, 'base64');

    // 2. DES-ECB decrypt (des.js pure JS — works on OpenSSL 3 / Node v17+)
    const decipher = new des.DES({ type: 'decrypt', key: KEY_BYTES });
    const plainBuf = Buffer.from(decipher.update(cipherBuf));

    // 3. Convert to string and strip null bytes / trailing garbage
    let url = plainBuf.toString('utf8').replace(/\0+$/, '').trim();

    if (!url.startsWith('http')) {
      console.warn('⚠️  jioDecrypt: result is not a URL:', url.substring(0, 60));
      return null;
    }

    // 4. Bump quality to 320kbps (saavncdn URLs end with _96, _160 etc. — no extension)
    return url
      .replace(/_12$/, '_320')
      .replace(/_48$/, '_320')
      .replace(/_96$/, '_320')
      .replace(/_160$/, '_320')
      .replace(/_12\.mp4$|_48\.mp4$|_96\.mp4$|_160\.mp4$/, '_320.mp4')
      .replace(/_12\.m4a$|_48\.m4a$|_96\.m4a$|_160\.m4a$/, '_320.m4a');

  } catch (err) {
    console.warn('⚠️  jioDecrypt failed:', err.message);
    return null;
  }
}

module.exports = { decryptUrl };
