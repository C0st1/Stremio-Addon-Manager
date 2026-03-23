/**
 * api/addons/get.js
 * Vercel serverless function — fetches the user's addon collection.
 *
 * On Vercel the local Stremio API (127.0.0.1:11470) is unreachable,
 * so we only support the cloud source here.  If someone passes
 * source='local' we return a clear error rather than timing out.
 */

const stremioAPI = require('../../lib/stremioAPI');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { authKey = '' } = req.body || {};

  if (!authKey) {
    res.status(400).json({
      ok:    false,
      error: 'An auth key is required. Find it in Stremio → Settings → Account.',
    });
    return;
  }

  try {
    const result = await stremioAPI.cloudGetAddons(authKey);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[GET addons]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
