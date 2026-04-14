/**
 * ========== MATHQUIZZIZZ CLOUD FUNCTIONS ==========
 * Firebase Cloud Functions for the Question Randomizer app
 *
 * Core functions:
 * 1.  cleanupUserData      - Cleanup user data when account is deleted (callable)
 * 2.  validateUsername     - Check username uniqueness (callable)
 * 3.  getLeaderboard       - Secure server-side leaderboard (callable)
 * 4.  submitScore          - Validated score submission (callable)
 * 5.  moderateQuestion     - Auto-moderate user-generated questions (callable)
 * 6.  getUserStats         - Fetch another user's public stats (callable)
 * 7.  processStudyMaterial - AI study-material processor (storage trigger)
 *
 * Reliability infrastructure (Modules 1-6):
 * 8.  healthCheck          - Deep-ping health endpoint (HTTP)
 * 9.  processJobQueue      - Scheduled worker: email + delayed jobs (cron)
 * 10. adminSetFeatureFlag  - Create / update feature flags (admin callable)
 * 11. adminGetAuditLogs    - Query recent audit log entries (admin callable)
 * 12. adminRateLimiterInfo - Inspect current rate-limit bucket (admin callable)
 * 13. adminListRegisteredUsers - List registered users and roles (admin callable)
 * 14. adminSetUserRole     - Assign user/admin role using custom claims (admin callable)
 * 15. aiGenerateImage      - Free SVG image generation with provider cycling
 */

const { setGlobalOptions } = require("firebase-functions");
const {
  onRequest,
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");
const { Buffer } = require("node:buffer");
const { URLSearchParams } = require("url");

// ── Reliability modules ──────────────────────────────────────────────────────
const { writeAuditLog, withAuditLog } = require("./middleware/auditLog");
const {
  rateLimitCallable,
  rateLimitHttp,
  checkRateLimit,
} = require("./middleware/rateLimiter");
const { isEnabled, setFlag, getFlag } = require("./services/featureFlags");
const {
  queueEmail,
  scheduleReminder,
  processEmailJobs,
} = require("./services/emailQueue");
const { deepHealthCheck, httpStatusFor } = require("./health/healthCheck");

// Initialize Firebase Admin
admin.initializeApp();
const firestore = admin.firestore();

// Cost control: limit concurrent instances
setGlobalOptions({
  maxInstances: 10,
  region: "asia-southeast2",
  secrets: [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "OPENROUTER_API_KEY",
  ],
});

// Owner-direct bypass is for localhost developer tooling only.
const DEV_OWNER_BYPASS_ENABLED =
  process.env.DEV_OWNER_BYPASS_ENABLED === "true";
const DEV_OWNER_BYPASS_TOKEN = process.env.DEV_OWNER_BYPASS_TOKEN || "";
const DEV_OWNER_BYPASS_UID =
  process.env.DEV_OWNER_BYPASS_UID || "owner-localhost";
const ADMIN_ALLOWED_EMAILS = (
  process.env.ADMIN_ALLOWED_EMAILS || "wilbertamadeuspo@gmail.com"
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const DEV_OWNER_ALLOWED_ORIGINS = (
  process.env.DEV_OWNER_ALLOWED_ORIGINS ||
  "http://localhost:4177,http://127.0.0.1:4177,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "";
const DISCORD_ADMIN_WEBHOOK_URL = process.env.DISCORD_ADMIN_WEBHOOK_URL || "";
const CLOUDFLARE_TURNSTILE_SECRET =
  process.env.CLOUDFLARE_TURNSTILE_SECRET || "";
const PASSWORD_RESET_CONTINUE_URL =
  process.env.PASSWORD_RESET_CONTINUE_URL || "https://mathquizzizz.web.app/auth";
const PASSWORD_RESET_ALLOWED_HOSTS = (
  process.env.PASSWORD_RESET_ALLOWED_HOSTS || "mathquizzizz.web.app,localhost,127.0.0.1"
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const AI_PROVIDER_SEQUENCE = ["gemini", "ollama", "openrouter"];
const AI_FALLBACK_MAX_ATTEMPTS = Math.min(
  Math.max(Number(process.env.AI_FALLBACK_MAX_ATTEMPTS) || 9, 3),
  15,
);
const OLLAMA_BASE_URL = String(
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
)
  .trim()
  .replace(/\/+$/, "");
const OLLAMA_TUTOR_MODEL = String(
  process.env.OLLAMA_TUTOR_MODEL || "qwen2.5:7b-instruct",
).trim();
const OLLAMA_IMAGE_MODEL = String(
  process.env.OLLAMA_IMAGE_MODEL || OLLAMA_TUTOR_MODEL,
).trim();
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
const OPENROUTER_BASE_URL = String(
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
)
  .trim()
  .replace(/\/+$/, "");
const OPENROUTER_TUTOR_MODEL = String(
  process.env.OPENROUTER_TUTOR_MODEL || "google/gemma-3-27b-it:free",
).trim();
const OPENROUTER_IMAGE_MODEL = String(
  process.env.OPENROUTER_IMAGE_MODEL || OPENROUTER_TUTOR_MODEL,
).trim();
const OPENROUTER_SITE_URL = String(
  process.env.OPENROUTER_SITE_URL || "https://mathquizzizz.web.app",
).trim();
const OPENROUTER_APP_NAME = String(
  process.env.OPENROUTER_APP_NAME || "MathQuizzizz",
).trim();
const AI_IMAGE_SVG_MAX_CHARS = 12000;

const INVENTORY_ITEMS = {
  xp_boost_2h: {
    type: "boost",
    durationMs: 2 * 60 * 60 * 1000,
    multiplier: 2,
    boostType: "xp",
  },
  spark_boost_2h: {
    type: "boost",
    durationMs: 2 * 60 * 60 * 1000,
    multiplier: 2,
    boostType: "sparks",
  },
  gem_boost_24h: {
    type: "boost",
    durationMs: 24 * 60 * 60 * 1000,
    multiplier: 2,
    boostType: "gems",
  },
  earning_multiplier_30m: {
    type: "boost",
    durationMs: 30 * 60 * 1000,
    multiplier: 1.5,
    boostType: "multi",
  },
  streak_shield: { type: "utility" },
  hint_pack_5: { type: "utility" },
  free_gems_20: { type: "ticket", gems: 20 },
  free_gems_50: { type: "ticket", gems: 50 },
  free_gems_100: { type: "ticket", gems: 100 },
};

const STORE_DEALS = {
  xp_boost_2h: { sparks: 150, prisms: 15 },
  streak_shield: { sparks: 200, prisms: 20 },
  hint_pack_5: { sparks: 100, prisms: 10 },
  free_gems_20: { sparks: 500, prisms: 50 },
  free_gems_50: { sparks: 900, prisms: 90 },
  free_gems_100: { sparks: 1700, prisms: 170 },
  gem_boost_24h: { sparks: 1400, prisms: 140 },
  earning_multiplier_30m: { sparks: 950, prisms: 95 },
};

const ADMIN_CALLABLE_OPTIONS = {
  region: "asia-southeast2",
  cors: true,
};

const REDIS_SECRET_BINDINGS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

function isProductionLikeEnvironment() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.FUNCTIONS_EMULATOR !== "true"
  );
}

function getRequestOrigin(request) {
  return (
    request.rawRequest?.headers?.origin ||
    request.rawRequest?.headers?.referer ||
    ""
  );
}

function isAllowedOwnerOrigin(origin) {
  if (!origin) return false;
  return DEV_OWNER_ALLOWED_ORIGINS.some((allowed) =>
    origin.startsWith(allowed),
  );
}

function isAllowedAdminEmail(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  return Boolean(normalized) && ADMIN_ALLOWED_EMAILS.includes(normalized);
}

async function resolveAdminActor(request) {
  if (request.auth?.uid) {
    const userRecord = await admin.auth().getUser(request.auth.uid);
    const normalizedEmail = String(userRecord?.email || "")
      .trim()
      .toLowerCase();
    const hasAdminClaim = Boolean(request.auth.token?.admin);
    const hasAllowedEmail = isAllowedAdminEmail(normalizedEmail);

    if (!hasAdminClaim && !hasAllowedEmail) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const actor = {
      uid: request.auth.uid,
      email: normalizedEmail,
      authMode: hasAdminClaim
        ? "firebase-admin-claim"
        : "firebase-allowed-email",
      isBypass: false,
    };
    request.adminActor = actor;
    return actor;
  }

  const ownerAccessKey = request.data?.ownerAccessKey;
  const origin = getRequestOrigin(request);

  if (!DEV_OWNER_BYPASS_ENABLED || !DEV_OWNER_BYPASS_TOKEN) {
    throw new HttpsError("unauthenticated", "Login required");
  }
  if (isProductionLikeEnvironment()) {
    throw new HttpsError(
      "permission-denied",
      "Owner bypass is disabled in production",
    );
  }
  if (!isAllowedOwnerOrigin(origin)) {
    throw new HttpsError(
      "permission-denied",
      "Origin is not allowed for owner bypass",
    );
  }
  if (!ownerAccessKey || ownerAccessKey !== DEV_OWNER_BYPASS_TOKEN) {
    throw new HttpsError("permission-denied", "Invalid owner access key");
  }

  const actor = {
    uid: DEV_OWNER_BYPASS_UID,
    authMode: "owner-bypass",
    isBypass: true,
  };
  request.adminActor = actor;
  return actor;
}

function stripOwnerAccessKey(payload = {}) {
  if (!payload || typeof payload !== "object") return {};
  const { ownerAccessKey, ...safePayload } = payload;
  return safePayload;
}

function normalizeFeedbackCategory(category) {
  const raw = String(category || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (raw.includes("bug")) return "bug";
  if (raw.includes("feature")) return "feature";
  if (raw.includes("compliment") || raw.includes("praise")) return "compliment";
  if (raw.includes("other") || raw.includes("general")) return "other";
  return raw;
}

function clampUnitInterval(value, fallback = 0.7) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function trimText(value, maxLen = 400) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function normalizeTutorTurns(recentTurns) {
  if (!Array.isArray(recentTurns)) return [];
  return recentTurns.slice(-6).map((turn) => ({
    role:
      String(turn?.role || "user").toLowerCase() === "assistant"
        ? "assistant"
        : "user",
    text: trimText(turn?.text || "", 400),
  }));
}

function normalizeTutorMode(mode) {
  const normalized = String(mode || "hint").toLowerCase();
  if (["hint", "explain", "steps", "answer"].includes(normalized)) {
    return normalized;
  }
  return "hint";
}

function getRequestIpAddress(request) {
  const forwardedFor = request.rawRequest?.headers?.["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || "");
  const firstForwardedIp = forwardedValue.split(",")[0].trim();
  return firstForwardedIp || request.rawRequest?.ip || "";
}

function sanitizePasswordResetContinueUrl(rawUrl) {
  const fallback = PASSWORD_RESET_CONTINUE_URL;
  if (!rawUrl || typeof rawUrl !== "string") return fallback;

  try {
    const parsed = new URL(rawUrl);
    const hostname = String(parsed.hostname || "").toLowerCase();
    if (!PASSWORD_RESET_ALLOWED_HOSTS.includes(hostname)) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function countMatches(regex, text) {
  if (!(regex instanceof RegExp)) return 0;

  const input = String(text || "");
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);

  let count = 0;
  let match = globalRegex.exec(input);
  while (match) {
    count += 1;
    if (match[0] === "") {
      globalRegex.lastIndex += 1;
    }
    match = globalRegex.exec(input);
  }

  return count;
}

function detectTutorBotReason({
  questionText,
  learnerMessage,
  recentTurns,
  clientSignals,
}) {
  const safeQuestionText = String(questionText || "");
  const safeLearnerMessage = String(learnerMessage || "");
  const safeRecentTurns = Array.isArray(recentTurns) ? recentTurns : [];
  const safeClientSignals =
    clientSignals && typeof clientSignals === "object" ? clientSignals : {};

  if (safeLearnerMessage.length > 900) return "message_too_long";
  if (countMatches(/(https?:\/\/|www\.)/gi, safeLearnerMessage) > 1) {
    return "link_spam";
  }
  if (/[<>]{3,}/.test(safeLearnerMessage)) return "markup_injection";
  if (safeClientSignals.webdriver === true) return "webdriver_client";

  if (safeRecentTurns.length >= 6) {
    const userTurns = safeRecentTurns
      .filter((turn) => String(turn?.role || "").toLowerCase() === "user")
      .map((turn) => trimText(turn?.text || "", 400))
      .filter(Boolean);

    if (
      userTurns.length > 0 &&
      userTurns.every((text) => text === userTurns[0])
    ) {
      return "repeated_turn_spam";
    }
  }

  void safeQuestionText;
  return "";
}

async function verifyTurnstileToken({ token, ipAddress }) {
  if (!CLOUDFLARE_TURNSTILE_SECRET) {
    return {
      configured: false,
      success: false,
      reason: "secret_missing",
    };
  }

  if (!token) {
    return { configured: true, success: false, reason: "token_missing" };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", CLOUDFLARE_TURNSTILE_SECRET);
    body.append("response", String(token));
    if (ipAddress) body.append("remoteip", String(ipAddress));

    const verifyResponse = await globalThis.fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const verifyJson = await verifyResponse.json();
    const errorCodes = Array.isArray(verifyJson?.["error-codes"])
      ? verifyJson["error-codes"]
      : [];

    return {
      configured: true,
      success: Boolean(verifyJson?.success),
      reason: errorCodes.length > 0 ? String(errorCodes[0]) : "",
    };
  } catch {
    return {
      configured: true,
      success: false,
      reason: "verification_request_failed",
    };
  }
}

function safeParseTutorJson(text) {
  if (!text || typeof text !== "string") return null;

  const stripped = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end < start) return null;

  const jsonCandidate = stripped.slice(start, end + 1);
  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

function buildTutorFallback(mode = "hint") {
  return {
    success: false,
    mode: normalizeTutorMode(mode),
    response:
      "I can still help you learn this. Start by identifying what the question asks and list the known values. Then ask me for a hint or one step at a time.",
    followUps: [
      "What values are given in the problem?",
      "Which topic rule or formula seems relevant?",
      "Do you want one small hint or the next step?",
    ],
    confidence: 0.35,
    source: "fallback",
  };
}

function normalizeAiProvider(provider, fallback = "gemini") {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();
  if (AI_PROVIDER_SEQUENCE.includes(normalized)) return normalized;
  return fallback;
}

function buildAiProviderCycle(startProvider = "gemini", maxAttempts) {
  const safeAttempts = Math.min(
    Math.max(Number(maxAttempts) || AI_FALLBACK_MAX_ATTEMPTS, 3),
    15,
  );
  const normalizedStart = normalizeAiProvider(startProvider, "gemini");
  const startIndex = AI_PROVIDER_SEQUENCE.indexOf(normalizedStart);

  const providers = [];
  for (let i = 0; i < safeAttempts; i += 1) {
    providers.push(
      AI_PROVIDER_SEQUENCE[(startIndex + i) % AI_PROVIDER_SEQUENCE.length],
    );
  }
  return providers;
}

function normalizeProviderError(error) {
  const message = String(error?.message || error || "unknown_error")
    .replace(/\s+/g, " ")
    .trim();
  return message.slice(0, 240);
}

function readOpenRouterMessageContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      return typeof part?.text === "string" ? part.text : "";
    })
    .join("\n")
    .trim();
}

async function generateWithGemini({
  systemPrompt,
  payload,
  responseMimeType,
  maxOutputTokens = 650,
  temperature = 0.3,
}) {
  const projectId = process.env.GCLOUD_PROJECT || "mathquizzizz";
  const vertexAi = new VertexAI({
    project: projectId,
    location: "asia-southeast1",
  });

  const generationConfig = {
    temperature,
    maxOutputTokens,
  };
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }

  const generativeModel = vertexAi.preview.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig,
  });

  const payloadText =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const requestParams = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: payloadText },
        ],
      },
    ],
  };

  const aiResponse = await generativeModel.generateContent(requestParams);
  const text =
    aiResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const safeText = String(text || "").trim();
  if (!safeText) {
    throw new Error("Gemini returned an empty response");
  }
  return safeText;
}

