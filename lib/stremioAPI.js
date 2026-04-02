/**
 * stremioAPI.js
 * Helper module for communicating with Stremio's cloud API (https://api.strem.io)
 * Requires an authKey from the user's Stremio settings.
 */

const CLOUD_BASE  = 'https://api.strem.io';
const TIMEOUT_MS  = 8000; // 8 s timeout for every request
const RETRY_DELAYS_MS = [300, 900, 1800];

// ─── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Wraps fetch with a timeout
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

function shouldRetry(resOrErr) {
  if (!resOrErr) return false;
  if (resOrErr instanceof Error) return true;
  return resOrErr.status >= 500 && resOrErr.status <= 599;
}

async function fetchWithRetry(url, options = {}) {
  let lastErr = null;
  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (!shouldRetry(res) || attempt === maxAttempts) return res;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetry(err)) throw err;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
    }
  }

  throw lastErr || new Error('Unknown request failure');
}

// ─── Cloud API ────────────────────────────────────────────────────────────────

/**
 * POST https://api.strem.io/api/login
 * Logs in and returns an authKey.
 */
async function cloudLogin(email, password) {
  const url = `${CLOUD_BASE}/api/login`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, type: 'Login' }),
  });

  if (!res.ok) throw new Error(`Stremio API responded with HTTP ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Invalid email or password');
  if (!data.result || !data.result.authKey) throw new Error('No auth key returned');

  return data.result.authKey;
}

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
  const res = await fetchWithRetry(url, {
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
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, addons, type: 'AddonCollectionSet' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloud API responded with HTTP ${res.status}: ${text}`);
  }

  const body = await res.text().catch(() => '');
  if (!body) return {};
  return JSON.parse(body);
}

module.exports = {
  cloudLogin,
  cloudGetAddons,
  cloudSetAddons,
};
