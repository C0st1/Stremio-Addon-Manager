/**
 * api/addons/resolve-manifest.js
 * Vercel serverless function — fetches an addon manifest server-side.
 * Avoids CORS issues when the browser can't directly reach addon servers.
 *
 * POST { transportUrl: string }
 * Returns { ok: true, manifest: object } or { ok: false, error: string }
 */

const { setSecurityHeaders } = require('../../lib/securityHeaders');
const { setPublicCors } = require('../../lib/cors');
const { getClientIp } = require('../../lib/ip');
const { hitRateLimit } = require('../../lib/rateLimiter');

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const limit = hitRateLimit(`resolve:${ip}`, { max: 30, windowMs: 60_000 });
  if (limit.limited) {
    res.status(429).json({ ok: false, error: 'Rate limit exceeded.' });
    return;
  }

  const { transportUrl } = req.body || {};
  if (!transportUrl || typeof transportUrl !== 'string') {
    res.status(400).json({ ok: false, error: 'transportUrl is required.' });
    return;
  }

  if (!/^https?:\/\//i.test(transportUrl)) {
    res.status(400).json({ ok: false, error: 'transportUrl must be http(s).' });
    return;
  }

  try {
    const manifestUrl = transportUrl.replace(/\/+$/, '') + '/manifest.json';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchRes = await fetch(manifestUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!fetchRes.ok) {
      res.status(200).json({ ok: false, error: `Manifest returned HTTP ${fetchRes.status}` });
      return;
    }

    const manifest = await fetchRes.json();
    res.status(200).json({ ok: true, manifest });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.name === 'AbortError' ? 'Manifest fetch timed out.' : 'Could not reach addon server.' });
  }
};
