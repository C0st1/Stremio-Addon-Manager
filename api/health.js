/**
 * api/health.js
 * Vercel serverless function — simple API health check.
 */

const { setSecurityHeaders } = require('../lib/securityHeaders');

module.exports = (req, res) => {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  const env = process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV || 'development');
  res.status(200).json({
    ok:          true,
    environment: env,
    message:     'API is running correctly.',
  });
};