async function generateWithOllama({
  systemPrompt,
  payload,
  model = OLLAMA_TUTOR_MODEL,
  temperature = 0.3,
  maxOutputTokens = 650,
}) {
  if (!OLLAMA_BASE_URL) {
    throw new Error("OLLAMA_BASE_URL is not configured");
  }
  if (!model) {
    throw new Error("Ollama model is not configured");
  }

  const payloadText =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const response = await globalThis.fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      options: {
        temperature,
        num_predict: maxOutputTokens,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payloadText },
      ],
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Ollama request failed (${response.status}): ${responseText.slice(0, 220)}`,
    );
  }

  let responseJson = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    throw new Error("Ollama returned invalid JSON");
  }

  const content = String(responseJson?.message?.content || "").trim();
  if (!content) {
    throw new Error("Ollama returned an empty response");
  }
  return content;
}

async function generateWithOpenRouter({
  systemPrompt,
  payload,
  model = OPENROUTER_TUTOR_MODEL,
  temperature = 0.3,
  maxOutputTokens = 650,
}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  if (!model) {
    throw new Error("OpenRouter model is not configured");
  }

  const payloadText =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = OPENROUTER_SITE_URL;
  }
  if (OPENROUTER_APP_NAME) {
    headers["X-Title"] = OPENROUTER_APP_NAME;
  }

  const response = await globalThis.fetch(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxOutputTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: payloadText },
        ],
      }),
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed (${response.status}): ${responseText.slice(0, 220)}`,
    );
  }

  let responseJson = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }

  const rawContent = responseJson?.choices?.[0]?.message?.content;
  const content = readOpenRouterMessageContent(rawContent);
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }
  return content;
}

