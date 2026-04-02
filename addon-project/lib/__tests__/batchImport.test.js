const { batchImportAddons } = require('../batchImport');

describe('lib/batchImport.js', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns empty arrays for non-array input', async () => {
    const result = await batchImportAddons(null);
    expect(result).toEqual({ imported: [], failed: [] });
  });

  test('returns empty arrays for empty URL array', async () => {
    const result = await batchImportAddons([]);
    expect(result).toEqual({ imported: [], failed: [] });
  });

  test('imports valid manifests', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test.addon',
        transportUrl: 'https://test.strem.io',
        name: 'Test Addon',
      }),
    });

    const result = await batchImportAddons(['https://test.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].id).toBe('test.addon');
    expect(result.failed).toHaveLength(0);
  });

  test('reports failed manifests with HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await batchImportAddons(['https://bad.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].url).toBe('https://bad.strem.io/manifest.json');
    expect(result.failed[0].error).toContain('404');
  });

  test('reports timed-out manifests', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        setTimeout(() => reject(err), 50);
      });
    });

    const result = await batchImportAddons(['https://slow.strem.io/manifest.json']);

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('timed out');
  });

  test('rejects manifests without id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transportUrl: 'https://noid.strem.io',
        name: 'No ID Addon',
      }),
    });

    const result = await batchImportAddons(['https://noid.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('id');
  });

  test('rejects manifests without transportUrl', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'no.url.addon',
        name: 'No URL Addon',
      }),
    });

    const result = await batchImportAddons(['https://nourl.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('transportUrl');
  });

  test('handles multiple URLs concurrently', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'multi.addon',
        transportUrl: 'https://multi.strem.io',
      }),
    });

    const urls = Array.from({ length: 5 }, (_, i) => `https://addon${i}.strem.io/manifest.json`);
    const result = await batchImportAddons(urls);

    expect(result.imported).toHaveLength(5);
    expect(result.failed).toHaveLength(0);
  });

  test('handles mixed success and failure', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'good', transportUrl: 'https://good.strem.io' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'also.good', transportUrl: 'https://also.strem.io' }),
      });

    const result = await batchImportAddons([
      'https://good.strem.io/manifest.json',
      'https://bad.strem.io/manifest.json',
      'https://also.strem.io/manifest.json',
    ]);

    expect(result.imported).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
  });

  test('handles network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await batchImportAddons(['https://fail.strem.io/manifest.json']);

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe('Network error');
  });

  test('rejects non-object manifest', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => 'not an object',
    });

    const result = await batchImportAddons(['https://invalid.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
  });

  test('accepts manifest with manifest.transportUrl', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'nested.url',
        manifest: { transportUrl: 'https://nested.strem.io' },
      }),
    });

    const result = await batchImportAddons(['https://nested.strem.io/manifest.json']);

    expect(result.imported).toHaveLength(1);
  });
});
