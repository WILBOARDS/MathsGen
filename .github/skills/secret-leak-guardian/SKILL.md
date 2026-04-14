---
name: secret-leak-guardian
description: "Security workflow for scanning secret leaks and hardening production config. Use when: scan for leaked keys/secrets, protect .env usage, rotate exposed credentials, secure Firebase/Cloud Functions secrets, prevent development data leaks in production, add pre-commit or CI secret checks."
argument-hint: Describe what to scan and whether this is local-only, pre-release, or production hardening.
---

# Secret Leak Guardian

Use this skill to detect leaked sensitive values and enforce a safe path for
storing secrets (especially for production).

## Outcome

Produce a leak report and apply or recommend concrete remediations so secrets are
not exposed in source, client bundles, logs, or production misconfiguration.

## When To Use

Use when user asks for:

- scanning for leaked API keys, OAuth secrets, tokens, private keys
- checking `.env` hygiene before release
- rotating compromised credentials
- moving secrets to backend secret managers
- setting up guardrails (pre-commit / CI checks)

Do not use when user is asking for non-security feature work.

## Security Model

1. Public client identifiers are sometimes expected (for example Firebase web
   config API keys), but server secrets are never safe in frontend code.
2. `.env` is for local development convenience, not long-term production secret
   storage in this project.
3. Production secrets must be stored in managed secret stores and injected at
   runtime.

## Workflow

### Phase 1: Discovery Scan

1. Run staged scan first for fast feedback:
   - `npm run secret:scan:staged`
2. Run full workspace scan:
   - `npm run secret:scan`
3. Search for known leaked values if provided by user.
4. Capture findings with file path, type, and severity.

### Phase 2: Classify Findings

For each finding, classify as one of:

1. `critical`: OAuth client secret, service account key, private key, access
   token, database password, webhook signing secret.
2. `sensitive`: internal endpoint keys, analytics credentials, environment-only
   tokens.
3. `acceptable-public`: known frontend public identifiers intentionally exposed
   by platform design.

If uncertain, treat as `critical` until verified.

### Phase 3: Remediation Decision Tree

If `critical` found:

1. Remove or redact from tracked files immediately.
2. Rotate secret at provider immediately.
3. Replace with placeholder/example value in workspace files.
4. Move real value to secret manager and bind runtime usage.

If `sensitive` found:

1. Move to backend-only config where possible.
2. Restrict logs and avoid printing values.
3. Validate access scope and least privilege.

If `acceptable-public`:

1. Keep only if required by platform.
2. Document why it is acceptable to avoid future confusion.

### Phase 4: Production Hardening

1. Verify `.gitignore` blocks local secret files (`.env`, credentials json,
   key files).
2. Ensure production uses managed secrets:
   - Firebase Functions secrets for this project.
3. Trim environment values at runtime to avoid newline/whitespace failures.
4. Bind secrets explicitly in Cloud Functions v2 options.
5. Confirm no secret appears in frontend build output.

### Phase 5: Guardrails

1. Ensure pre-commit scanner is enabled when repository is git-initialized.
2. Keep scanner allowlist minimal and explicit.
3. Recommend CI secret scanning for pull requests.
4. Add/update security runbook documentation.

### Phase 5.1: PR CI Workflow Guidance

1. Enforce secret scanning on every PR.
2. Require `npm run secret:scan:staged` as a merge gate.
3. Block PR merge on any `critical` finding.
4. Require security-owner acknowledgement for `sensitive` findings.
5. Allow `acceptable-public` only when explicitly documented.
6. Post findings summary in PR with file path, severity, and remediation required.

### Phase 5.2: One-Shot Incident Response Prompt

Use this prompt template when a leak is suspected:

1. Run secret leak guardian in INCIDENT MODE.
2. Scope: secret type or known value pattern.
3. Actions required now:

- Redact leaked values from tracked content.
- Rotate compromised credentials at provider immediately.
- Verify old credentials no longer authenticate.
- Scan repository and recent history for additional exposure.
- Produce incident report with timeline and residual risk.

4. Priority is critical and deployment stays blocked until resolved.

### Phase 5.3: Production Release Checklist Prompt

Use this prompt template before production deploy:

1. Run production secret-hardening checklist.
2. Validate:

- `npm run secret:scan` passes with zero critical findings.
- `.gitignore` blocks `.env`, `credentials*.json`, and key files.
- Production secrets are stored in Firebase Functions secrets, not `.env`.
- Cloud Functions v2 secret bindings are configured and runtime values are trimmed.
- No server secrets appear in frontend build artifacts.
- Post-deploy logs show no credential leakage.

3. Return pass/fail per item and a final release decision.

## Required Checks Before Completion

A run is complete only when all are true:

1. No unrotated `critical` leak remains in workspace files.
2. Any exposed secret has a documented rotation action.
3. Runtime secret storage path is defined (and preferably applied).
4. Scanner commands run successfully.
5. User receives an actionable checklist with next commands.
6. PR CI secret scan policy is defined and enforceable.
7. Incident response prompt is present and actionable.
8. Production release checklist is completed or explicitly waived with owner sign-off.

## Project-Specific Commands

- `npm run secret:scan`
- `npm run secret:scan:staged`
- `npm run hooks:install`
- `firebase functions:secrets:set <KEY> --project mathquizzizz`

## Response Format

When using this skill, output:

1. Findings by severity (`critical`, `sensitive`, `acceptable-public`).
2. Exact remediations already applied.
3. Exact remediations still required by the user/operator.
4. Verification results and residual risk.

## Example Prompts

- "Run secret leak guardian before production deploy."
- "Scan for leaked OAuth/API secrets and harden production config."
- "Use secret leak guardian to verify .env handling and stop development leaks."
- "Audit this repo for critical key exposure and give me a rotation checklist."