async function generateTutorRawTextByProvider({ provider, systemPrompt, payload }) {
  if (provider === "gemini") {
    return generateWithGemini({
      systemPrompt,
      payload,
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 650,
    });
  }

  if (provider === "ollama") {
    return generateWithOllama({
      systemPrompt,
      payload,
      model: OLLAMA_TUTOR_MODEL,
      temperature: 0.3,
      maxOutputTokens: 650,
    });
  }

  if (provider === "openrouter") {
    return generateWithOpenRouter({
      systemPrompt,
      payload,
      model: OPENROUTER_TUTOR_MODEL,
      temperature: 0.3,
      maxOutputTokens: 650,
    });
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

function buildImageSvgSystemPrompt(style = "clean educational") {
  const safeStyle = trimText(style, 120) || "clean educational";
  return [
    "You are an SVG illustration generator for math learning content.",
    `Style direction: ${safeStyle}.`,
    "Return only raw SVG markup.",
    "Do not return markdown, code fences, explanation, JavaScript, or external asset links.",
    "Output must begin with <svg and end with </svg>.",
    "Keep the SVG self-contained and under 12,000 characters.",
    "Use readable labels and high contrast colors suitable for students.",
  ].join("\n");
}

function extractSvgMarkup(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const fencedMatch = raw.match(/```(?:svg|xml)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? String(fencedMatch[1] || "").trim() : raw;

  const start = candidate.indexOf("<svg");
  const end = candidate.lastIndexOf("</svg>");
  if (start < 0 || end < start) return "";

  return candidate.slice(start, end + 6).trim();
}

function sanitizeSvgMarkup(svgMarkup) {
  const svg = String(svgMarkup || "").trim();
  if (!svg) return "";
  if (svg.length > AI_IMAGE_SVG_MAX_CHARS) return "";

  const lowered = svg.toLowerCase();
  if (!lowered.startsWith("<svg")) return "";
  if (lowered.includes("<script")) return "";
  if (lowered.includes("javascript:")) return "";
  if (/\son[a-z]+\s*=\s*/i.test(svg)) return "";

  return svg;
}

function toSvgDataUrl(svgMarkup) {
  return `data:image/svg+xml;base64,${Buffer.from(svgMarkup, "utf8").toString("base64")}`;
}

async function generateImageRawTextByProvider({ provider, prompt, style }) {
  const systemPrompt = buildImageSvgSystemPrompt(style);
  const payload = {
    task: "Generate one educational SVG image",
    prompt,
    style,
    requirements: {
      output: "raw_svg_only",
      maxChars: AI_IMAGE_SVG_MAX_CHARS,
    },
  };

  if (provider === "gemini") {
    return generateWithGemini({
      systemPrompt,
      payload,
      responseMimeType: "text/plain",
      temperature: 0.5,
      maxOutputTokens: 1200,
    });
  }

  if (provider === "ollama") {
    return generateWithOllama({
      systemPrompt,
      payload,
      model: OLLAMA_IMAGE_MODEL,
      temperature: 0.5,
      maxOutputTokens: 1200,
    });
  }

  if (provider === "openrouter") {
    return generateWithOpenRouter({
      systemPrompt,
      payload,
      model: OPENROUTER_IMAGE_MODEL,
      temperature: 0.5,
      maxOutputTokens: 1200,
    });
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

function _normalizeQuantity(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

function _getInventoryItemDef(itemId) {
  return INVENTORY_ITEMS[String(itemId || "").trim()] || null;
}

function _getStoreDealDef(itemId) {
  return STORE_DEALS[String(itemId || "").trim()] || null;
}

function _isBoostItem(itemId) {
  return _getInventoryItemDef(itemId)?.type === "boost";
}

function _isTicketItem(itemId) {
  return _getInventoryItemDef(itemId)?.type === "ticket";
}

async function postDiscordWebhook(payload) {
  if (!DISCORD_ADMIN_WEBHOOK_URL) {
    return { success: false, reason: "webhook_not_configured" };
  }

  try {
    const response = await globalThis.fetch(DISCORD_ADMIN_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.warn("Discord webhook rejected payload", {
        status: response.status,
        responseText: String(responseText || "").slice(0, 240),
      });
      return {
        success: false,
        reason: "webhook_rejected",
        status: response.status,
      };
    }

    return { success: true };
  } catch (error) {
    logger.warn("Discord webhook request failed", {
      message: error?.message || String(error),
    });
    return { success: false, reason: "network_error" };
  }
}

async function emitDiscordEvent({
  title,
  description,
  severity = "info",
  fields = [],
}) {
  const colorBySeverity = {
    info: 0x378add,
    success: 0x1d9e75,
    warning: 0xf59e0b,
    critical: 0xef4444,
  };

  const payload = {
    username: "Mathquizzizz Admin",
    embeds: [
      {
        title: title || "Mathquizzizz Event",
        description: description || "",
        color: colorBySeverity[severity] || colorBySeverity.info,
        timestamp: new Date().toISOString(),
        fields: fields.slice(0, 12).map((field) => ({
          name: String(field?.name || "Field"),
          value: String(field?.value || "-"),
          inline: Boolean(field?.inline),
        })),
      },
    ],
  };

  return postDiscordWebhook(payload);
}

// ========== 1. USER LIFECYCLE: ON AUTH DELETE ==========
// Callable function to clean up user data when account is deleted
exports.cleanupUserData = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    // Rate limit: destructive operation, low limit
    await rateLimitCallable(request, { limit: 5, windowSec: 60 });

    const uid = request.auth.uid;
    logger.info(`Cleaning up data for user: ${uid}`);

    try {
      const batch = firestore.batch();

      // Delete user document
      batch.delete(firestore.collection("users").doc(uid));

      // Delete user's leaderboard entry
      batch.delete(firestore.collection("leaderboard").doc(uid));

      // Delete user's activities
      const activitiesSnap = await firestore
        .collection("activities")
        .where("userId", "==", uid)
        .limit(100)
        .get();
      activitiesSnap.docs.forEach((doc) => batch.delete(doc.ref));

      // Delete user's friend requests
      const friendReqSnap = await firestore
        .collection("friendRequests")
        .where("fromUid", "==", uid)
        .limit(100)
        .get();
      friendReqSnap.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
      logger.info(`Successfully cleaned up data for user: ${uid}`);

      return { success: true, message: "User data cleaned up successfully" };
    } catch (error) {
      logger.error(`Error cleaning up user ${uid}:`, error);
      throw new HttpsError("internal", "Error cleaning up user data");
    }
  },
);

// ========== 2. VALIDATE USERNAME (Callable) ==========
// Check if a username is available before registration
exports.validateUsername = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    // Rate limit: prevent username enumeration abuse
    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const { username } = request.data;

    if (!username || typeof username !== "string") {
      throw new HttpsError("invalid-argument", "Username is required");
    }

    const cleanUsername = username.toLowerCase().trim();

    // Validate format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return {
        available: false,
        message:
          "Username must be 3-20 characters (alphanumeric and underscore only)",
      };
    }

    // Check reserved usernames
    const reserved = [
      "admin",
      "moderator",
      "system",
      "mathquizzizz",
      "support",
      "help",
    ];
    if (reserved.includes(cleanUsername)) {
      return { available: false, message: "This username is reserved" };
    }

    try {
      const snapshot = await firestore
        .collection("users")
        .where("username", "==", cleanUsername)
        .limit(1)
        .get();

      const isAvailable = snapshot.empty;
      return {
        available: isAvailable,
        message: isAvailable
          ? "Username is available!"
          : "Username is already taken",
      };
    } catch (error) {
      logger.error("Error checking username:", error);
      throw new HttpsError("internal", "Error checking username availability");
    }
  },
);

// ========== 3. GET LEADERBOARD (Callable) ==========
// Server-side leaderboard to prevent client-side manipulation
exports.getLeaderboard = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    // Rate limit: database query, moderate traffic
    await rateLimitCallable(request, { limit: 30, windowSec: 60 });

    const {
      type = "xp",
      limit = 20,
      mode = "cumulative",
      sessionWindowMinutes = 180,
    } = request.data || {};

    try {
      const cappedLimit = Math.min(limit, 100);
      const safeMode = mode === "session" ? "session" : "cumulative";
      const safeWindowMinutes = Math.max(
        15,
        Math.min(sessionWindowMinutes, 24 * 60),
      );

      let query = firestore.collection("users");

      // Sort based on type
      switch (type) {
        case "accuracy":
          query = query.orderBy("stats.accuracy", "desc");
          break;
        case "streak":
          query = query.orderBy("stats.bestStreak", "desc");
          break;
        case "questions":
          query = query.orderBy("stats.totalQuestions", "desc");
          break;
        case "xp":
        default:
          query = query.orderBy("stats.xp", "desc");
          break;
      }

      let snapshot;
      if (safeMode === "session") {
        // Session mode starts from most recently active users, then ranks filtered rows.
        snapshot = await firestore
          .collection("users")
          .orderBy("stats.updatedAt", "desc")
          .limit(500)
          .get();
      } else {
        snapshot = await query.limit(cappedLimit).get();
      }

      const windowStart = Date.now() - safeWindowMinutes * 60000;

      const leaderboard = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const updatedAtValue = data.stats?.updatedAt;
        const updatedAt =
          updatedAtValue && typeof updatedAtValue.toMillis === "function"
            ? updatedAtValue.toMillis()
            : updatedAtValue || null;

        if (safeMode === "session") {
          if (!updatedAt || updatedAt < windowStart) {
            return;
          }
        }

        leaderboard.push({
          rank: 0,
          uid: doc.id,
          name: data.name || "Anonymous",
          username: data.username || "unknown",
          profilePicture: data.profilePicture || null,
          totalCorrect: data.stats?.totalCorrect || 0,
          totalQuestions: data.stats?.totalQuestions || 0,
          accuracy: data.stats?.accuracy || 0,
          streak: data.stats?.bestStreak || 0,
          xp: data.stats?.xp || 0,
          level: data.stats?.level || 1,
          updatedAt,
        });
      });

      leaderboard.sort((a, b) => {
        if (type === "accuracy") return b.accuracy - a.accuracy;
        if (type === "streak") return b.streak - a.streak;
        if (type === "questions") return b.totalQuestions - a.totalQuestions;
        return b.xp - a.xp;
      });

      const sliced = leaderboard.slice(0, cappedLimit).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      return {
        leaderboard: sliced,
        total: sliced.length,
        mode: safeMode,
        sessionWindowMinutes: safeMode === "session" ? safeWindowMinutes : null,
      };
    } catch (error) {
      logger.error("Error fetching leaderboard:", error);
      throw new HttpsError("internal", "Error fetching leaderboard");
    }
  },
);

// ========== 4. SUBMIT SCORE (Callable) ==========
// Validated score submission to prevent cheating
exports.submitScore = onCall({ region: "asia-southeast2" }, async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Must be logged in to submit scores",
    );
  }

  // Rate limit: CRITICAL - high-volume, prevents spam submissions
  await rateLimitCallable(request, { limit: 120, windowSec: 60 });

  const uid = request.auth.uid;
  const { correct, wrong, difficulty, timeSpent } = request.data;

  // Validate input
  if (typeof correct !== "number" || typeof wrong !== "number") {
    throw new HttpsError("invalid-argument", "Invalid score data");
  }

  if (correct < 0 || wrong < 0 || correct > 1000 || wrong > 1000) {
    throw new HttpsError("invalid-argument", "Score values out of range");
  }

  // Validate difficulty
  const validDifficulties = ["easy", "medium", "hard"];
  if (difficulty && !validDifficulties.includes(difficulty)) {
    throw new HttpsError("invalid-argument", "Invalid difficulty level");
  }

  // Anti-cheat: check time spent is reasonable (at least 2s per question)
  const totalQuestions = correct + wrong;
  if (timeSpent && totalQuestions > 0) {
    const avgTimePerQuestion = timeSpent / totalQuestions;
    if (avgTimePerQuestion < 2) {
      logger.warn(
        `Suspicious submission from ${uid}: ${avgTimePerQuestion}s per question`,
      );
      throw new HttpsError(
        "invalid-argument",
        "Submission flagged as suspicious",
      );
    }
  }

  try {
    const userRef = firestore.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const currentStats = userDoc.exists ? userDoc.data().stats || {} : {};

    // Calculate XP earned (server-side validation)
    const baseXP = correct * 10;
    const difficultyMultiplier =
      difficulty === "hard" ? 2 : difficulty === "medium" ? 1.5 : 1;
    const xpEarned = Math.floor(baseXP * difficultyMultiplier);

    // Build update object
    const diffKey = difficulty || "easy";
    const newTotalCorrect = (currentStats.totalCorrect || 0) + correct;
    const newTotalWrong = (currentStats.totalWrong || 0) + wrong;
    const newTotalQuestions =
      (currentStats.totalQuestions || 0) + totalQuestions;
    const newXP = (currentStats.xp || 0) + xpEarned;
    const newAccuracy =
      newTotalCorrect + newTotalWrong > 0
        ? Math.round(
            (newTotalCorrect / (newTotalCorrect + newTotalWrong)) * 100,
          )
        : 0;

    // ========== STREAK CALCULATION ==========
    // Calculate current and best streak based on daily activity
    const today = new Date().toDateString(); // e.g., "Mon Apr 07 2026"
    const lastQuizDate = currentStats.lastQuizDate || null;
    const currentStreak = currentStats.currentStreak || 0;
    const bestStreak = currentStats.bestStreak || 0;

    let newCurrentStreak = 1; // Default: first quiz today
    let newBestStreak = bestStreak;

    if (lastQuizDate === today) {
      // Same day: streak continues, don't increment
      newCurrentStreak = currentStreak;
    } else if (lastQuizDate) {
      // Different day: check if it was yesterday
      const lastDate = new Date(lastQuizDate);
      const currentDate = new Date(today);
      const dayDiff = Math.floor(
        (currentDate - lastDate) / (24 * 60 * 60 * 1000)
      );

      if (dayDiff === 1) {
        // Yesterday: streak continues, increment
        newCurrentStreak = currentStreak + 1;
      } else {
        // More than 1 day ago: streak broken, reset to 1
        newCurrentStreak = 1;
      }
    }

    // Update bestStreak if currentStreak exceeds it
    newBestStreak = Math.max(bestStreak, newCurrentStreak);

    const updates = {
      "stats.totalCorrect": newTotalCorrect,
      "stats.totalWrong": newTotalWrong,
      "stats.totalQuestions": newTotalQuestions,
      "stats.xp": newXP,
      "stats.accuracy": newAccuracy,
      "stats.currentStreak": newCurrentStreak,
      "stats.bestStreak": newBestStreak,
      "stats.lastQuizDate": today,
      [`stats.${diffKey}Correct`]:
        (currentStats[`${diffKey}Correct`] || 0) + correct,
      [`stats.${diffKey}Wrong`]: (currentStats[`${diffKey}Wrong`] || 0) + wrong,
      "stats.lastActiveDate": new Date().toDateString(),
      "stats.updatedAt": new Date().toISOString(),
    };

    await userRef.update(updates);

    // SYNC LEADERBOARD: update leaderboard/{uid} with latest user stats
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();
    if (updatedUserData) {
      await firestore.collection("leaderboard").doc(uid).set(
        {
          userId: uid,
          username: updatedUserData.username || "Unknown Player",
          xp: newXP,
          accuracy: newAccuracy,
          totalQuestions: newTotalQuestions,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    logger.info(
      `Score submitted for ${uid}: +${correct} correct, +${xpEarned} XP`,
    );

    return {
      success: true,
      xpEarned,
      newTotalXP: newXP,
      newAccuracy,
      message: `+${xpEarned} XP earned!`,
    };
  } catch (error) {
    logger.error(`Error submitting score for ${uid}:`, error);
    throw new HttpsError("internal", "Error submitting score");
  }
});

// ========== 5. MODERATE QUESTION (Callable) ==========
// Basic auto-moderation for user-generated questions
exports.moderateQuestion = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be logged in to submit questions",
      );
    }

    // Rate limit: AI moderation is expensive, low limit
    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const { question, answer, options, difficulty, topic } = request.data;

    // Validate required fields
    if (!question || !answer) {
      throw new HttpsError(
        "invalid-argument",
        "Question and answer are required",
      );
    }

    if (typeof question !== "string" || question.trim().length < 5) {
      throw new HttpsError(
        "invalid-argument",
        "Question must be at least 5 characters",
      );
    }

    if (question.trim().length > 500) {
      throw new HttpsError(
        "invalid-argument",
        "Question must be under 500 characters",
      );
    }

    // Basic content filter (profanity/spam check)
    const blockedPatterns = [
      /\b(spam|hack|cheat|exploit)\b/i,
      /(.)\1{5,}/, // Repeated characters (e.g., "aaaaaa")
      /https?:\/\//i, // URLs
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(question) || pattern.test(String(answer))) {
        return {
          approved: false,
          reason:
            "Content flagged by auto-moderation. Please review and resubmit.",
        };
      }
    }

    // Save the question for moderation
    const uid = request.auth.uid;
    const questionRef = await firestore.collection("pendingQuestions").add({
      question: question.trim(),
      answer: String(answer).trim(),
      options: options || null,
      difficulty: difficulty || "medium",
      topic: topic || "general",
      submittedBy: uid,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      autoModeration: "passed",
    });

    logger.info(`Question submitted by ${uid}: ${questionRef.id}`);

    return {
      approved: true,
      questionId: questionRef.id,
      message:
        "Question submitted for review! It will appear after moderation.",
    };
  },
);

// ========== 6. GET USER STATS (Callable) ==========
// Securely fetch another user's public stats (for friend profiles)
exports.getUserStats = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    // Rate limit: read-heavy, moderate traffic
    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const { targetUid } = request.data;

    if (!targetUid) {
      throw new HttpsError("invalid-argument", "User ID is required");
    }

    try {
      const userDoc = await firestore.collection("users").doc(targetUid).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();

      // Return only public information
      return {
        name: userData.name || "Anonymous",
        username: userData.username || "unknown",
        profilePicture: userData.profilePicture || null,
        stats: {
          totalCorrect: userData.stats?.totalCorrect || 0,
          totalQuestions: userData.stats?.totalQuestions || 0,
          accuracy: userData.stats?.accuracy || 0,
          bestStreak: userData.stats?.bestStreak || 0,
          xp: userData.stats?.xp || 0,
          level: userData.stats?.level || 1,
        },
        createdAt: userData.createdAt || null,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Error fetching user stats:", error);
      throw new HttpsError("internal", "Error fetching user stats");
    }
  },
);

// ========== 7. SUBMIT CAREER INTEREST (Callable) ==========
// Stores custom/unlisted career requests for moderator review.
exports.submitCareerInterest = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const desiredCareer = String(request.data?.desiredCareer || "Other")
      .trim()
      .slice(0, 60);
    const customCareer = String(request.data?.customCareer || "")
      .trim()
      .slice(0, 120);
    const source = String(request.data?.source || "auth")
      .trim()
      .slice(0, 40);

    if (!customCareer) {
      throw new HttpsError("invalid-argument", "customCareer is required");
    }

    const authUser = await admin.auth().getUser(request.auth.uid);
    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await firestore.collection("career_requests").add({
      uid: request.auth.uid,
      email: authUser?.email || "",
      name: authUser?.displayName || "",
      desiredCareer: desiredCareer || "Other",
      customCareer,
      source,
      status: "pending",
      reviewedAt: null,
      reviewedBy: null,
      moderatorNote: "",
      createdAt,
      updatedAt: createdAt,
    });

    return {
      success: true,
      id: docRef.id,
      message: "Career request submitted for moderator review",
    };
  },
);

// ========== 8. HEALTH CHECK — deep ping (HTTP) ==========
// Actively probes Firestore, Redis, and Realtime DB.
// Returns 200 (healthy), 207 (degraded), or 503 (down).
exports.healthCheck = onRequest(
  { region: "asia-southeast2", secrets: REDIS_SECRET_BINDINGS },
  async (req, res) => {
    // Light rate-limit: 30 req/min per IP to avoid scraping the health endpoint
    const throttled = await rateLimitHttp(req, res, {
      limit: 30,
      windowSec: 60,
    });
    if (throttled) return;

    const report = await deepHealthCheck();
    res.status(httpStatusFor(report)).json(report);
  },
);

// ========== 9. JOB QUEUE WORKER — scheduled every minute (cron) ==========
// Polls `scheduled_jobs` for due work and processes email delivery + delayed tasks.
exports.processJobQueue = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "asia-southeast2",
    timeoutSeconds: 300,
  },
  async () => {
    logger.info("[Cron] processJobQueue tick");
    await processEmailJobs(20);
  },
);

// ========== 10. ADMIN: SET FEATURE FLAG (Callable) ==========
// Create or update a feature flag. Requires admin role.
exports.adminSetFeatureFlag = onCall(
  ADMIN_CALLABLE_OPTIONS,
  withAuditLog("admin.feature_flag.set", async (request) => {
    const actor = await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const { featureKey, enabled, rolloutPercentage, allowedUids, description } =
      stripOwnerAccessKey(request.data || {});

    if (!featureKey || typeof featureKey !== "string") {
      throw new HttpsError("invalid-argument", "featureKey is required");
    }

    const result = await setFlag(featureKey, {
      enabled: !!enabled,
      rolloutPercentage: rolloutPercentage ?? undefined,
      allowedUids: allowedUids ?? undefined,
      description: description ?? "",
    });

    logger.info(`[FeatureFlags] Flag updated by admin ${actor.uid}`, {
      featureKey,
    });
    return { success: true, flag: result };
  }),
);

// ========== 10. ADMIN: GET AUDIT LOGS (Callable) ==========
// Returns the most recent audit log entries. Requires admin role.
exports.adminGetAuditLogs = onCall(ADMIN_CALLABLE_OPTIONS, async (request) => {
  await resolveAdminActor(request);

  await rateLimitCallable(request, { limit: 10, windowSec: 60 });

  const {
    limit = 50,
    action,
    actorId,
  } = stripOwnerAccessKey(request.data || {});

  let query = admin
    .firestore()
    .collection("audit_logs")
    .orderBy("timestamp", "desc")
    .limit(Math.min(limit, 200));

  if (action) query = query.where("action", "==", action);
  if (actorId) query = query.where("actorId", "==", actorId);

  const snap = await query.get();
  const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return { logs, count: logs.length };
});

// ========== 11. ADMIN: RATE LIMITER INFO (Callable) ==========
// Inspect a rate-limit bucket for a specific identifier. Requires admin role.
exports.adminRateLimiterInfo = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    const actor = await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const {
      identifier = actor.uid,
      limit = 60,
      windowSec = 60,
    } = stripOwnerAccessKey(request.data || {});

    const bucket = await checkRateLimit({
      identifier: String(identifier),
      limit: Number(limit) || 60,
      windowSec: Number(windowSec) || 60,
    });

    return {
      success: true,
      identifier: String(identifier),
      bucket,
    };
  },
);

// ========== ADMIN: VERIFY DASHBOARD GATE (Callable) ==========
// Secondary gate for /admin after Firebase admin role check.
exports.adminVerifyDashboardAccess = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    const actor = await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const { email, password } = stripOwnerAccessKey(request.data || {});
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const actorEmail = String(actor.email || "")
      .trim()
      .toLowerCase();

    const emailMatchesActor =
      Boolean(normalizedEmail) && normalizedEmail === actorEmail;
    const allowedAdminEmail = isAllowedAdminEmail(normalizedEmail);
    const passwordOk =
      Boolean(ADMIN_DASHBOARD_PASSWORD) &&
      String(password || "") === ADMIN_DASHBOARD_PASSWORD;
    const granted = emailMatchesActor && allowedAdminEmail && passwordOk;

    await emitDiscordEvent({
      title: granted
        ? "Admin Dashboard Login Success"
        : "Admin Dashboard Login Failed",
      description: granted
        ? "Secondary dashboard gate passed."
        : "Secondary dashboard gate rejected credentials.",
      severity: granted ? "success" : "warning",
      fields: [
        { name: "UID", value: actor.uid || "unknown", inline: true },
        { name: "Email", value: normalizedEmail || "unknown", inline: true },
        { name: "Auth Mode", value: actor.authMode || "unknown", inline: true },
      ],
    });

    if (!granted) {
      throw new HttpsError(
        "permission-denied",
        "Invalid admin dashboard credentials",
      );
    }

    return {
      success: true,
      granted: true,
      message: "Dashboard access granted",
    };
  },
);

// ========== ADMIN: SEND DISCORD WEBHOOK (Callable) ==========
// Manual/system alert bridge from admin panel.
exports.adminSendDiscordWebhook = onCall(
  ADMIN_CALLABLE_OPTIONS,
  withAuditLog("admin.discord_webhook.sent", async (request) => {
    const actor = await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 30, windowSec: 60 });

    const {
      eventType = "manual",
      title = "Admin Message",
      message = "",
      severity = "info",
      metadata,
    } = stripOwnerAccessKey(request.data || {});

    const safeTitle = String(title || "Admin Message").slice(0, 120);
    const safeMessage = String(message || "").slice(0, 1500);

    const fields = [
      {
        name: "Event Type",
        value: String(eventType || "manual"),
        inline: true,
      },
      {
        name: "Actor",
        value: actor.email || actor.uid || "unknown",
        inline: true,
      },
    ];

    if (metadata && typeof metadata === "object") {
      Object.entries(metadata)
        .slice(0, 6)
        .forEach(([key, value]) => {
          fields.push({
            name: String(key).slice(0, 100),
            value: String(value).slice(0, 500) || "-",
            inline: true,
          });
        });
    }

    const webhook = await emitDiscordEvent({
      title: safeTitle,
      description: safeMessage,
      severity,
      fields,
    });

    return {
      success: Boolean(webhook.success),
      webhookConfigured: Boolean(DISCORD_ADMIN_WEBHOOK_URL),
      reason: webhook.reason || null,
    };
  })
);

// ========== 12. ADMIN: GET TROUBLESHOOTING ALERTS (Callable) ==========
// Aggregates recent user errors, 404 events, and button failures for ops triage.
exports.adminGetTroubleshootingAlerts = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const { minutes = 60, sampleSize = 400 } = stripOwnerAccessKey(
      request.data || {},
    );
    const safeMinutes = Math.min(Math.max(Number(minutes) || 60, 5), 24 * 60);
    const safeSample = Math.min(Math.max(Number(sampleSize) || 400, 50), 1000);
    const cutoff = Date.now() - safeMinutes * 60 * 1000;

    const rtdb = admin.database();
    const [errorsSnap, eventsSnap, troubleshootingSnap] = await Promise.all([
      rtdb.ref("analytics/errors").limitToLast(safeSample).get(),
      rtdb.ref("analytics/events").limitToLast(safeSample).get(),
      rtdb.ref("analytics/troubleshooting").limitToLast(safeSample).get(),
    ]);

    const toArray = (snap) => (snap.exists() ? Object.values(snap.val()) : []);
    const isRecent = (entry) => {
      const parsed = Date.parse(entry?.timestamp || "");
      return Number.isFinite(parsed) && parsed >= cutoff;
    };

    const recentErrors = toArray(errorsSnap).filter(isRecent);
    const recentEvents = toArray(eventsSnap).filter(isRecent);
    const recentTroubleshooting = toArray(troubleshootingSnap).filter(isRecent);

    const route404Count = recentEvents.filter(
      (evt) => evt?.action === "route_404",
    ).length;
    const buttonFailureCount =
      recentEvents.filter((evt) => evt?.action === "button_failure").length +
      recentTroubleshooting.filter((evt) => evt?.type === "button_failure")
        .length;
    const criticalTroubleshootingCount = recentTroubleshooting.filter(
      (evt) => evt?.severity === "critical",
    ).length;

    const alerts = [];
    if (recentErrors.length >= 10) {
      alerts.push({
        severity: "critical",
        title: "High runtime error volume",
        message: `${recentErrors.length} user-side errors in the last ${safeMinutes} minutes`,
      });
    }
    if (route404Count >= 3) {
      alerts.push({
        severity: "warning",
        title: "404 spike detected",
        message: `${route404Count} 404 route hits in the last ${safeMinutes} minutes`,
      });
    }
    if (buttonFailureCount >= 3) {
      alerts.push({
        severity: "critical",
        title: "Broken action signals",
        message: `${buttonFailureCount} button failure signals in the last ${safeMinutes} minutes`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        severity: "ok",
        title: "No active incidents",
        message: `No major troubleshooting spikes in the last ${safeMinutes} minutes`,
      });
    }

    const recentIssues = [
      ...recentErrors.map((evt) => ({
        type: evt?.type || "error",
        severity: "critical",
        message: evt?.message || "Runtime error",
        timestamp: evt?.timestamp || null,
        url: evt?.url || null,
      })),
      ...recentTroubleshooting.map((evt) => ({
        type: evt?.type || "troubleshooting",
        severity: evt?.severity || "warning",
        message:
          evt?.detail?.message || evt?.detail?.step || evt?.type || "Issue",
        timestamp: evt?.timestamp || null,
        url: evt?.url || null,
      })),
      ...recentEvents
        .filter((evt) => evt?.action === "route_404")
        .map((evt) => ({
          type: "route_404",
          severity: "warning",
          message: `404 route: ${evt?.label || evt?.url || "unknown"}`,
          timestamp: evt?.timestamp || null,
          url: evt?.url || null,
        })),
    ]
      .sort(
        (a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0),
      )
      .slice(0, 30);

    return {
      windowMinutes: safeMinutes,
      counts: {
        errors: recentErrors.length,
        route404: route404Count,
        buttonFailures: buttonFailureCount,
        criticalTroubleshooting: criticalTroubleshootingCount,
      },
      alerts,
      recentIssues,
    };
  },
);

// ========== 13. ADMIN: GET USER FEEDBACK (Callable) ==========
// Fetches recent feedback events from analytics stream for developer triage.
exports.adminGetUserFeedback = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const {
      minutes = 60,
      limit = 200,
      category,
      minRating = 1,
    } = stripOwnerAccessKey(request.data || {});

    const safeMinutes = Math.min(
      Math.max(Number(minutes) || 60, 5),
      7 * 24 * 60,
    );
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 10), 500);
    const safeMinRating = Math.min(Math.max(Number(minRating) || 1, 1), 5);
    const normalizedCategory = normalizeFeedbackCategory(category);
    const cutoff = Date.now() - safeMinutes * 60 * 1000;

    const snap = await admin
      .database()
      .ref("analytics/feedback")
      .limitToLast(safeLimit)
      .get();
    const feedbackEntries = snap.exists() ? Object.entries(snap.val()) : [];

    const feedback = feedbackEntries
      .map(([id, item]) => ({ id, ...item }))
      .filter((item) => {
        const parsed = Date.parse(item?.timestamp || "");
        if (!Number.isFinite(parsed) || parsed < cutoff) return false;
        const rating = Number(item?.rating) || 0;
        if (rating < safeMinRating) return false;
        const itemCategory = normalizeFeedbackCategory(item?.category);
        if (normalizedCategory && itemCategory !== normalizedCategory) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        id: item.id,
        timestamp: item.timestamp || null,
        rating: Number(item.rating) || 0,
        category: item.category || "general",
        message: String(item.message || "").slice(0, 1000),
        uid: item.uid || null,
      }))
      .sort(
        (a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0),
      );

    return {
      windowMinutes: safeMinutes,
      count: feedback.length,
      feedback,
    };
  },
);

// ========== ADMIN: LIST CAREER REQUESTS (Callable) ==========
exports.adminListCareerRequests = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const {
      status = "pending",
      limit = 50,
      pageToken,
      search,
    } = stripOwnerAccessKey(request.data || {});

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const normalizedStatus = String(status || "pending")
      .trim()
      .toLowerCase();
    const normalizedSearch = String(search || "")
      .trim()
      .toLowerCase();

    let query = firestore
      .collection("career_requests")
      .orderBy("createdAt", "desc")
      .limit(safeLimit);

    if (pageToken) {
      const cursorDoc = await firestore
        .collection("career_requests")
        .doc(String(pageToken))
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snap = await query.get();
    let requests = snap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        uid: data.uid || "",
        email: data.email || "",
        name: data.name || "",
        desiredCareer: data.desiredCareer || "Other",
        customCareer: data.customCareer || "",
        source: data.source || "unknown",
        status: data.status || "pending",
        moderatorNote: data.moderatorNote || "",
        reviewedBy: data.reviewedBy || null,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    if (normalizedStatus === "pending" || normalizedStatus === "reviewed") {
      requests = requests.filter((item) => item.status === normalizedStatus);
    }

    if (normalizedSearch) {
      requests = requests.filter((item) => {
        const haystack = `${item.customCareer} ${item.email} ${item.name}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    return {
      requests,
      count: requests.length,
      nextPageToken: snap.docs.length ? snap.docs[snap.docs.length - 1].id : null,
    };
  },
);

// ========== ADMIN: MARK CAREER REQUEST REVIEWED (Callable) ==========
exports.adminMarkCareerRequestReviewed = onCall(
  ADMIN_CALLABLE_OPTIONS,
  withAuditLog("admin.career_request.reviewed", async (request) => {
    const actor = await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const {
      requestId,
      reviewed = true,
      moderatorNote = "",
    } = stripOwnerAccessKey(request.data || {});

    const normalizedId = String(requestId || "").trim();
    if (!normalizedId) {
      throw new HttpsError("invalid-argument", "requestId is required");
    }

    const targetRef = firestore.collection("career_requests").doc(normalizedId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      throw new HttpsError("not-found", "Career request not found");
    }

    const nowIso = new Date().toISOString();
    const nextStatus = reviewed ? "reviewed" : "pending";

    await targetRef.set(
      {
        status: nextStatus,
        moderatorNote: String(moderatorNote || "")
          .trim()
          .slice(0, 240),
        reviewedAt: reviewed ? nowIso : null,
        reviewedBy: reviewed ? actor.uid : null,
        updatedAt: nowIso,
      },
      { merge: true },
    );

    return {
      success: true,
      requestId: normalizedId,
      status: nextStatus,
      message: reviewed ? "Marked as reviewed" : "Marked as pending",
    };
  }),
);

// ========== 14. ADMIN: LIST FEATURE FLAGS (Callable) ==========
// Returns feature flag documents for operator dashboard usage.
exports.adminListFeatureFlags = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    await resolveAdminActor(request);
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const { limit = 100 } = stripOwnerAccessKey(request.data || {});
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 300);

    const snap = await firestore
      .collection("feature_flags")
      .orderBy("updatedAt", "desc")
      .limit(safeLimit)
      .get();

    const flags = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        featureKey: doc.id,
        enabled: Boolean(data.enabled),
        rolloutPercentage:
          typeof data.rolloutPercentage === "number"
            ? data.rolloutPercentage
            : null,
        allowedUids: Array.isArray(data.allowedUids) ? data.allowedUids : [],
        description: data.description || "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return { flags, count: flags.length };
  },
);

