/**
 * api/addons/get.js
 * Vercel serverless function — fetches the user's addon collection from the Stremio cloud.
 */

const stremioAPI = require('../../lib/stremioAPI');
const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { setAuthCors } = require('../../lib/cors');
const { logEvent } = require('../../lib/logger');
const { sanitizeError } = require('../../lib/errors');
const { setSecurityHeaders } = require('../../lib/securityHeaders');

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
    res.status(400).json({
      ok:    false,
      error: 'No active session found. Login or set your auth key first.',
    });
    return;
  }

  // Sliding session renewal
  refreshSession(req, res);

  try {
    const result = await stremioAPI.cloudGetAddons(authKey);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    const safeErr = sanitizeError(err, 'addonGet');
    await logEvent('error', 'addons_get_failed', { message: err.message });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
