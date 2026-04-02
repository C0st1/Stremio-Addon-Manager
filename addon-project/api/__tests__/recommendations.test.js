const mockSetSecurityHeaders = jest.fn();
const mockSetPublicCors = jest.fn();

jest.mock('../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));
jest.mock('../../lib/cors', () => ({ setPublicCors: mockSetPublicCors }));

const handler = require('../recommendations');

function mockReq(method = 'GET', body = {}) {
  return { method, headers: {}, body };
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

describe('api/recommendations.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls setSecurityHeaders and setPublicCors', async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(mockSetSecurityHeaders).toHaveBeenCalledWith(res);
    expect(mockSetPublicCors).toHaveBeenCalledWith(req, res);
  });

  test('returns 204 on OPTIONS preflight', async () => {
    const req = mockReq('OPTIONS');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  test('returns 405 for DELETE requests', async () => {
    const req = mockReq('DELETE');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('GET returns all recommendations with ok=true', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  });

  test('GET recommendations have required fields', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);

    for (const rec of res.body.recommendations) {
      expect(rec).toHaveProperty('name');
      expect(rec).toHaveProperty('transportUrl');
      expect(rec).toHaveProperty('description');
    }
  });

  test('POST with query filters recommendations', async () => {
    const req = mockReq('POST', { query: 'subtitle' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    // Results should match the query
    for (const rec of res.body.recommendations) {
      const match =
        (rec.name || '').toLowerCase().includes('subtitle') ||
        (rec.description || '').toLowerCase().includes('subtitle') ||
        (rec.types || []).some(t => t.toLowerCase().includes('subtitle'));
      expect(match).toBe(true);
    }
  });

  test('POST without query returns empty array (undefined is falsy)', async () => {
    const req = mockReq('POST', {});
    const res = mockRes();
    await handler(req, res);

    // searchRecommendations(undefined) returns [] because !undefined is true
    expect(res.body.recommendations).toHaveLength(0);
  });

  test('POST with empty query returns empty array', async () => {
    const req = mockReq('POST', { query: '' });
    const res = mockRes();
    await handler(req, res);

    // searchRecommendations('') returns [] because !'' is true
    expect(res.body.recommendations).toHaveLength(0);
  });
});