// ========== 15. ADMIN: LIST REGISTERED USERS (Callable) ==========
// Returns auth users + profile metadata for role management. Requires admin role.
exports.adminListRegisteredUsers = onCall(
  ADMIN_CALLABLE_OPTIONS,
  async (request) => {
    await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const { limit = 200, pageToken } = stripOwnerAccessKey(request.data || {});
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);

    const listed = await admin
      .auth()
      .listUsers(safeLimit, pageToken || undefined);

    const userDocs = await Promise.all(
      listed.users.map((u) => firestore.collection("users").doc(u.uid).get()),
    );

    const users = listed.users.map((u, idx) => {
      const profile = userDocs[idx]?.exists ? userDocs[idx].data() : null;
      return {
        uid: u.uid,
        email: u.email || "",
        name: profile?.name || u.displayName || "",
        username: profile?.username || "",
        desiredCareer: profile?.desiredCareer || "Undecided",
        careerOther: profile?.careerOther || "",
        accountType: profile?.accountType || "registered",
        role: u.customClaims?.admin ? "admin" : "user",
        disabled: Boolean(u.disabled),
        createdAt: u.metadata?.creationTime || null,
        lastSignInAt: u.metadata?.lastSignInTime || null,
      };
    });

    return {
      users,
      count: users.length,
      nextPageToken: listed.pageToken || null,
    };
  },
);

