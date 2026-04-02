const { bindSessionToIp, validateSessionIp } = require('../sessionBinding');

describe('lib/sessionBinding.js', () => {
  beforeEach(() => {
    // Clear in-memory bindings — we access the module internals indirectly
    // by creating unique keys per test
  });

  describe('bindSessionToIp', () => {
    test('does not throw with valid arguments', () => {
      expect(() => bindSessionToIp('1.2.3.4', 'auth-key-test-1')).not.toThrow();
    });

    test('does nothing when ip is empty', () => {
      expect(() => bindSessionToIp('', 'auth-key')).not.toThrow();
    });

    test('does nothing when authKey is empty', () => {
      expect(() => bindSessionToIp('1.2.3.4', '')).not.toThrow();
    });

    test('updates binding for the same authKey', () => {
      bindSessionToIp('1.1.1.1', 'auth-key-rebind');
      expect(validateSessionIp('1.1.1.1', 'auth-key-rebind')).toBe(true);
      expect(validateSessionIp('2.2.2.2', 'auth-key-rebind')).toBe(false);

      bindSessionToIp('2.2.2.2', 'auth-key-rebind');
      expect(validateSessionIp('2.2.2.2', 'auth-key-rebind')).toBe(true);
    });
  });

  describe('validateSessionIp', () => {
    test('returns true when no binding exists for the authKey', () => {
      expect(validateSessionIp('1.2.3.4', 'nonexistent-key')).toBe(true);
    });

    test('returns true when ip matches the binding', () => {
      bindSessionToIp('10.0.0.1', 'auth-key-match-test');
      expect(validateSessionIp('10.0.0.1', 'auth-key-match-test')).toBe(true);
    });

    test('returns false when ip does not match the binding', () => {
      bindSessionToIp('10.0.0.1', 'auth-key-mismatch-test');
      expect(validateSessionIp('10.0.0.2', 'auth-key-mismatch-test')).toBe(false);
    });

    test('returns true when both ip and authKey are empty', () => {
      expect(validateSessionIp('', '')).toBe(true);
    });

    test('returns true when ip is empty but binding exists', () => {
      bindSessionToIp('10.0.0.1', 'auth-key-empty-ip');
      expect(validateSessionIp('', 'auth-key-empty-ip')).toBe(true);
    });
  });
});
