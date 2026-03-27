const { applyCinemetaPatches } = require('../lib/applyCinemetaPatches');

function sampleAddon() {
  return {
    transportUrl: 'https://v3-cinemeta.strem.io/manifest.json',
    manifest: {
      id: 'com.linvo.cinemeta',
      name: 'Cinemeta',
      version: '3.0.12',
      types: ['movie', 'series'],
      resources: ['catalog', 'meta', 'search'],
      catalogs: [
        { type: 'movie', id: 'popular', name: 'Popular', extraSupported: ['search'] },
        { type: 'movie', id: 'top', name: 'Top' },
      ],
    },
  };
}

describe('applyCinemetaPatches', () => {
  test('keeps required manifest identity fields', () => {
    const input = sampleAddon();
    const output = applyCinemetaPatches(input, { removeSearch: true, removeCatalogs: true, removeMetadata: true });

    expect(output.manifest.id).toBe(input.manifest.id);
    expect(output.manifest.name).toBe(input.manifest.name);
    expect(output.manifest.version).toBe(input.manifest.version);
    expect(output.manifest.types).toEqual(input.manifest.types);
    expect(output.transportUrl).toBe(input.transportUrl);
  });

  test('removes search and metadata resources when toggled', () => {
    const output = applyCinemetaPatches(sampleAddon(), { removeSearch: true, removeCatalogs: false, removeMetadata: true });
    expect(output.manifest.resources).toEqual(['catalog']);
  });

  test('removes popular/new/featured catalogs only', () => {
    const output = applyCinemetaPatches(sampleAddon(), { removeSearch: false, removeCatalogs: true, removeMetadata: false });
    expect(output.manifest.catalogs).toHaveLength(1);
    expect(output.manifest.catalogs[0].id).toBe('top');
  });
});
