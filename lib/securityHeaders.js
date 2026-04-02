/**
 * lib/securityHeaders.js
 *
 * Shared helpers for setting security-related HTTP headers across all
 * API endpoints and HTML pages.
 */

/**
 * Sets common security headers on a response.
 *
 * @param {import('http').ServerResponse} res
 * @param {'api'|'html'} [type='api']  Set to 'html' to also include CSP headers.
 */
function setSecurityHeaders(res, type = 'api') {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (type === 'html') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.strem.io https://cdn.jsdelivr.net; " +
      "font-src 'self'; " +
      "frame-ancestors 'none'"
    );
  }
}

module.exports = { setSecurityHeaders };
