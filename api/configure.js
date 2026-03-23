/**
 * api/configure.js
 * Vercel serverless function — serves the interactive configure page.
 * Reads configure.html from the project root and injects the live
 * deployment URL so the client-side JS knows where to call the API.
 */

const fs   = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const proto   = req.headers['x-forwarded-proto'] || 'https';
  const host    = req.headers['x-forwarded-host']  || req.headers.host;
  const baseUrl = `${proto}://${host}`;

  // configure.html lives at the project root (one level up from /api/)
  const htmlPath = path.join(__dirname, '..', 'configure.html');
  let html;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (e) {
    res.status(500).send('Could not read configure.html: ' + e.message);
    return;
  }

  // Replace the placeholder the client uses to call back to our API
  const injected = html
    .replace('__API_BASE__', baseUrl)
    // On Vercel, the local Stremio server is unreachable — default to cloud mode
    .replace("currentSource = 'local'", "currentSource = 'cloud'")
    .replace("data-src=\"local\" class=\"active\"", "data-src=\"local\"")
    .replace("data-src=\"cloud\"", "data-src=\"cloud\" class=\"active\"");

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(injected);
};
