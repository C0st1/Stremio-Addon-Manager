const { setCacheHeaders } = require('../responseCache');

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  return res;
}

describe('lib/responseCache.js', () => {
  test('sets Cache-Control with public by default', () => {
    const res = mockRes();
    setCacheHeaders(res);

    expect(res.headers['Cache-Control']).toContain('public');
  });

  test('sets Cache-Control with private when private option is true', () => {
    const res = mockRes();
    setCacheHeaders(res, { private: true });

    expect(res.headers['Cache-Control']).toContain('private');
  });

  test('sets max-age from options', () => {
    const res = mockRes();
    setCacheHeaders(res, { maxAge: 120 });

    expect(res.headers['Cache-Control']).toContain('max-age=120');
  });

  test('defaults max-age to 60', () => {
    const res = mockRes();
    setCacheHeaders(res);

    expect(res.headers['Cache-Control']).toContain('max-age=60');
  });

  test('includes stale-while-revalidate directive', () => {
    const res = mockRes();
    setCacheHeaders(res, { staleWhileRevalidate: 600 });

    expect(res.headers['Cache-Control']).toContain('stale-while-revalidate=600');
  });

  test('sets ETag header when body is provided', () => {
    const res = mockRes();
    setCacheHeaders(res, { body: '{"ok":true}' });

    expect(res.headers['ETag']).toBeDefined();
    expect(res.headers['ETag']).toMatch(/^"[0-9a-f]+"/);
  });

  test('does not set ETag when body is not provided', () => {
    const res = mockRes();
    setCacheHeaders(res);

    expect(res.headers['ETag']).toBeUndefined();
  });

  test('sets Vary: Cookie when varyByCookie is true', () => {
    const res = mockRes();
    setCacheHeaders(res, { varyByCookie: true });

    expect(res.headers['Vary']).toBe('Cookie');
  });

  test('does not set Vary when varyByCookie is false (default)', () => {
    const res = mockRes();
    setCacheHeaders(res);

    expect(res.headers['Vary']).toBeUndefined();
  });

  test('same body produces same ETag', () => {
    const res1 = mockRes();
    const res2 = mockRes();
    const body = '{"addons":[]}';

    setCacheHeaders(res1, { body });
    setCacheHeaders(res2, { body });

    expect(res1.headers['ETag']).toBe(res2.headers['ETag']);
  });

  test('different bodies produce different ETags', () => {
    const res1 = mockRes();
    const res2 = mockRes();

    setCacheHeaders(res1, { body: '{"ok":true}' });
    setCacheHeaders(res2, { body: '{"ok":false}' });

    expect(res1.headers['ETag']).not.toBe(res2.headers['ETag']);
  });
});
