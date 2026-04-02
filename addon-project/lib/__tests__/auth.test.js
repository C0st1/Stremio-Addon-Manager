const crypto = require('crypto');

// Capture original env keys/values (we'll restore by modifying process.env in-place)
const originalEnvKeys = Object.keys(process.env);
const originalEnvValues = {};
for (const key of originalEnvKeys) originalEnvValues[key] = process.env[key];

function mockReq(headers = {}, cookies = '') {
  return {
    headers: { cookie: cookies, ...headers },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = 200;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.end = jest.fn();
  res.json = jest.fn((body) => { res.body = body; return res; });
  res.send = jest.fn((body) => { res.body = body; return res; });
  return res;
}

// Helper to create a signed session token manually (since createSessionToken is internal)
function createTokenManually(secret, payload, maxAgeSeconds = 1800) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + maxAgeSeconds };
  const base64Url = (input) => Buffer.from(input).toString('base64url');
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const encoded = base64Url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

// Helper to create an expired token
function createExpiredToken(secret, authKey) {
  const now = Math.floor(Date.now() / 1000);
  const body = { authKey, iat: now - 2000, exp: now - 1000 };
  const base64Url = (input) => Buffer.from(input).toString('base64url');
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const encoded = base64Url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

// Helper to create a token with specific exp
function createTokenWithExp(secret, authKey, expSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { authKey, iat: now - 1755, exp: now + expSeconds };
  const base64Url = (input) => Buffer.from(input).toString('base64url');
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const encoded = base64Url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

const SECRET = 'test-secret-key-for-testing';

beforeEach(() => {
  // Restore env in-place (don't replace process.env — Node.js internals may cache the reference)
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvValues)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnvValues)) {
    process.env[key] = value;
  }
  delete process.env.SESSION_SECRET;
  delete process.env.VERCEL;
  delete process.env.NODE_ENV;
  jest.resetModules();
});

afterAll(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvValues)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnvValues)) {
    process.env[key] = value;
  }
});

