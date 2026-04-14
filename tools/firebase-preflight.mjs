#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const strictMode = args.has("--strict");
const projectId = "mathquizzizz";

const requiredEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const requiredDeploySecrets = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
];

const requiredStrictSecrets = [
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "CLOUDFLARE_TURNSTILE_SECRET",
  "ADMIN_DASHBOARD_PASSWORD",
];

const placeholderPattern = /YOUR_|your-project|YOUR_APP_ID|YOUR_MESSAGING/i;

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const map = {};
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    map[key] = value;
  }

  return map;
}

function runFirebase(argsList) {
  if (process.platform === "win32") {
    const encodedArgs = argsList
      .map((arg) => {
        if (!/[\s"]/u.test(arg)) return arg;
        return `"${arg.replace(/"/g, '\\"')}"`;
      })
      .join(" ");

    return spawnSync("cmd.exe", ["/d", "/s", "/c", `firebase ${encodedArgs}`], {
      encoding: "utf8",
      shell: false,
    });
  }

  return spawnSync("npx", ["firebase-tools", ...argsList], {
    encoding: "utf8",
    shell: false,
  });
}

function printResult(kind, message) {
  const label = kind === "PASS" ? "PASS" : "FAIL";
  const stream = kind === "PASS" ? console.log : console.error;
  stream(`[${label}] ${message}`);
}

function checkEnvReadiness() {
  const envPath = join(process.cwd(), ".env");
  const env = parseDotEnv(envPath);
  const failures = [];

  if (!existsSync(envPath)) {
    failures.push(".env file is missing");
    return failures;
  }

  for (const key of requiredEnvKeys) {
    const value = String(env[key] || "").trim();
    if (!value) {
      failures.push(`${key} is missing`);
      continue;
    }
    if (placeholderPattern.test(value)) {
      failures.push(`${key} still uses placeholder content`);
    }
  }

  return failures;
}

function checkActiveProject() {
  const result = runFirebase(["use"]);
  if (result.error || result.status !== 0) {
    const details = String(result.stderr || result.error?.message || "").trim();
    return {
      ok: false,
      message: details
        ? `Unable to read active Firebase project: ${details}`
        : "Unable to read active Firebase project. Run firebase login and ensure CLI access works.",
    };
  }

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (!output.includes(projectId)) {
    return {
      ok: false,
      message: `Active Firebase project does not appear to be ${projectId}`,
    };
  }

  return { ok: true, message: `Active Firebase project includes ${projectId}` };
}

function checkSecret(secretName) {
  const result = runFirebase([
    "functions:secrets:get",
    secretName,
    "--project",
    projectId,
  ]);

  if (result.status === 0) {
    return {
      state: "present",
      message: `${secretName} exists in Firebase Secret Manager`,
    };
  }

  const errorText = String(result.stderr || result.stdout || "").toLowerCase();
  if (errorText.includes("not found")) {
    return {
      state: "missing",
      message: `${secretName} is missing in Firebase Secret Manager`,
    };
  }

  return {
    state: "unknown",
    message: `Unable to verify ${secretName} due to Firebase CLI/auth issue`,
  };
}

function main() {
  const modeLabel = strictMode ? "strict" : "launch";
  const failures = [];

  console.log(`Firebase preflight mode: ${modeLabel}`);

  const projectCheck = checkActiveProject();
  if (projectCheck.ok) {
    printResult("PASS", projectCheck.message);
  } else {
    failures.push(projectCheck.message);
    printResult("FAIL", projectCheck.message);
  }

  const envFailures = checkEnvReadiness();
  if (envFailures.length === 0) {
    printResult("PASS", ".env required Firebase keys are present and non-placeholder");
  } else {
    for (const message of envFailures) {
      failures.push(message);
      printResult("FAIL", message);
    }
  }

  const requiredSecrets = strictMode
    ? [...requiredDeploySecrets, ...requiredStrictSecrets]
    : requiredDeploySecrets;

  for (const secretName of requiredSecrets) {
    const secretCheck = checkSecret(secretName);
    if (secretCheck.state === "present") {
      printResult("PASS", secretCheck.message);
      continue;
    }

    failures.push(secretCheck.message);
    printResult("FAIL", secretCheck.message);
  }

  if (failures.length > 0) {
    console.error(`\nPreflight failed with ${failures.length} issue(s).`);
    console.error("Fix the failing items, then run npm run preflight:firebase again.");
    process.exit(1);
  }

  console.log("\nPreflight passed. Ready to run release gate and deploy.");
}

main();
