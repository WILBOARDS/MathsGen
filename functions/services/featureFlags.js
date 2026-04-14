const admin = require("firebase-admin");

const COLLECTION = "feature_flags";

function normalizeRolloutPercentage(value) {
  if (value === undefined || value === null) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(100, Math.max(0, Math.floor(parsed)));
}

function normalizeAllowedUids(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((uid) => String(uid || "").trim()).filter(Boolean))];
}

function stableBucket(input) {
  const text = String(input || "anonymous");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

async function getFlag(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return null;

  const snap = await admin.firestore().collection(COLLECTION).doc(key).get();
  if (!snap.exists) return null;
  return { key, ...snap.data() };
}

async function setFlag(featureKey, data = {}) {
  const key = String(featureKey || "").trim();
  if (!key) {
    throw new Error("featureKey is required");
  }

  const payload = {
    key,
    enabled: Boolean(data.enabled),
    rolloutPercentage: normalizeRolloutPercentage(data.rolloutPercentage),
    allowedUids: normalizeAllowedUids(data.allowedUids),
    description: String(data.description || "").trim().slice(0, 300),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection(COLLECTION).doc(key).set(payload, { merge: true });
  return payload;
}

async function isEnabled(featureKey, context = {}) {
  const flag = await getFlag(featureKey);
  if (!flag || !flag.enabled) return false;

  const uid = String(context.uid || "").trim();
  if (uid && Array.isArray(flag.allowedUids) && flag.allowedUids.includes(uid)) {
    return true;
  }

  const rollout = normalizeRolloutPercentage(flag.rolloutPercentage);
  if (rollout >= 100) return true;
  if (rollout <= 0) return false;

  const bucket = stableBucket(uid || "anonymous");
  return bucket < rollout;
}

module.exports = {
  getFlag,
  setFlag,
  isEnabled,
};
