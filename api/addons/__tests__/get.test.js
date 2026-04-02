const mockCloudGetAddons = jest.fn();
const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockLogEvent = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../../lib/stremioAPI', () => ({ cloudGetAddons: mockCloudGetAddons }));
jest.mock('../../../lib/auth', () => ({
  getAuthKeyFromRequest: mockGetAuthKeyFromRequest,
  refreshSession: mockRefreshSession,
}));
jest.mock('../../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../../lib/logger', () => ({ logEvent: mockLogEvent }));
jest.mock('../../../lib/errors', () => ({
  sanitizeError: mockSanitizeError,
  SAFE_MESSAGES: {},
}));
jest.mock('../../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));

const handler = require('../get');

function mockReq(method = 'POST') {
  return {
    method,
    headers: {},
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

describe('api/addons/get.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('returns 400 when no auth key is present', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('No active session');
  });

  test('refreshes session on authenticated request', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(mockRefreshSession).toHaveBeenCalledWith(req, res);
  });

  test('returns addons on successful fetch', async () => {
    const testAddons = [
      { transportUrl: 'https://a.com/manifest.json', name: 'Addon A' },
      { transportUrl: 'https://b.com/manifest.json', name: 'Addon B' },
    ];
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
    mockCloudGetAddons.mockResolvedValue({ addons: testAddons });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.addons).toEqual(testAddons);
    expect(mockCloudGetAddons).toHaveBeenCalledWith('valid-key');
  });

  test('returns 500 when cloud API fails', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
    mockCloudGetAddons.mockRejectedValue(new Error('Network error'));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(mockSanitizeError).toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith('error', 'addons_get_failed', expect.any(Object));
  });

  test('returns empty addons array when no addons', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.addons).toEqual([]);
  });
});
