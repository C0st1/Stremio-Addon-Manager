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
  const baseUrl = process.env.API_BASE || `${proto}://${host}`;

  const htmlPath = path.join(__dirname, '..', 'configure.html');
  let html;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (e) {
    res.status(500).send('Could not read configure.html: ' + e.message);
    return;
  }

  // Just inject the API Base URL now
  const injected = html.replace('__API_BASE__', baseUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(injected);
};
