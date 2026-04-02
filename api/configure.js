/**
 * api/configure.js
 * Vercel serverless function — serves the interactive configure page.
 * Reads configure.html from the project root and injects the live
 * deployment URL so the client-side JS knows where to call the API.
 */

const fs   = require('fs');
const path = require('path');
const { setSecurityHeaders, generateCspNonce } = require('../lib/securityHeaders');
const { generateCsrfToken } = require('../lib/csrf');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const nonce = generateCspNonce();
  setSecurityHeaders(res, 'html', { nonce });

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const fallbackUrl = `${proto}://${host}`;
  const baseUrl = process.env.PUBLIC_API_BASE || fallbackUrl;

  const htmlPath = path.join(__dirname, '..', 'configure.html');
  let html;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (e) {
    res.status(500).send('Could not read configure.html');
    return;
  }

  // Generate CSRF token and inject into HTML
  const csrfToken = generateCsrfToken(req, res);
  const injected = html
    .replace(/__API_BASE__/g, baseUrl)
    .replace(/__CSRF_TOKEN__/g, csrfToken)
    .replace(/__CSP_NONCE__/g, nonce);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(injected);
};
