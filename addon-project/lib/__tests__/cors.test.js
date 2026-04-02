const { setAuthCors, setPublicCors } = require('../cors');

function mockReq(headers = {}) {
  return { headers };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  return res;
}

describe('lib/cors', () => {
  describe('setPublicCors', () => {
    test('sets wildcard CORS headers', () => {
      const req = mockReq();
      const res = mockRes();

      setPublicCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
      expect(res.headers['Access-Control-Allow-Headers']).toBe('Content-Type');
    });
  });

  describe('setAuthCors', () => {
    test('reflects matching origin from x-forwarded-host', () => {
      const req = mockReq({
        origin: 'https://my-app.vercel.app',
        'x-forwarded-host': 'my-app.vercel.app',
        'x-forwarded-proto': 'https',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my-app.vercel.app');
      expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(res.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    });

    test('reflects matching origin from host header (localhost)', () => {
      const req = mockReq({
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    test('reflects origin matching PUBLIC_API_BASE', () => {
      process.env.PUBLIC_API_BASE = 'https://custom-domain.com';
      const req = mockReq({
        origin: 'https://custom-domain.com',
        host: 'my-app.vercel.app',
        'x-forwarded-proto': 'https',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://custom-domain.com');

      delete process.env.PUBLIC_API_BASE;
    });

    test('does NOT set CORS for unknown origin', () => {
      const req = mockReq({
        origin: 'https://evil-site.com',
        host: 'my-app.vercel.app',
        'x-forwarded-proto': 'https',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    test('does nothing when no origin header is present', () => {
      const req = mockReq({ host: 'my-app.vercel.app' });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    test('defaults to http for localhost hosts without x-forwarded-proto', () => {
      const req = mockReq({
        origin: 'http://127.0.0.1:3000',
        host: '127.0.0.1:3000',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:3000');
    });

    test('defaults to https for non-localhost hosts without x-forwarded-proto', () => {
      const req = mockReq({
        origin: 'https://my-app.com',
        host: 'my-app.com',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my-app.com');
    });

    test('PUBLIC_API_BASE with trailing slash is normalized', () => {
      process.env.PUBLIC_API_BASE = 'https://custom.com/';
      const req = mockReq({
        origin: 'https://custom.com',
        host: 'other-app.vercel.app',
        'x-forwarded-proto': 'https',
      });
      const res = mockRes();

      setAuthCors(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://custom.com');

      delete process.env.PUBLIC_API_BASE;
    });
  });
});
