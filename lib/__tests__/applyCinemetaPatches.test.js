const { applyCinemetaPatches } = require('../applyCinemetaPatches');

function makeAddon(overrides = {}) {
  return {
    transportUrl: 'https://cinemeta.strem.io/manifest.json',
    manifest: {
      id: 'community.cinemeta',
      name: 'Cinemeta',
      version: '1.0.0',
      catalogs: [
        { id: 'top', name: 'Top', type: 'movie', extra: [{ name: 'search' }] },
        { id: 'popular', name: 'Popular Movies', type: 'movie' },
        { id: 'new', name: 'New Releases', type: 'movie' },
        { id: 'featured', name: 'Featured', type: 'series' },
        { id: 'all', name: 'All Movies', type: 'movie', extraSupported: ['search', 'genre'] },
        { id: 'series_all', name: 'All Series', type: 'series' },
      ],
      resources: [
        'catalog',
        { name: 'search' },
        { name: 'meta' },
        'subtitles',
      ],
    },
    ...overrides,
  };
}

describe('lib/applyCinemetaPatches', () => {
  test('returns a deep clone (does not mutate original)', () => {
    const original = makeAddon();
    const patched = applyCinemetaPatches(original, { removeSearch: true });

    expect(patched).not.toBe(original);
    expect(patched.manifest).not.toBe(original.manifest);
    expect(patched.manifest.catalogs).not.toBe(original.manifest.catalogs);

    expect(original.manifest.catalogs).toHaveLength(6);
    expect(original.manifest.resources).toHaveLength(4);
  });

  test('does nothing when no options are set', () => {
    const addon = makeAddon();
    const patched = applyCinemetaPatches(addon, {});

    expect(patched.manifest.catalogs).toHaveLength(6);
    expect(patched.manifest.resources).toHaveLength(4);
  });

  describe('removeSearch', () => {
    test('removes catalogs with search extra and extraSupported containing search', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, { removeSearch: true });

      const remaining = patched.manifest.catalogs;
      // 'top' has search extra, 'all' has extraSupported with search → both removed
      // Remaining: popular, new, featured, series_all
      expect(remaining).toHaveLength(4);
      expect(remaining.find(c => c.id === 'top')).toBeUndefined();
      expect(remaining.find(c => c.id === 'all')).toBeUndefined();
      // Non-search catalogs remain
      expect(remaining.find(c => c.id === 'popular')).toBeDefined();
      expect(remaining.find(c => c.id === 'series_all')).toBeDefined();
    });

    test('removes catalogs with extraSupported containing search', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, { removeSearch: true });

      const remaining = patched.manifest.catalogs;
      expect(remaining.find(c => c.id === 'all')).toBeUndefined();
    });

    test('removes search resources (string and object forms)', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, { removeSearch: true });

      const resources = patched.manifest.resources;
      expect(resources.find(r => (typeof r === 'string' ? r : r.name) === 'search')).toBeUndefined();
      expect(resources).toContain('catalog');
      expect(resources.find(r => (typeof r === 'string' ? r : r.name) === 'meta')).toBeDefined();
    });
  });

  describe('removeCatalogs', () => {
    test('removes catalogs with popular, new, or featured in id/name', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, { removeCatalogs: true });

      const remaining = patched.manifest.catalogs;
      expect(remaining).toHaveLength(3);

      expect(remaining.find(c => c.id === 'popular')).toBeUndefined();
      expect(remaining.find(c => c.id === 'new')).toBeUndefined();
      expect(remaining.find(c => c.id === 'featured')).toBeUndefined();
    });

    test('case-insensitive matching', () => {
      const addon = makeAddon();
      addon.manifest.catalogs = [
        { id: 'POPULAR', name: 'Popular', type: 'movie' },
        { id: 'my-new-catalog', name: 'My New', type: 'movie' },
        { id: 'Featured', name: 'FEATURED', type: 'movie' },
      ];

      const patched = applyCinemetaPatches(addon, { removeCatalogs: true });
      expect(patched.manifest.catalogs).toHaveLength(0);
    });
  });

  describe('removeMetadata', () => {
    test('removes meta resources', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, { removeMetadata: true });

      const resources = patched.manifest.resources;
      expect(resources.find(r => (typeof r === 'string' ? r : r.name) === 'meta')).toBeUndefined();
      expect(resources).toContain('catalog');
      expect(resources.find(r => (typeof r === 'string' ? r : r.name) === 'search')).toBeDefined();
    });
  });

  describe('combined options', () => {
    test('removeSearch + removeCatalogs together', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, {
        removeSearch: true,
        removeCatalogs: true,
      });

      // top: removed (search extra), popular: removed (popular), new: removed (new),
      // featured: removed (featured), all: removed (search extraSupported), series_all: remains
      expect(patched.manifest.catalogs).toHaveLength(1);
      expect(patched.manifest.catalogs[0].id).toBe('series_all');
    });

    test('all three options together', () => {
      const addon = makeAddon();
      const patched = applyCinemetaPatches(addon, {
        removeSearch: true,
        removeCatalogs: true,
        removeMetadata: true,
      });

      expect(patched.manifest.catalogs).toHaveLength(1);
      expect(patched.manifest.resources).toHaveLength(2);
      expect(patched.manifest.resources).toContain('catalog');
      expect(patched.manifest.resources).toContain('subtitles');
    });
  });

  describe('edge cases', () => {
    test('handles addon with no manifest property', () => {
      const addon = { transportUrl: 'https://example.com' };
      const patched = applyCinemetaPatches(addon, { removeSearch: true });

      // structuredClone preserves the absence of manifest property
      expect(patched).toEqual({ transportUrl: 'https://example.com' });
      expect(patched.manifest).toBeUndefined();
    });

    test('handles manifest with no catalogs or resources', () => {
      const addon = { transportUrl: 'https://example.com', manifest: {} };
      const patched = applyCinemetaPatches(addon, {
        removeSearch: true,
        removeCatalogs: true,
        removeMetadata: true,
      });

      expect(patched.manifest.catalogs).toBeUndefined();
      expect(patched.manifest.resources).toBeUndefined();
    });
  });
});
