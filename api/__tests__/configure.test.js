const handler = require('../configure');

function mockReq(headers = {}) {
  return {
    headers: {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'my-app.vercel.app',
      ...headers,
    },
    method: 'GET',
  };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = null;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.send = jest.fn((body) => { res.body = body; return res; });
  return res;
}

describe('api/configure.js', () => {
  test('returns 200 with HTML content type', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/html');
  });

  test('injects API base URL into HTML', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.body).toContain('https://my-app.vercel.app');
    expect(res.body).not.toContain('__API_BASE__');
  });

  test('uses PUBLIC_API_BASE when set', () => {
    process.env.PUBLIC_API_BASE = 'https://custom.domain.com';
    // Need to re-require for env to take effect
    jest.resetModules();
    const configureHandler = require('../configure');

    const req = mockReq();
    const res = mockRes();

    configureHandler(req, res);

    expect(res.body).toContain('https://custom.domain.com');
    delete process.env.PUBLIC_API_BASE;
  });

  test('sets HTML security headers including CSP', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.headers['Content-Security-Policy']).toBeDefined();
    expect(res.headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(res.headers['X-Frame-Options']).toBe('DENY');
  });

  test('sets wildcard CORS header', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('constructs fallback URL from headers', () => {
    const req = mockReq({
      'x-forwarded-proto': 'http',
      'x-forwarded-host': 'localhost:3000',
    });
    const res = mockRes();

    handler(req, res);

    expect(res.body).toContain('http://localhost:3000');
  });
});
