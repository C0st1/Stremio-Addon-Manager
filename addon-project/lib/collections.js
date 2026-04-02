/**
 * lib/collections.js
 *
 * Addon collection profiles — named snapshots of addon configurations.
 * Users can save, load, list, and delete profiles for quick switching
 * between different addon setups.
 *
 * Storage is in-memory (Map of authKey → { profileName → addons }).
 */

// In-memory store: authKey → { profileName → addons[] }
const profiles = new Map();

/**
 * Retrieves a saved collection profile by name and auth key.
 *
 * @param {string} profileName  The name of the profile to retrieve
 * @param {string} authKey      The user's auth key
 * @returns {Array|null} The saved addons array, or null if not found
 */
function getCollectionProfile(profileName, authKey) {
  if (!profileName || !authKey) return null;

  const userProfiles = profiles.get(authKey);
  if (!userProfiles) return null;

  return userProfiles[profileName] || null;
}

/**
 * Saves a collection profile. Overwrites if a profile with the same name exists.
 *
 * @param {string} profileName  The name of the profile
 * @param {Array}  addons       The full addons array to store
 * @param {string} authKey      The user's auth key
 * @returns {boolean} true if saved successfully
 */
function saveCollectionProfile(profileName, addons, authKey) {
  if (!profileName || !authKey) return false;
  if (!Array.isArray(addons)) return false;

  let userProfiles = profiles.get(authKey);
  if (!userProfiles) {
    userProfiles = {};
    profiles.set(authKey, userProfiles);
  }

  userProfiles[profileName] = addons;
  return true;
}

/**
 * Lists all profile names for a given auth key.
 *
 * @param {string} authKey  The user's auth key
 * @returns {string[]} Array of profile names
 */
function listCollectionProfiles(authKey) {
  if (!authKey) return [];

  const userProfiles = profiles.get(authKey);
  if (!userProfiles) return [];

  return Object.keys(userProfiles);
}

/**
 * Deletes a collection profile by name and auth key.
 *
 * @param {string} profileName  The name of the profile to delete
 * @param {string} authKey      The user's auth key
 * @returns {boolean} true if the profile was found and deleted, false otherwise
 */
function deleteCollectionProfile(profileName, authKey) {
  if (!profileName || !authKey) return false;

  const userProfiles = profiles.get(authKey);
  if (!userProfiles || !userProfiles[profileName]) return false;

  delete userProfiles[profileName];

  // Clean up empty user entries
  if (Object.keys(userProfiles).length === 0) {
    profiles.delete(authKey);
  }

  return true;
}

module.exports = {
  getCollectionProfile,
  saveCollectionProfile,
  listCollectionProfiles,
  deleteCollectionProfile,
};