// ========== 13. ADMIN: SET USER ROLE (Callable) ==========
// Sets custom claim admin=true/false and mirrors role into Firestore user profile.
exports.adminSetUserRole = onCall(
  ADMIN_CALLABLE_OPTIONS,
  withAuditLog("admin.user.role.set", async (request) => {
    const actor = await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const { uid, role } = stripOwnerAccessKey(request.data || {});
    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase();

    if (!uid || typeof uid !== "string") {
      throw new HttpsError("invalid-argument", "uid is required");
    }
    if (!["admin", "user"].includes(normalizedRole)) {
      throw new HttpsError("invalid-argument", "role must be admin or user");
    }

    // Prevent accidental self-demotion and lockout of role management.
    if (uid === actor.uid && normalizedRole !== "admin") {
      throw new HttpsError(
        "failed-precondition",
        "You cannot remove your own admin role",
      );
    }

    const target = await admin.auth().getUser(uid);
    const currentClaims = target.customClaims || {};
    const nextClaims = {
      ...currentClaims,
      admin: normalizedRole === "admin",
    };

    await admin.auth().setCustomUserClaims(uid, nextClaims);

    await firestore.collection("users").doc(uid).set(
      {
        role: normalizedRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      success: true,
      uid,
      role: normalizedRole,
      message: `Role updated to ${normalizedRole}`,
    };
  }),
);

// ========== 14. SYSTEM HEALTH SUMMARY (Callable) ==========
// Callable health route for frontend status pages (avoids browser CORS issues).
exports.getSystemHealth = onCall(
  { ...ADMIN_CALLABLE_OPTIONS, secrets: REDIS_SECRET_BINDINGS },
  async (request) => {
  await rateLimitCallable(request, { limit: 20, windowSec: 60 });
  const report = await deepHealthCheck();
  return report;
  },
);

// ========== 15. FEATURE FLAG STATUS (Callable) ==========
// Frontend helper for safe runtime gating of in-progress surfaces.
exports.getFeatureFlagStatus = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const { featureKey, defaultEnabled = false } = request.data || {};

    if (!featureKey || typeof featureKey !== "string") {
      throw new HttpsError("invalid-argument", "featureKey is required");
    }

    const rawFlag = await getFlag(featureKey);
    const enabled = rawFlag
      ? await isEnabled(featureKey, { uid: request.auth?.uid })
      : Boolean(defaultEnabled);

    return {
      featureKey,
      enabled,
      configured: Boolean(rawFlag),
      description: rawFlag?.description || "",
      rolloutPercentage: rawFlag?.rolloutPercentage ?? null,
      source: rawFlag ? "feature_flags" : "default",
    };
  },
);

// ========== 11. ADMIN: SCHEDULE EMAIL / REMINDER (Callable) ==========
// Allows the app to schedule transactional emails and reminders.
exports.scheduleEmail = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");

    await rateLimitCallable(request, { limit: 5, windowSec: 60 });

    const { type, to, templateId, templateData, sendAt, delayMs } =
      request.data;

    if (!to || !templateId) {
      throw new HttpsError(
        "invalid-argument",
        "to and templateId are required",
      );
    }

    let result;
    if (type === "reminder" && sendAt) {
      result = await scheduleReminder({
        to,
        recipientName: templateData?.recipientName || "there",
        message: templateData?.message || "Time to study!",
        sendAt: new Date(sendAt),
      });
    } else {
      result = await queueEmail({
        to,
        templateId,
        templateData,
        delayMs: delayMs || 0,
      });
    }

    writeAuditLog({
      actorId: request.auth.uid,
      action: "email.scheduled",
      metadata: { to, templateId, jobId: result.jobId },
      ipAddress: request.rawRequest?.ip,
    });

    return result;
  },
);

// ========== 16. AUTH: REQUEST PASSWORD RESET (Callable) ==========
// Backend-issued reset flow with generic response (prevents email enumeration).
exports.requestPasswordReset = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 8, windowSec: 60 });

    const email = String(request.data?.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    const continueUrl = sanitizePasswordResetContinueUrl(
      request.data?.continueUrl,
    );

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: continueUrl,
      });

      await queueEmail({
        to: email,
        templateId: "password_reset",
        templateData: {
          resetLink,
          email,
          uid: userRecord.uid,
          continueUrl,
        },
      });

      await writeAuditLog({
        actorId: request.auth?.uid || "anonymous",
        action: "auth.password_reset.requested",
        metadata: {
          hasAccount: true,
          emailDomain: email.split("@")[1] || "",
        },
        ipAddress: getRequestIpAddress(request),
      });
    } catch (error) {
      // Avoid account enumeration by returning success on missing accounts.
      if (error?.code !== "auth/user-not-found") {
        logger.error("Password reset request failed", { error: error?.message });
      }

      await writeAuditLog({
        actorId: request.auth?.uid || "anonymous",
        action: "auth.password_reset.requested",
        metadata: {
          hasAccount: false,
          emailDomain: email.split("@")[1] || "",
        },
        ipAddress: getRequestIpAddress(request),
      });
    }

    return {
      success: true,
      message:
        "If an account exists for this email, a password reset link will be sent.",
    };
  },
);

// ========== 8. AI TUTOR EXPLAIN (Callable) ==========
exports.aiTutorExplain = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const {
      questionText,
      topic,
      difficulty,
      learnerMessage,
      intent = "hint",
      correctAnswer,
      recentTurns = [],
      turnstileToken,
      clientSignals = {},
      startProvider = "gemini",
      maxProviderAttempts,
    } = request.data || {};

    const safeQuestionText = String(questionText || "").trim();
    const safeLearnerMessage = String(learnerMessage || "").trim();
    if (safeQuestionText.length < 8) {
      throw new HttpsError(
        "invalid-argument",
        "questionText must be a string with at least 8 characters",
      );
    }
    if (safeLearnerMessage.length < 1) {
      throw new HttpsError(
        "invalid-argument",
        "learnerMessage must be a non-empty string",
      );
    }

    const safeIntent = normalizeTutorMode(intent);
    const safeTurns = normalizeTutorTurns(recentTurns);
    const safeTopic = trimText(topic || "general", 80);
    const safeDifficulty = trimText(difficulty || "unknown", 40);
    const safeCorrectAnswer = trimText(correctAnswer || "", 80);
    const ipAddress = getRequestIpAddress(request);

    const verification = await verifyTurnstileToken({
      token: turnstileToken,
      ipAddress,
    });
    if (!verification.configured) {
      logger.error("aiTutorExplain verification misconfigured", {
        reason: verification.reason || "secret_missing",
      });
      throw new HttpsError(
        "failed-precondition",
        "Verification service unavailable. Please contact support.",
      );
    }
    if (verification.configured && !verification.success) {
      logger.warn("aiTutorExplain verification failed", {
        reason: verification.reason || "verification_failed",
        uid: request.auth?.uid || "anonymous",
        ipAddress,
      });
      throw new HttpsError(
        "permission-denied",
        "Verification failed. Please confirm you are human and try again.",
      );
    }

    const botReason = detectTutorBotReason({
      questionText: safeQuestionText,
      learnerMessage: safeLearnerMessage,
      recentTurns: safeTurns,
      clientSignals,
    });
    if (botReason) {
      logger.warn("aiTutorExplain blocked by bot protection", {
        reason: botReason,
        uid: request.auth?.uid || "anonymous",
        ipAddress,
      });
      throw new HttpsError(
        "permission-denied",
        "Request blocked by bot protection.",
      );
    }

    const systemPrompt = [
      "You are Mathquizzizz Tutor, a supportive math coach for learners.",
      "Rules:",
      "1) Prioritize hints and concept guidance before full solutions.",
      "2) Provide step-by-step only when learner intent is 'steps' or user explicitly requests steps.",
      "3) Never reveal the final answer unless intent is 'answer' or the learner explicitly asks for the final answer.",
      "4) Keep explanations concise, age-appropriate, and learning-focused.",
      "5) If user asks for final answer but needs context, still provide one short learning cue first.",
      "6) Output strict JSON only, no markdown.",
      "JSON schema:",
      "{\"mode\":\"hint|explain|steps|answer\",\"response\":\"string\",\"followUps\":[\"string\"],\"confidence\":0.0}",
    ].join("\n");

    const userPayload = {
      context: {
        questionText: safeQuestionText,
        topic: safeTopic,
        difficulty: safeDifficulty,
        intent: safeIntent,
        correctAnswer: safeCorrectAnswer || undefined,
      },
      learnerMessage: safeLearnerMessage,
      recentTurns: safeTurns,
      guardrails: {
        hintsFirst: true,
        stepsOnlyWhenRequested: true,
        finalAnswerRestricted: true,
      },
    };

    const providerCycle = buildAiProviderCycle(
      startProvider,
      maxProviderAttempts,
    );
    const providerFailures = [];

    for (const provider of providerCycle) {
      try {
        const rawText = await generateTutorRawTextByProvider({
          provider,
          systemPrompt,
          payload: userPayload,
        });

        const parsed = safeParseTutorJson(rawText);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Provider response was not valid tutor JSON");
        }

        const mode = normalizeTutorMode(parsed.mode || safeIntent);
        const response = trimText(parsed.response || "", 1600);
        const followUps = Array.isArray(parsed.followUps)
          ? parsed.followUps
              .map((item) => trimText(item, 140))
              .filter(Boolean)
              .slice(0, 3)
          : [];
        const confidence = clampUnitInterval(parsed.confidence, 0.7);

        return {
          success: true,
          mode,
          response:
            response ||
            "Let's start with a small hint: identify what the problem asks and which values are known.",
          followUps:
            followUps.length > 0
              ? followUps
              : [
                  "What part feels most confusing?",
                  "Want a hint or a concept refresher?",
                ],
          confidence,
          source: provider,
          attemptedProviders: providerCycle.slice(0, providerFailures.length + 1),
        };
      } catch (error) {
        const message = normalizeProviderError(error);
        providerFailures.push({ provider, message });

        logger.warn("aiTutorExplain provider attempt failed", {
          provider,
          message,
          intent: safeIntent,
          topic: safeTopic,
        });
      }
    }

    logger.error("aiTutorExplain exhausted provider cycle", {
      intent: safeIntent,
      topic: safeTopic,
      providerFailures,
      questionLength: safeQuestionText.length,
    });

    const fallback = buildTutorFallback(safeIntent);
    return {
      ...fallback,
      attemptedProviders: providerCycle,
      providerFailures,
    };
  },
);