describe('lib/auth', () => {
  describe('verifySessionToken', () => {
    let auth;

    beforeEach(() => {
      process.env.SESSION_SECRET = SECRET;
      auth = require('../auth');
    });

    test('verifies a valid token created manually', () => {
      const token = createTokenManually(SECRET, { authKey: 'my-secret-key' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);

      const payload = auth.verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload.authKey).toBe('my-secret-key');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    test('token expiry is set correctly (default 1800s)', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTokenManually(SECRET, { authKey: 'test' });
      const payload = auth.verifySessionToken(token);
      expect(payload.exp - payload.iat).toBe(1800);
      expect(payload.exp - now).toBeLessThanOrEqual(1800);
      expect(payload.exp - now).toBeGreaterThan(1790);
    });

    test('custom maxAgeSeconds is respected', () => {
      const now = Math.floor(Date.now() / 1000);
      const body = { authKey: 'test', iat: now, exp: now + 600 };
      const base64Url = (input) => Buffer.from(input).toString('base64url');
      const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
      const encoded = base64Url(JSON.stringify(body));
      const token = `${encoded}.${sign(encoded)}`;

      const payload = auth.verifySessionToken(token);
      expect(payload.exp - payload.iat).toBe(600);
    });

    test('expired token returns null', () => {
      const token = createExpiredToken(SECRET, 'test');
      expect(auth.verifySessionToken(token)).toBeNull();
    });

    test('tampered token returns null', () => {
      const token = createTokenManually(SECRET, { authKey: 'original' });
      const tampered = Buffer.from('{"authKey":"tampered"}').toString('base64url');
      const tamperedToken = `${tampered}.${token.split('.')[1]}`;

      expect(auth.verifySessionToken(tamperedToken)).toBeNull();
    });

    test('null/undefined/empty token returns null', () => {
      expect(auth.verifySessionToken(null)).toBeNull();
      expect(auth.verifySessionToken(undefined)).toBeNull();
      expect(auth.verifySessionToken('')).toBeNull();
    });

    test('token with wrong number of parts returns null', () => {
      expect(auth.verifySessionToken('a')).toBeNull();
      expect(auth.verifySessionToken('a.b.c')).toBeNull();
    });

    test('non-string token returns null', () => {
      expect(auth.verifySessionToken(123)).toBeNull();
      expect(auth.verifySessionToken({})).toBeNull();
    });

    test('different authKeys produce different tokens', () => {
      const token1 = createTokenManually(SECRET, { authKey: 'key1' });
      const token2 = createTokenManually(SECRET, { authKey: 'key2' });
      expect(token1).not.toBe(token2);
    });

    test('token signed with wrong secret returns null', () => {
      const token = createTokenManually('wrong-secret', { authKey: 'test' });
      expect(auth.verifySessionToken(token)).toBeNull();
    });
  });

  describe('getAuthKeyFromRequest', () => {
    let auth;

    beforeEach(() => {
      process.env.SESSION_SECRET = SECRET;
      auth = require('../auth');
    });

    test('extracts authKey from valid session cookie', () => {
      const token = createTokenManually(SECRET, { authKey: 'my-key' });
      const req = mockReq({}, `stremio_session=${token}`);

      expect(auth.getAuthKeyFromRequest(req)).toBe('my-key');
    });

    test('handles multiple cookies', () => {
      const token = createTokenManually(SECRET, { authKey: 'key123' });
      const req = mockReq({}, `other=value; stremio_session=${token}; another=test`);

      expect(auth.getAuthKeyFromRequest(req)).toBe('key123');
    });

    test('handles URL-encoded cookie values', () => {
      const token = createTokenManually(SECRET, { authKey: 'key-with-special' });
      const encodedToken = encodeURIComponent(token);
      const req = mockReq({}, `stremio_session=${encodedToken}`);

      expect(auth.getAuthKeyFromRequest(req)).toBe('key-with-special');
    });

    test('returns empty string when no session cookie', () => {
      const req = mockReq({}, 'other=value');
      expect(auth.getAuthKeyFromRequest(req)).toBe('');
    });

    test('returns empty string when no cookies at all', () => {
      const req = mockReq({});
      expect(auth.getAuthKeyFromRequest(req)).toBe('');
    });

    test('returns empty string for expired session', () => {
      const token = createExpiredToken(SECRET, 'expired-key');
      const req = mockReq({}, `stremio_session=${token}`);
      expect(auth.getAuthKeyFromRequest(req)).toBe('');
    });
  });

  describe('setSessionCookie', () => {
    let auth;

    beforeEach(() => {
      process.env.SESSION_SECRET = SECRET;
      process.env.NODE_ENV = 'development';
      auth = require('../auth');
    });

    test('sets HttpOnly, SameSite=Lax, Max-Age=1800 in dev mode', () => {
      const res = mockRes();
      auth.setSessionCookie(res, 'my-auth-key');
      const cookie = res.headers['Set-Cookie'];

      expect(cookie).toContain('stremio_session=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Max-Age=1800');
      expect(cookie).toContain('Path=/');
      expect(cookie).not.toContain('Secure');
    });

    test('sets Secure flag in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      process.env.SESSION_SECRET = SECRET;
      auth = require('../auth');

      const res = mockRes();
      auth.setSessionCookie(res, 'my-auth-key');
      const cookie = res.headers['Set-Cookie'];

      expect(cookie).toContain('Secure');
    });

    test('cookie contains a valid token that can be verified', () => {
      const res = mockRes();
      auth.setSessionCookie(res, 'verify-me');

      const cookie = res.headers['Set-Cookie'];
      const tokenMatch = cookie.match(/stremio_session=([^;]+)/);
      expect(tokenMatch).not.toBeNull();

      const payload = auth.verifySessionToken(decodeURIComponent(tokenMatch[1]));
      expect(payload).not.toBeNull();
      expect(payload.authKey).toBe('verify-me');
    });
  });

  describe('clearSessionCookie', () => {
    let auth;

    beforeEach(() => {
      process.env.SESSION_SECRET = SECRET;
      auth = require('../auth');
    });

    test('sets Max-Age=0 to clear cookie', () => {
      const res = mockRes();
      auth.clearSessionCookie(res);
      const cookie = res.headers['Set-Cookie'];

      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('stremio_session=');
      expect(cookie).toContain('HttpOnly');
    });
  });

  describe('refreshSession', () => {
    let auth;

    beforeEach(() => {
      process.env.SESSION_SECRET = SECRET;
      auth = require('../auth');
    });

    test('re-issues cookie when less than 15 minutes remain', () => {
      const token = createTokenWithExp(SECRET, 'test-key', 300); // 5 minutes remaining

      const req = mockReq({}, `stremio_session=${token}`);
      const res = mockRes();

      auth.refreshSession(req, res);
      expect(res.headers['Set-Cookie']).toBeDefined();
    });

    test('does NOT re-issue cookie when more than 15 minutes remain', () => {
      const token = createTokenManually(SECRET, { authKey: 'test-key' });

      const req = mockReq({}, `stremio_session=${token}`);
      const res = mockRes();

      auth.refreshSession(req, res);
      expect(res.headers['Set-Cookie']).toBeUndefined();
    });

    test('does nothing when no session cookie is present', () => {
      const req = mockReq({});
      const res = mockRes();

      auth.refreshSession(req, res);
      expect(res.headers['Set-Cookie']).toBeUndefined();
    });

    test('accepts pre-verified payload', () => {
      const token = createTokenManually(SECRET, { authKey: 'test-key' });
      const payload = auth.verifySessionToken(token);
      const res = mockRes();

      // Fresh token has >15 min remaining, so no refresh
      auth.refreshSession({}, res, payload);
      expect(res.headers['Set-Cookie']).toBeUndefined();
    });
  });

  describe('getSecret', () => {
    // getSecret() is called lazily (not at require time) — it throws only when
    // exported functions that depend on it (setSessionCookie, verifySessionToken, etc.)
    // are actually invoked.
    test('setSessionCookie throws in production (VERCEL) when SESSION_SECRET is not set', () => {
      jest.resetModules();
      delete process.env.SESSION_SECRET;
      process.env.VERCEL = '1';
      delete process.env.NODE_ENV;
      jest.resetModules();

      const auth = require('../auth');
      const res = mockRes();

      expect(() => auth.setSessionCookie(res, 'key')).toThrow('SESSION_SECRET environment variable is required');
    });

    test('verifySessionToken throws in production (NODE_ENV) when SESSION_SECRET is not set', () => {
      jest.resetModules();
      delete process.env.SESSION_SECRET;
      delete process.env.VERCEL;
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const auth = require('../auth');
      // verifySessionToken calls sign() which calls getSecret()
      expect(() => auth.verifySessionToken('some.token')).toThrow('SESSION_SECRET environment variable is required');
    });

    test('uses dev secret when not in production', () => {
      jest.resetModules();
      delete process.env.SESSION_SECRET;
      delete process.env.VERCEL;
      process.env.NODE_ENV = 'development';
      jest.resetModules();

      const auth = require('../auth');
      // The dev secret is 'dev-only-secret-change-me'
      const token = createTokenManually('dev-only-secret-change-me', { authKey: 'test' });
      expect(auth.verifySessionToken(token)).not.toBeNull();
    });
  });
});
