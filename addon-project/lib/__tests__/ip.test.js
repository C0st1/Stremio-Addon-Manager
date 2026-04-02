const { getClientIp } = require('../ip');

function mockReq(headers = {}, socketAddr = '::1') {
  return {
    headers,
    socket: { remoteAddress: socketAddr },
  };
}

describe('lib/ip', () => {
  describe('getClientIp', () => {
    test('prefers x-vercel-forwarded-for header', () => {
      const req = mockReq({
        'x-vercel-forwarded-for': '1.2.3.4, 10.0.0.1',
        'x-forwarded-for': '99.99.99.99',
      });

      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    test('uses first IP from x-vercel-forwarded-for', () => {
      const req = mockReq({
        'x-vercel-forwarded-for': '203.0.113.50',
      });

      expect(getClientIp(req)).toBe('203.0.113.50');
    });

    test('trims whitespace from x-vercel-forwarded-for', () => {
      const req = mockReq({
        'x-vercel-forwarded-for': '  5.6.7.8  , 10.0.0.1  ',
      });

      expect(getClientIp(req)).toBe('5.6.7.8');
    });

    test('falls back to x-forwarded-for when vercel header absent', () => {
      const req = mockReq({
        'x-forwarded-for': '10.0.0.1, 172.16.0.1, 192.168.1.1',
      });

      expect(getClientIp(req)).toBe('192.168.1.1');
    });

    test('handles single IP in x-forwarded-for', () => {
      const req = mockReq({
        'x-forwarded-for': '10.0.0.1',
      });

      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    test('falls back to socket.remoteAddress when no forwarded headers', () => {
      const req = mockReq({}, '10.20.30.40');

      expect(getClientIp(req)).toBe('10.20.30.40');
    });

    test('returns "unknown" when no IP source available', () => {
      const req = mockReq({}, undefined);
      req.socket = {};

      expect(getClientIp(req)).toBe('unknown');
    });

    test('filters empty entries from x-forwarded-for', () => {
      const req = mockReq({
        'x-forwarded-for': '10.0.0.1, , 192.168.1.1',
      });

      expect(getClientIp(req)).toBe('192.168.1.1');
    });

    test('x-vercel-forwarded-for takes precedence over x-forwarded-for', () => {
      const req = mockReq({
        'x-vercel-forwarded-for': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
      });

      expect(getClientIp(req)).toBe('1.1.1.1');
    });
  });
});
