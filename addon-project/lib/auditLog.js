/**
 * lib/auditLog.js
 *
 * Structured audit logging for security-sensitive events.
 * Extends the existing logEvent pattern with a dedicated `[AUDIT]` prefix
 * and standardised event types.
 */

/**
 * Valid audit event types.
 * @typedef {'login_success'|'login_failed'|'logout'|'addon_collection_changed'|'session_created'|'session_auth_key'} AuditEventType
 */

/**
 * Logs a structured audit entry for a security-sensitive event.
 *
 * @param {AuditEventType} event   The type of audit event
 * @param {object}         details Additional context for the event
 * @param {string}        [details.authKey]   The auth key involved (if any)
 * @param {string}        [details.ip]        The client IP address
 * @param {string}        [details.reason]    Reason for the event (e.g. failure reason)
 * @param {object}        [details.meta]      Arbitrary extra metadata
 * @returns {{ ts: string, event: string, details: object }} The log entry
 */
function auditLog(event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    details: {
      authKey: details.authKey || undefined,
      ip: details.ip || undefined,
      reason: details.reason || undefined,
      ...details.meta,
    },
  };

  console.log('[AUDIT]', JSON.stringify(entry));

  return entry;
}

module.exports = { auditLog };
