/**
 * api/addons/get.js
 * Vercel serverless function — fetches the user's addon collection from the Stremio cloud.
 */

const stremioAPI = require('../../lib/stremioAPI');
const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { validateSessionIp } = require('../../lib/sessionBinding');
const { validateCsrfToken } = require('../../lib/csrf');
const { setAuthCors } = require('../../lib/cors');
const { logEvent } = require('../../lib/logger');
const { getClientIp } = require('../../lib/ip');
const { sanitizeError } = require('../../lib/errors');
const { setSecurityHeaders } = require('../../lib/securityHeaders');
const { sanitizeAddons } = require('../../lib/sanitizeAddons');

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
    res.status(401).json({
      ok:    false,
      error: 'No active session found. Login or set your auth key first.',
    });
    return;
  }

  const ip = getClientIp(req);
  if (!validateSessionIp(ip, authKey)) {
    res.status(403).json({ ok: false, error: 'Session IP mismatch. Please log in again.' });
    return;
  }

  // CSRF validation (skip if no token present — allows non-browser clients)
  const csrfToken = req.headers['x-csrf-token'];
  if (csrfToken && !validateCsrfToken(req, csrfToken)) {
    res.status(403).json({ ok: false, error: 'Invalid CSRF token. Please reload the page and try again.' });
    return;
  }

  // Sliding session renewal
  refreshSession(req, res);

  try {
    const result = await stremioAPI.cloudGetAddons(authKey);
    // Sanitize: strip null/undefined manifest fields from addons loaded from cloud.
    const addons = sanitizeAddons(result.addons || []);
    res.status(200).json({ ok: true, addons });
  } catch (err) {
    const safeErr = sanitizeError(err, 'addonGet');
    await logEvent('error', 'addons_get_failed', { message: err.message });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
