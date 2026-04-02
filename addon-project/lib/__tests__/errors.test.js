const { sanitizeError, SAFE_MESSAGES } = require('../errors');

describe('lib/errors', () => {
  describe('SAFE_MESSAGES', () => {
    test('contains expected error contexts', () => {
      expect(SAFE_MESSAGES.login).toBeDefined();
      expect(SAFE_MESSAGES.addonGet).toBeDefined();
      expect(SAFE_MESSAGES.addonSet).toBeDefined();
      expect(SAFE_MESSAGES.session).toBeDefined();
      expect(SAFE_MESSAGES.linkCheck).toBeDefined();
      expect(SAFE_MESSAGES.compressed).toBeDefined();
    });

    test('messages do not leak implementation details', () => {
      for (const [context, message] of Object.entries(SAFE_MESSAGES)) {
        expect(message).not.toContain('stack');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('TypeError');
        expect(message).not.toContain('at ');
      }
    });
  });

  describe('sanitizeError', () => {
    test('returns a safe error message for known context', () => {
      const originalErr = new Error('ECONNREFUSED 127.0.0.1:5432');
      const safeErr = sanitizeError(originalErr, 'login');

      expect(safeErr.message).toBe(SAFE_MESSAGES.login);
      expect(safeErr.message).not.toContain('ECONNREFUSED');
      expect(safeErr.message).not.toContain('127.0.0.1');
    });

    test('returns generic message for unknown context', () => {
      const originalErr = new Error('Some internal database error');
      const safeErr = sanitizeError(originalErr, 'unknownContext');

      expect(safeErr.message).toBe('An unexpected error occurred.');
    });

    test('uses default context "general" when no context is provided', () => {
      const originalErr = new Error('DB connection failed');
      const safeErr = sanitizeError(originalErr);

      expect(safeErr.message).toBe('An unexpected error occurred.');
    });

    test('returns an Error instance', () => {
      const originalErr = new Error('test');
      const safeErr = sanitizeError(originalErr, 'addonGet');

      expect(safeErr).toBeInstanceOf(Error);
    });

    test('logs the real error to console.error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const originalErr = new Error('Secret internal error');
      sanitizeError(originalErr, 'session');

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('[session]');
      expect(logCall).toContain('Secret internal error');

      consoleSpy.mockRestore();
    });

    test('preserves the error stack in the log', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const originalErr = new Error('test');
      sanitizeError(originalErr, 'login');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[login]'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test('each known context returns its specific message', () => {
      const contexts = ['login', 'addonGet', 'addonSet', 'session', 'linkCheck', 'compressed'];
      const err = new Error('internal');

      for (const ctx of contexts) {
        const safeErr = sanitizeError(err, ctx);
        expect(safeErr.message).toBe(SAFE_MESSAGES[ctx]);
      }
    });
  });
});
