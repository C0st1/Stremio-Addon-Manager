const mockSetSecurityHeaders = jest.fn();
const mockSetPublicCors = jest.fn();

jest.mock('../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));
jest.mock('../../lib/cors', () => ({ setPublicCors: mockSetPublicCors }));

const handler = require('../docs');

function mockReq(method = 'GET') {
  return { method, headers: {} };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = null;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((body) => { res.body = body; return res; });
  res.end = jest.fn();
  return res;
}

describe('api/docs.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls setSecurityHeaders and setPublicCors', async () => {
    const req = mockReq();
    const res = mockRes();
    handler(req, res);
    expect(mockSetSecurityHeaders).toHaveBeenCalledWith(res);
    expect(mockSetPublicCors).toHaveBeenCalledWith(req, res);
  });

  test('returns 204 on OPTIONS preflight', () => {
    const req = mockReq('OPTIONS');
    const res = mockRes();
    handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  test('returns 405 for POST requests', () => {
    const req = mockReq('POST');
    const res = mockRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.ok).toBe(false);
  });

  test('GET returns OpenAPI 3.0 spec', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
  });

  test('spec has required OpenAPI fields', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);

    expect(res.body).toHaveProperty('info');
    expect(res.body).toHaveProperty('paths');
    expect(res.body).toHaveProperty('components');
    expect(res.body.info).toHaveProperty('title');
    expect(res.body.info).toHaveProperty('version');
  });

  test('spec includes all expected endpoints', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);

    const paths = Object.keys(res.body.paths);
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/login');
    expect(paths).toContain('/api/session');
    expect(paths).toContain('/api/addons/get');
    expect(paths).toContain('/api/addons/set');
    expect(paths).toContain('/api/addons/check-links');
    expect(paths).toContain('/api/addons/diff');
    expect(paths).toContain('/api/addons/import');
    expect(paths).toContain('/api/collections');
    expect(paths).toContain('/api/recommendations');
    expect(paths).toContain('/api/docs');
  });

  test('spec has security schemes defined', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);

    expect(res.body.components.securitySchemes).toHaveProperty('cookieAuth');
    expect(res.body.components.securitySchemes.cookieAuth.type).toBe('apiKey');
    expect(res.body.components.securitySchemes.cookieAuth.in).toBe('cookie');
  });

  test('spec has component schemas defined', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);

    expect(res.body.components.schemas).toHaveProperty('Error');
    expect(res.body.components.schemas).toHaveProperty('SuccessResponse');
    expect(res.body.components.schemas).toHaveProperty('Addon');
    expect(res.body.components.schemas).toHaveProperty('Recommendation');
  });

  test('sets Content-Type to application/json', () => {
    const req = mockReq('GET');
    const res = mockRes();
    handler(req, res);
    expect(res.headers['Content-Type']).toBe('application/json');
  });
});
