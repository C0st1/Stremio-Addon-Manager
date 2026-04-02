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
 *
 * @module rateLimiter
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  EXTERNAL STORE INTERFACE                                          │
 * │                                                                    │
 * │  The `externalStore` parameter accepts an object implementing the  │
 * │  following async methods:                                          │
 * │                                                                    │
 * │    externalStore.get(key) → Promise<object|null>                   │
 * │      Returns the cached rate-limit result for the given key,       │
 * │      or null if no entry exists. The returned value should match   │
 * │      the shape: { limited, remaining, retryAfterMs? }.             │
 * │                                                                    │
 * │    externalStore.set(key, value, ttlMs) → Promise<void>            │
 * │      Stores the rate-limit result with a time-to-live in ms.       │
 * │      Errors from set() are silently ignored to avoid blocking.     │
 * │                                                                    │
 * │  Example — Vercel KV:                                              │
 * │    const kv = require('@vercel/kv');                               │
 * │    const store = {                                                  │
 * │      get: (key) => kv.get(`rl:${key}`, 'json'),                   │
 * │      set: (key, val, ttl) => kv.set(`rl:${key}`, val, { px: ttl }),│
 * │    };                                                              │
 * │                                                                    │
 * │  Example — Upstash Redis:                                          │
 * │    const { Redis } = require('@upstash/redis');                     │
 * │    const redis = new Redis();                                       │
 * │    const store = {                                                  │
 * │      get: (key) => redis.get(`rl:${key}`, { type: 'json' }),      │
 * │      set: (key, val, ttl) => redis.set(`rl:${key}`, JSON.stringify(val), { ex: Math.ceil(ttl / 1000) }),
 * │    };                                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const buckets = new Map();


/**
 * Returns the current rate-limit state for `key` and increments the counter.
 *
 * If an `externalStore` is provided, it is consulted first. When a cache
 * miss occurs the in-memory bucket is used as the source of truth, and the
 * result is written back to the external store for future cold starts.
 *
 * @param {string}  key               Unique identifier (e.g. "login:1.2.3.4")
 * @param {object}  [opts]
 * @param {number}  [opts.max=20]     Max requests allowed in the window
 * @param {number}  [opts.windowMs=60000] Window duration in milliseconds
 * @param {object}  [opts.externalStore]  Optional async store for serverless persistence.
 *                                        See module-level JSDoc for the full interface.
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

/**
 * Manually resets (clears) the rate-limit bucket for a given key.
 * Useful for admin actions or when a user has been whitelisted.
 *
 * @param {string} key  The rate-limit key to reset (e.g. "login:1.2.3.4")
 * @returns {boolean} true if the key existed and was removed, false otherwise
 */
function resetRateLimit(key) {
  return buckets.delete(key);
}

/**
 * Checks the current rate-limit status for a key without incrementing the counter.
 *
 * @param {string}  key               Unique identifier
 * @param {object}  [opts]
 * @param {number}  [opts.max=20]     Max requests allowed in the window
 * @param {number}  [opts.windowMs=60000] Window duration in milliseconds
 * @returns {{limited: boolean, remaining: number, retryAfterMs?: number, exists: boolean}}
 */
function getRateLimitStatus(key, { max = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const existing = buckets.get(key);

  // No bucket exists — no rate limit applied yet
  if (!existing) {
    return { limited: false, remaining: max, exists: false };
  }

  // Bucket has expired
  if (existing.resetAt <= now) {
    return { limited: false, remaining: max, exists: false };
  }

  // Return current status without incrementing
  if (existing.count > max) {
    return { limited: true, remaining: 0, retryAfterMs: existing.resetAt - now, exists: true };
  }

  return { limited: false, remaining: max - existing.count, exists: true };
}

module.exports = { hitRateLimit, getCachedLimit, rateLimitResponse, resetRateLimit, getRateLimitStatus };
