/**
 * api/session.js
 * Vercel serverless function — creates a session from a manually pasted auth key.
 * Validates the key against Stremio's cloud API before issuing a cookie.
 */
const { setSessionCookie, clearSessionCookie } = require('../lib/auth');
const { setAuthCors } = require('../lib/cors');
const { hitRateLimit } = require('../lib/rateLimiter');
const stremioAPI = require('../lib/stremioAPI');

module.exports = async (req, res) => {
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  if (req.body?.logout) {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const limit = hitRateLimit(`session:${ip}`, { max: 10, windowMs: 60_000 });
  if (limit.limited) {
    res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a minute.' });
    return;
  }

  const authKey = (req.body?.authKey || '').trim();
  if (!authKey) {
    res.status(400).json({ ok: false, error: 'authKey is required' });
    return;
  }

  // Validate the key by making a real Stremio API call
  try {
    await stremioAPI.cloudGetAddons(authKey);
  } catch {
    res.status(401).json({ ok: false, error: 'Invalid auth key — could not authenticate with Stremio' });
    return;
  }

  setSessionCookie(res, authKey);
  res.status(200).json({ ok: true });
};
