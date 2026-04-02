/**
 * lib/responseCache.js
 *
 * Helpers for setting HTTP caching headers on API responses.
 * Supports Cache-Control, ETag, and Vary headers for proper cache management.
 */

const crypto = require('crypto');

/**
 * Sets caching-related headers on a response.
 *
 * @param {import('http').ServerResponse} res   The HTTP response object
 * @param {object}  [options]
 * @param {number}  [options.maxAge=60]              Max age in seconds for the cache
 * @param {number}  [options.staleWhileRevalidate=300]  Seconds to serve stale while revalidating
 * @param {boolean} [options.private=false]           Whether the response is user-specific
 * @param {string}  [options.body]                    Response body string (used to generate ETag)
 * @param {boolean} [options.varyByCookie=false]      Whether to add 'Vary: Cookie' header
 */
function setCacheHeaders(res, options = {}) {
  const {
    maxAge = 60,
    staleWhileRevalidate = 300,
    private: isPrivate = false,
    body,
    varyByCookie = false,
  } = options;

  // Build Cache-Control directive
  const directives = [];
  if (isPrivate) {
    directives.push('private');
  } else {
    directives.push('public');
  }
  directives.push(`max-age=${maxAge}`);
  if (staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  res.setHeader('Cache-Control', directives.join(', '));

  // Set ETag from body hash if body is provided
  if (body != null) {
    const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 32);
    res.setHeader('ETag', `"${hash}"`);
  }

  // Set Vary header for auth endpoints
  if (varyByCookie) {
    res.setHeader('Vary', 'Cookie');
  }
}

module.exports = { setCacheHeaders };