// ========== 9. AI IMAGE GENERATOR (Callable) ==========
// Generates free SVG images using provider fallback cycle.
exports.aiGenerateImage = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 8, windowSec: 60 });

    const {
      prompt,
      style = "clean educational vector",
      startProvider = "ollama",
      maxProviderAttempts,
    } = request.data || {};

    const safePrompt = trimText(prompt || "", 260);
    if (safePrompt.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "prompt must be a string with at least 6 characters",
      );
    }

    const safeStyle = trimText(style || "clean educational vector", 120);
    const providerCycle = buildAiProviderCycle(
      startProvider,
      maxProviderAttempts,
    );
    const providerFailures = [];

    for (const provider of providerCycle) {
      try {
        const rawText = await generateImageRawTextByProvider({
          provider,
          prompt: safePrompt,
          style: safeStyle,
        });

        const extractedSvg = extractSvgMarkup(rawText);
        const safeSvg = sanitizeSvgMarkup(extractedSvg);
        if (!safeSvg) {
          throw new Error("Provider did not return a safe SVG image");
        }

        return {
          success: true,
          source: provider,
          mimeType: "image/svg+xml",
          prompt: safePrompt,
          style: safeStyle,
          svg: safeSvg,
          imageDataUrl: toSvgDataUrl(safeSvg),
          attemptedProviders: providerCycle.slice(0, providerFailures.length + 1),
        };
      } catch (error) {
        const message = normalizeProviderError(error);
        providerFailures.push({ provider, message });

        logger.warn("aiGenerateImage provider attempt failed", {
          provider,
          message,
          promptLength: safePrompt.length,
        });
      }
    }

    logger.error("aiGenerateImage exhausted provider cycle", {
      promptLength: safePrompt.length,
      providerFailures,
    });

    throw new HttpsError(
      "unavailable",
      "Image generation is temporarily unavailable across all AI providers.",
    );
  },
);

// ========== 8. AI STUDY MATERIAL PROCESSOR ==========
// NOTE: This function is temporarily disabled because Cloud Storage hasn't been initialized.
// To enable: Set up Cloud Storage in Firebase Console, then uncomment this function.
/*
exports.processStudyMaterial = onObjectFinalized(
  {
    region: "asia-southeast2",
    bucket: "mathquizzizz.appspot.com",
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const md5Hash = event.data.md5Hash;

    // Only process files in the `study-materials/` directory
    if (!filePath.startsWith("study-materials/")) {
      logger.info(`Ignoring file outside study-materials: ${filePath}`);
      return;
    }

    // Checking cache to avoid duplicate billing
    const processedFilesRef = admin
      .database()
      .ref("processedMaterials/" + md5Hash);
    const existingDoc = await processedFilesRef.once("value");

    if (existingDoc.exists()) {
      logger.info(`File ${filePath} (hash: ${md5Hash}) already processed.`);
      return;
    }

    // Supported formats: pdf, image
    if (!contentType.includes("pdf") && !contentType.includes("image")) {
      logger.warn(`Unsupported content type for ${filePath}: ${contentType}`);
      return;
    }

    logger.info(`Processing study material: ${filePath}`);

    try {
      // Connect to Vertex AI
      const projectId = process.env.GCLOUD_PROJECT || "mathquizzizz";
      // Vertex AI currently supports robust regions like us-central1 and asia-southeast1
      const vertexAi = new VertexAI({
        project: projectId,
        location: "asia-southeast1",
      });

      const generativeModel = vertexAi.preview.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const systemPrompt = `Role: You are an expert Academic Content Architect. Your goal is to transform uploaded study materials (PDFs, Images, Transcripts) into a dynamic "Method-Based" learning suite.

Task 1: Method Flashcards
Extract every unique formula from the source.
Create a flashcard that doesn't just show the formula, but explains the "Trigger." (e.g., "When you see a right-angle triangle and two sides, use Pythagoras.")
Create a "Method" card: A step-by-step checklist for solving that specific type of problem.

Task 2: "Parallel" Story Questions
Identify the mathematical structure of the source questions.
DO NOT copy the question. Generate a "Parallel Version":
Change the Narrative: If the original is about a car's velocity, make the new one about a sliding penguin or a launching rocket.
Shift the Variables: If the original asks for "Distance," make the new one provide "Distance" but ask for "Time," requiring the user to rearrange the same formula.
Complexity Matching: Keep the number of steps required to solve exactly the same as the original.

Task 3: Interactive Evaluation
Provide 4 multiple-choice options for the generated question.
Distractor Logic: One option must be the correct answer. The other three must be "common mistake" results (e.g., forgetting to square a number or using sine instead of cosine).

Output Format: JSON
Strictly return a JSON object with this shape:
{
  "flashcards": [
    { "formula": "string", "trigger": "string", "methodSteps": ["string"] }
  ],
  "questions": [
    {
      "narrative": "string",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctOptionIndex": number,
      "explanation": "string"
    }
  ]
}`;

      const filePart = {
        fileData: {
          fileUri: `gs://${fileBucket}/${filePath}`,
          mimeType: contentType,
        },
      };

      const requestParams = {
        contents: [{ role: "user", parts: [{ text: systemPrompt }, filePart] }],
      };

      const resp = await generativeModel.generateContent(requestParams);
      const textResponse = resp.response.candidates[0].content.parts[0].text;

      let generatedContent = {};
      try {
        generatedContent = JSON.parse(textResponse);
      } catch (e) {
        logger.error("Failed to parse AI output as JSON", textResponse, e);
        throw new Error("Invalid output format from AI");
      }

      // Save generated content to Realtime Database
      const uid = event.data.metadata?.uid || "anonymous";

      const studySuitesRef = admin.database().ref("studySuites");
      const newSuiteRef = studySuitesRef.push();

      await newSuiteRef.set({
        originalFile: `gs://${fileBucket}/${filePath}`,
        fileName: filePath.split("/").pop(),
        uploaderUid: uid,
        flashcards: generatedContent.flashcards || [],
        questions: generatedContent.questions || [],
        createdAt: admin.database.ServerValue.TIMESTAMP,
        md5Hash: md5Hash,
      });

      // Mark the file hash as processed to optimize further runs
      await admin.database().ref(`processedMaterials/${md5Hash}`).set({
        processedAt: admin.database.ServerValue.TIMESTAMP,
        filePath: filePath,
        suiteId: newSuiteRef.key,
      });

      logger.info(
        `Successfully processed ${filePath} -> Suite: ${newSuiteRef.key}`,
      );
    } catch (error) {
      logger.error(`Failed to process study material (${filePath}):`, error);
    }
  },
);
*/

// ========== 16. AWARD GEMS (Callable) ==========
// Server-authoritative gem award for correct answers (3-8 gems random).
// Client calls this after a correct answer; server validates and persists.
exports.awardGems = onCall({ region: "asia-southeast2" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to earn gems");
  }

  await rateLimitCallable(request, { limit: 120, windowSec: 60 });

  const uid = request.auth.uid;
  const { topic, difficulty, multiplier = 1 } = request.data || {};

  const safeMultiplier = Number(multiplier);
  const finalMultiplier = Number.isFinite(safeMultiplier)
    ? Math.max(1, Math.min(2, safeMultiplier))
    : 1;

  // Server-side random to prevent client manipulation
  const baseGems = Math.floor(Math.random() * 6) + 3; // 3-8 inclusive
  const gems = Math.round(baseGems * finalMultiplier);

  try {
    const userRef = firestore.collection("users").doc(uid);
    await userRef.set(
      {
        gems: admin.firestore.FieldValue.increment(gems),
        "stats.lastActiveDate": new Date().toDateString(),
      },
      { merge: true },
    );

    // Update quest progress for relevant objectives
    await _incrementQuestProgress(uid, { topic, difficulty, gems });

    await emitDiscordEvent({
      title: "Economy: Gems Awarded",
      description: "Server-authoritative gem reward was granted.",
      severity: "info",
      fields: [
        { name: "UID", value: uid, inline: true },
        { name: "Topic", value: String(topic || "unknown"), inline: true },
        {
          name: "Difficulty",
          value: String(difficulty || "unknown"),
          inline: true,
        },
        { name: "Gems", value: String(gems), inline: true },
        { name: "Multiplier", value: String(finalMultiplier), inline: true },
      ],
    });

    logger.info(`Awarded ${gems} gems to ${uid}`);
    return {
      success: true,
      gems,
      totalNote: "check getUserEconomyState for balance",
    };
  } catch (error) {
    logger.error(`Error awarding gems to ${uid}:`, error);
    throw new HttpsError("internal", "Error awarding gems");
  }
});

// ========== 17. GET USER ECONOMY STATE (Callable) ==========
// Returns gem balance and current quest state.
exports.getUserEconomyState = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 30, windowSec: 60 });

    const uid = request.auth.uid;

    try {
      const userRef = firestore.collection("users").doc(uid);
      const doc = await userRef.get();
      const data = doc.exists ? doc.data() : {};

      const now = new Date();
      const quests = await _ensureQuestsExist(uid, data, now);

      return {
        gems: data.gems || 0,
        dailyQuests: quests.daily,
        weeklyQuests: quests.weekly,
      };
    } catch (error) {
      logger.error(`Error fetching economy state for ${uid}:`, error);
      throw new HttpsError("internal", "Error fetching economy state");
    }
  },
);

// ========== 18. CLAIM QUEST REWARD (Callable) ==========
// Validates quest completion and awards 2x-5x of average per-question gems (= 12-27 gems).
exports.claimQuestReward = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const uid = request.auth.uid;
    const { questId, questType } = request.data || {};

    if (!questId || !["daily", "weekly"].includes(questType)) {
      throw new HttpsError(
        "invalid-argument",
        "questId and questType required",
      );
    }

    try {
      const userRef = firestore.collection("users").doc(uid);
      const doc = await userRef.get();
      const data = doc.exists ? doc.data() : {};
      const quests = data.quests || {};
      const questList = quests[questType] || [];
      const quest = questList.find((q) => q.id === questId);

      if (!quest) throw new HttpsError("not-found", "Quest not found");
      if (quest.claimed)
        throw new HttpsError("already-exists", "Quest already claimed");
      if (quest.progress < quest.target) {
        throw new HttpsError("failed-precondition", "Quest not completed yet");
      }

      // Average per-question gem = 5.5 (mean of 3-8). Multiply 2x-5x.
      const multiplier = 2 + Math.floor(Math.random() * 4); // 2, 3, 4, or 5
      const rewardGems = Math.round(5.5 * multiplier * quest.target);

      // Mark claimed and award gems atomically
      const updatedList = questList.map((q) =>
        q.id === questId ? { ...q, claimed: true } : q,
      );

      await userRef.update({
        gems: admin.firestore.FieldValue.increment(rewardGems),
        [`quests.${questType}`]: updatedList,
      });

      await emitDiscordEvent({
        title: "Economy: Quest Reward Claimed",
        description: "Quest reward was successfully claimed.",
        severity: "success",
        fields: [
          { name: "UID", value: uid, inline: true },
          { name: "Quest ID", value: String(questId), inline: true },
          { name: "Quest Type", value: String(questType), inline: true },
          { name: "Reward Gems", value: String(rewardGems), inline: true },
        ],
      });

      logger.info(`Quest ${questId} claimed by ${uid}: +${rewardGems} gems`);
      return { success: true, rewardGems };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error(`Error claiming quest for ${uid}:`, error);
      throw new HttpsError("internal", "Error claiming quest reward");
    }
  },
);

