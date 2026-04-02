const handler = require('../health');

function mockReq() {
  return { headers: {}, method: 'GET' };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = null;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((body) => { res.body = body; return res; });
  return res;
}

describe('api/health.js', () => {
  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env.NODE_ENV;
  });

  test('returns 200 with ok: true', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe('API is running correctly.');
  });

  test('sets wildcard CORS header', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('sets security headers', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
  });

  test('detects Vercel environment', () => {
    process.env.VERCEL = '1';
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.body.environment).toBe('vercel');
  });

  test('detects NODE_ENV environment', () => {
    process.env.NODE_ENV = 'test';
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.body.environment).toBe('test');
  });

  test('defaults to development environment', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.body.environment).toBe('development');
  });
});
