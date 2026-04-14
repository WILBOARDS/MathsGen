/**
 * ========== MODULE 6: DEEP HEALTH CHECK ==========
 *
 * Architecture:
 *   A "deep ping" endpoint that actively probes every critical dependency rather
 *   than returning a trivial 200 OK. Checks run in parallel via Promise.allSettled
 *   so a single slow/failed service does not block the others.
 *
 *   Status levels:
 *   - "healthy"  — all services responding within acceptable latency
 *   - "degraded" — at least one service is up but one or more are down
 *   - "down"     — all services are unreachable
 *
 *   HTTP response codes:
 *   - 200 → healthy
 *   - 207 → degraded (partial failure)
 *   - 503 → down
 *
 *   Metrics:
 *   - Latency for each subsystem probe is reported in the response body.
 *   - The full response is also logged via Firebase logger so it can be
 *     forwarded to Cloud Monitoring / an external APM (Datadog, Sentry, etc.).
 *
 *   Probes:
 *   1. Firestore (primary database) — write a document to `_health/ping`
 *   2. Redis (Upstash)              — SET a key with 10s TTL
 *   3. Firebase Realtime Database   — write to `_health/ping`
 *
 *   Adding more probes (e.g., a third-party API):
 *     Add an async `_checkXxx()` function and push it into the `probes` array
 *     at the top of `deepHealthCheck()`.
 */

const admin  = require("firebase-admin");
const { Redis } = require("@upstash/redis");
const logger = require("firebase-functions/logger");

// ---------------------------------------------------------------------------
// Redis client
// ---------------------------------------------------------------------------
let _redis = null;
let _redisConfigWarned = false;
function _getRedis() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

  if (!url || !token) {
    if (!_redisConfigWarned) {
      logger.warn("[HealthCheck] Redis credentials are not configured; redis probe marked unavailable");
      _redisConfigWarned = true;
    }
    return null;
  }

  if (!_redis) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ---------------------------------------------------------------------------
// Public: deep health check runner
// ---------------------------------------------------------------------------

/**
 * Run all dependency probes in parallel and return a structured health report.
 *
 * @returns {Promise<HealthReport>}
 */
async function deepHealthCheck() {
  const uptimeSeconds = Math.floor(process.uptime());
  const mem           = process.memoryUsage();

  // Run all probes concurrently; allSettled ensures partial results on failure
  const [firestoreResult, redisResult, rtdbResult] = await Promise.allSettled([
    _checkFirestore(),
    _checkRedis(),
    _checkRealtimeDB(),
  ]);

  const services = {
    firestore:  _extractResult(firestoreResult),
    redis:      _extractResult(redisResult),
    realtimeDb: _extractResult(rtdbResult),
  };

  const statuses    = Object.values(services).map((s) => s.status);
  const upCount     = statuses.filter((s) => s === "up").length;
  const overallStatus =
    upCount === statuses.length   ? "healthy" :
    upCount > 0                   ? "degraded" :
                                    "down";

  const report = {
    status:    overallStatus,
    app:       "mathquizzizz",
    version:   "3.7.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    services,
    memory: {
      heapUsedMB:  _mb(mem.heapUsed),
      heapTotalMB: _mb(mem.heapTotal),
      rssMB:       _mb(mem.rss),
    },
  };

  // Log to Cloud Logging for dashboards / alerting
  const logFn = overallStatus === "healthy" ? logger.info : logger.warn;
  logFn("[HealthCheck]", { status: overallStatus, services });

  return report;
}

/**
 * Get the appropriate HTTP status code for a health report.
 * @param {HealthReport} report
 * @returns {200|207|503}
 */
function httpStatusFor(report) {
  switch (report.status) {
    case "healthy":  return 200;
    case "degraded": return 207;
    default:         return 503;
  }
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

async function _checkFirestore() {
  const start = Date.now();
  await admin
    .firestore()
    .collection("_health")
    .doc("ping")
    .set({ checkedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { status: "up", latencyMs: Date.now() - start };
}

async function _checkRedis() {
  const redis = _getRedis();
  if (!redis) {
    return { status: "unavailable", latencyMs: 0, reason: "credentials_missing" };
  }

  const start  = Date.now();
  const result = await redis.set("health:ping", Date.now(), { ex: 10 });
  if (result !== "OK") throw new Error(`Unexpected Redis SET response: ${result}`);
  return { status: "up", latencyMs: Date.now() - start };
}

async function _checkRealtimeDB() {
  const start = Date.now();
  await admin.database().ref("_health/ping").set({ ts: Date.now() });
  return { status: "up", latencyMs: Date.now() - start };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _extractResult(settled) {
  if (settled.status === "fulfilled") return settled.value;
  return { status: "down", latencyMs: -1, error: settled.reason?.message || "unknown error" };
}

function _mb(bytes) {
  return Math.round(bytes / 1024 / 1024);
}

/**
 * @typedef {{ status: string, latencyMs: number, error?: string }} ServiceStatus
 * @typedef {{ status: string, app: string, version: string, timestamp: string, uptimeSeconds: number, services: Record<string, ServiceStatus>, memory: object }} HealthReport
 */

module.exports = { deepHealthCheck, httpStatusFor };
