/**
 * api/login.js
 * Vercel serverless function — logs into Stremio and sets a session cookie.
 * Credentials are proxied to api.strem.io and never stored.
 */
const stremioAPI = require('../lib/stremioAPI');
const { hitRateLimit } = require('../lib/rateLimiter');
const { logEvent } = require('../lib/logger');
const { setSessionCookie, clearSessionCookie } = require('../lib/auth');
const { setAuthCors } = require('../lib/cors');

module.exports = async (req, res) => {
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (req.body?.logout) {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const limit = hitRateLimit(`login:${ip}`, { max: 10, windowMs: 60_000 });
  if (limit.limited) {
    await logEvent('warn', 'login_rate_limited', { ip });
    res.status(429).json({ ok: false, error: 'Too many login attempts. Try again in a minute.' });
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email and password are required' });
    return;
  }

  try {
    const authKey = await stremioAPI.cloudLogin(email, password);
    setSessionCookie(res, authKey);
    res.status(200).json({ ok: true });
  } catch (err) {
    await logEvent('error', 'login_failed', { ip, message: err.message });
    res.status(401).json({ ok: false, error: err.message });
  }
};
