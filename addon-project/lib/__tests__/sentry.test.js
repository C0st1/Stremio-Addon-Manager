const { initSentry, captureException, isInitialised, resetSentry } = require('../sentry');

describe('lib/sentry.js', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    resetSentry();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    delete process.env.SENTRY_DSN;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.SENTRY_DSN;
  });

  describe('initSentry', () => {
    test('returns false when no DSN provided', () => {
      const result = initSentry();
      expect(result).toBe(false);
      // initSentry logs a single string argument
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No DSN')
      );
    });

    test('returns true when explicit DSN is provided', () => {
      const result = initSentry('https://test@sentry.io/123');
      expect(result).toBe(true);
      expect(isInitialised()).toBe(true);
    });

    test('returns true when SENTRY_DSN env var is set', () => {
      process.env.SENTRY_DSN = 'https://env@sentry.io/456';
      const result = initSentry();
      expect(result).toBe(true);
    });

    test('explicit DSN takes precedence over env var', () => {
      process.env.SENTRY_DSN = 'https://env@sentry.io/456';
      const result = initSentry('https://explicit@sentry.io/789');
      expect(result).toBe(true);
      // The log should show the explicit DSN
      const lastCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
      expect(lastCall).toContain('explicit');
    });
  });

  describe('captureException', () => {
    test('logs error with [SENTRY] prefix when not initialised', () => {
      captureException(new Error('test error'));
      // captureException uses console.error with two args: '[SENTRY]' and JSON
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SENTRY]', expect.any(String));
    });

    test('logs error with [SENTRY] prefix when initialised', () => {
      initSentry('https://test@sentry.io/123');
      captureException(new Error('test error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SENTRY]', expect.any(String));
    });

    test('returns an event ID string', () => {
      const eventId = captureException(new Error('test'));
      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^local-/);
    });

    test('includes error message in logged JSON', () => {
      captureException(new Error('something went wrong'));

      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][1]);
      expect(loggedJson.message).toBe('something went wrong');
    });

    test('includes stack trace when available', () => {
      const err = new Error('with stack');
      captureException(err);

      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][1]);
      expect(loggedJson.stack).toBeDefined();
    });

    test('includes context fields', () => {
      captureException(new Error('ctx test'), {
        authKey: 'key-123',
        ip: '10.0.0.1',
        endpoint: '/api/test',
      });

      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][1]);
      expect(loggedJson.context.authKey).toBe('key-123');
      expect(loggedJson.context.ip).toBe('10.0.0.1');
      expect(loggedJson.context.endpoint).toBe('/api/test');
    });

    test('handles non-Error objects', () => {
      captureException('string error');
      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][1]);
      expect(loggedJson.message).toBe('string error');
    });
  });

  describe('isInitialised', () => {
    test('returns false by default', () => {
      expect(isInitialised()).toBe(false);
    });

    test('returns true after initSentry with valid DSN', () => {
      initSentry('https://test@sentry.io/123');
      expect(isInitialised()).toBe(true);
    });
  });
});
