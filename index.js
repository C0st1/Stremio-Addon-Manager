/**
 * index.js — Stremio Addon Manager
 *
 * Serves both the Stremio addon manifest (so Stremio can install it)
 * and an Express-backed API that the configure page uses to read/write
 * the user's addon collection via the Stremio local or cloud API.
 *
 * Run:  node index.js   (or npm start)
 * Then install in Stremio:  http://localhost:7000/manifest.json
 */

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const stremioAPI = require('./lib/stremioAPI');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT        = process.env.PORT || 7000;
// When deployed remotely, set this env-var so the configure page knows
// where to send its API calls.  Locally it defaults to localhost.
const PUBLIC_URL  = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// ─── Addon Manifest ───────────────────────────────────────────────────────────

const MANIFEST = {
  id:          'community.addon-manager',
  version:     '1.0.0',
  name:        'Addon Manager',
  description: 'Reorder, enable/disable, and organize your installed Stremio addons with a beautiful drag-and-drop interface.',
  logo:        `${PUBLIC_URL}/logo.png`,
  background:  `${PUBLIC_URL}/bg.png`,

  // This addon is purely a utility — it does NOT provide streams, catalogs, or meta.
  // We declare a minimal catalog so Stremio accepts the manifest as valid.
  resources:   ['catalog'],
  types:       ['other'],
  catalogs:    [],          // empty — no actual catalogs exposed

  behaviorHints: {
    configurable:            true,   // shows the ⚙ Configure button
    configurationRequired:   false,  // user can install without configuring first
  },

  // Point Stremio at our custom configure page
  config: [
    {
      key:      'note',
      type:     'text',
      title:    'Open the Configure page below to manage your addons.',
      required: false,
    },
  ],
};

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// Allow cross-origin requests (Stremio webview may call our API from a different origin)
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Stremio Addon Routes ─────────────────────────────────────────────────────

/**
 * GET /manifest.json
 * Stremio fetches this to install/verify the addon.
 */
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(MANIFEST);
});

/**
 * GET /configure
 * Opens the interactive management UI.
 * Stremio calls this URL when the user clicks ⚙ Configure.
 * We pass the PUBLIC_URL so the page knows where to call our API.
 */
app.get('/configure', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'configure.html'), 'utf8');
  // Inject the server's base URL so client-side JS can reach our proxy API
  const injected = html.replace('__API_BASE__', PUBLIC_URL);
  res.setHeader('Content-Type', 'text/html');
  res.send(injected);
});

// Required by some Stremio versions — redirect root to configure
app.get('/', (req, res) => res.redirect('/configure'));

// ─── Proxy API (used by the configure page) ───────────────────────────────────

/**
 * GET /api/health
 * Quick health-check + reports whether the local Stremio server is reachable.
 */
app.get('/api/health', async (req, res) => {
  const localReachable = await stremioAPI.isLocalServerReachable();
  res.json({ ok: true, localStremioReachable: localReachable });
});

/**
 * POST /api/addons/get
 * Body: { authKey?: string, source: 'local' | 'cloud' }
 * Returns the current addon collection.
 */
app.post('/api/addons/get', async (req, res) => {
  const { authKey = '', source = 'local' } = req.body;

  try {
    let result;
    if (source === 'cloud') {
      result = await stremioAPI.cloudGetAddons(authKey);
    } else {
      result = await stremioAPI.localGetAddons(authKey);
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[GET addons]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/addons/set
 * Body: { authKey?: string, addons: Array, source: 'local' | 'cloud' | 'both' }
 * Saves the addon collection.
 */
app.post('/api/addons/set', async (req, res) => {
  const { authKey = '', addons, source = 'local' } = req.body;

  if (!Array.isArray(addons)) {
    return res.status(400).json({ ok: false, error: '"addons" must be an array' });
  }

  try {
    const results = {};

    if (source === 'local' || source === 'both') {
      results.local = await stremioAPI.localSetAddons(addons, authKey);
    }
    if (source === 'cloud' || source === 'both') {
      results.cloud = await stremioAPI.cloudSetAddons(addons, authKey);
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error('[SET addons]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          🎬  Stremio Addon Manager  🎬               ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Server running at: ${PUBLIC_URL.padEnd(32)}║`);
  console.log('║                                                      ║');
  console.log('║  To install in Stremio, paste this URL:              ║');
  console.log(`║  ${(PUBLIC_URL + '/manifest.json').padEnd(52)}║`);
  console.log('║                                                      ║');
  console.log('║  Then click ⚙ Configure to manage your addons.      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
});
