const zlib = require('zlib');

const mockCloudSetAddons = jest.fn();
const mockGetAuthKeyFromRequest = jest.fn();
const mockRefreshSession = jest.fn();
const mockSetAuthCors = jest.fn();
const mockHitRateLimit = jest.fn();
const mockLogEvent = jest.fn();
const mockGetClientIp = jest.fn();
const mockSanitizeError = jest.fn();
const mockSetSecurityHeaders = jest.fn();

jest.mock('../../../lib/stremioAPI', () => ({ cloudSetAddons: mockCloudSetAddons }));
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

const handler = require('../set');

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

describe('api/addons/set.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHitRateLimit.mockReturnValue({ limited: false });
    mockGetAuthKeyFromRequest.mockReturnValue('valid-key');
    mockSanitizeError.mockImplementation((err) => new Error('Safe error'));
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

  test('returns 400 when addons is not an array', async () => {
    const req = mockReq('POST', { addons: 'not-array' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('must be an array');
  });

  test('returns 400 when addons array is invalid', async () => {
    const req = mockReq('POST', { addons: [{ notTransportUrl: 'bad' }] });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid addon data');
  });

  test('returns 400 when no auth key', async () => {
    mockGetAuthKeyFromRequest.mockReturnValue('');

    const validAddons = [{ transportUrl: 'https://a.com/manifest.json' }];
    const req = mockReq('POST', { addons: validAddons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('No active session');
  });

  test('returns 429 when rate limited', async () => {
    mockHitRateLimit.mockReturnValue({ limited: true });
    mockGetClientIp.mockReturnValue('1.2.3.4');

    const validAddons = [{ transportUrl: 'https://a.com/manifest.json' }];
    const req = mockReq('POST', { addons: validAddons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.ok).toBe(false);
  });

  test('successful save returns 200 with result', async () => {
    mockCloudSetAddons.mockResolvedValue({ success: true });

    const addons = [
      { transportUrl: 'https://a.com/manifest.json' },
      { transportUrl: 'https://b.com/manifest.json' },
    ];
    const req = mockReq('POST', { addons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.result).toEqual({ success: true });
    expect(mockCloudSetAddons).toHaveBeenCalledWith(addons, 'valid-key');
    expect(mockRefreshSession).toHaveBeenCalledWith(req, res);
  });

  test('handles addons with manifest.transportUrl', async () => {
    mockCloudSetAddons.mockResolvedValue({ success: true });

    const addons = [
      { manifest: { transportUrl: 'https://a.com/manifest.json' } },
    ];
    const req = mockReq('POST', { addons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  test('rejects addons with non-http transportUrl', async () => {
    const req = mockReq('POST', {
      addons: [{ transportUrl: 'ftp://bad.com/manifest.json' }],
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('rejects addons with more than 500 items', async () => {
    const addons = Array.from({ length: 501 }, (_, i) => ({
      transportUrl: `https://addon${i}.com/manifest.json`,
    }));
    const req = mockReq('POST', { addons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('allows empty addons array', async () => {
    mockCloudSetAddons.mockResolvedValue({ success: true });

    const req = mockReq('POST', { addons: [] });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  test('returns 500 when cloud API fails', async () => {
    mockCloudSetAddons.mockRejectedValue(new Error('Server error'));

    const addons = [{ transportUrl: 'https://a.com/manifest.json' }];
    const req = mockReq('POST', { addons });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(mockSanitizeError).toHaveBeenCalled();
  });

  describe('compressed payload support', () => {
    test('handles gzip-compressed addons', async () => {
      mockCloudSetAddons.mockResolvedValue({ success: true });

      const addons = [{ transportUrl: 'https://a.com/manifest.json' }];
      const json = JSON.stringify(addons);
      const compressed = zlib.gzipSync(Buffer.from(json));

      const req = mockReq('POST', {
        compressedAddons: compressed.toString('base64'),
        compression: 'gzip',
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockCloudSetAddons).toHaveBeenCalledWith(addons, 'valid-key');
    });

    test('handles brotli-compressed addons', async () => {
      mockCloudSetAddons.mockResolvedValue({ success: true });

      const addons = [{ transportUrl: 'https://a.com/manifest.json' }];
      const json = JSON.stringify(addons);
      const compressed = zlib.brotliCompressSync(Buffer.from(json));

      const req = mockReq('POST', {
        compressedAddons: compressed.toString('base64'),
        compression: 'br',
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockCloudSetAddons).toHaveBeenCalledWith(addons, 'valid-key');
    });

    test('returns 400 on invalid compressed data', async () => {
      const req = mockReq('POST', {
        compressedAddons: 'not-valid-base64!!!',
        compression: 'gzip',
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockSanitizeError).toHaveBeenCalled();
    });

    test('defaults to gzip when compression type is not brotli', async () => {
      mockCloudSetAddons.mockResolvedValue({ success: true });

      const addons = [{ transportUrl: 'https://a.com/manifest.json' }];
      const json = JSON.stringify(addons);
      const compressed = zlib.gzipSync(Buffer.from(json));

      const req = mockReq('POST', {
        compressedAddons: compressed.toString('base64'),
        compression: 'unknown',
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
