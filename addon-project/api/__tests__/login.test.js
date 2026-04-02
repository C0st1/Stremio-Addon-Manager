// Mock dependencies before requiring the handler
const mockCloudLogin = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockSetSessionCookie = jest.fn();
const mockClearSessionCookie = jest.fn();
const mockSetAuthCors = jest.fn();
const mockGetClientIp = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../lib/stremioAPI', () => ({ cloudLogin: mockCloudLogin }));
jest.mock('../../lib/rateLimiter', () => ({ hitRateLimit: mockHitRateLimit }));
jest.mock('../../lib/logger', () => ({ logEvent: mockLogEvent }));
jest.mock('../../lib/auth', () => ({
  setSessionCookie: mockSetSessionCookie,
  clearSessionCookie: mockClearSessionCookie,
}));
jest.mock('../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../lib/ip', () => ({ getClientIp: mockGetClientIp }));
jest.mock('../../lib/errors', () => ({
  sanitizeError: mockSanitizeError,
  SAFE_MESSAGES: {},
}));
jest.mock('../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));

const handler = require('../login');

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

describe('api/login.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHitRateLimit.mockReturnValue({ limited: false });
    mockSanitizeError.mockImplementation((err, ctx) => new Error('Safe error'));
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
    expect(res.body.error).toContain('Method not allowed');
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

    const req = mockReq('POST', { email: 'a@b.com', password: 'pass' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Too many login attempts');
    expect(mockLogEvent).toHaveBeenCalledWith('warn', 'login_rate_limited', { ip: '1.2.3.4' });
  });

  test('returns 400 when email is missing', async () => {
    const req = mockReq('POST', { password: 'pass' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Email and password are required');
  });

  test('returns 400 when password is missing', async () => {
    const req = mockReq('POST', { email: 'a@b.com' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when email is too long', async () => {
    const req = mockReq('POST', { email: 'a'.repeat(255), password: 'pass' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Input too long');
  });

  test('returns 400 when password is too long', async () => {
    const req = mockReq('POST', { email: 'a@b.com', password: 'p'.repeat(129) });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Input too long');
  });

  test('successful login sets session cookie and returns 200', async () => {
    mockCloudLogin.mockResolvedValue('auth-key-123');

    const req = mockReq('POST', { email: 'user@test.com', password: 'password' });
    const res = mockRes();

    await handler(req, res);

    expect(mockCloudLogin).toHaveBeenCalledWith('user@test.com', 'password');
    expect(mockSetSessionCookie).toHaveBeenCalledWith(res, 'auth-key-123');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('failed login returns 401 with sanitized error', async () => {
    mockCloudLogin.mockRejectedValue(new Error('Invalid credentials'));

    const req = mockReq('POST', { email: 'user@test.com', password: 'wrong' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(mockSanitizeError).toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith('error', 'login_failed', expect.objectContaining({
      message: 'Invalid credentials',
    }));
  });
});
