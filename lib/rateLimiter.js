/**
 * lib/rateLimiter.js
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SERVERLESS LIMITATION                                             │
 * │                                                                    │
 * │  This module uses an in-memory Map to track rate-limit buckets.    │
 * │  In a Vercel serverless environment each cold start creates a      │
 * │  fresh Map, so the limiter resets on every new function instance.  │
 * │                                                                    │
 * │  For production-grade rate limiting you should integrate an        │
 * │  external store (Vercel KV, Upstash Redis, etc.) via the optional  │
 * │  externalStore parameter in getCachedLimit().                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const buckets = new Map();

// ── In-memory deduplication cache ────────────────────────────────────
// Tracks recently-seen keys with a timestamp so that within a single
// serverless invocation duplicate requests can be short-circuited.
const seenKeys = new Map();

/**
 * Returns the current rate-limit state for `key` from the in-memory Map.
 *
 * @param {string}  key               Unique identifier (e.g. "login:1.2.3.4")
 * @param {object}  [opts]
 * @param {number}  [opts.max=20]     Max requests allowed in the window
 * @param {number}  [opts.windowMs=60000] Window duration in milliseconds
 * @param {object}  [opts.externalStore]  Optional async store for serverless persistence
 *                                        Must expose `get(key)` and `set(key, value, ttlMs)`.
 * @returns {Promise<{limited: boolean, remaining: number, retryAfterMs?: number}>}
 */
async function getCachedLimit(key, opts = {}) {
  const { max = 20, windowMs = 60_000, externalStore } = opts;

  // If an external store is provided, try it first
  if (externalStore) {
    try {
      const cached = await externalStore.get(key);
      if (cached) {
        return cached;
      }
    } catch {
      // Fall through to in-memory on store error
    }
  }

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    const result = { limited: false, remaining: max - 1 };

    if (externalStore) {
      try { await externalStore.set(key, result, windowMs); } catch { /* ignore */ }
    }
    return result;
  }

  existing.count += 1;
  if (existing.count > max) {
    const result = { limited: true, remaining: 0, retryAfterMs: existing.resetAt - now };
    if (externalStore) {
      try { await externalStore.set(key, result, windowMs); } catch { /* ignore */ }
    }
    return result;
  }

  const result = { limited: false, remaining: max - existing.count };
  if (externalStore) {
    try { await externalStore.set(key, result, windowMs); } catch { /* ignore */ }
  }
  return result;
}

/**
 * Synchronous rate-limit helper (backward-compatible).
 *
 * @param {string}  key
 * @param {object}  [opts]
 * @param {number}  [opts.max=20]
 * @param {number}  [opts.windowMs=60000]
 * @returns {{limited: boolean, remaining: number, retryAfterMs?: number}}
 */
function hitRateLimit(key, { max = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: max - 1 };
  }

  existing.count += 1;
  if (existing.count > max) {
    return { limited: true, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  return { limited: false, remaining: max - existing.count };
}

/**
 * Returns a standardised 429 response object that callers can send
 * via `res.status(429).json(rateLimitResponse())`.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.retryAfterMs]
 * @param {string}  [opts.message]
 * @returns {{ ok: false, error: string, retryAfter?: number }}
 */
function rateLimitResponse({ retryAfterMs, message } = {}) {
  const body = {
    ok: false,
    error: message || 'Too many requests. Please retry shortly.',
  };
  if (retryAfterMs != null) {
    body.retryAfter = Math.ceil(retryAfterMs / 1000);
  }
  return body;
}

module.exports = { hitRateLimit, getCachedLimit, rateLimitResponse };
