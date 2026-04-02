const { generateCsrfToken, validateCsrfToken } = require('../csrf');

function mockReq(cookieHeader = '') {
  return { headers: { cookie: cookieHeader } };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  return res;
}

describe('lib/csrf.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCsrfToken', () => {
    test('returns a 64-character hex string', () => {
      const req = mockReq();
      const res = mockRes();

      const token = generateCsrfToken(req, res);

      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    test('sets a _csrf_salt cookie on the response', () => {
      const req = mockReq();
      const res = mockRes();

      generateCsrfToken(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('_csrf_salt=')
      );
    });

    test('generates unique tokens on each call', () => {
      const req = mockReq();
      const res1 = mockRes();
      const res2 = mockRes();

      const token1 = generateCsrfToken(req, res1);
      const token2 = generateCsrfToken(req, res2);

      expect(token1).not.toBe(token2);
    });

    test('cookie contains a dot-separated salt and signature', () => {
      const req = mockReq();
      const res = mockRes();

      generateCsrfToken(req, res);

      const cookieCall = res.setHeader.mock.calls.find(
        ([key]) => key === 'Set-Cookie'
      );
      const cookieValue = cookieCall[1];
      const decoded = decodeURIComponent(cookieValue.split(';')[0].split('=')[1]);
      const parts = decoded.split('.');
      expect(parts.length).toBe(2);
      expect(parts[0]).toMatch(/^[0-9a-f]+$/);
      expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('validateCsrfToken', () => {
    test('returns false for null/undefined token', () => {
      const req = mockReq();
      expect(validateCsrfToken(req, null)).toBe(false);
      expect(validateCsrfToken(req, undefined)).toBe(false);
    });

    test('returns false for empty string token', () => {
      const req = mockReq();
      expect(validateCsrfToken(req, '')).toBe(false);
    });

    test('returns false for a random token not in the store', () => {
      const req = mockReq();
      expect(validateCsrfToken(req, 'abc123')).toBe(false);
    });

    test('returns false when no _csrf_salt cookie is present', () => {
      const req = mockReq();
      const res = mockRes();

      const token = generateCsrfToken(req, res);
      expect(validateCsrfToken(mockReq(), token)).toBe(false);
    });

    test('returns true for a valid token with matching salt cookie', () => {
      const req = mockReq();
      const res = mockRes();

      const token = generateCsrfToken(req, res);

      // Extract the cookie value from the mock
      const cookieCall = res.setHeader.mock.calls.find(
        ([key]) => key === 'Set-Cookie'
      );
      const cookieValue = cookieCall[1];
      const cookieHeader = cookieValue.split(';')[0]; // just the Set-Cookie name=value part

      const validationReq = mockReq(cookieHeader);
      expect(validateCsrfToken(validationReq, token)).toBe(true);
    });

    test('token is single-use — second validation returns false', () => {
      const req = mockReq();
      const res = mockRes();

      const token = generateCsrfToken(req, res);

      const cookieCall = res.setHeader.mock.calls.find(
        ([key]) => key === 'Set-Cookie'
      );
      const cookieValue = cookieCall[1];
      const cookieHeader = cookieValue.split(';')[0];

      const validationReq = mockReq(cookieHeader);
      expect(validateCsrfToken(validationReq, token)).toBe(true);
      expect(validateCsrfToken(validationReq, token)).toBe(false);
    });

    test('returns false when salt cookie signature is tampered', () => {
      const req = mockReq();
      const res = mockRes();

      const token = generateCsrfToken(req, res);

      // Tamper the signature
      const tamperedCookie = '_csrf_salt=' + encodeURIComponent('tampered.fakesignature');
      const validationReq = mockReq(tamperedCookie);

      expect(validateCsrfToken(validationReq, token)).toBe(false);
    });
  });
});
