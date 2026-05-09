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
 * Padding:   PKCS5/PKCS7 (Node's built-in crypto handles this)
 *
 * Input:  Base64-encoded DES-encrypted string (from encrypted_media_url field)
 * Output: Plain CDN URL string (e.g. https://aac.saavncdn.com/...)
 *
 * WHY we implement this ourselves instead of using a 3rd-party API:
 *  - saavn.sumit.co / saavn.dev are shared instances → rate-limited & CF-blocked
 *  - Calling JioSaavn's own API directly and decrypting gives us unlimited access
 *  - No dependency on anyone else's infrastructure staying up
 */

const crypto = require('crypto');

// Static key used by JioSaavn client (reverse-engineered from their JS bundle)
const DES_KEY = Buffer.from('38346591', 'ascii');

/**
 * Decrypt a JioSaavn encrypted_media_url → plain CDN stream URL
 * @param {string} encryptedUrl - Base64-encoded DES-ECB ciphertext
 * @returns {string|null}       - Decrypted URL, or null on failure
 */
function decryptUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    // 1. Base64-decode the encrypted string
    const cipherBuf = Buffer.from(encryptedUrl, 'base64');

    // 2. DES-ECB decrypt (Node crypto: 'des-ecb' handles PKCS5 unpadding)
    const decipher = crypto.createDecipheriv('des-ecb', DES_KEY, null);
    decipher.setAutoPadding(true);
    const plain = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);

    // 3. Convert to string and clean up null bytes / whitespace
    const url = plain.toString('utf8').replace(/\0+$/, '').trim();
    if (!url.startsWith('http')) return null;

    // 4. Bump quality to 320kbps (JioSaavn CDN supports _96.mp4 → _320.mp4)
    return url.replace(/_96\.mp4|_160\.mp4|_48\.mp4|_12\.mp4/, '_320.mp4')
              .replace(/_96\.m4a|_160\.m4a|_48\.m4a|_12\.m4a/, '_320.m4a');
  } catch (err) {
    console.warn('⚠️  jioDecrypt failed:', err.message);
    return null;
  }
}

module.exports = { decryptUrl };
