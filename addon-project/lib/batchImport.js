/**
 * lib/batchImport.js
 *
 * Batch import of Stremio addon manifests from URLs.
 * Fetches manifests with timeout and validates required fields.
 * Uses limited concurrency to avoid overwhelming the network.
 */

const BATCH_TIMEOUT_MS = 10000; // 10s per manifest fetch
const CONCURRENCY = 3;

/**
 * Validates that a manifest object has the required fields.
 *
 * @param {object} manifest  The parsed manifest JSON
 * @returns {{ valid: boolean, error?: string }}
 */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest is not a valid object' };
  }

  if (!manifest.id) {
    return { valid: false, error: 'Manifest missing required field: id' };
  }

  const transportUrl = manifest.transportUrl || (manifest.manifest && manifest.manifest.transportUrl);
  if (!transportUrl) {
    return { valid: false, error: 'Manifest missing required field: transportUrl (or manifest.transportUrl)' };
  }

  return { valid: true };
}

/**
 * Fetches a single manifest URL with timeout.
 *
 * @param {string} url  The manifest URL to fetch
 * @returns {Promise<{ url: string, manifest?: object, error?: string }>}
 */
async function fetchManifest(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      return { url, error: `HTTP ${res.status}` };
    }

    const manifest = await res.json();
    const validation = validateManifest(manifest);

    if (!validation.valid) {
      return { url, error: validation.error };
    }

    return { url, manifest };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { url, error: 'Request timed out' };
    }
    return { url, error: err.message || 'Fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Processes an array of manifest URLs in batches with limited concurrency.
 *
 * @param {string[]} urls  Array of addon manifest URLs
 * @returns {Promise<{ imported: object[], failed: Array<{ url: string, error: string }> }>}
 */
async function batchImportAddons(urls) {
  if (!Array.isArray(urls)) {
    return { imported: [], failed: [] };
  }

  const results = [];
  const queue = [...urls];
  const workers = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (url) {
            results.push(await fetchManifest(url));
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  const imported = results.filter(r => r.manifest).map(r => r.manifest);
  const failed = results.filter(r => r.error).map(r => ({ url: r.url, error: r.error }));

  return { imported, failed };
}

module.exports = { batchImportAddons };
