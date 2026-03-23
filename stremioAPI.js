/**
 * stremioAPI.js
 * Helper module for communicating with both:
 *   - Stremio's local HTTP server (http://127.0.0.1:11470)
 *   - Stremio's cloud API  (https://api.strem.io)
 *
 * The local API is available when Stremio desktop is running on the same machine.
 * The cloud API requires an authKey from the user's Stremio settings.
 */

const fetch = require('node-fetch');

const LOCAL_BASE  = 'http://127.0.0.1:11470';
const CLOUD_BASE  = 'https://api.strem.io';
const TIMEOUT_MS  = 8000; // 8 s timeout for every request

// ─── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Wraps fetch with a timeout so we don't hang forever when
 * the Stremio desktop app is not running.
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Local API ────────────────────────────────────────────────────────────────

/**
 * GET /api/addonCollectionGet
 * Returns the full ordered array of installed addon manifests.
 *
 * Stremio desktop exposes this endpoint without authentication for
 * local connections, but it may require an authKey for some versions.
 * We try without a key first, then fall back with one if provided.
 *
 * @returns {Promise<{addons: Array, authKey?: string}>}
 */
async function localGetAddons(authKey = '') {
  const url = `${LOCAL_BASE}/api/addonCollectionGet`;
  const body = authKey ? JSON.stringify({ authKey }) : JSON.stringify({});

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Local API responded with HTTP ${res.status}`);
  }

  const data = await res.json();

  // The response shape is: { result: { addons: [...] } }  OR  { addons: [...] }
  const addons = data?.result?.addons ?? data?.addons ?? data;
  if (!Array.isArray(addons)) {
    throw new Error('Unexpected response shape from local addonCollectionGet');
  }

  return { addons, authKey: data?.result?.authKey ?? authKey };
}

/**
 * POST /api/addonCollectionSet
 * Saves a new (reordered/modified) addon collection to the local Stremio server.
 *
 * @param {Array}  addons   - The full addon array in desired order
 * @param {string} authKey  - Optional auth key
 */
async function localSetAddons(addons, authKey = '') {
  const url = `${LOCAL_BASE}/api/addonCollectionSet`;
  const payload = authKey ? { authKey, addons } : { addons };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Local API responded with HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  // A successful save typically returns { result: true } or { ok: true }
  return data;
}

// ─── Cloud API ────────────────────────────────────────────────────────────────

/**
 * POST https://api.strem.io/api/addonCollectionGet
 * Fetches the cloud-synced addon collection.
 * Requires a valid authKey.
 *
 * @param {string} authKey
 * @returns {Promise<{addons: Array}>}
 */
async function cloudGetAddons(authKey) {
  if (!authKey) throw new Error('authKey is required for cloud API');

  const url = `${CLOUD_BASE}/api/addonCollectionGet`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, type: 'AddonCollectionGet' }),
  });

  if (!res.ok) {
    throw new Error(`Cloud API responded with HTTP ${res.status}`);
  }

  const data = await res.json();
  const addons = data?.result?.addons ?? data?.addons ?? [];
  if (!Array.isArray(addons)) {
    throw new Error('Unexpected response shape from cloud addonCollectionGet');
  }

  return { addons };
}

/**
 * POST https://api.strem.io/api/addonCollectionSet
 * Saves the addon collection to Stremio cloud (syncs across devices).
 *
 * @param {Array}  addons
 * @param {string} authKey
 */
async function cloudSetAddons(addons, authKey) {
  if (!authKey) throw new Error('authKey is required for cloud API');

  const url = `${CLOUD_BASE}/api/addonCollectionSet`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, addons, type: 'AddonCollectionSet' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloud API responded with HTTP ${res.status}: ${text}`);
  }

  return await res.json();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Checks whether the local Stremio server is reachable.
 * Returns true/false without throwing.
 */
async function isLocalServerReachable() {
  try {
    const res = await fetchWithTimeout(`${LOCAL_BASE}/`, { method: 'GET' });
    return res.ok || res.status < 500; // any real HTTP response means the server is up
  } catch {
    return false;
  }
}

module.exports = {
  localGetAddons,
  localSetAddons,
  cloudGetAddons,
  cloudSetAddons,
  isLocalServerReachable,
};
