const { getAuthKeyFromRequest } = require('../../lib/auth');
const { cloudGetAddons } = require('../../lib/stremioAPI');

async function pingUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, status: null };
  if (!/^https?:\/\//i.test(url)) {
    return { ok: true, status: null, skipped: true };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 405 || res.status === 501) {
      // Some addon hosts do not allow HEAD but are still healthy.
      return { ok: true, status: res.status, skipped: true };
    }
    return { ok: res.ok, status: res.status, skipped: false };
  } catch {
    return { ok: false, status: null, skipped: false };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const authKey = getAuthKeyFromRequest(req);
  if (!authKey) { res.status(400).json({ ok: false, error: 'No active session found. Login or set your auth key first.' }); return; }

  try {
    const { addons } = await cloudGetAddons(authKey);
    const checks = await Promise.all(
      addons.map(async addon => {
        const url = addon.transportUrl || addon?.manifest?.transportUrl || '';
        const result = await pingUrl(url);
        return { url, ...result };
      })
    );
    res.status(200).json({ ok: true, checks });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
