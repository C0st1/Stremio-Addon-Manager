/**
 * api/addons/import.js
 * Vercel serverless function — batch imports addons from a list of manifest URLs.
 * Fetches each manifest, validates it, merges into the existing cloud collection.
 *
 * POST only, requires auth. Rate limit: 10/60s.
 */

const stremioAPI = require('../../lib/stremioAPI');
const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { setAuthCors } = require('../../lib/cors');
const { hitRateLimit } = require('../../lib/rateLimiter');
const { logEvent } = require('../../lib/logger');
const { getClientIp } = require('../../lib/ip');
const { sanitizeError } = require('../../lib/errors');
const { setSecurityHeaders } = require('../../lib/securityHeaders');

const MAX_URLS = 50;
const MANIFEST_TIMEOUT_MS = 6000;
const MAX_CONCURRENT_FETCHES = 5;

/**
 * Validates that a URL is a well-formed http(s) string.
 * @param {string} url
 * @returns {boolean}
 */
function isValidHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\/.+/i.test(url.trim());
}

/**
 * Fetches a Stremio addon manifest from a URL with timeout.
 * @param {string} manifestUrl
 * @returns {Promise<object|null>}  Parsed manifest JSON or null on failure.
 */
async function fetchManifest(manifestUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS);
  try {
    const res = await fetch(manifestUrl + '/manifest.json', {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Validates a manifest object has required Stremio addon fields.
 * @param {object} manifest
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return { valid: false, reason: 'Not a valid manifest object' };
  if (!manifest.id || typeof manifest.id !== 'string') return { valid: false, reason: 'Missing or invalid manifest.id' };
  if (!manifest.name || typeof manifest.name !== 'string') return { valid: false, reason: 'Missing or invalid manifest.name' };
  if (!manifest.version || typeof manifest.version !== 'string') return { valid: false, reason: 'Missing or invalid manifest.version' };
  if (!Array.isArray(manifest.resources)) return { valid: false, reason: 'Missing or invalid manifest.resources' };
  if (!Array.isArray(manifest.types)) return { valid: false, reason: 'Missing or invalid manifest.types' };
  return { valid: true };
}

/**
 * Builds a standard addon object from a manifest URL and its fetched manifest.
 * @param {string} manifestUrl
 * @param {object} manifest
 * @returns {object}
 */
function buildAddonObject(manifestUrl, manifest) {
  const transportUrl = manifestUrl.replace(/\/+$/, '');
  return {
    transportUrl,
    transportName: 'http',
    manifest: {
      ...manifest,
      transportUrl,
    },
  };
}

/**
 * Runs promises with bounded concurrency.
 * @param {Array} items
 * @param {Function} fn
 * @param {number} concurrency
 * @returns {Promise<Array>}
 */
async function mapConcurrent(items, fn, concurrency) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item)).then(r => { executing.delete(p); return r; });
    executing.add(p);
    results.push(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
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
  const limit = hitRateLimit(`import:${ip}`, { max: 10, windowMs: 60_000 });
  if (limit.limited) {
    await logEvent('warn', 'import_rate_limited', { ip });
    res.status(429).json({ ok: false, error: 'Too many import requests. Try again in a minute.' });
    return;
  }

  refreshSession(req, res);

  const { urls } = req.body || {};

  if (!Array.isArray(urls)) {
    res.status(400).json({ ok: false, error: '"urls" must be an array of http(s) addon manifest URLs.' });
    return;
  }

  if (urls.length > MAX_URLS) {
    res.status(400).json({ ok: false, error: `Maximum ${MAX_URLS} URLs allowed per request.` });
    return;
  }

  // Validate all URLs
  const invalidUrls = urls.filter(u => !isValidHttpUrl(u));
  if (invalidUrls.length > 0) {
    res.status(400).json({ ok: false, error: `Invalid URLs provided. Each must be a valid http(s) URL.` });
    return;
  }

  try {
    // Fetch current cloud collection
    const { addons: existingAddons } = await stremioAPI.cloudGetAddons(authKey);

    // Build a set of existing transportUrls for deduplication
    const existingUrls = new Set(
      existingAddons.map(a => (a.transportUrl || a.manifest?.transportUrl || '').replace(/\/+$/, '').toLowerCase())
    );

    const failed = [];
    const importedAddons = [];

    // Deduplicate input URLs
    const uniqueUrls = [...new Set(urls.map(u => u.replace(/\/+$/, '')))];

    const results = await mapConcurrent(uniqueUrls, async (url) => {
      try {
        const manifest = await fetchManifest(url);
        if (!manifest) {
          return { url, error: 'Failed to fetch manifest' };
        }

        const validation = validateManifest(manifest);
        if (!validation.valid) {
          return { url, error: validation.reason };
        }

        const normalizedUrl = url.replace(/\/+$/, '').toLowerCase();
        if (existingUrls.has(normalizedUrl)) {
          return { url, error: 'Already in collection' };
        }

        const addon = buildAddonObject(url, manifest);
        return { url, addon };
      } catch (err) {
        return { url, error: err.message || 'Unknown error' };
      }
    }, MAX_CONCURRENT_FETCHES);

    for (const result of results) {
      if (result.error) {
        failed.push({ url: result.url, error: result.error });
      } else if (result.addon) {
        importedAddons.push(result.addon);
        existingUrls.add(result.url.replace(/\/+$/, '').toLowerCase());
      }
    }

    // Merge imported addons into the existing collection (prepend new ones)
    const mergedCollection = [...importedAddons, ...existingAddons];

    // Save merged collection to cloud
    if (importedAddons.length > 0) {
      await stremioAPI.cloudSetAddons(mergedCollection, authKey);
    }

    await logEvent('info', 'addons_imported', {
      ip,
      imported: importedAddons.length,
      failed: failed.length,
      total: uniqueUrls.length,
    });

    res.status(200).json({
      ok: true,
      imported: importedAddons.length,
      failed,
    });
  } catch (err) {
    const safeErr = sanitizeError(err, 'addonSet');
    await logEvent('error', 'import_failed', { ip, message: err.message });
    res.status(500).json({ ok: false, error: safeErr.message });
  }
};
