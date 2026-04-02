const { setSecurityHeaders } = require('../securityHeaders');

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  return res;
}

describe('lib/securityHeaders', () => {
  describe('setSecurityHeaders', () => {
    test('sets default API security headers', () => {
      const res = mockRes();

      setSecurityHeaders(res);

      expect(res.headers['X-Frame-Options']).toBe('DENY');
      expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(res.headers['Content-Security-Policy']).toBeUndefined();
    });

    test('sets CSP headers when type is html', () => {
      const res = mockRes();

      setSecurityHeaders(res, 'html');

      expect(res.headers['X-Frame-Options']).toBe('DENY');
      expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(res.headers['Content-Security-Policy']).toBeDefined();
      expect(res.headers['Content-Security-Policy']).toContain("default-src 'none'");
      expect(res.headers['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net");
      expect(res.headers['Content-Security-Policy']).toContain("style-src 'self' 'unsafe-inline'");
      expect(res.headers['Content-Security-Policy']).toContain("img-src 'self' data: https:");
      expect(res.headers['Content-Security-Policy']).toContain("connect-src 'self' https://api.strem.io https://cdn.jsdelivr.net");
      expect(res.headers['Content-Security-Policy']).toContain("font-src 'self'");
      expect(res.headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    });

    test('does NOT set CSP headers when type is api', () => {
      const res = mockRes();

      setSecurityHeaders(res, 'api');

      expect(res.headers['Content-Security-Policy']).toBeUndefined();
    });

    test('defaults to api when no type specified', () => {
      const res = mockRes();

      setSecurityHeaders(res);

      expect(res.headers['Content-Security-Policy']).toBeUndefined();
    });
  });
});
