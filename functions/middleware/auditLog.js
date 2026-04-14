/**
 * ========== MODULE 1: AUDIT LOG SYSTEM ==========
 *
 * Architecture:
 *   Every critical write operation is wrapped with `withAuditLog()` or calls
 *   `writeAuditLog()` directly. Log entries are written to the `audit_logs`
 *   Firestore collection using a fire-and-forget pattern — the .add() is never
 *   awaited in the hot path, so it adds zero latency to the main response.
 *
 *   Trade-offs:
 *   - Fire-and-forget means a Cloud Function cold-start crash could lose that
 *     single entry. Acceptable for non-financial audit logs.
 *   - For financial/compliance audit trails, swap the fire-and-forget with a
 *     Pub/Sub publish (also async, but with at-least-once delivery guarantees).
 *
 * Firestore Schema — collection: `audit_logs`
 *   {
 *     actorId:    string,   // Firebase UID or "anonymous"
 *     action:     string,   // e.g. "user.updated", "admin.deleted_question"
 *     metadata:   object,   // sanitised request/response snapshot
 *     ipAddress:  string,   // from x-forwarded-for or req.ip
 *     timestamp:  Timestamp // server-side Firestore timestamp
 *   }
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Lazy-load db reference so it's only accessed after admin.initializeApp() is called
function getDb() {
  return admin.firestore();
}

/** Keys that are always stripped before a log entry is persisted. */
const SENSITIVE_KEYS = ["password", "token", "secret", "credit_card", "ssn", "cvv", "pin"];

// ---------------------------------------------------------------------------
// Core writer (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Write an audit log entry asynchronously without blocking the caller.
 *
 * @param {object} params
 * @param {string}  params.actorId   - Firebase UID of the requester.
 * @param {string}  params.action    - Dot-namespaced action, e.g. "user.updated".
 * @param {object}  [params.metadata={}] - Extra context (request data, result).
 * @param {string}  [params.ipAddress]   - Client IP, if available.
 */
function writeAuditLog({ actorId, action, metadata = {}, ipAddress }) {
  const entry = {
    actorId:   actorId    || "anonymous",
    action,
    metadata:  sanitizeForLog(metadata),
    ipAddress: ipAddress  || "unknown",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Intentionally NOT awaited — fire and forget
  getDb().collection("audit_logs")
    .add(entry)
    .catch((err) =>
      logger.error("[AuditLog] Failed to persist entry", { action, err: err.message })
    );
}

// ---------------------------------------------------------------------------
// Higher-order wrapper for onCall handlers
// ---------------------------------------------------------------------------

/**
 * Wrap a Firebase Callable handler so the action is automatically logged
 * after the handler resolves successfully.
 *
 * Usage:
 *   exports.updateProfile = onCall({ region }, withAuditLog("user.updated", async (req) => {
 *     // ... handler logic
 *   }));
 *
 * @param {string}   action  - Audit action identifier.
 * @param {Function} handler - Original async callable handler.
 * @returns {Function} Wrapped handler.
 */
function withAuditLog(action, handler) {
  return async (request) => {
    const result = await handler(request);

    const actor = request.adminActor || null;

    writeAuditLog({
      actorId: actor?.uid || request.auth?.uid,
      action,
      metadata: {
        requestData: sanitizeForLog(request.data ?? {}),
        authMode: actor?.authMode || (request.auth ? "firebase" : "anonymous"),
        // Only store a success indicator in the log, not the full result
        resultSummary: result && typeof result === "object"
          ? { success: result.success ?? true }
          : {},
      },
      ipAddress: request.rawRequest?.headers?.["x-forwarded-for"]
        || request.rawRequest?.ip,
    });

    return result;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively strip sensitive keys from a plain object before logging.
 * @param {object} data
 * @returns {object}
 */
function sanitizeForLog(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data ?? {};

  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk)))
      .map(([key, value]) => [
        key,
        typeof value === "object" && value !== null ? sanitizeForLog(value) : value,
      ])
  );
}

module.exports = { writeAuditLog, withAuditLog };
