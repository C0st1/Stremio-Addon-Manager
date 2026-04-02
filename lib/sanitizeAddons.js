/**
 * lib/sanitizeAddons.js
 *
 * Shared utility for sanitizing addon arrays before sending to or
 * receiving from Stremio's cloud API. Strips null/undefined manifest
 * fields that would cause "invalid type: null, expected struct Manifest"
 * errors.
 */

/**
 * Removes null/undefined manifest fields from addon objects.
 * Stremio's API rejects any addon where manifest is explicitly null.
 *
 * @param {Array} addons  Array of addon objects
 * @returns {Array} Sanitized copy of the array
 */
function sanitizeAddons(addons) {
  if (!Array.isArray(addons)) return addons;
  return addons.map(a => {
    if (a.manifest === null || a.manifest === undefined) {
      const { manifest, ...rest } = a;
      return rest;
    }
    return a;
  });
}

module.exports = { sanitizeAddons };
