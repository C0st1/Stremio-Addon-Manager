/**
 * api/health.js
 * Vercel serverless function — simple API health check.
 */

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok:          true,
    environment: 'vercel',
    message:     'API is running correctly.',
  });
};
