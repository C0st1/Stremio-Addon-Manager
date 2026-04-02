/**
 * api/addons/diff.js
 * Vercel serverless function — compares two versions of an addon collection
 * and returns the differences (added, removed, reordered, unchanged).
 *
 * POST only, requires auth. Rate limit: 20/60s.
 */

const stremioAPI = require('../../lib/stremioAPI');
const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { setAuthCors } = require('../../lib/cors');
const { hitRateLimit } = require('../../lib/rateLimiter');
const { logEvent } = require('../../lib/logger');
const { getClientIp } = require('../../lib/ip');
const { sanitizeError } = require('../../lib/errors');
const { setSecurityHeaders } = require('../../lib/securityHeaders');

const { diffCollections } = require('../../lib/collectionDiff');

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const authKey = getAuthKeyFromRequest(req);
  if (!authKey) {
    res.status(401).json({ ok: false, error: 'No active session found. Login or set your auth key first.' });
    return;
  }

  const ip = getClientIp(req);
  const limit = hitRateLimit(`diff:${ip}`, { max: 20, windowMs: 60_000 });
  if (limit.limited) {
    await logEvent('warn', 'diff_rate_limited', { ip });
    res.status(429).json({ ok: false, error: 'Too many diff requests. Try again in a minute.' });
    return;
  }

  refreshSession(req, res);

  try {
    const { oldAddons } = req.body || {};
    let oldCollection = oldAddons;

    // If oldAddons not provided, fetch the current cloud state to use as baseline
    if (!Array.isArray(oldCollection)) {
      const cloudResult = await stremioAPI.cloudGetAddons(authKey);
      oldCollection = cloudResult.addons || [];
    }

    // Fetch the "new" collection from the session's current state
    const newResult = await stremioAPI.cloudGetAddons(authKey);
    const newCollection = newResult.addons || [];

    const diff = diffCollections(oldCollection, newCollection);

    res.status(200).json({ ok: true, ...diff });
  } catch (err) {
    const safeErr = sanitizeError(err, 'addonGet');
    await logEvent('error', 'diff_failed', { ip, message: err.message });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
