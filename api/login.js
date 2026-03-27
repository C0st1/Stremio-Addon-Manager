/**
 * api/login.js
 * Vercel serverless function — logs into Stremio and returns the Auth Key.
 */
const stremioAPI = require('../lib/stremioAPI');

const { Ratelimit } = require("@upstash/ratelimit");
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m") });

module.exports = async (req, res) => {
  const ip = req.headers["x-real-ip"] || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ ok: false, error: "Rate limit exceeded. Try again later." });
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
    const cookie = require('cookie');
    res.setHeader('Set-Cookie', cookie.serialize('stremioAuth', authKey, {
      httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7, path: '/'
    }));
    res.status(200).json({ ok: true, authKey });
  } catch (err) {
    console.error('[LOGIN]', err.message);
    res.status(401).json({ ok: false, error: err.message });
  }
};
