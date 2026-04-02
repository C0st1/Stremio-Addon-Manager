/**
 * lib/publicApi.js
 *
 * Public API key management for programmatic access to the Addon Manager API.
 * Keys are stored in-memory and support permission scoping.
 *
 * For production, replace the in-memory Map with a database store.
 */

const crypto = require('crypto');

// In-memory store: apiKey → { permissions, createdAt, lastUsedAt }
const apiKeys = new Map();

const DEFAULT_PERMISSIONS = ['read'];

/**
 * Generates a random API key (32-byte hex string).
 *
 * @returns {string} The generated API key
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Registers an API key with optional permission scope.
 * If no key is provided, one is generated automatically.
 *
 * @param {string}   [key]          The API key to register. If omitted, a new key is generated.
 * @param {string[]} [permissions]  Array of permission scopes (e.g. ['read', 'write']). Defaults to ['read'].
 * @returns {{ key: string, permissions: string[] }} The registered key and its permissions
 */
function registerApiKey(key, permissions) {
  const apiKey = key || generateApiKey();
  const perms = Array.isArray(permissions) && permissions.length > 0
    ? permissions
    : [...DEFAULT_PERMISSIONS];

  apiKeys.set(apiKey, {
    permissions: perms,
    createdAt: Date.now(),
    lastUsedAt: null,
  });

  return { key: apiKey, permissions: perms };
}

/**
 * Validates an API key and returns its metadata if valid.
 *
 * @param {string} key  The API key to validate
 * @returns {{ valid: boolean, permissions?: string[], lastUsedAt?: number }}
 */
function validateApiKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false };
  }

  const entry = apiKeys.get(key);
  if (!entry) {
    return { valid: false };
  }

  // Update last used timestamp
  entry.lastUsedAt = Date.now();

  return { valid: true, permissions: entry.permissions, lastUsedAt: entry.lastUsedAt };
}

/**
 * Checks if an API key has a specific permission.
 *
 * @param {string} key         The API key
 * @param {string} permission  The permission to check
 * @returns {boolean}
 */
function hasPermission(key, permission) {
  const result = validateApiKey(key);
  if (!result.valid) return false;
  return result.permissions.includes(permission);
}

/**
 * Revokes (removes) an API key.
 *
 * @param {string} key  The API key to revoke
 * @returns {boolean} true if the key existed and was removed
 */
function revokeApiKey(key) {
  return apiKeys.delete(key);
}

/**
 * Lists all registered API keys (without revealing the full key for security).
 *
 * @returns {Array<{ keyPrefix: string, permissions: string[], createdAt: number, lastUsedAt: number|null }>}
 */
function listApiKeys() {
  const result = [];
  for (const [key, entry] of apiKeys) {
    result.push({
      keyPrefix: key.substring(0, 8) + '...',
      permissions: entry.permissions,
      createdAt: entry.createdAt,
      lastUsedAt: entry.lastUsedAt,
    });
  }
  return result;
}

/**
 * Clears all registered API keys. Useful for testing.
 */
function clearApiKeys() {
  apiKeys.clear();
}

module.exports = {
  generateApiKey,
  registerApiKey,
  validateApiKey,
  hasPermission,
  revokeApiKey,
  listApiKeys,
  clearApiKeys,
};
