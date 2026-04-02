/**
 * lib/ip.js
 *
 * Helpers for extracting the client's real IP address in a Vercel
 * serverless environment.  Prevents IP spoofing via x-forwarded-for by
 * preferring Vercel's verified header and falling back to the rightmost
 * IP in the chain (closest to the Vercel edge).
 */

/**
 * Returns the client IP most likely to be truthful.
 *
 * Resolution order:
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge and cannot be spoofed
 *   2. `x-forwarded-for`        — rightmost IP (closest to Vercel edge)
 *   3. `req.socket.remoteAddress`
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function getClientIp(req) {
  // Prefer Vercel's verified client IP header (cannot be spoofed)
  const vercelIp = req.headers['x-vercel-forwarded-for'];
  if (vercelIp) return vercelIp.split(',')[0].trim();

  // Fall back to x-forwarded-for — use the rightmost IP (closest to Vercel edge)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[ips.length - 1];
  }

  return req.socket?.remoteAddress || 'unknown';
}

module.exports = { getClientIp };
