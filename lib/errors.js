/**
 * lib/errors.js
 *
 * Sanitises internal error messages before sending them to clients.
 * Prevents leaking implementation details (stack traces, internal URLs,
 * database errors, etc.) while preserving server-side logging.
 */

// Maps internal error contexts to user-safe messages
const SAFE_MESSAGES = {
  login: 'Invalid email or password. Please try again.',
  addonGet: 'Failed to fetch addons. Please try again.',
  addonSet: 'Failed to save addons. Please try again.',
  diff: 'Failed to compute addon diff. Please try again.',
  session: 'Authentication failed. Please check your credentials.',
  linkCheck: 'Health check failed. Please try again later.',
  compressed: 'Invalid data format. Please try again.',
  import: 'Failed to import addons. Please try again.',
};

/**
 * Replaces an internal error with a user-safe one and logs the real error
 * server-side for debugging.
 *
 * @param {Error}   err      The original internal error
 * @param {string}  [context='general']  A key from SAFE_MESSAGES or arbitrary label
 * @returns {Error}  A new Error whose `.message` is safe for the client
 */
function sanitizeError(err, context = 'general') {
  const message = SAFE_MESSAGES[context] || 'An unexpected error occurred.';
  // Log the real error server-side for debugging
  console.error(`[${context}] ${err.message}`, err.stack);
  return new Error(message);
}

module.exports = { sanitizeError, SAFE_MESSAGES };
