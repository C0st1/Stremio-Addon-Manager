const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockGetClientIp = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();
const mockListCollectionProfiles = jest.fn();
const mockSaveCollectionProfile = jest.fn();
const mockGetCollectionProfile = jest.fn();
const mockDeleteCollectionProfile = jest.fn();

jest.mock('../../lib/auth', () => ({
  getAuthKeyFromRequest: mockGetAuthKeyFromRequest,
  refreshSession: mockRefreshSession,
}));
jest.mock('../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../lib/rateLimiter', () => ({ hitRateLimit: mockHitRateLimit }));
jest.mock('../../lib/logger', () => ({ logEvent: mockLogEvent }));
jest.mock('../../lib/ip', () => ({ getClientIp: mockGetClientIp }));
jest.mock('../../lib/errors', () => ({
  sanitizeError: mockSanitizeError,
  SAFE_MESSAGES: {},
}));
jest.mock('../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));
jest.mock('../../lib/collections', () => ({
  listCollectionProfiles: mockListCollectionProfiles,
  saveCollectionProfile: mockSaveCollectionProfile,
  getCollectionProfile: mockGetCollectionProfile,
  deleteCollectionProfile: mockDeleteCollectionProfile,
}));

const handler = require('../collections');

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

describe('api/collections.js', () => {
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

  test('returns 400 for invalid action', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
    const req = mockReq('POST', { action: 'invalid' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid action');
  });

  describe('list action', () => {
    test('returns list of profile names', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      mockListCollectionProfiles.mockReturnValue(['profile1', 'profile2']);

      const req = mockReq('POST', { action: 'list' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.profiles).toEqual(['profile1', 'profile2']);
    });
  });

  describe('save action', () => {
    test('saves a profile and returns 200', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      mockSaveCollectionProfile.mockReturnValue(true);

      const addons = [{ transportUrl: 'https://a.strem.io' }];
      const req = mockReq('POST', { action: 'save', name: 'my-profile', addons });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockSaveCollectionProfile).toHaveBeenCalledWith('my-profile', addons, 'auth-key');
    });

    test('returns 400 when name is empty', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      const req = mockReq('POST', { action: 'save', name: '', addons: [] });
      const res = mockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    test('returns 400 when addons are invalid', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      const req = mockReq('POST', { action: 'save', name: 'profile', addons: 'not-array' });
      const res = mockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid addon data');
    });
  });

  describe('load action', () => {
    test('loads a profile and returns addons', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      const addons = [{ transportUrl: 'https://a.strem.io' }];
      mockGetCollectionProfile.mockReturnValue(addons);

      const req = mockReq('POST', { action: 'load', name: 'my-profile' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.addons).toEqual(addons);
    });

    test('returns 404 when profile not found', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      mockGetCollectionProfile.mockReturnValue(null);

      const req = mockReq('POST', { action: 'load', name: 'nonexistent' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('delete action', () => {
    test('deletes a profile and returns 200', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      mockDeleteCollectionProfile.mockReturnValue(true);

      const req = mockReq('POST', { action: 'delete', name: 'my-profile' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('returns 404 when profile not found', async () => {
      mockGetAuthKeyFromRequest.mockReturnValue('auth-key');
      mockDeleteCollectionProfile.mockReturnValue(false);

      const req = mockReq('POST', { action: 'delete', name: 'nonexistent' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
