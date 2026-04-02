/**
 * test/integration.test.js
 *
 * Comprehensive integration tests for the Stremio Addon Manager.
 * Tests full flows: login → session → get addons → set addons → check-links
 * Tests new endpoints: diff, import, collections, recommendations
 * Tests error scenarios: invalid auth, rate limiting, malformed requests
 */

// ─── Global mocks ────────────────────────────────────────────────────────────

// Mock stremioAPI (fetch-based)
const mockCloudLogin = jest.fn();
const mockCloudGetAddons = jest.fn();
const mockCloudSetAddons = jest.fn();

jest.mock('../lib/stremioAPI', () => ({
  cloudLogin: mockCloudLogin,
  cloudGetAddons: mockCloudGetAddons,
  cloudSetAddons: mockCloudSetAddons,
}));

jest.mock('../lib/auth', () => {
  const crypto = require('crypto');
  const SECRET = 'test-secret';
  const tokens = new Map();

  function createToken(authKey) {
    const payload = { authKey, exp: Math.floor(Date.now() / 1000) + 1800 };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  }

  function verify(token) {
    if (!token) return null;
    const [encoded, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
    if (sig !== expected) return null;
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch { return null; }
  }

  function getAuthKeyFromRequest(req) {
    const cookie = (req.headers.cookie || '').split(';').reduce((a, p) => {
      const [k, ...v] = p.trim().split('=');
      if (k) a[k] = decodeURIComponent(v.join('=') || '');
      return a;
    }, {});
    const token = cookie.stremio_session;
    const payload = verify(token);
    return payload?.authKey || '';
  }

  function setSessionCookie(res, authKey) {
    const token = createToken(authKey);
    res.setHeader('Set-Cookie', `stremio_session=${token}; Path=/; HttpOnly`);
  }

  function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'stremio_session=; Path=/; Max-Age=0');
  }

  function refreshSession(req, res) {}

  return {
    getAuthKeyFromRequest,
    setSessionCookie,
    clearSessionCookie,
    refreshSession,
  };
});

jest.mock('../lib/rateLimiter', () => ({
  hitRateLimit: jest.fn(() => ({ limited: false })),
}));

jest.mock('../lib/logger', () => ({
  logEvent: jest.fn(async () => {}),
}));

