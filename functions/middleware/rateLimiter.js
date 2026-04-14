/**
 * ========== MODULE 2: API RATE LIMITER ==========
 *
 * Architecture — Sliding Window via Redis Sorted Sets:
 *   Each identifier (IP or UID) maps to a Redis sorted set where the score is
 *   the Unix epoch in milliseconds. On every request:
 *     1. ZREMRANGEBYSCORE: prune entries older than (now - windowMs)
 *     2. ZCARD:            count requests still in the window
 *     3. ZADD:             record this request
 *     4. EXPIRE:           keep the key from leaking memory
 *
 *   All four commands are batched into a single pipeline to minimise round-trips.
 *
 *   Why Sorted Sets over Counters?
 *   - Token Bucket requires a background "refill" process.
 *   - Fixed Window counters can allow 2× the limit at window boundaries.
 *   - Sliding Window sorted sets are exact and need no cron job.
 *
 *   Why not in-memory?
 *   - Cloud Functions / containerised services run multiple instances.
 *     An in-memory counter resets per instance and does not enforce global limits.
 *
 *   Fail-open policy:
 *   - If Redis is unreachable, requests are allowed through (fail-open) and an
 *     error is logged. Change `FAIL_OPEN` to `false` to fail-closed for stricter
 *     security at the cost of availability.
 *
 * Redis Key Schema:
 *   rl:{identifier}  →  sorted set of request timestamps
 */

const { Redis } = require("@upstash/redis");
const logger = require("firebase-functions/logger");

// ---------------------------------------------------------------------------
// Initialise Redis client
// Credentials come from environment variables set via:
//   firebase functions:secrets:set UPSTASH_REDIS_REST_URL
//   firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN
// ---------------------------------------------------------------------------
let _redis = null;
let _redisConfigWarned = false;
function getRedis() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

  if (!url || !token) {
    if (!_redisConfigWarned) {
      logger.warn("[RateLimiter] Redis credentials are not configured; using fail-open mode");
      _redisConfigWarned = true;
    }
    return null;
  }

  if (!_redis) {
    try {
      _redis = new Redis({ url, token });
    } catch (err) {
      logger.error("[RateLimiter] Redis client initialization failed", { err: err.message });
      return null;
    }
  }
  return _redis;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FAIL_OPEN       = true;  // allow requests when Redis is down
const DEFAULT_LIMIT   = 60;    // requests per window
const DEFAULT_WINDOW  = 60;    // window size in seconds

// ---------------------------------------------------------------------------
// Core sliding-window implementation
// ---------------------------------------------------------------------------

/**
 * Check whether `identifier` is within its rate limit.
 *
 * @param {object} params
 * @param {string} params.identifier - Unique key to throttle (UID or IP).
 * @param {number} [params.limit=60]      - Max allowed requests per window.
 * @param {number} [params.windowSec=60]  - Sliding window duration in seconds.
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number, limit: number, degraded?: boolean }>}
 */
async function checkRateLimit({
  identifier,
  limit     = DEFAULT_LIMIT,
  windowSec = DEFAULT_WINDOW,
}) {
  const key         = `rl:${identifier}`;
  const now         = Date.now();
  const windowStart = now - windowSec * 1000;

  try {
    const redis = getRedis();
    if (!redis) {
      return { allowed: true, remaining: limit, resetAt: 0, limit, degraded: true };
    }

    const pipeline = redis.pipeline();

    // 1. Prune entries outside the sliding window
    pipeline.zremrangebyscore(key, "-inf", windowStart);
    // 2. Count entries remaining inside the window (before adding current)
    pipeline.zcard(key);
    // 3. Add the current request (unique member to handle sub-ms bursts)
    pipeline.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2)}` });
    // 4. Set TTL so unused keys are garbage-collected
    pipeline.expire(key, windowSec * 2);

    const results = await pipeline.exec();

    // results[1] is the count *before* the current request was added
    const countBeforeCurrent = Number(results[1]);
    const allowed             = countBeforeCurrent < limit;
    const remaining           = Math.max(0, limit - countBeforeCurrent - 1);
    const resetAt             = Math.ceil((now + windowSec * 1000) / 1000); // Unix seconds

    return { allowed, remaining, resetAt, limit };
  } catch (err) {
    logger.error("[RateLimiter] Redis error", { identifier, err: err.message });

    if (FAIL_OPEN) {
      return { allowed: true, remaining: limit, resetAt: 0, limit, degraded: true };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HTTP middleware (for onRequest functions)
// ---------------------------------------------------------------------------

/**
 * Express-style rate-limit middleware for `onRequest` Cloud Functions.
 *
 * Usage:
 *   exports.myEndpoint = onRequest({ region }, async (req, res) => {
 *     const stop = await rateLimitHttp(req, res, { limit: 30 });
 *     if (stop) return;
 *     // ... handler logic
 *   });
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {object} [options]
 * @returns {Promise<boolean>} `true` if the request was throttled (handler should return early).
 */
async function rateLimitHttp(req, res, options = {}) {
  const identifier = (
    req.headers["x-forwarded-for"] ||
    req.ip ||
    "unknown"
  ).split(",")[0].trim();

  const result = await checkRateLimit({ identifier, ...options });

  // Always set informational headers
  res.set("X-RateLimit-Limit",     String(result.limit));
  res.set("X-RateLimit-Remaining", String(result.remaining));
  res.set("X-RateLimit-Reset",     String(result.resetAt));

  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
    res.set("Retry-After", String(retryAfter));
    res.status(429).json({
      error:      "too_many_requests",
      message:    "Rate limit exceeded. Please slow down.",
      retryAfter,
      resetAt:    result.resetAt,
    });
    return true; // signal: stop processing
  }

  return false; // signal: continue
}

// ---------------------------------------------------------------------------
// Callable middleware (for onCall functions)
// ---------------------------------------------------------------------------

/**
 * Guard for `onCall` Cloud Functions. Throws `HttpsError("resource-exhausted")`
 * when the caller exceeds the configured rate limit.
 *
 * Usage:
 *   exports.myCallable = onCall({ region }, async (request) => {
 *     await rateLimitCallable(request, { limit: 10, windowSec: 60 });
 *     // ... handler logic
 *   });
 *
 * @param {import("firebase-functions/v2/https").CallableRequest} request
 * @param {object} [options]
 */
async function rateLimitCallable(request, options = {}) {
  const { HttpsError } = require("firebase-functions/v2/https");

  // Prefer authenticated UID for accuracy; fall back to IP for guests
  const identifier = request.auth?.uid
    || (request.rawRequest?.headers?.["x-forwarded-for"] || request.rawRequest?.ip || "anon")
        .split(",")[0].trim();

  const result = await checkRateLimit({ identifier, ...options });

  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Retry after ${retryAfter}s.`
    );
  }

  return result;
}

module.exports = { checkRateLimit, rateLimitHttp, rateLimitCallable };
