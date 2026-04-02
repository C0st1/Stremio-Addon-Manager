describe('lib/rateLimiter', () => {
  let hitRateLimit, getCachedLimit, rateLimitResponse;

  beforeEach(() => {
    jest.resetModules();
    const limiter = require('../rateLimiter');
    hitRateLimit = limiter.hitRateLimit;
    getCachedLimit = limiter.getCachedLimit;
    rateLimitResponse = limiter.rateLimitResponse;
  });

  describe('hitRateLimit', () => {
    test('returns limited=false for first request', () => {
      const result = hitRateLimit('test-key');

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(19);
    });

    test('allows up to max requests', () => {
      for (let i = 0; i < 20; i++) {
        const result = hitRateLimit('test-key');
        expect(result.limited).toBe(false);
      }
    });

    test('limits after max requests exceeded', () => {
      for (let i = 0; i < 20; i++) {
        hitRateLimit('test-key');
      }

      const result = hitRateLimit('test-key');
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    test('tracks remaining requests correctly', () => {
      const result1 = hitRateLimit('track-key');
      expect(result1.remaining).toBe(19);

      const result2 = hitRateLimit('track-key');
      expect(result2.remaining).toBe(18);

      const result3 = hitRateLimit('track-key');
      expect(result3.remaining).toBe(17);
    });

    test('custom max parameter is respected', () => {
      for (let i = 0; i < 5; i++) {
        const result = hitRateLimit('custom-key', { max: 5 });
        expect(result.limited).toBe(false);
      }

      const overLimit = hitRateLimit('custom-key', { max: 5 });
      expect(overLimit.limited).toBe(true);
    });

    test('separate keys have independent counters', () => {
      for (let i = 0; i < 20; i++) {
        hitRateLimit('key-a');
      }

      const result = hitRateLimit('key-b');
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(19);
    });
  });

  describe('getCachedLimit', () => {
    test('returns limited=false for first request', async () => {
      const result = await getCachedLimit('cached-key');

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(19);
    });

    test('works the same as hitRateLimit for basic usage', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await getCachedLimit('async-key');
        expect(result.limited).toBe(false);
      }

      const overLimit = await getCachedLimit('async-key');
      expect(overLimit.limited).toBe(true);
    });

    test('uses externalStore when provided', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      };

      const result = await getCachedLimit('ext-key', {
        max: 5,
        windowMs: 1000,
        externalStore: mockStore,
      });

      expect(mockStore.get).toHaveBeenCalledWith('ext-key');
      expect(mockStore.set).toHaveBeenCalled();
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);
    });

    test('falls back to in-memory when externalStore.get throws', async () => {
      const mockStore = {
        get: jest.fn().mockRejectedValue(new Error('store error')),
        set: jest.fn().mockResolvedValue(undefined),
      };

      const result = await getCachedLimit('fallback-key', {
        externalStore: mockStore,
      });

      expect(result.limited).toBe(false);
    });

    test('returns cached value when externalStore has one', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({ limited: true, remaining: 0, retryAfterMs: 5000 }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      const result = await getCachedLimit('cached-ext-key', {
        externalStore: mockStore,
      });

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(5000);
    });

    test('continues when externalStore.set throws', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockRejectedValue(new Error('set error')),
      };

      const result = await getCachedLimit('set-fail-key', {
        externalStore: mockStore,
      });

      expect(result.limited).toBe(false);
    });
  });

  describe('rateLimitResponse', () => {
    test('returns standard 429 body', () => {
      const body = rateLimitResponse();

      expect(body.ok).toBe(false);
      expect(body.error).toBe('Too many requests. Please retry shortly.');
      expect(body.retryAfter).toBeUndefined();
    });

    test('includes retryAfter when retryAfterMs is provided', () => {
      const body = rateLimitResponse({ retryAfterMs: 5500 });

      expect(body.ok).toBe(false);
      expect(body.retryAfter).toBe(6); // ceil(5500/1000)
    });

    test('retryAfter is 1 for 500ms', () => {
      const body = rateLimitResponse({ retryAfterMs: 500 });

      expect(body.retryAfter).toBe(1);
    });

    test('retryAfter is exact for whole seconds', () => {
      const body = rateLimitResponse({ retryAfterMs: 10000 });

      expect(body.retryAfter).toBe(10);
    });

    test('uses custom message when provided', () => {
      const body = rateLimitResponse({ message: 'Custom rate limit message' });

      expect(body.error).toBe('Custom rate limit message');
    });

    test('does not include retryAfter when retryAfterMs is null', () => {
      const body = rateLimitResponse({ retryAfterMs: null });

      expect(body.retryAfter).toBeUndefined();
    });
  });
});
