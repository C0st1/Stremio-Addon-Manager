const mockCloudGetAddons = jest.fn();
const mockCloudSetAddons = jest.fn();
const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockGetClientIp = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../../lib/stremioAPI', () => ({
  cloudGetAddons: mockCloudGetAddons,
  cloudSetAddons: mockCloudSetAddons,
}));
jest.mock('../../../lib/auth', () => ({
  getAuthKeyFromRequest: mockGetAuthKeyFromRequest,
  refreshSession: mockRefreshSession,
}));
jest.mock('../../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../../lib/rateLimiter', () => ({ hitRateLimit: mockHitRateLimit }));
jest.mock('../../../lib/logger', () => ({ logEvent: mockLogEvent }));
jest.mock('../../../lib/ip', () => ({ getClientIp: mockGetClientIp }));
jest.mock('../../../lib/errors', () => ({
  sanitizeError: mockSanitizeError,
  SAFE_MESSAGES: {},
}));
jest.mock('../../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));

const handler = require('../import');

function mockReq(method = 'POST', body = {}) {
  return { method, headers: {}, body, socket: { remoteAddress: '127.0.0.1' } };
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

describe('api/addons/import.js', () => {
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHitRateLimit.mockReturnValue({ limited: false });
    mockSanitizeError.mockImplementation((err) => new Error('Safe error'));
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('calls setSecurityHeaders and setAuthCors', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(mockSetSecurityHeaders).toHaveBeenCalledWith(res);
    expect(mockSetAuthCors).toHaveBeenCalledWith(req, res);
  });

  test('returns 204 on OPTIONS preflight', async () => {
    const req = mockReq('OPTIONS');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  test('returns 405 for GET requests', async () => {
    const req = mockReq('GET');
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('returns 401 when no auth key', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  test('returns 429 when rate limited', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockHitRateLimit.mockReturnValue({ limited: true });
    mockGetClientIp.mockReturnValue('1.2.3.4');
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
  });

  test('returns 400 when urls is not an array', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    const req = mockReq('POST', { urls: 'not-array' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('array');
  });

  test('returns 400 when urls array exceeds max', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    const req = mockReq('POST', { urls: Array(51).fill('https://a.strem.io') });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('50');
  });

  test('returns 400 when urls contain invalid entries', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    const req = mockReq('POST', { urls: ['not-a-url'] });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid URLs');
  });

  test('imports addons and merges with existing collection', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({
      addons: [{ transportUrl: 'https://existing.strem.io' }],
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'imported.addon',
        name: 'Imported',
        version: '1.0.0',
        resources: ['catalog'],
        types: ['movie'],
      }),
    });

    const req = mockReq('POST', { urls: ['https://import.strem.io'] });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.imported).toBe(1);
    expect(res.body.failed).toHaveLength(0);
  });

  test('reports failed imports', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const req = mockReq('POST', { urls: ['https://fail.strem.io'] });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.imported).toBe(0);
    expect(res.body.failed).toHaveLength(1);
  });

  test('deduplicates already existing addons', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({
      addons: [{ transportUrl: 'https://existing.strem.io' }],
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'existing.addon',
        name: 'Existing',
        version: '1.0.0',
        resources: ['catalog'],
        types: ['movie'],
      }),
    });

    const req = mockReq('POST', { urls: ['https://existing.strem.io'] });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.failed).toHaveLength(1);
    expect(res.body.failed[0].error).toContain('Already in collection');
  });
});
