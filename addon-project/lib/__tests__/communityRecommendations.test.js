const { getRecommendations, searchRecommendations } = require('../communityRecommendations');

describe('lib/communityRecommendations.js', () => {
  describe('getRecommendations', () => {
    test('returns an array of recommendations', () => {
      const recs = getRecommendations();
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
    });

    test('each recommendation has required fields', () => {
      const recs = getRecommendations();
      for (const rec of recs) {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('name');
        expect(rec).toHaveProperty('transportUrl');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('categories');
      }
    });

    test('returns a copy (not the internal array)', () => {
      const recs1 = getRecommendations();
      const recs2 = getRecommendations();
      expect(recs1).not.toBe(recs2);
      expect(recs1).toEqual(recs2);
    });
  });

  describe('searchRecommendations', () => {
    test('returns empty array for empty string query (empty string is falsy)', () => {
      const results = searchRecommendations('');
      expect(results).toHaveLength(0);
    });

    test('returns empty array for null/undefined query', () => {
      expect(searchRecommendations(null)).toHaveLength(0);
      expect(searchRecommendations(undefined)).toHaveLength(0);
    });

    test('filters by name (case-insensitive)', () => {
      const results = searchRecommendations('openSubtitles');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('opensubtitles');
    });

    test('filters by type', () => {
      const results = searchRecommendations('subtitle');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        const matchesType = r.type.toLowerCase().includes('subtitle') ||
          r.categories.some(c => c.toLowerCase().includes('subtitle'));
        expect(matchesType).toBe(true);
      }
    });

    test('returns empty array for non-matching query', () => {
      const results = searchRecommendations('xyznonexistent123456');
      expect(results).toHaveLength(0);
    });

    test('filters by category', () => {
      const results = searchRecommendations('popular');
      expect(results.length).toBeGreaterThan(0);
    });

    test('filters by description text', () => {
      const results = searchRecommendations('anime');
      expect(results.length).toBeGreaterThan(0);
    });

    test('is case-insensitive', () => {
      const upper = searchRecommendations('SUBTITLE');
      const lower = searchRecommendations('subtitle');
      expect(upper).toEqual(lower);
    });
  });
});
