/**
 * lib/cors.js
 * Shared CORS helpers.
 *
 * - setAuthCors:   For authenticated endpoints — reflects the deployment's own
 *                  origin and enables credentials. Rejects unknown origins.
 * - setPublicCors: For public endpoints (manifest, health, configure) — wildcard.
 */

/**
 * Sets CORS headers for authenticated (cookie-based) endpoints.
 * Only reflects the Origin back if it matches this deployment's own domain
 * or the PUBLIC_API_BASE override.
 */
function setAuthCors(req, res) {
  const origin = req.headers.origin;

  if (origin) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.');
    const proto = req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https');
    const selfOrigin = `${proto}://${host}`;

    // Collect every origin that should be trusted
    const allowed = new Set([selfOrigin]);
    if (process.env.PUBLIC_API_BASE) {
      allowed.add(process.env.PUBLIC_API_BASE.replace(/\/+$/, ''));
    }

    if (allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // If the origin is not allowed, no CORS headers are set → browser blocks the response.
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Sets CORS headers for public endpoints that never use credentials.
 */
function setPublicCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { setAuthCors, setPublicCors };
