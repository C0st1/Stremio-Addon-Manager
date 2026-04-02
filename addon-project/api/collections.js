/**
 * api/collections.js
 * Vercel serverless function — manages named collection profiles (save, load,
 * list, delete). Profiles are keyed by user auth key.
 *
 * POST only, requires auth. Rate limit: 30/60s.
 */

const { getAuthKeyFromRequest, refreshSession } = require('../lib/auth');
const { setAuthCors } = require('../lib/cors');
const { hitRateLimit } = require('../lib/rateLimiter');
const { logEvent } = require('../lib/logger');
const { getClientIp } = require('../lib/ip');
const { sanitizeError } = require('../lib/errors');
const { setSecurityHeaders } = require('../lib/securityHeaders');
const {
  listCollectionProfiles,
  saveCollectionProfile,
  getCollectionProfile,
  deleteCollectionProfile,
} = require('../lib/collections');

const VALID_ACTIONS = new Set(['list', 'save', 'load', 'delete']);

/**
 * Validates a profile name: non-empty string, reasonable length, no control characters.
 * @param {*} name
 * @returns {{ valid: boolean, error?: string }}
 */
function validateProfileName(name) {
  if (!name || typeof name !== 'string') return { valid: false, error: 'Profile name is required.' };
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Profile name cannot be empty.' };
  if (trimmed.length > 100) return { valid: false, error: 'Profile name must be 100 characters or less.' };
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return { valid: false, error: 'Profile name contains invalid characters.' };
  return { valid: true };
}

/**
 * Validates that addons is a well-formed array of addon objects.
 * @param {*} addons
 * @returns {boolean}
 */
function validateAddonArray(addons) {
  if (!Array.isArray(addons)) return false;
  if (addons.length > 500) return false;
  for (const addon of addons) {
    if (!addon || typeof addon !== 'object') return false;
    const url = addon.transportUrl || addon.manifest?.transportUrl;
    if (!url || typeof url !== 'string') return false;
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
  if (!authKey) {
    res.status(401).json({ ok: false, error: 'No active session found. Login or set your auth key first.' });
    return;
  }

  const ip = getClientIp(req);
  const limit = hitRateLimit(`collections:${ip}`, { max: 30, windowMs: 60_000 });
  if (limit.limited) {
    await logEvent('warn', 'collections_rate_limited', { ip });
    res.status(429).json({ ok: false, error: 'Too many collection requests. Try again in a minute.' });
    return;
  }

  refreshSession(req, res);

  const { action } = req.body || {};
  if (!VALID_ACTIONS.has(action)) {
    res.status(400).json({ ok: false, error: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(', ')}` });
    return;
  }

  try {
    switch (action) {
      case 'list': {
        const names = listCollectionProfiles(authKey);
        res.status(200).json({ ok: true, profiles: names });
        break;
      }

      case 'save': {
        const { name, addons } = req.body || {};
        const nameCheck = validateProfileName(name);
        if (!nameCheck.valid) {
          res.status(400).json({ ok: false, error: nameCheck.error });
          return;
        }
        if (!validateAddonArray(addons)) {
          res.status(400).json({ ok: false, error: 'Invalid addon data. Each addon must have a valid http(s) transportUrl.' });
          return;
        }
        saveCollectionProfile(name.trim(), addons, authKey);
        await logEvent('info', 'collection_saved', { ip, name: name.trim() });
        res.status(200).json({ ok: true });
        break;
      }

      case 'load': {
        const { name } = req.body || {};
        const nameCheck = validateProfileName(name);
        if (!nameCheck.valid) {
          res.status(400).json({ ok: false, error: nameCheck.error });
          return;
        }
        const addons = getCollectionProfile(name.trim(), authKey);
        if (addons === null) {
          res.status(404).json({ ok: false, error: `Profile "${name.trim()}" not found.` });
          return;
        }
        res.status(200).json({ ok: true, addons });
        break;
      }

      case 'delete': {
        const { name } = req.body || {};
        const nameCheck = validateProfileName(name);
        if (!nameCheck.valid) {
          res.status(400).json({ ok: false, error: nameCheck.error });
          return;
        }
        const deleted = deleteCollectionProfile(name.trim(), authKey);
        if (!deleted) {
          res.status(404).json({ ok: false, error: `Profile "${name.trim()}" not found.` });
          return;
        }
        await logEvent('info', 'collection_deleted', { ip, name: name.trim() });
        res.status(200).json({ ok: true });
        break;
      }
    }
  } catch (err) {
    const safeErr = sanitizeError(err, 'general');
    await logEvent('error', 'collections_failed', { ip, action, message: err.message });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
