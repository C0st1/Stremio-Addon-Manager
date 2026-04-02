/**
 * api/addons/set.js
 * Vercel serverless function — saves the user's addon collection to the Stremio cloud.
 */

const stremioAPI = require('../../lib/stremioAPI');
const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { setAuthCors } = require('../../lib/cors');
const { hitRateLimit } = require('../../lib/rateLimiter');
const { logEvent } = require('../../lib/logger');
const { getClientIp } = require('../../lib/ip');
const { sanitizeError } = require('../../lib/errors');
const { setSecurityHeaders } = require('../../lib/securityHeaders');
const zlib = require('zlib');

/**
 * Validates that `addons` is a well-formed array of addon objects.
 * Each addon must have a valid http(s) transportUrl.
 *
 * @param {*} addons
 * @returns {boolean}
 */
function validateAddonArray(addons) {
  if (!Array.isArray(addons)) return false;
  if (addons.length === 0) return true;
  if (addons.length > 500) return false;

  for (const addon of addons) {
    if (!addon || typeof addon !== 'object') return false;
    const url = addon.transportUrl || addon.manifest?.transportUrl;
    if (!url || typeof url !== 'string') return false;
    // Validate URL is http(s)
    if (!/^https?:\/\//i.test(url)) return false;
  }
  return true;
}

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const authKey = getAuthKeyFromRequest(req);
  let { addons } = req.body || {};

  if (!Array.isArray(addons) && req.body?.compressedAddons) {
    try {
      const raw = Buffer.from(req.body.compressedAddons, 'base64');
      const encoding = req.body.compression === 'br' ? 'br' : 'gzip';
      const decompressed = encoding === 'br' ? zlib.brotliDecompressSync(raw) : zlib.gunzipSync(raw);
      addons = JSON.parse(decompressed.toString('utf8'));
    } catch (err) {
      const safeErr = sanitizeError(err, 'compressed');
      res.status(400).json({ ok: false, error: safeErr.message });
      return;
    }
  }

  if (!Array.isArray(addons)) {
    res.status(400).json({ ok: false, error: '"addons" must be an array' });
    return;
  }

  // Schema validation
  if (!validateAddonArray(addons)) {
    res.status(400).json({ ok: false, error: 'Invalid addon data. Each addon must have a valid http(s) transportUrl.' });
    return;
  }

  if (!authKey) {
    res.status(400).json({
      ok:    false,
      error: 'No active session found. Login or set your auth key first.',
    });
    return;
  }

  const ip = getClientIp(req);
  const limit = hitRateLimit(`set:${ip}`, { max: 50, windowMs: 60_000 });
  if (limit.limited) {
    await logEvent('warn', 'addons_set_rate_limited', { ip, addonsCount: addons.length });
    res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please retry shortly.' });
    return;
  }

  // Sliding session renewal
  refreshSession(req, res);

  try {
    const result = await stremioAPI.cloudSetAddons(addons, authKey);
    res.status(200).json({ ok: true, result });
  } catch (err) {
    const safeErr = sanitizeError(err, 'addonSet');
    await logEvent('error', 'addons_set_failed', { message: err.message, addonsCount: addons.length });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
