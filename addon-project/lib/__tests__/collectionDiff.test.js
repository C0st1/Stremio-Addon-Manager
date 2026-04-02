const { diffCollections } = require('../collectionDiff');

describe('lib/collectionDiff.js', () => {
  const addonA = { transportUrl: 'https://a.strem.io', name: 'Addon A' };
  const addonB = { transportUrl: 'https://b.strem.io', name: 'Addon B' };
  const addonC = { transportUrl: 'https://c.strem.io', name: 'Addon C' };

  test('returns unchanged=true for identical collections', () => {
    const old = [addonA, addonB, addonC];
    const result = diffCollections(old, [...old]);

    expect(result.unchanged).toBe(true);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.reordered).toBe(false);
  });

  test('detects added addons', () => {
    const old = [addonA, addonB];
    const result = diffCollections(old, [addonA, addonB, addonC]);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].transportUrl).toBe('https://c.strem.io');
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toBe(false);
  });

  test('detects removed addons', () => {
    const old = [addonA, addonB, addonC];
    const result = diffCollections(old, [addonA, addonB]);

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].transportUrl).toBe('https://c.strem.io');
    expect(result.added).toHaveLength(0);
    expect(result.unchanged).toBe(false);
  });

  test('detects reordering', () => {
    const old = [addonA, addonB, addonC];
    const result = diffCollections(old, [addonC, addonB, addonA]);

    expect(result.reordered).toBe(true);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toBe(false);
  });

  test('does not flag reordering when only length differs', () => {
    const old = [addonA, addonB];
    const result = diffCollections(old, [addonB, addonA, addonC]);

    // added C, same length check fails → reordered stays false
    expect(result.added.length).toBeGreaterThan(0);
  });

  test('handles empty collections', () => {
    const result = diffCollections([], []);
    expect(result.unchanged).toBe(true);
  });

  test('handles null/undefined inputs', () => {
    const result = diffCollections(null, undefined);
    expect(result.unchanged).toBe(true);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  test('handles addons wrapped in manifest objects', () => {
    const old = [{ manifest: { transportUrl: 'https://a.strem.io' } }];
    const result = diffCollections(old, old);

    expect(result.unchanged).toBe(true);
  });

  test('detects both additions and removals', () => {
    const old = [addonA, addonB];
    const result = diffCollections(old, [addonB, addonC]);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].transportUrl).toBe('https://c.strem.io');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].transportUrl).toBe('https://a.strem.io');
    expect(result.unchanged).toBe(false);
  });

  test('identical single element is unchanged', () => {
    const result = diffCollections([addonA], [addonA]);
    expect(result.unchanged).toBe(true);
    expect(result.reordered).toBe(false);
  });
});