// ========== 19. PURCHASE STORE DEAL (Callable) ==========
exports.purchaseStoreDeal = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const uid = request.auth.uid;
    const { itemId, currency } = request.data || {};
    const deal = _getStoreDealDef(itemId);
    const item = _getInventoryItemDef(itemId);
    const safeCurrency = String(currency || "")
      .trim()
      .toLowerCase();

    if (!deal || !item) {
      throw new HttpsError("invalid-argument", "Unknown store deal item");
    }
    if (safeCurrency !== "sparks" && safeCurrency !== "prisms") {
      throw new HttpsError(
        "invalid-argument",
        "currency must be sparks or prisms",
      );
    }

    const cost = Number(deal[safeCurrency] || 0);
    if (!Number.isFinite(cost) || cost < 1) {
      throw new HttpsError("invalid-argument", "Invalid deal pricing");
    }

    const userRef = firestore.collection("users").doc(uid);
    let nextSparks = 0;
    let nextPrisms = 0;
    let nextInventory = {};

    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const userData = snap.exists ? snap.data() : {};
      const currentSparks = Number(userData.sparks || 0);
      const currentPrisms = Number(userData.prisms || 0);
      const currentInventory = userData.inventory || {};
      const currentBalance =
        safeCurrency === "sparks" ? currentSparks : currentPrisms;

      if (currentBalance < cost) {
        throw new HttpsError(
          "failed-precondition",
          `Not enough ${safeCurrency} to purchase this deal`,
        );
      }

      nextSparks =
        safeCurrency === "sparks" ? currentSparks - cost : currentSparks;
      nextPrisms =
        safeCurrency === "prisms" ? currentPrisms - cost : currentPrisms;
      nextInventory = {
        ...currentInventory,
        [itemId]: Number(currentInventory[itemId] || 0) + 1,
      };

      transaction.set(
        userRef,
        {
          sparks: nextSparks,
          prisms: nextPrisms,
          inventory: nextInventory,
          "stats.lastStorePurchaseAt": new Date().toISOString(),
        },
        { merge: true },
      );
    });

    writeAuditLog({
      actorId: uid,
      action: "economy.store.purchase",
      metadata: { itemId, currency: safeCurrency, cost },
      ipAddress:
        request.rawRequest?.headers?.["x-forwarded-for"] ||
        request.rawRequest?.ip,
    });

    await emitDiscordEvent({
      title: "Economy: Store Deal Purchased",
      description: "A store deal purchase was completed.",
      severity: "info",
      fields: [
        { name: "UID", value: uid, inline: true },
        { name: "Item", value: String(itemId), inline: true },
        { name: "Currency", value: safeCurrency, inline: true },
        { name: "Cost", value: String(cost), inline: true },
      ],
    });

    return {
      success: true,
      itemId,
      currency: safeCurrency,
      cost,
      sparks: nextSparks,
      prisms: nextPrisms,
      inventory: nextInventory,
    };
  },
);

// ========== 19. GET INVENTORY STATE (Callable) ==========
exports.getInventoryState = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const uid = request.auth.uid;
    const userRef = firestore.collection("users").doc(uid);
    const doc = await userRef.get();
    const data = doc.exists ? doc.data() : {};

    return {
      success: true,
      inventory: data.inventory || {},
      activeBoosts: data.activeBoosts || {},
      syncedAt: new Date().toISOString(),
    };
  },
);

// ========== 20. AWARD INVENTORY ITEM (Callable) ==========
// Restricted to admin tools and server-side operator actions.
exports.awardInventoryItem = onCall(ADMIN_CALLABLE_OPTIONS, async (request) => {
  await resolveAdminActor(request);
  await rateLimitCallable(request, { limit: 40, windowSec: 60 });

  const { uid, itemId, quantity = 1 } = stripOwnerAccessKey(request.data || {});
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  const item = _getInventoryItemDef(itemId);
  if (!item) {
    throw new HttpsError("invalid-argument", "Unknown inventory item");
  }

  const safeQty = _normalizeQuantity(quantity, 1);
  const userRef = firestore.collection("users").doc(uid);
  await userRef.set(
    {
      [`inventory.${itemId}`]: admin.firestore.FieldValue.increment(safeQty),
    },
    { merge: true },
  );

  const latest = await userRef.get();
  const nextInventory = latest.data()?.inventory || {};

  return {
    success: true,
    itemId,
    quantityAwarded: safeQty,
    totalQuantity: Number(nextInventory[itemId] || 0),
  };
});

// ========== 21. ACTIVATE BOOST (Callable) ==========
exports.activateBoost = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const uid = request.auth.uid;
    const { itemId, quantity = 1 } = request.data || {};
    if (!_isBoostItem(itemId)) {
      throw new HttpsError("invalid-argument", "Boost item required");
    }

    const safeQty = _normalizeQuantity(quantity, 1);
    const item = _getInventoryItemDef(itemId);
    const userRef = firestore.collection("users").doc(uid);

    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const userData = snap.exists ? snap.data() : {};
      const inventory = userData.inventory || {};
      const activeBoosts = userData.activeBoosts || {};
      const owned = Number(inventory[itemId] || 0);

      if (owned < safeQty) {
        throw new HttpsError("failed-precondition", "Not enough inventory");
      }

      const nextInventoryQty = Math.max(0, owned - safeQty);
      const now = Date.now();
      const boostKey = `${item.boostType}BoostUntil`;
      const currentUntil = Date.parse(activeBoosts[boostKey] || "") || 0;
      const baseTime = currentUntil > now ? currentUntil : now;
      const expiresAt = new Date(
        baseTime + item.durationMs * safeQty,
      ).toISOString();

      transaction.set(
        userRef,
        {
          [`inventory.${itemId}`]: nextInventoryQty,
          [`activeBoosts.${boostKey}`]: expiresAt,
        },
        { merge: true },
      );
    });

    const latest = await userRef.get();
    return {
      success: true,
      inventory: latest.data()?.inventory || {},
      activeBoosts: latest.data()?.activeBoosts || {},
    };
  },
);

// ========== 22. REDEEM TICKET (Callable) ==========
exports.redeemTicket = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const uid = request.auth.uid;
    const { itemId } = request.data || {};
    if (!_isTicketItem(itemId)) {
      throw new HttpsError("invalid-argument", "Ticket item required");
    }

    const item = _getInventoryItemDef(itemId);
    const userRef = firestore.collection("users").doc(uid);
    let grantedGems = 0;

    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const userData = snap.exists ? snap.data() : {};
      const inventory = userData.inventory || {};
      const owned = Number(inventory[itemId] || 0);

      if (owned < 1) {
        throw new HttpsError("failed-precondition", "Ticket not owned");
      }

      grantedGems = Number(item.gems || 0);

      transaction.set(
        userRef,
        {
          [`inventory.${itemId}`]: owned - 1,
          gems: admin.firestore.FieldValue.increment(grantedGems),
        },
        { merge: true },
      );
    });

    const latest = await userRef.get();
    return {
      success: true,
      grantedGems,
      inventory: latest.data()?.inventory || {},
      gems: Number(latest.data()?.gems || 0),
    };
  },
);

// ========== 23. CONSUME INVENTORY ITEM (Callable) ==========
exports.consumeInventoryItem = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const uid = request.auth.uid;
    const { itemId, quantity = 1 } = request.data || {};
    const item = _getInventoryItemDef(itemId);
    if (!item) {
      throw new HttpsError("invalid-argument", "Unknown inventory item");
    }

    const safeQty = _normalizeQuantity(quantity, 1);
    const userRef = firestore.collection("users").doc(uid);

    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(userRef);
      const userData = snap.exists ? snap.data() : {};
      const inventory = userData.inventory || {};
      const owned = Number(inventory[itemId] || 0);

      if (owned < safeQty) {
        throw new HttpsError("failed-precondition", "Not enough inventory");
      }

      transaction.set(
        userRef,
        {
          [`inventory.${itemId}`]: owned - safeQty,
        },
        { merge: true },
      );
    });

    const latest = await userRef.get();
    return {
      success: true,
      inventory: latest.data()?.inventory || {},
      activeBoosts: latest.data()?.activeBoosts || {},
    };
  },
);

// ========== 24. SUBSCRIBE NEWSLETTER (Callable) ==========
exports.subscribeNewsletter = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 5, windowSec: 60 });

    const { email, name } = request.data || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    const normalizedEmail = String(email).trim().toLowerCase().slice(0, 254);
    const safeName = String(name || "")
      .trim()
      .slice(0, 100);

    try {
      const existing = await firestore
        .collection("newsletter_subscribers")
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();

      if (!existing.empty) {
        return {
          success: true,
          alreadySubscribed: true,
          message: "Already subscribed!",
        };
      }

      await firestore.collection("newsletter_subscribers").add({
        email: normalizedEmail,
        name: safeName || null,
        uid: request.auth?.uid || null,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "dashboard_nl_button",
      });

      logger.info(`Newsletter subscription: ${normalizedEmail}`);
      return {
        success: true,
        alreadySubscribed: false,
        message: "Subscribed! 🎉",
      };
    } catch (error) {
      logger.error("Newsletter subscription error:", error);
      throw new HttpsError("internal", "Error subscribing to newsletter");
    }
  },
);

// ========== 25. ADMIN: CLEANUP USER BY EMAIL (Callable) ==========
// Admin-only: look up a user by email and purge all their data from Auth + Firestore + RTDB.
exports.adminCleanupUserByEmail = onCall(
  ADMIN_CALLABLE_OPTIONS,
  withAuditLog("admin.user.cleanup_by_email", async (request) => {
    const actor = await resolveAdminActor(request);

    await rateLimitCallable(request, { limit: 5, windowSec: 60 });

    const { email } = stripOwnerAccessKey(request.data || {});
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "email is required");
    }

    let targetUid;
    try {
      const userRecord = await admin
        .auth()
        .getUserByEmail(email.trim().toLowerCase());
      targetUid = userRecord.uid;
    } catch {
      throw new HttpsError("not-found", `No user found with email: ${email}`);
    }

    // Prevent accidental self-purge
    if (targetUid === actor.uid) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot purge your own account",
      );
    }

    try {
      const batch = firestore.batch();
      batch.delete(firestore.collection("users").doc(targetUid));
      batch.delete(firestore.collection("leaderboard").doc(targetUid));

      const activitiesSnap = await firestore
        .collection("activities")
        .where("userId", "==", targetUid)
        .limit(100)
        .get();
      activitiesSnap.docs.forEach((doc) => batch.delete(doc.ref));

      const friendReqSnap = await firestore
        .collection("friendRequests")
        .where("fromUid", "==", targetUid)
        .limit(100)
        .get();
      friendReqSnap.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      // Delete RTDB user node
      await admin.database().ref(`users/${targetUid}`).remove();

      // Delete Firebase Auth account
      await admin.auth().deleteUser(targetUid);

      logger.info(`Admin ${actor.uid} purged account ${targetUid} (${email})`);
      return { success: true, uid: targetUid, email };
    } catch (error) {
      logger.error(`Error purging user ${targetUid}:`, error);
      throw new HttpsError("internal", "Error purging user data");
    }
  }),
);

