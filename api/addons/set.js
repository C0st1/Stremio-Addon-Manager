/**
 * api/addons/set.js
 * Vercel serverless function — saves the user's addon collection to the Stremio cloud.
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

  const { authKey = '', addons } = req.body || {};

  if (!Array.isArray(addons)) {
    res.status(400).json({ ok: false, error: '"addons" must be an array' });
    return;
  }

  if (!authKey) {
    res.status(400).json({
      ok:    false,
      error: 'An auth key is required to save your addons.',
    });
    return;
  }

  try {
    const result = await stremioAPI.cloudSetAddons(addons, authKey);
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[SET addons]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
