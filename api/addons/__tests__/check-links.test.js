const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockCloudGetAddons = jest.fn();
const mockHitRateLimit = jest.fn();
const mockGetClientIp = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../../lib/auth', () => ({
  getAuthKeyFromRequest: mockGetAuthKeyFromRequest,
  refreshSession: mockRefreshSession,
}));
jest.mock('../../../lib/cors', () => ({ setAuthCors: mockSetAuthCors }));
jest.mock('../../../lib/stremioAPI', () => ({ cloudGetAddons: mockCloudGetAddons }));
jest.mock('../../../lib/rateLimiter', () => ({ hitRateLimit: mockHitRateLimit }));
jest.mock('../../../lib/ip', () => ({ getClientIp: mockGetClientIp }));
jest.mock('../../../lib/securityHeaders', () => ({ setSecurityHeaders: mockSetSecurityHeaders }));

const handler = require('../check-links');
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe('api/addons/check-links.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockHitRateLimit.mockReturnValue({ limited: false });
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
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

  test('returns 400 when no auth key', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('No active session');
  });

  test('returns 429 when rate limited', async () => {
    mockHitRateLimit.mockReturnValue({ limited: true });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.ok).toBe(false);
  });

  test('checks addon URLs and returns results', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { transportUrl: 'https://addon1.com/manifest.json', manifest: { id: 'com.addon1' } },
        { transportUrl: 'https://addon2.com/manifest.json', manifest: { id: 'com.addon2' } },
      ],
    });

    mockFetch.mockResolvedValue(new Response(null, { status: 200, ok: true }));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.checks).toHaveLength(2);
    expect(res.body.checks[0].url).toBe('https://addon1.com/manifest.json');
    expect(res.body.checks[0].ok).toBe(true);
  });

  test('skips local addons without pinging', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { transportUrl: 'http://127.0.0.1:11470/manifest.json', manifest: { id: 'org.stremio.local' } },
        { transportUrl: 'http://localhost:11470/manifest.json', manifest: { id: 'local' } },
      ],
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.checks).toHaveLength(2);
    expect(res.body.checks.every(c => c.skipped === true)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('handles addon with no transportUrl gracefully', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { manifest: { id: 'com.no-url' } },
      ],
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.checks).toHaveLength(1);
    expect(res.body.checks[0].ok).toBe(false);
  });

  test('treats 405 and 501 responses as skipped but healthy', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { transportUrl: 'https://no-head.com/manifest.json', manifest: { id: 'com.nohead' } },
      ],
    });

    mockFetch.mockResolvedValue(new Response(null, { status: 405, ok: false }));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.checks[0].ok).toBe(true);
    expect(res.body.checks[0].skipped).toBe(true);
    expect(res.body.checks[0].status).toBe(405);
  });

  test('returns failed check for network errors', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { transportUrl: 'https://down.com/manifest.json', manifest: { id: 'com.down' } },
      ],
    });

    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.checks[0].ok).toBe(false);
    expect(res.body.checks[0].skipped).toBe(false);
  });

  test('handles non-https URLs as skipped', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { transportUrl: 'ws://websocket.com/socket', manifest: { id: 'com.ws' } },
      ],
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.checks[0].ok).toBe(true);
    expect(res.body.checks[0].skipped).toBe(true);
  });

  test('returns 500 when cloudGetAddons fails', async () => {
    mockCloudGetAddons.mockRejectedValue(new Error('API down'));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Health check failed');
  });

  test('refreshes session on authenticated request', async () => {
    mockCloudGetAddons.mockResolvedValue({ addons: [] });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(mockRefreshSession).toHaveBeenCalledWith(req, res);
  });

  test('extracts transportUrl from manifest when top-level is missing', async () => {
    mockCloudGetAddons.mockResolvedValue({
      addons: [
        { manifest: { transportUrl: 'https://from-manifest.com/manifest.json', id: 'com.frommanifest' } },
      ],
    });

    mockFetch.mockResolvedValue(new Response(null, { status: 200, ok: true }));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.body.checks[0].url).toBe('https://from-manifest.com/manifest.json');
  });
});
