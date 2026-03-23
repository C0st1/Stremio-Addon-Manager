/**
 * api/login.js
 * Vercel serverless function — logs into Stremio and returns the Auth Key.
 */
const stremioAPI = require('../lib/stremioAPI');

module.exports = async (req, res) => {
  // Handle CORS pre-flight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email and password are required' });
    return;
  }

  try {
    const authKey = await stremioAPI.cloudLogin(email, password);
    res.status(200).json({ ok: true, authKey });
  } catch (err) {
    console.error('[LOGIN]', err.message);
    res.status(401).json({ ok: false, error: err.message });
  }
};
