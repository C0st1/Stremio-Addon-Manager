const handler = require('../manifest');

function mockReq() {
  return { headers: {}, method: 'GET' };
}

function mockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => { res.headers[k] = v; });
  res.statusCode = null;
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((body) => { res.body = body; return res; });
  return res;
}

describe('api/manifest.js', () => {
  test('returns 200 with correct manifest structure', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('manifest has required Stremio addon fields', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    const manifest = res.body;
    expect(manifest.id).toBe('community.addon-manager');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.name).toBe('Addon Manager');
    expect(manifest.description).toBeDefined();
    expect(manifest.resources).toContain('catalog');
    expect(manifest.types).toContain('other');
    expect(manifest.catalogs).toEqual([]);
  });

  test('manifest has configurable behavior hint', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    const manifest = res.body;
    expect(manifest.behaviorHints.configurable).toBe(true);
    expect(manifest.behaviorHints.configurationRequired).toBe(false);
  });

  test('manifest has config array', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    const manifest = res.body;
    expect(Array.isArray(manifest.config)).toBe(true);
    expect(manifest.config[0].key).toBe('note');
    expect(manifest.config[0].type).toBe('text');
    expect(manifest.config[0].required).toBe(false);
  });

  test('sets security headers', () => {
    const req = mockReq();
    const res = mockRes();

    handler(req, res);

    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});
