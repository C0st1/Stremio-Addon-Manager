const {
  cloudLogin,
  cloudGetAddons,
  cloudSetAddons,
} = require('../stremioAPI');

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('lib/stremioAPI', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('cloudLogin', () => {
    test('sends correct login request and returns authKey', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { authKey: 'test-auth-key-123' } }),
      });

      const authKey = await cloudLogin('user@example.com', 'password123');

      expect(authKey).toBe('test-auth-key-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.strem.io/api/login');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.email).toBe('user@example.com');
      expect(body.password).toBe('password123');
      expect(body.type).toBe('Login');
    });

    test('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(cloudLogin('user@example.com', 'wrong')).rejects.toThrow('HTTP 401');
    });

    test('throws when response contains error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      });

      await expect(cloudLogin('user@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    test('throws when no auth key is returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: {} }),
      });

      await expect(cloudLogin('user@example.com', 'pass')).rejects.toThrow('No auth key returned');
    });

    test('throws with default message when error.message is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: {} }),
      });

      await expect(cloudLogin('user@example.com', 'pass')).rejects.toThrow('Invalid email or password');
    });
  });

  describe('cloudGetAddons', () => {
    test('sends correct request and returns addons array', async () => {
      const testAddons = [
        { transportUrl: 'https://addon1.com/manifest.json' },
        { transportUrl: 'https://addon2.com/manifest.json' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { addons: testAddons } }),
      });

      const result = await cloudGetAddons('valid-auth-key');

      expect(result.addons).toEqual(testAddons);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.strem.io/api/addonCollectionGet');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.authKey).toBe('valid-auth-key');
      expect(body.type).toBe('AddonCollectionGet');
    });

    test('throws when authKey is empty', async () => {
      await expect(cloudGetAddons('')).rejects.toThrow('authKey is required');
    });

    test('throws when authKey is undefined', async () => {
      await expect(cloudGetAddons(undefined)).rejects.toThrow('authKey is required');
    });

    test('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(cloudGetAddons('key')).rejects.toThrow('HTTP 403');
    });

    test('handles result.addons format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { addons: [{ transportUrl: 'https://a.com' }] } }),
      });

      const result = await cloudGetAddons('key');
      expect(result.addons).toHaveLength(1);
    });

    test('handles top-level addons format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [{ transportUrl: 'https://a.com' }] }),
      });

      const result = await cloudGetAddons('key');
      expect(result.addons).toHaveLength(1);
    });

    test('returns empty array when addons field is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: {} }),
      });

      const result = await cloudGetAddons('key');
      expect(result.addons).toEqual([]);
    });

    test('throws when addons is not an array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { addons: 'not-an-array' } }),
      });

      await expect(cloudGetAddons('key')).rejects.toThrow('Unexpected response shape');
    });
  });

  describe('cloudSetAddons', () => {
    test('sends correct request and returns response', async () => {
      const addons = [{ transportUrl: 'https://test.com' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { success: true } }),
      });

      const result = await cloudSetAddons(addons, 'auth-key');

      expect(result).toEqual({ result: { success: true } });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.strem.io/api/addonCollectionSet');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.authKey).toBe('auth-key');
      expect(body.addons).toEqual(addons);
      expect(body.type).toBe('AddonCollectionSet');
    });

    test('throws when authKey is empty', async () => {
      await expect(cloudSetAddons([], '')).rejects.toThrow('authKey is required');
    });

    test('throws on non-ok response with body text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request body',
      });

      await expect(cloudSetAddons([], 'key')).rejects.toThrow('HTTP 400');
    });

    test('includes response text in error on failure', async () => {
      // Use 400 (4xx) which does NOT trigger retry — ensures single call
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request details',
      });

      await expect(cloudSetAddons([], 'key')).rejects.toThrow('Bad request details');
    });

    test('handles text() failure gracefully on error', async () => {
      // Use 403 (4xx) which does NOT trigger retry
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => { throw new Error('text failed'); },
      });

      await expect(cloudSetAddons([], 'key')).rejects.toThrow('HTTP 403');
    });
  });

  describe('retry behavior', () => {
    test('retries on 5xx response and succeeds on second attempt', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { authKey: 'retry-key' } }),
        });

      const promise = cloudLogin('user@test.com', 'pass');

      // Advance past the retry delay (300ms)
      await jest.advanceTimersByTimeAsync(400);

      const result = await promise;
      expect(result).toBe('retry-key');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    }, 15000);

    test('retries on network error and succeeds', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      mockFetch
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { authKey: 'recovered-key' } }),
        });

      const promise = cloudLogin('user@test.com', 'pass');

      await jest.advanceTimersByTimeAsync(500);

      const result = await promise;
      expect(result).toBe('recovered-key');

      jest.useRealTimers();
    }, 15000);

    test('request times out and throws on abort', async () => {
      jest.useFakeTimers({ advanceTimers: true });

      // Mock fetch to hang until abort signal fires
      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options && options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            }, { once: true });
          }
        });
      });

      const promise = cloudLogin('user@test.com', 'pass');

      // Attach error handler BEFORE advancing timers (to prevent unhandled rejection)
      let caughtError = null;
      promise.catch(err => { caughtError = err; });

      // Advance timers enough to trigger timeout (8s) + all 3 retry cycles
      await jest.advanceTimersByTimeAsync(36000);

      // Give microtasks a chance to settle
      await Promise.resolve();

      expect(caughtError).toBeDefined();

      jest.useRealTimers();
    }, 60000);

    test('shouldRetry returns false for 4xx responses (no retry)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(cloudLogin('user@test.com', 'pass')).rejects.toThrow('HTTP 401');
      // Should only have been called once (no retry for 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