// ─── Internal helpers ────────────────────────────────────────────────────────
// Generate a fresh set of daily/weekly quests for a user.
function _generateQuests(now) {
  const dayKey = now.toISOString().slice(0, 10); // "2025-05-28"
  const weekKey = `${now.getFullYear()}-W${_isoWeek(now)}`;

  const daily = [
    {
      id: `d1-${dayKey}`,
      type: "daily",
      objective: "Answer 10 questions correctly",
      target: 10,
      progress: 0,
      claimed: false,
      resetKey: dayKey,
    },
    {
      id: `d2-${dayKey}`,
      type: "daily",
      objective: "Complete a 3-question streak",
      target: 3,
      progress: 0,
      claimed: false,
      resetKey: dayKey,
    },
  ];
  const weekly = [
    {
      id: `w1-${weekKey}`,
      type: "weekly",
      objective: "Answer 50 questions correctly",
      target: 50,
      progress: 0,
      claimed: false,
      resetKey: weekKey,
    },
    {
      id: `w2-${weekKey}`,
      type: "weekly",
      objective: "Complete 5 different topics",
      target: 5,
      progress: 0,
      claimed: false,
      resetKey: weekKey,
    },
  ];
  return { daily, weekly };
}

async function _ensureQuestsExist(uid, userData, now) {
  const dayKey = now.toISOString().slice(0, 10);
  const weekKey = `${now.getFullYear()}-W${_isoWeek(now)}`;
  const existing = userData.quests || {};

  const dailyStale =
    !existing.daily?.[0] || existing.daily[0].resetKey !== dayKey;
  const weeklyStale =
    !existing.weekly?.[0] || existing.weekly[0].resetKey !== weekKey;

  if (!dailyStale && !weeklyStale) {
    return { daily: existing.daily, weekly: existing.weekly };
  }

  const fresh = _generateQuests(now);
  const update = {};
  if (dailyStale) update["quests.daily"] = fresh.daily;
  if (weeklyStale) update["quests.weekly"] = fresh.weekly;

  await firestore.collection("users").doc(uid).set(update, { merge: true });
  return {
    daily: dailyStale ? fresh.daily : existing.daily,
    weekly: weeklyStale ? fresh.weekly : existing.weekly,
  };
}

async function _incrementQuestProgress(uid, { topic, difficulty, gems }) {
  try {
    const doc = await firestore.collection("users").doc(uid).get();
    const data = doc.exists ? doc.data() : {};
    const now = new Date();
    const quests = await _ensureQuestsExist(uid, data, now);

    const update = (list) =>
      list.map((q) => {
        if (q.claimed) return q;
        // "Answer N questions correctly" objective
        if (
          q.objective.includes("correctly") &&
          !q.objective.includes("streak")
        ) {
          return { ...q, progress: Math.min(q.progress + 1, q.target) };
        }
        return q;
      });

    const updatedDaily = update(quests.daily);
    const updatedWeekly = update(quests.weekly);

    await firestore.collection("users").doc(uid).update({
      "quests.daily": updatedDaily,
      "quests.weekly": updatedWeekly,
    });
  } catch {
    // Non-blocking — quest progress failure should never break answer flow
  }
}

function _isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// ─── Community Quizzizz ──────────────────────────────────────────────────────

function _randomInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function _sanitizeOptionalUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 2000);
  return "";
}

function _sanitizeOptionalPath(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (!/^user-uploads\//i.test(trimmed)) return "";
  return trimmed.slice(0, 500);
}

function _sanitizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.slice(0, 100).map((q, i) => {
    const type = ["input", "multiple-choice", "true-false", "fill-blank"].includes(
      q?.type,
    )
      ? q.type
      : "input";

    const providedChoices = Array.isArray(q?.choices)
      ? q.choices
          .slice(0, 4)
          .map((choice) => String(choice || "").trim().slice(0, 200))
          .filter(Boolean)
      : [];

    const choices =
      type === "multiple-choice"
        ? providedChoices
        : type === "true-false"
          ? ["True", "False"]
          : null;

    const rawAnswer = String(q?.answer ?? "").trim().slice(0, 300);
    const answer =
      type === "true-false"
        ? /^(true|false)$/i.test(rawAnswer)
          ? rawAnswer[0].toUpperCase() + rawAnswer.slice(1).toLowerCase()
          : "True"
        : rawAnswer;

    return {
      id: q.id || `q${i}`,
      text: String(q?.text || "")
        .trim()
        .slice(0, 500),
      answer,
      choices,
      type,
      difficulty: ["easy", "medium", "hard"].includes(q?.difficulty)
        ? q.difficulty
        : "medium",
      topic: String(q?.topic || "general")
        .trim()
        .slice(0, 50),
      imageUrl: _sanitizeOptionalUrl(q?.imageUrl),
      imagePath: _sanitizeOptionalPath(q?.imagePath),
      answerImageUrl: _sanitizeOptionalUrl(q?.answerImageUrl),
      answerImagePath: _sanitizeOptionalPath(q?.answerImagePath),
    };
  });
}

// ========== 21. CREATE COMMUNITY QUIZZIZZ (Callable) ==========
exports.createQuizzizz = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const {
      name,
      description,
      questions,
      isPublic,
      hasLeaderboard,
      gameMode,
      tags,
      coverEmoji,
    } = request.data || {};

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      throw new HttpsError(
        "invalid-argument",
        "Name must be at least 3 characters",
      );
    }
    const cleanQuestions = _sanitizeQuestions(questions);
    if (cleanQuestions.length < 1) {
      throw new HttpsError(
        "invalid-argument",
        "At least 1 question is required",
      );
    }

    const uid = request.auth.uid;
    const userDoc = await firestore.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const doc = {
      name: name.trim().slice(0, 80),
      description: String(description || "")
        .trim()
        .slice(0, 500),
      creatorUid: uid,
      creatorName: userData.name || "Anonymous",
      creatorUsername: userData.username || "",
      questions: cleanQuestions,
      isPublic: Boolean(isPublic),
      hasLeaderboard: Boolean(hasLeaderboard),
      gameMode: ["standard", "fishing", "flashcard", "crossword"].includes(
        gameMode,
      )
        ? gameMode
        : "standard",
      tags: Array.isArray(tags)
        ? tags.slice(0, 5).map((t) => String(t).slice(0, 30))
        : [],
      coverEmoji: String(coverEmoji || "📝").slice(0, 4),
      plays: 0,
      inviteCode: _randomInviteCode(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await firestore.collection("community_quizzizz").add(doc);
    logger.info(`Quizzizz created by ${uid}: ${ref.id}`);
    return { success: true, id: ref.id, inviteCode: doc.inviteCode };
  },
);

// ========== 22. GET PUBLIC QUIZZIZZ (Callable) ==========
exports.getPublicQuizzizz = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 30, windowSec: 60 });

    const { gameMode, limit = 20, startAfter } = request.data || {};
    const safeLimit = Math.min(Number(limit) || 20, 50);

    let query = firestore
      .collection("community_quizzizz")
      .where("isPublic", "==", true)
      .orderBy("plays", "desc");

    if (gameMode && gameMode !== "all") {
      query = query.where("gameMode", "==", gameMode);
    }
    if (startAfter) {
      const cursor = await firestore
        .collection("community_quizzizz")
        .doc(startAfter)
        .get();
      if (cursor.exists) query = query.startAfter(cursor);
    }

    const snap = await query.limit(safeLimit).get();
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      creatorName: doc.data().creatorName,
      creatorUsername: doc.data().creatorUsername,
      gameMode: doc.data().gameMode,
      questionCount: (doc.data().questions || []).length,
      plays: doc.data().plays || 0,
      hasLeaderboard: doc.data().hasLeaderboard,
      tags: doc.data().tags || [],
      coverEmoji: doc.data().coverEmoji || "📝",
      inviteCode: doc.data().inviteCode,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return { items, count: items.length };
  },
);

// ========== 23. GET QUIZZIZZ BY ID OR INVITE CODE (Callable) ==========
exports.getQuizzizzById = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const { id, inviteCode } = request.data || {};

    let snap;
    if (id) {
      snap = await firestore.collection("community_quizzizz").doc(id).get();
      if (!snap.exists) throw new HttpsError("not-found", "Quizzizz not found");
    } else if (inviteCode) {
      const q = await firestore
        .collection("community_quizzizz")
        .where("inviteCode", "==", String(inviteCode).toUpperCase())
        .limit(1)
        .get();
      if (q.empty) throw new HttpsError("not-found", "Invite code not found");
      snap = q.docs[0];
    } else {
      throw new HttpsError("invalid-argument", "id or inviteCode required");
    }

    const data = snap.data();
    const isOwner = request.auth?.uid === data.creatorUid;
    if (!data.isPublic && !isOwner) {
      throw new HttpsError("permission-denied", "This quizzizz is private");
    }

    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };
  },
);

// ========== 24. UPDATE QUIZZIZZ (Callable) ==========
exports.updateQuizzizz = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    await rateLimitCallable(request, { limit: 20, windowSec: 60 });

    const {
      id,
      name,
      description,
      questions,
      isPublic,
      hasLeaderboard,
      gameMode,
      tags,
      coverEmoji,
    } = request.data || {};

    if (!id) throw new HttpsError("invalid-argument", "id required");

    const ref = firestore.collection("community_quizzizz").doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError("not-found", "Quizzizz not found");
    if (doc.data().creatorUid !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the creator can update this",
      );
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name) updates.name = String(name).trim().slice(0, 80);
    if (description !== undefined)
      updates.description = String(description).trim().slice(0, 500);
    if (questions) updates.questions = _sanitizeQuestions(questions);
    if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);
    if (hasLeaderboard !== undefined)
      updates.hasLeaderboard = Boolean(hasLeaderboard);
    if (gameMode)
      updates.gameMode = [
        "standard",
        "fishing",
        "flashcard",
        "crossword",
      ].includes(gameMode)
        ? gameMode
        : "standard";
    if (tags)
      updates.tags = Array.isArray(tags)
        ? tags.slice(0, 5).map((t) => String(t).slice(0, 30))
        : [];
    if (coverEmoji) updates.coverEmoji = String(coverEmoji).slice(0, 4);

    await ref.update(updates);
    return { success: true };
  },
);

// ========== 25. DELETE QUIZZIZZ (Callable) ==========
exports.deleteQuizzizz = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    await rateLimitCallable(request, { limit: 10, windowSec: 60 });

    const { id } = request.data || {};
    if (!id) throw new HttpsError("invalid-argument", "id required");

    const ref = firestore.collection("community_quizzizz").doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError("not-found", "Quizzizz not found");

    const isOwner = doc.data().creatorUid === request.auth.uid;
    const isAdmin = (await admin.auth().getUser(request.auth.uid)).customClaims
      ?.admin;
    if (!isOwner && !isAdmin)
      throw new HttpsError("permission-denied", "Forbidden");

    await ref.delete();
    return { success: true };
  },
);

// ========== 26. RECORD QUIZZIZZ PLAY + SCORE (Callable) ==========
exports.recordQuizzizzPlay = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required");
    await rateLimitCallable(request, { limit: 60, windowSec: 60 });

    const { quizzizzId, score, timeTakenSeconds } = request.data || {};
    if (!quizzizzId)
      throw new HttpsError("invalid-argument", "quizzizzId required");

    const uid = request.auth.uid;
    const ref = firestore.collection("community_quizzizz").doc(quizzizzId);
    const doc = await ref.get();
    if (!doc.exists) throw new HttpsError("not-found", "Quizzizz not found");

    const numScore = Math.max(0, Math.min(Number(score) || 0, 100));
    const numTime = Math.max(0, Number(timeTakenSeconds) || 0);

    // Increment play count
    await ref.update({ plays: admin.firestore.FieldValue.increment(1) });

    // Store score if leaderboard is enabled
    if (doc.data().hasLeaderboard) {
      const userDoc = await firestore.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      await firestore
        .collection("community_quizzizz")
        .doc(quizzizzId)
        .collection("leaderboard")
        .doc(uid)
        .set(
          {
            uid,
            name: userData.name || "Anonymous",
            username: userData.username || "",
            score: numScore,
            timeTakenSeconds: numTime,
            playedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: false },
        );
    }

    return { success: true };
  },
);

// ========== 27. GET QUIZZIZZ LEADERBOARD (Callable) ==========
exports.getQuizzizzLeaderboard = onCall(
  { region: "asia-southeast2" },
  async (request) => {
    await rateLimitCallable(request, { limit: 30, windowSec: 60 });

    const { quizzizzId, limit = 20 } = request.data || {};
    if (!quizzizzId)
      throw new HttpsError("invalid-argument", "quizzizzId required");

    const snap = await firestore
      .collection("community_quizzizz")
      .doc(quizzizzId)
      .collection("leaderboard")
      .orderBy("score", "desc")
      .orderBy("timeTakenSeconds", "asc")
      .limit(Math.min(Number(limit) || 20, 100))
      .get();

    const entries = snap.docs.map((doc, i) => ({
      rank: i + 1,
      ...doc.data(),
      playedAt: doc.data().playedAt?.toDate?.()?.toISOString() || null,
    }));

    return { entries };
  },
);
