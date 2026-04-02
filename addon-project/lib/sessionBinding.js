/**
 * lib/sessionBinding.js
 *
 * Binds session auth keys to client IP addresses for additional security.
 * Prevents session tokens from being reused from a different IP.
 *
 * Bindings are stored in-memory and auto-expire after 30 minutes.
 */

const BINDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

// In-memory store: authKey → { ip, boundAt }
const bindings = new Map();

/**
 * Binds an auth key to a client IP address. Updates the binding if one
 * already exists for the given auth key.
 *
 * @param {string} ip      The client's IP address
 * @param {string} authKey The session's auth key
 */
function bindSessionToIp(ip, authKey) {
  if (!ip || !authKey) return;

  pruneExpiredBindings();

  bindings.set(authKey, {
    ip,
    boundAt: Date.now(),
  });
}

/**
 * Validates that the provided IP matches the IP bound to the auth key.
 * Returns true if:
 *   - No binding exists for the auth key (no enforcement)
 *   - The IP matches the stored binding
 *   - The binding has not expired
 *
 * If the binding has expired, it is removed and the function returns true
 * (as if no binding exists, allowing re-binding).
 *
 * @param {string} ip      The client's IP address
 * @param {string} authKey The session's auth key
 * @returns {boolean}
 */
function validateSessionIp(ip, authKey) {
  if (!ip || !authKey) return true;

  const entry = bindings.get(authKey);
  if (!entry) return true;

  // Check if the binding has expired
  const now = Date.now();
  if (now - entry.boundAt > BINDING_TTL_MS) {
    bindings.delete(authKey);
    return true;
  }

  return entry.ip === ip;
}

/**
 * Removes expired bindings from the store.
 */
function pruneExpiredBindings() {
  const now = Date.now();
  for (const [key, entry] of bindings) {
    if (now - entry.boundAt > BINDING_TTL_MS) {
      bindings.delete(key);
    }
  }
}

module.exports = { bindSessionToIp, validateSessionIp };
