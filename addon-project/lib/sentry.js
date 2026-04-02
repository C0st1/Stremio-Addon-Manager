/**
 * lib/sentry.js
 *
 * Sentry integration stub — provides a structured interface for error reporting
 * that can be wired to a real Sentry DSN in production.
 *
 * In development, errors are logged to console with a [SENTRY] prefix.
 * When SENTRY_DSN environment variable is set, the module initialises Sentry
 * (for real DSN integration, install @sentry/node and uncomment the init call).
 */

let initialised = false;

/**
 * Initialises Sentry error reporting.
 * In production with a SENTRY_DSN, this would call Sentry.init({ dsn }).
 *
 * @param {string} [dsn]  Explicit DSN override. Falls back to process.env.SENTRY_DSN.
 * @returns {boolean} true if Sentry was initialised (DSN was available)
 */
function initSentry(dsn) {
  const sentryDsn = dsn || process.env.SENTRY_DSN;
  if (!sentryDsn) {
    console.log('[SENTRY] No DSN provided — error reporting is disabled.');
    return false;
  }

  // In a real implementation you would:
  // const Sentry = require('@sentry/node');
  // Sentry.init({ dsn: sentryDsn });

  initialised = true;
  console.log(`[SENTRY] Initialised with DSN: ${sentryDsn.substring(0, 20)}...`);
  return true;
}

/**
 * Captures an exception. Logs to console in dev; would send to Sentry in production.
 *
 * @param {Error}   err            The error to capture
 * @param {object}  [context={}]   Additional context tags / user info
 * @param {string}  [context.authKey]
 * @param {string}  [context.ip]
 * @param {string}  [context.endpoint]
 * @returns {string} A synthetic event ID (real Sentry returns its own)
 */
function captureException(err, context = {}) {
  if (!initialised) {
    console.log('[SENTRY] Not initialised — logging error locally.');
  }

  const eventId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const entry = {
    eventId,
    message: err?.message || String(err),
    stack: err?.stack || undefined,
    context: {
      authKey: context.authKey || undefined,
      ip: context.ip || undefined,
      endpoint: context.endpoint || undefined,
    },
  };

  console.error('[SENTRY]', JSON.stringify(entry));

  return eventId;
}

/**
 * Returns whether Sentry has been initialised.
 * @returns {boolean}
 */
function isInitialised() {
  return initialised;
}

/**
 * Resets the initialised state. Used for testing.
 */
function resetSentry() {
  initialised = false;
}

module.exports = { initSentry, captureException, isInitialised, resetSentry };
