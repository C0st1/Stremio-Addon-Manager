const mockCloudGetAddons = jest.fn();
const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockGetClientIp = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../../lib/stremioAPI', () => ({ cloudGetAddons: mockCloudGetAddons }));
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

const handler = require('../diff');

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

describe('api/addons/diff.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHitRateLimit.mockReturnValue({ limited: false });
    mockSanitizeError.mockImplementation((err) => new Error('Safe error'));
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
    expect(res.body.ok).toBe(false);
  });

  test('returns 401 when no auth key', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('returns 429 when rate limited', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockHitRateLimit.mockReturnValue({ limited: true });
    mockGetClientIp.mockReturnValue('1.2.3.4');
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
    expect(res.body.ok).toBe(false);
  });

  test('returns diff when oldAddons provided', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({
      addons: [{ transportUrl: 'https://new.strem.io' }],
    });

    const req = mockReq('POST', {
      oldAddons: [{ transportUrl: 'https://old.strem.io' }],
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('added');
    expect(res.body).toHaveProperty('removed');
    expect(res.body).toHaveProperty('reordered');
    expect(res.body).toHaveProperty('unchanged');
  });

  test('fetches cloud state when oldAddons not provided', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({
      addons: [{ transportUrl: 'https://a.strem.io' }],
    });

    const req = mockReq('POST', {});
    const res = mockRes();
    await handler(req, res);

    // Should call cloudGetAddons twice (once for old baseline, once for new)
    expect(mockCloudGetAddons).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
  });

  test('returns 500 when API call fails', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockRejectedValue(new Error('Network error'));
    mockSanitizeError.mockImplementation((err) => new Error('Safe error'));

    const req = mockReq('POST', {});
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(mockLogEvent).toHaveBeenCalled();
  });

  test('refreshes session on authenticated request', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    mockCloudGetAddons.mockResolvedValue({ addons: [] });
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(mockRefreshSession).toHaveBeenCalledWith(req, res);
  });
});
