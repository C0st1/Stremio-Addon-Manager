/**
 * lib/csrf.js
 *
 * CSRF (Cross-Site Request Forgery) protection using single-use tokens.
 * Tokens are server-bound via a signed salt cookie so they cannot be
 * replayed across different server instances.
 *
 * Uses the same HMAC signing approach as lib/auth.js for cookie integrity.
 */

const crypto = require('crypto');

const CSRF_SALT_COOKIE = '_csrf_salt';
const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// In-memory token store: token → { salt, createdAt }
const tokenStore = new Map();

/**
 * Returns the shared signing secret (same source as auth.js).
 *
 * @returns {string}
 */
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production.');
    }
    return 'dev-only-secret-change-me';
  }
  return secret;
}

/**
 * Signs a value with HMAC-SHA256 using the session secret.
 *
 * @param {string} value
 * @returns {string} base64url-encoded signature
 */
function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

/**
 * Generates a random 32-byte hex token and stores it with an expiry.
 * Also generates a salt and sets it as a signed cookie on the response.
 *
 * @param {import('http').IncomingMessage}  req
 * @param {import('http').ServerResponse}   res
 * @returns {string} The generated CSRF token (32 hex characters)
 */
function generateCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const signedSalt = `${salt}.${sign(salt)}`;

  tokenStore.set(token, {
    salt,
    createdAt: Date.now(),
  });

  const secure = process.env.NODE_ENV !== 'development';
  res.setHeader(
    'Set-Cookie',
    `${CSRF_SALT_COOKIE}=${encodeURIComponent(signedSalt)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(CSRF_TOKEN_EXPIRY_MS / 1000)}${secure ? '; Secure' : ''}`
  );

  return token;
}

/**
 * Validates a CSRF token submitted by the client.
 * Checks:
 *   1. The token exists in the store and has not expired.
 *   2. The salt cookie matches the salt stored with the token (server-bound).
 *   3. The salt cookie signature is valid.
 *
 * The token is consumed (single-use) — after validation it is removed from the store.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} token  The CSRF token to validate
 * @returns {boolean} true if the token is valid
 */
function validateCsrfToken(req, token) {
  if (!token || typeof token !== 'string') return false;

  // Expire old tokens before lookup
  pruneExpiredTokens();

  const entry = tokenStore.get(token);
  if (!entry) return false;

  // Extract and verify the salt cookie
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k.trim()] = decodeURIComponent(v.join('=') || '');
    return acc;
  }, {});

  const signedSalt = cookies[CSRF_SALT_COOKIE];
  if (!signedSalt) return false;

  const [salt, signature] = signedSalt.split('.');
  if (!salt || !signature) return false;

  // Verify the cookie signature (timing-safe comparison)
  const expectedSig = sign(salt);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  // Verify the salt matches the one stored with the token
  if (salt !== entry.salt) return false;

  // Token is valid — remove it (single-use)
  tokenStore.delete(token);

  return true;
}

/**
 * Removes expired tokens from the store. Called automatically during validation.
 */
function pruneExpiredTokens() {
  const now = Date.now();
  for (const [key, entry] of tokenStore) {
    if (now - entry.createdAt > CSRF_TOKEN_EXPIRY_MS) {
      tokenStore.delete(key);
    }
  }
}

module.exports = { generateCsrfToken, validateCsrfToken };
