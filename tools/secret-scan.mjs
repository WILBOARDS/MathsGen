#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const textExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".env",
  ".txt",
  ".html",
  ".css",
  ".scss",
  ".rules",
  ".xml",
  ".toml",
]);

const safeValuePattern =
  /(ROTATED|REDACTED|PLACEHOLDER|EXAMPLE|DUMMY|TEST|CHANGEME|STORED_IN_FIREBASE)/i;

const criticalPatterns = [
  {
    name: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/ },
  {
    name: "Generic secret assignment",
    regex:
      /\b(?:client_secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|jwt[_-]?secret|password)\b\s*[:=]\s*["'][^"'\n]{8,}["']/i,
  },
];

const sensitivePatterns = [
  { name: "Bearer token format", regex: /\bBearer\s+[A-Za-z0-9\-_=.]{20,}/i },
  {
    name: "Suspicious high-entropy token",
    regex: /\b[A-Za-z0-9\-_]{32,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\b/,
  },
];

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

function isGitRepo() {
  try {
    run("git rev-parse --is-inside-work-tree");
    return true;
  } catch {
    return false;
  }
}

function listFilesFromFs(rootDir = process.cwd()) {
  const ignoreDirs = new Set([
    "node_modules",
    "dist",
    "build",
    ".firebase",
    ".git",
    ".vscode",
  ]);
  const files = [];

  function walk(dirPath) {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      if (!relPath || relPath.startsWith("../")) continue;

      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        if (ignoreDirs.has(entry)) continue;
        walk(fullPath);
        continue;
      }

      const ext = path.extname(relPath);
      if (textExtensions.has(ext) || path.basename(relPath).startsWith(".env")) {
        files.push(relPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function getCandidateFiles() {
  if (!isGitRepo()) {
    return listFilesFromFs();
  }

  const cmd = stagedOnly
    ? "git diff --cached --name-only --diff-filter=ACM"
    : "git ls-files";
  const output = run(cmd);
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => {
      const ext = path.extname(f);
      return textExtensions.has(ext) || path.basename(f).startsWith(".env");
    });
}

function readTextFile(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function isClearlySafe(content) {
  return safeValuePattern.test(content);
}

function findMatches(filePath, content, patterns, severity) {
  const results = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (!pattern.regex.test(line)) return;
      if (isClearlySafe(line)) return;
      results.push({
        filePath,
        line: index + 1,
        severity,
        type: pattern.name,
        snippet: line.slice(0, 160),
      });
    });
  });
  return results;
}

function main() {
  let files = [];
  try {
    files = getCandidateFiles();
  } catch (error) {
    console.error("Secret scanner failed to enumerate files:", error.message);
    process.exit(2);
  }

  const findings = [];
  for (const file of files) {
    const content = readTextFile(file);
    if (content === null) continue;
    findings.push(...findMatches(file, content, criticalPatterns, "critical"));
    findings.push(...findMatches(file, content, sensitivePatterns, "sensitive"));
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const sensitive = findings.filter((f) => f.severity === "sensitive");

  console.log(`Secret scan mode: ${stagedOnly ? "staged" : "full"}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Critical findings: ${critical.length}`);
  console.log(`Sensitive findings: ${sensitive.length}`);

  if (findings.length > 0) {
    console.log("\nFindings:");
    for (const finding of findings) {
      console.log(
        `- [${finding.severity}] ${finding.filePath}:${finding.line} (${finding.type})`,
      );
    }
  }

  if (critical.length > 0) {
    console.error("\nSecret scan failed: critical findings detected.");
    process.exit(1);
  }

  console.log("\nSecret scan passed: no critical findings.");
}

main();
