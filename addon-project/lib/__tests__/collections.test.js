const {
  getCollectionProfile,
  saveCollectionProfile,
  listCollectionProfiles,
  deleteCollectionProfile,
} = require('../collections');

describe('lib/collections.js', () => {
  const AUTH_KEY = 'test-auth-key-collections';

  beforeEach(() => {
    // Profiles are in-memory; we use unique names per test to avoid collisions
  });

  describe('saveCollectionProfile', () => {
    test('returns true for valid arguments', () => {
      const result = saveCollectionProfile('test-profile-save', [{ transportUrl: 'https://a.strem.io' }], AUTH_KEY);
      expect(result).toBe(true);
    });

    test('returns false when profileName is empty', () => {
      expect(saveCollectionProfile('', [], AUTH_KEY)).toBe(false);
      expect(saveCollectionProfile(null, [], AUTH_KEY)).toBe(false);
    });

    test('returns false when authKey is empty', () => {
      expect(saveCollectionProfile('profile', [], '')).toBe(false);
      expect(saveCollectionProfile('profile', [], null)).toBe(false);
    });

    test('returns false when addons is not an array', () => {
      expect(saveCollectionProfile('profile', 'not-array', AUTH_KEY)).toBe(false);
      expect(saveCollectionProfile('profile', null, AUTH_KEY)).toBe(false);
    });

    test('overwrites existing profile', () => {
      saveCollectionProfile('profile-overwrite', [{ transportUrl: 'https://a.strem.io' }], AUTH_KEY);
      saveCollectionProfile('profile-overwrite', [{ transportUrl: 'https://b.strem.io' }], AUTH_KEY);

      const loaded = getCollectionProfile('profile-overwrite', AUTH_KEY);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].transportUrl).toBe('https://b.strem.io');
    });
  });

  describe('getCollectionProfile', () => {
    test('returns null for non-existent profile', () => {
      expect(getCollectionProfile('nonexistent', AUTH_KEY)).toBeNull();
    });

    test('returns null when profileName is empty', () => {
      expect(getCollectionProfile('', AUTH_KEY)).toBeNull();
    });

    test('returns saved addons', () => {
      const addons = [{ transportUrl: 'https://c.strem.io' }];
      saveCollectionProfile('profile-get-test', addons, AUTH_KEY);

      const result = getCollectionProfile('profile-get-test', AUTH_KEY);
      expect(result).toEqual(addons);
    });

    test('does not cross-contaminate between auth keys', () => {
      saveCollectionProfile('shared-name', [{ transportUrl: 'https://a.strem.io' }], AUTH_KEY);

      expect(getCollectionProfile('shared-name', 'other-auth-key')).toBeNull();
    });
  });

  describe('listCollectionProfiles', () => {
    test('returns empty array when no profiles exist', () => {
      expect(listCollectionProfiles('no-profiles-key')).toEqual([]);
    });

    test('returns empty array for empty authKey', () => {
      expect(listCollectionProfiles('')).toEqual([]);
    });

    test('lists saved profile names', () => {
      saveCollectionProfile('list-test-1', [], AUTH_KEY);
      saveCollectionProfile('list-test-2', [], AUTH_KEY);

      const names = listCollectionProfiles(AUTH_KEY);
      expect(names).toContain('list-test-1');
      expect(names).toContain('list-test-2');
    });
  });

  describe('deleteCollectionProfile', () => {
    test('returns false for non-existent profile', () => {
      expect(deleteCollectionProfile('nonexistent', AUTH_KEY)).toBe(false);
    });

    test('returns false when profileName is empty', () => {
      expect(deleteCollectionProfile('', AUTH_KEY)).toBe(false);
    });

    test('deletes existing profile and returns true', () => {
      saveCollectionProfile('delete-test', [], AUTH_KEY);
      expect(deleteCollectionProfile('delete-test', AUTH_KEY)).toBe(true);
      expect(getCollectionProfile('delete-test', AUTH_KEY)).toBeNull();
    });

    test('does not affect other profiles', () => {
      saveCollectionProfile('keep-me', [], AUTH_KEY);
      saveCollectionProfile('delete-other', [], AUTH_KEY);

      deleteCollectionProfile('delete-other', AUTH_KEY);

      expect(getCollectionProfile('keep-me', AUTH_KEY)).not.toBeNull();
    });
  });
});
