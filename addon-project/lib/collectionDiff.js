/**
 * lib/collectionDiff.js
 *
 * Compares two addon collection arrays and reports the differences:
 * which addons were added, removed, or reordered.
 *
 * Addons are compared by their `transportUrl` as the unique key,
 * consistent with how Stremio identifies addons.
 */

/**
 * Diffs two addon collections and reports structural changes.
 *
 * @param {Array}  oldAddons  The previous collection of addons
 * @param {Array}  newAddons  The new collection of addons
 * @returns {{ added: Array, removed: Array, reordered: boolean, unchanged: boolean }}
 */
function diffCollections(oldAddons, newAddons) {
  const oldUrls = (oldAddons || []).map(a => {
    const addon = a.manifest || a;
    return addon.transportUrl;
  }).filter(Boolean);

  const newUrls = (newAddons || []).map(a => {
    const addon = a.manifest || a;
    return addon.transportUrl;
  }).filter(Boolean);

  const oldSet = new Set(oldUrls);
  const newSet = new Set(newUrls);

  // Added: in new but not in old
  const added = (newAddons || []).filter(a => {
    const addon = a.manifest || a;
    const url = addon.transportUrl;
    return url && !oldSet.has(url);
  });

  // Removed: in old but not in new
  const removed = (oldAddons || []).filter(a => {
    const addon = a.manifest || a;
    const url = addon.transportUrl;
    return url && !newSet.has(url);
  });

  // Detect reordering by comparing the sequence of URLs (ignoring added/removed items)
  let reordered = false;
  if (oldUrls.length === newUrls.length && added.length === 0 && removed.length === 0) {
    reordered = oldUrls.some((url, i) => url !== newUrls[i]);
  }

  // Check if collections are completely unchanged
  const unchanged = added.length === 0 && removed.length === 0 && !reordered;

  return { added, removed, reordered, unchanged };
}

module.exports = { diffCollections };
