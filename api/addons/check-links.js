const { getAuthKeyFromRequest, refreshSession } = require('../../lib/auth');
const { validateSessionIp } = require('../../lib/sessionBinding');
const { validateCsrfToken } = require('../../lib/csrf');
const { setAuthCors } = require('../../lib/cors');
const { cloudGetAddons } = require('../../lib/stremioAPI');
const { hitRateLimit } = require('../../lib/rateLimiter');
const { logEvent } = require('../../lib/logger');
const { getClientIp } = require('../../lib/ip');
const { setSecurityHeaders } = require('../../lib/securityHeaders');

const MAX_CONCURRENT_PINGS = 5;

async function pingWithConcurrency(urls, pingFn) {
  const results = [];
  const executing = new Set();
  for (const url of urls) {
    const p = pingFn(url).then(r => { executing.delete(p); return r; });
    executing.add(p);
    results.push(p);
    if (executing.size >= MAX_CONCURRENT_PINGS) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function pingUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, status: null };
  if (!/^https?:\/\//i.test(url)) {
    return { ok: true, status: null, skipped: true };
  }

  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 405 || res.status === 501) {
      // Some addon hosts do not allow HEAD but are still healthy.
      return { ok: true, status: res.status, skipped: true };
    }
    return { ok: res.ok, status: res.status, skipped: false };
  } catch {
    return { ok: false, status: null, skipped: false };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  setAuthCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const authKey = getAuthKeyFromRequest(req);
  if (!authKey) { res.status(401).json({ ok: false, error: 'No active session found. Login or set your auth key first.' }); return; }

  // Rate limit check-links requests
  const ip = getClientIp(req);
  if (!validateSessionIp(ip, authKey)) {
    res.status(403).json({ ok: false, error: 'Session IP mismatch. Please log in again.' });
    return;
  }
  // CSRF validation (skip if no token present — allows non-browser clients)
  const csrfToken = req.headers['x-csrf-token'];
  if (csrfToken && !validateCsrfToken(req, csrfToken)) {
    res.status(403).json({ ok: false, error: 'Invalid CSRF token. Please reload the page and try again.' });
    return;
  }
  const limit = hitRateLimit(`check-links:${ip}`, { max: 10, windowMs: 60_000 });
  if (limit.limited) {
    res.status(429).json({ ok: false, error: 'Too many check requests. Please retry shortly.' });
    return;
  }

  // Sliding session renewal
  refreshSession(req, res);

  try {
    const { addons } = await cloudGetAddons(authKey);
    const urls = addons.map(addon => ({
      url: addon.transportUrl || addon?.manifest?.transportUrl || '',
      addonId: (addon?.manifest?.id || addon?.id || '').toLowerCase(),
    }));

    const checks = await pingWithConcurrency(urls, ({ url, addonId }) => {
      if (addonId === 'org.stremio.local' || addonId === 'local') {
        return Promise.resolve({ url, ok: true, status: null, skipped: true });
      }
      return pingUrl(url).then(result => ({ url, ...result }));
    });

    res.status(200).json({ ok: true, checks });
  } catch (err) {
    await logEvent('error', 'check_links_failed', { ip, message: err.message });
    res.status(500).json({ ok: false, error: 'Health check failed. Please try again later.' });
  }
};
