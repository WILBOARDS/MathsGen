const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const COLLECTION = "scheduled_jobs";
const RESEND_API_BASE = "https://api.resend.com/emails";

function getResendConfig() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || "").trim(),
    from: String(
      process.env.RESEND_FROM_EMAIL || "MathQuizzizz <no-reply@mathquizzizz.app>",
    ).trim(),
  };
}

function toSafeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function renderTemplate({ templateId, templateData = {} }) {
  if (templateId === "password_reset") {
    const resetLink = String(templateData.resetLink || "").trim();
    const continueUrl = String(templateData.continueUrl || "").trim();

    return {
      subject: "Reset your MathQuizzizz password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
          <h2 style="margin-bottom:8px">Reset your password</h2>
          <p style="margin-top:0">We received a request to reset your MathQuizzizz password.</p>
          <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700">Reset Password</a></p>
          <p style="font-size:13px;color:#475569">If the button doesn't work, use this link:</p>
          <p style="font-size:13px;word-break:break-all"><a href="${resetLink}">${resetLink}</a></p>
          ${continueUrl ? `<p style="font-size:12px;color:#64748b">Continue URL: ${continueUrl}</p>` : ""}
          <p style="font-size:12px;color:#64748b">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
      text: `Reset your password: ${resetLink}`,
    };
  }

  return {
    subject: "MathQuizzizz notification",
    html: `<p>You have a new notification from MathQuizzizz.</p>`,
    text: "You have a new notification from MathQuizzizz.",
  };
}

async function sendWithResend({ to, templateId, templateData }) {
  const { apiKey, from } = getResendConfig();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const email = toSafeEmail(to);
  const content = renderTemplate({ templateId, templateData });
  const payload = {
    from,
    to: [email],
    subject: content.subject,
    html: content.html,
    text: content.text,
  };

  const response = await globalThis.fetch(RESEND_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`Resend request failed (${response.status}): ${responseBody}`);
  }

  try {
    return JSON.parse(responseBody);
  } catch {
    return { id: "", raw: responseBody };
  }
}

async function queueEmail({ to, templateId, templateData = {}, delayMs = 0 }) {
  const email = toSafeEmail(to);
  const now = Date.now();
  const runAt = new Date(now + Math.max(0, Number(delayMs) || 0));

  const docRef = await admin.firestore().collection(COLLECTION).add({
    type: "email",
    to: email,
    templateId: String(templateId || "generic").trim(),
    templateData,
    status: "queued",
    attempts: 0,
    runAt: admin.firestore.Timestamp.fromDate(runAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, jobId: docRef.id, queued: true, runAt: runAt.toISOString() };
}

async function scheduleReminder({ to, recipientName, message, sendAt }) {
  const date = sendAt instanceof Date ? sendAt : new Date(sendAt || Date.now());
  const docRef = await admin.firestore().collection(COLLECTION).add({
    type: "reminder",
    to: toSafeEmail(to),
    recipientName: String(recipientName || "there").trim().slice(0, 80),
    message: String(message || "Time to study!").trim().slice(0, 500),
    status: "queued",
    attempts: 0,
    runAt: admin.firestore.Timestamp.fromDate(date),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, jobId: docRef.id, queued: true, runAt: date.toISOString() };
}

async function processEmailJobs(limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const nowTs = admin.firestore.Timestamp.now();

  const snap = await admin
    .firestore()
    .collection(COLLECTION)
    .where("status", "==", "queued")
    .where("runAt", "<=", nowTs)
    .orderBy("runAt", "asc")
    .limit(safeLimit)
    .get();

  if (snap.empty) {
    return { processed: 0, jobs: [] };
  }

  const jobs = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    jobs.push(doc.id);

    try {
      const deliveryResult = await sendWithResend({
        to: data.to,
        templateId: data.templateId,
        templateData: data.templateData,
      });

      await doc.ref.update({
        status: "processed",
        provider: "resend",
        providerMessageId: String(deliveryResult?.id || ""),
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: Number(data.attempts || 0) + 1,
      });

      logger.info("[EmailQueue] Processed job", {
        jobId: doc.id,
        type: data.type || "email",
        provider: "resend",
      });
    } catch (error) {
      await doc.ref.update({
        status: "failed",
        provider: "resend",
        lastError: String(error?.message || "Unknown email processing error").slice(0, 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: Number(data.attempts || 0) + 1,
      });

      logger.error("[EmailQueue] Failed job", {
        jobId: doc.id,
        type: data.type || "email",
        error: error?.message,
      });
    }
  }

  return { processed: jobs.length, jobs };
}

module.exports = {
  queueEmail,
  scheduleReminder,
  processEmailJobs,
};
