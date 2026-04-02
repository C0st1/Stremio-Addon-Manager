const {
  generateApiKey,
  registerApiKey,
  validateApiKey,
  hasPermission,
  revokeApiKey,
  listApiKeys,
  clearApiKeys,
} = require('../publicApi');

describe('lib/publicApi.js', () => {
  beforeEach(() => {
    clearApiKeys();
  });

  describe('generateApiKey', () => {
    test('returns a 64-character hex string', () => {
      const key = generateApiKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    test('generates unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('registerApiKey', () => {
    test('registers a key with default permissions', () => {
      const result = registerApiKey('my-key-1');

      expect(result.key).toBe('my-key-1');
      expect(result.permissions).toEqual(['read']);
    });

    test('generates a key if none provided', () => {
      const result = registerApiKey();
      expect(result.key).toBeDefined();
      expect(result.key.length).toBe(64);
    });

    test('registers a key with custom permissions', () => {
      const result = registerApiKey('custom-key', ['read', 'write', 'admin']);

      expect(result.permissions).toEqual(['read', 'write', 'admin']);
    });

    test('ignores empty permissions array and uses defaults', () => {
      const result = registerApiKey('empty-perms', []);
      expect(result.permissions).toEqual(['read']);
    });
  });

  describe('validateApiKey', () => {
    test('returns valid=true for registered key', () => {
      registerApiKey('valid-key', ['read', 'write']);
      const result = validateApiKey('valid-key');

      expect(result.valid).toBe(true);
      expect(result.permissions).toEqual(['read', 'write']);
    });

    test('returns valid=false for unregistered key', () => {
      const result = validateApiKey('unknown-key');
      expect(result.valid).toBe(false);
    });

    test('returns valid=false for null/undefined', () => {
      expect(validateApiKey(null).valid).toBe(false);
      expect(validateApiKey(undefined).valid).toBe(false);
      expect(validateApiKey('').valid).toBe(false);
    });

    test('updates lastUsedAt on validation', () => {
      registerApiKey('usage-key');
      const before = Date.now();
      validateApiKey('usage-key');
      const result = validateApiKey('usage-key');

      expect(result.lastUsedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('hasPermission', () => {
    test('returns true when key has the permission', () => {
      registerApiKey('perm-key', ['read', 'write']);
      expect(hasPermission('perm-key', 'read')).toBe(true);
      expect(hasPermission('perm-key', 'write')).toBe(true);
    });

    test('returns false when key lacks the permission', () => {
      registerApiKey('perm-key', ['read']);
      expect(hasPermission('perm-key', 'admin')).toBe(false);
    });

    test('returns false for invalid key', () => {
      expect(hasPermission('invalid', 'read')).toBe(false);
    });
  });

  describe('revokeApiKey', () => {
    test('removes a registered key', () => {
      registerApiKey('revoke-me');
      expect(validateApiKey('revoke-me').valid).toBe(true);
      expect(revokeApiKey('revoke-me')).toBe(true);
      expect(validateApiKey('revoke-me').valid).toBe(false);
    });

    test('returns false for non-existent key', () => {
      expect(revokeApiKey('nonexistent')).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    test('returns empty array when no keys registered', () => {
      expect(listApiKeys()).toEqual([]);
    });

    test('lists registered keys with truncated keyPrefix', () => {
      registerApiKey('list-test-key-1');
      registerApiKey('list-test-key-2');

      const keys = listApiKeys();
      expect(keys).toHaveLength(2);
      for (const entry of keys) {
        expect(entry.keyPrefix).toMatch(/^.{8}\.\.\.$/);
        expect(entry.permissions).toBeDefined();
        expect(entry.createdAt).toBeGreaterThan(0);
      }
    });
  });
});
