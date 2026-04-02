const mockCloudGetAddons = jest.fn();
const mockSetSessionCookie = jest.fn();
const mockClearSessionCookie = jest.fn();
const mockSetAuthCors = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockGetClientIp = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../lib/stremioAPI', () => ({ cloudGetAddons: mockCloudGetAddons }));
jest.mock('../../lib/auth', () => ({
  setSessionCookie: mockSetSessionCookie,
  clearSessionCookie: mockClearSessionCookie,
}));
jest.mock('../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../lib/rateLimiter', () => ({ hitRateLimit: mockHitRateLimit }));
jest.mock('../../lib/logger', () => ({ logEvent: mockLogEvent }));
jest.mock('../../lib/ip', () => ({ getClientIp: mockGetClientIp }));
jest.mock('../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));

const handler = require('../session');

function mockReq(method = 'POST', body = {}) {
  return {
    method,
    headers: {},
    body,
    socket: { remoteAddress: '127.0.0.1' },
  };
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

describe('api/session.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHitRateLimit.mockReturnValue({ limited: false });
  });

  test('calls setSecurityHeaders and setAuthCors', async () => {
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
    expect(res.end).toHaveBeenCalled();
  });

  test('returns 405 for GET requests', async () => {
    const req = mockReq('GET');
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.ok).toBe(false);
  });

  test('handles logout by clearing session cookie', async () => {
    const req = mockReq('POST', { logout: true });
    const res = mockRes();

    await handler(req, res);

    expect(mockClearSessionCookie).toHaveBeenCalledWith(res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('returns 429 when rate limited', async () => {
    mockHitRateLimit.mockReturnValue({ limited: true });
    mockGetClientIp.mockReturnValue('1.2.3.4');

    const req = mockReq('POST', { authKey: 'some-key' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.ok).toBe(false);
  });

  test('returns 400 when authKey is missing', async () => {
    const req = mockReq('POST', {});
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('authKey is required');
  });

  test('returns 400 when authKey is empty string', async () => {
    const req = mockReq('POST', { authKey: '   ' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('authKey is required');
  });

  test('returns 401 when authKey is invalid', async () => {
    mockCloudGetAddons.mockRejectedValue(new Error('Unauthorized'));

    const req = mockReq('POST', { authKey: 'invalid-key' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Invalid auth key');
    expect(mockLogEvent).toHaveBeenCalledWith('warn', 'session_auth_key_invalid', expect.any(Object));
  });

  test('successful auth sets session cookie and returns 200', async () => {
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    const req = mockReq('POST', { authKey: 'valid-key' });
    const res = mockRes();

    await handler(req, res);

    expect(mockCloudGetAddons).toHaveBeenCalledWith('valid-key');
    expect(mockSetSessionCookie).toHaveBeenCalledWith(res, 'valid-key');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('trims whitespace from authKey', async () => {
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    const req = mockReq('POST', { authKey: '  valid-key  ' });
    const res = mockRes();

    await handler(req, res);

    expect(mockCloudGetAddons).toHaveBeenCalledWith('valid-key');
    expect(mockSetSessionCookie).toHaveBeenCalledWith(res, 'valid-key');
  });
});
