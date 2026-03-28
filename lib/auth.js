const crypto = require('crypto');

const SESSION_COOKIE = 'stremio_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail hard in production — a missing secret means anyone can forge sessions
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error(
        'SESSION_SECRET environment variable is required in production. ' +
        'Set it in your Vercel project settings (Settings → Environment Variables).'
      );
    }
    return 'dev-only-secret-change-me';
  }
  return secret;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function createSessionToken(payload, maxAgeSeconds = 2592000) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encoded = base64Url(JSON.stringify(body));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expected = sign(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('=') || '');
    return acc;
  }, {});
}

function getAuthKeyFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const payload = verifySessionToken(token);
  return payload?.authKey || '';
}

function setSessionCookie(res, authKey) {
  const secure = process.env.NODE_ENV !== 'development';
  const token = createSessionToken({ authKey });
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

/**
 * Sliding session renewal — re-issues the cookie with a fresh 30-minute expiry
 * if the current session has less than 15 minutes remaining.
 * Call this on every authenticated request.
 */
function refreshSession(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const payload = verifySessionToken(token);
  if (!payload?.authKey) return;

  const now = Math.floor(Date.now() / 1000);
  const remaining = (payload.exp || 0) - now;
  // Refresh the 30-day cookie if less than 7 days (604,800 seconds) remain
  if (remaining < 604800) {
    setSessionCookie(res, payload.authKey);
  }
}

module.exports = {
  getAuthKeyFromRequest,
  setSessionCookie,
  clearSessionCookie,
  refreshSession,
};
