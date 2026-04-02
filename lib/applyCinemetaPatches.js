function applyCinemetaPatches(addon, options) {
  const cloned = structuredClone(addon);
  const manifest = cloned.manifest || {};

  if (options.removeSearch) {
    if (manifest.catalogs) {
      manifest.catalogs = manifest.catalogs.filter(c => {
        const hasSearchExtra = c.extra && c.extra.some(e => e.name === 'search');
        const hasSearchSupported = c.extraSupported && c.extraSupported.includes('search');
        return !(hasSearchExtra || hasSearchSupported);
      });
    }
    if (manifest.resources) {
      manifest.resources = manifest.resources.filter(r => (typeof r === 'string' ? r : r.name) !== 'search');
    }
  }

  if (options.removeCatalogs) {
    const targets = ['popular', 'new', 'featured'];
    if (manifest.catalogs) {
      manifest.catalogs = manifest.catalogs.filter(c => {
        const id = (c.id || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        return !targets.some(t => id.includes(t) || name.includes(t));
      });
    }
  }

  if (options.removeMetadata) {
    if (manifest.resources) {
      manifest.resources = manifest.resources.filter(r => (typeof r === 'string' ? r : r.name) !== 'meta');
    }
  }

  return cloned;
}

module.exports = { applyCinemetaPatches };