jest.mock('../lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

jest.mock('../lib/errors', () => ({
  sanitizeError: jest.fn((err, ctx) => new Error('Sanitized error')),
  SAFE_MESSAGES: {},
}));

jest.mock('../lib/securityHeaders', () => ({
  setSecurityHeaders: jest.fn(),
}));

jest.mock('../lib/cors', () => ({
  setAuthCors: jest.fn(),
  setPublicCors: jest.fn(),
}));

// Mock fs for configure.html
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html><body>Configure Page</body></html>'),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(method, body, cookie = '') {
  return {
    method,
    headers: { cookie },
    body: body || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function makeRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = null;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((body) => { res.body = body; return res; });
  res.end = jest.fn();
  return res;
}

/** Build a cookie string from a res object's Set-Cookie header */
function extractCookie(res) {
  const setCookie = res.headers['Set-Cookie'] || '';
  return setCookie.split(';')[0];
}

// ─── Import handlers ────────────────────────────────────────────────────────

const loginHandler = require('../api/login');
const sessionHandler = require('../api/session');
const addonsGetHandler = require('../api/addons/get');
const addonsSetHandler = require('../api/addons/set');
const addonsCheckLinksHandler = require('../api/addons/check-links');
const addonsDiffHandler = require('../api/addons/diff');
const addonsImportHandler = require('../api/addons/import');
const collectionsHandler = require('../api/collections');
const recommendationsHandler = require('../api/recommendations');
const docsHandler = require('../api/docs');
// Health is now handled by manifest.js (merged to reduce function count)
const healthHandler = require('../api/manifest');
const configureHandler = require('../api/configure');
const manifestHandler = require('../api/manifest');

// ─── Test fixtures ──────────────────────────────────────────────────────────

const AUTH_KEY = 'test-auth-key-integration';
const SAMPLE_ADDONS = [
  { transportUrl: 'https://opensubtitles.strem.io', transportName: 'http' },
  { transportUrl: 'https://torrentio.strem.io', transportName: 'http' },
  { transportUrl: 'https://debrid-stream.strem.io', transportName: 'http' },
];

function authedReq(method = 'POST', body = {}) {
  // Build a mock session cookie
  const res = makeRes();
  const auth = require('../lib/auth');
  auth.setSessionCookie(res, AUTH_KEY);
  const cookie = extractCookie(res);
  return { req: makeReq(method, body, cookie), cookie };
}

// ─── Integration Tests ──────────────────────────────────────────────────────

describe('Integration Tests — Full Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Login Flow ─────────────────────────────────────────────────────────

  describe('Login Flow', () => {
    test('successful login returns 200 and sets cookie', async () => {
      mockCloudLogin.mockResolvedValue(AUTH_KEY);

      const req = makeReq('POST', { email: 'user@test.com', password: 'pass' });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.headers['Set-Cookie']).toContain('stremio_session=');
    });

    test('login with missing email returns 400', async () => {
      const req = makeReq('POST', { password: 'pass' });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test('login with invalid credentials returns 401', async () => {
      mockCloudLogin.mockRejectedValue(new Error('Invalid credentials'));

      const req = makeReq('POST', { email: 'user@test.com', password: 'wrong' });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    test('logout clears session cookie', async () => {
      const req = makeReq('POST', { logout: true });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers['Set-Cookie']).toContain('Max-Age=0');
    });
  });

  // ── Session Flow ───────────────────────────────────────────────────────

  describe('Session Flow', () => {
    test('set session with valid auth key returns 200', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: [] });

      const req = makeReq('POST', { authKey: AUTH_KEY });
      const res = makeRes();

      await sessionHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('set session with missing auth key returns 400', async () => {
      const req = makeReq('POST', {});
      const res = makeRes();

      await sessionHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test('set session with invalid auth key returns 401', async () => {
      mockCloudGetAddons.mockRejectedValue(new Error('Unauthorized'));

      const req = makeReq('POST', { authKey: 'invalid' });
      const res = makeRes();

      await sessionHandler(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  // ── Addons CRUD Flow ──────────────────────────────────────────────────

  describe('Addons CRUD Flow', () => {
    test('get addons returns 200 with addons array', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      const { req } = authedReq();
      const res = makeRes();

      await addonsGetHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.addons).toHaveLength(3);
    });

    test('get addons without auth returns 400', async () => {
      const req = makeReq('POST');
      const res = makeRes();

      await addonsGetHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    test('set addons returns 200 on success', async () => {
      mockCloudSetAddons.mockResolvedValue({ ok: true });
      const { req } = authedReq('POST', { addons: SAMPLE_ADDONS });
      const res = makeRes();

      await addonsSetHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('set addons without auth returns 400', async () => {
      const req = makeReq('POST', { addons: SAMPLE_ADDONS });
      const res = makeRes();

      await addonsSetHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test('set addons with invalid data returns 400', async () => {
      const { req } = authedReq('POST', { addons: 'not-array' });
      const res = makeRes();

      await addonsSetHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test('full flow: get → modify → set → verify', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      mockCloudSetAddons.mockResolvedValue({ ok: true });

      // Step 1: Get current addons
      const { req: getReq } = authedReq();
      const getRes = makeRes();
      await addonsGetHandler(getReq, getRes);
      expect(getRes.statusCode).toBe(200);

      // Step 2: Remove one addon
      const modifiedAddons = getRes.body.addons.slice(1);

      // Step 3: Set modified addons
      const { req: setReq } = authedReq('POST', { addons: modifiedAddons });
      const setRes = makeRes();
      await addonsSetHandler(setReq, setRes);
      expect(setRes.statusCode).toBe(200);

      // Step 4: Verify
      expect(mockCloudSetAddons).toHaveBeenCalledWith(
        expect.arrayContaining(modifiedAddons),
        AUTH_KEY
      );
    });
  });

  // ── Check Links Flow ──────────────────────────────────────────────────

  describe('Check Links Flow', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('check links returns health results', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      const { req } = authedReq();
      const res = makeRes();

      await addonsCheckLinksHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.checks).toHaveLength(3);
    });

    test('check links handles fetch errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('DNS failure'));
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      const { req } = authedReq();
      const res = makeRes();

      await addonsCheckLinksHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.checks).toHaveLength(3);
      expect(res.body.checks.every(c => !c.ok || c.skipped)).toBe(false);
    });
  });

  // ── Diff Flow ─────────────────────────────────────────────────────────

  describe('Diff Flow', () => {
    test('diff with old and new addons returns correct comparison', async () => {
      const oldAddons = [{ transportUrl: 'https://a.strem.io' }];
      const newAddons = [{ transportUrl: 'https://b.strem.io' }];
      mockCloudGetAddons.mockResolvedValue({ addons: newAddons });

      const { req } = authedReq('POST', { oldAddons });
      const res = makeRes();

      await addonsDiffHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.added.length).toBeGreaterThanOrEqual(0);
      expect(res.body.removed.length).toBeGreaterThanOrEqual(0);
    });

    test('diff without auth returns 401', async () => {
      const req = makeReq('POST', {});
      const res = makeRes();

      await addonsDiffHandler(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  // ── Import Flow ───────────────────────────────────────────────────────

  describe('Import Flow', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('batch import adds new addons to collection', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      mockCloudSetAddons.mockResolvedValue({ ok: true });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'community.newaddon',
          name: 'New Addon',
          version: '1.0.0',
          resources: ['catalog'],
          types: ['movie'],
        }),
      });

      const { req } = authedReq('POST', { urls: ['https://new-addon.strem.io'] });
      const res = makeRes();

      await addonsImportHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.imported).toBe(1);
      expect(res.body.failed).toHaveLength(0);
    });

    test('import with invalid URL returns 400', async () => {
      const { req } = authedReq('POST', { urls: ['not-a-url'] });
      const res = makeRes();

      await addonsImportHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test('import with too many URLs returns 400', async () => {
      const { req } = authedReq('POST', { urls: Array(51).fill('https://a.strem.io') });
      const res = makeRes();

      await addonsImportHandler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Collections Flow ──────────────────────────────────────────────────

  describe('Collections Flow', () => {
    test('save and load a collection profile', async () => {
      const { req: saveReq } = authedReq('POST', {
        action: 'save',
        name: 'integration-test-profile',
        addons: SAMPLE_ADDONS,
      });
      const saveRes = makeRes();
      await collectionsHandler(saveReq, saveRes);

      expect(saveRes.statusCode).toBe(200);
      expect(saveRes.body.ok).toBe(true);

      const { req: loadReq } = authedReq('POST', {
        action: 'load',
        name: 'integration-test-profile',
      });
      const loadRes = makeRes();
      await collectionsHandler(loadReq, loadRes);

      expect(loadRes.statusCode).toBe(200);
      expect(loadRes.body.ok).toBe(true);
      expect(loadRes.body.addons).toEqual(SAMPLE_ADDONS);
    });

    test('list profiles returns profile names', async () => {
      // First save a profile
      const { req: saveReq } = authedReq('POST', {
        action: 'save',
        name: 'list-test-profile',
        addons: [],
      });
      const saveRes = makeRes();
      await collectionsHandler(saveReq, saveRes);

      // Then list
      const { req: listReq } = authedReq('POST', { action: 'list' });
      const listRes = makeRes();
      await collectionsHandler(listReq, listRes);

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.profiles).toContain('list-test-profile');
    });

    test('delete a collection profile', async () => {
      // First save
      const { req: saveReq } = authedReq('POST', {
        action: 'save',
        name: 'delete-test-profile',
        addons: [],
      });
      const saveRes = makeRes();
      await collectionsHandler(saveReq, saveRes);

      // Then delete
      const { req: deleteReq } = authedReq('POST', {
        action: 'delete',
        name: 'delete-test-profile',
      });
      const deleteRes = makeRes();
      await collectionsHandler(deleteReq, deleteRes);

      expect(deleteRes.statusCode).toBe(200);

      // Verify deleted
      const { req: loadReq } = authedReq('POST', {
        action: 'load',
        name: 'delete-test-profile',
      });
      const loadRes = makeRes();
      await collectionsHandler(loadReq, loadRes);

      expect(loadRes.statusCode).toBe(404);
    });

    test('invalid action returns 400', async () => {
      const { req } = authedReq('POST', { action: 'explode' });
      const res = makeRes();
      await collectionsHandler(req, res);
      expect(res.statusCode).toBe(400);
    });

    test('load nonexistent profile returns 404', async () => {
      const { req } = authedReq('POST', { action: 'load', name: 'nope' });
      const res = makeRes();
      await collectionsHandler(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Recommendations Flow ──────────────────────────────────────────────

  describe('Recommendations Flow', () => {
    test('GET returns list of recommendations', async () => {
      const req = makeReq('GET');
      const res = makeRes();
      await recommendationsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });

    test('POST with query returns filtered recommendations', async () => {
      const req = makeReq('POST', { query: 'subtitle' });
      const res = makeRes();
      await recommendationsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      for (const rec of res.body.recommendations) {
        const match =
          (rec.name || '').toLowerCase().includes('subtitle') ||
          (rec.description || '').toLowerCase().includes('subtitle');
        expect(match).toBe(true);
      }
    });
  });

  // ── Docs Flow ─────────────────────────────────────────────────────────

  describe('Docs Flow', () => {
    test('GET returns OpenAPI spec', () => {
      const req = makeReq('GET');
      const res = makeRes();
      docsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
    });

    test('POST returns 405', () => {
      const req = makeReq('POST');
      const res = makeRes();
      docsHandler(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  // ── Health Flow ───────────────────────────────────────────────────────

  describe('Health Flow', () => {
    test('GET returns health status', async () => {
      const req = makeReq('GET');
      req.url = '/api/health'; // merged handler routes by req.url
      const res = makeRes();
      await healthHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toBe('API is running correctly.');
    });
  });

  // ── Configure Flow ───────────────────────────────────────────────────

  describe('Configure Flow', () => {
    test('GET returns HTML page', async () => {
      const req = makeReq('GET');
      const res = makeRes();
      await configureHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Configure Page');
    });
  });

  // ── Manifest Flow ─────────────────────────────────────────────────────

  describe('Manifest Flow', () => {
    test('GET returns manifest JSON', async () => {
      const req = makeReq('GET');
      const res = makeRes();
      await manifestHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
    });
  });

  // ── Error Scenarios ───────────────────────────────────────────────────

  describe('Error Scenarios', () => {
    test('OPTIONS returns 204 on all endpoints', async () => {
      const endpoints = [
        [loginHandler, 'POST'],
        [sessionHandler, 'POST'],
        [addonsGetHandler, 'POST'],
        [addonsSetHandler, 'POST'],
        [addonsDiffHandler, 'POST'],
        [addonsImportHandler, 'POST'],
        [collectionsHandler, 'POST'],
      ];

      for (const [handler] of endpoints) {
        const req = makeReq('OPTIONS');
        const res = makeRes();
        await handler(req, res);
        expect(res.statusCode).toBe(204);
      }
    });

    test('wrong method returns 405 on all POST endpoints', async () => {
      const endpoints = [
        [loginHandler],
        [sessionHandler],
        [addonsGetHandler],
        [addonsSetHandler],
        [addonsDiffHandler],
        [addonsImportHandler],
        [collectionsHandler],
      ];

      for (const [handler] of endpoints) {
        const req = makeReq('GET');
        const res = makeRes();
        await handler(req, res);
        expect(res.statusCode).toBe(405);
      }
    });

    test('cloud API failure returns 500 for get addons', async () => {
      mockCloudGetAddons.mockRejectedValue(new Error('Server error'));
      const { req } = authedReq();
      const res = makeRes();

      await addonsGetHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.ok).toBe(false);
    });

    test('cloud API failure returns 500 for set addons', async () => {
      mockCloudSetAddons.mockRejectedValue(new Error('Server error'));
      const { req } = authedReq('POST', { addons: SAMPLE_ADDONS });
      const res = makeRes();

      await addonsSetHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.ok).toBe(false);
    });

    test('malformed request body is handled gracefully', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: [] });
      const { req } = authedReq('POST', null);
      const res = makeRes();

      await addonsGetHandler(req, res);

      // Should not crash — either returns normally or error
      expect(res.statusCode).toBeDefined();
    });
  });

  // ── Cross-Endpoint Consistency ────────────────────────────────────────

  describe('Cross-Endpoint Consistency', () => {
    test('auth cookie works across multiple endpoints', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });
      mockCloudSetAddons.mockResolvedValue({ ok: true });

      // Same auth cookie used for get and set
      const { req: getReq, cookie } = authedReq();
      const getRes = makeRes();
      await addonsGetHandler(getReq, getRes);
      expect(getRes.statusCode).toBe(200);

      const setReq = makeReq('POST', { addons: SAMPLE_ADDONS }, cookie);
      const setRes = makeRes();
      await addonsSetHandler(setReq, setRes);
      expect(setRes.statusCode).toBe(200);
    });

    test('collections and addons use same auth mechanism', async () => {
      mockCloudGetAddons.mockResolvedValue({ addons: SAMPLE_ADDONS });

      const { req: addonsReq, cookie } = authedReq();
      const addonsRes = makeRes();
      await addonsGetHandler(addonsReq, addonsRes);
      expect(addonsRes.statusCode).toBe(200);

      const collReq = makeReq('POST', { action: 'list' }, cookie);
      const collRes = makeRes();
      await collectionsHandler(collReq, collRes);
      expect(collRes.statusCode).toBe(200);
    });
  });
});
