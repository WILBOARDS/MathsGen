---
name: troubleshoot-release-gate
description: 'Run basic troubleshooting and release gates before declaring done. Use when user wants npm run lint, npm run build, GitHub push, and Vercel hosting readiness with all checks passing.'
argument-hint: 'Describe branch/repo target, whether to push to GitHub, and Vercel deploy expectations.'
user-invocable: true
---

# Troubleshoot Release Gate

Enforce a strict done criteria: troubleshoot first, then pass lint and build, then push to GitHub for Vercel deployment.

Default posture: this is a release blocker workflow, not a suggestion checklist.

## When to Use
- User says work is not done until checks pass.
- User explicitly requests `npm run lint` and `npm run build` before completion.
- User wants code uploaded to GitHub for Vercel hosting.
- User wants an agent that reports success only after all gates are green.

## Inputs
Collect from the prompt when available:
- Branch target (for example `master` or `main`).
- GitHub repository URL.
- Whether the agent should commit and push automatically.
- Whether Vercel should be validated as "ready" or "deployed and verified".

If details are missing, proceed with defaults:
- Use current branch.
- Commit and push automatically when user asks to upload/publish to GitHub.
- Validate Vercel readiness (env and integration checklist) unless deploy credentials are available.

## Operating Rules
1. Do not declare completion until all required gates pass.
2. Always run troubleshooting first (diagnose obvious config/runtime failures).
3. Run lint and build after fixes, and re-run after each fix cycle.
4. If push is requested, verify remote and push status before completion.
5. Surface blockers immediately with exact remediation steps.
6. Keep output evidence-based: include pass/fail per gate.
7. Never mark done with "partial success" if any required gate failed.
8. Prefer non-interactive commands and deterministic checks.

## Procedure
1. Baseline diagnostics
- Inspect repository state: changed files, current branch, and git remotes.
- Confirm required environment variables for app/runtime auth integrations.
- Check for known startup issues (missing provider config, invalid callback URLs, missing service keys).

2. Troubleshoot first
- Fix straightforward issues that would fail checks (type/import/config/script errors).
- For infra-bound problems (provider disabled, missing remote credentials), document precise steps and continue with what can be validated locally.

3. Gate 1: Lint
- Run `npm run lint`.
- If it fails, fix issues and re-run until pass or hard blocker.

4. Gate 2: Build
- Run `npm run build`.
- If it fails, fix issues and re-run until pass or hard blocker.

5. GitHub publish gate (if requested)
- Ensure remote exists and points to intended GitHub repo.
- Stage/commit changes with a clear message.
- Push branch to remote.
- Confirm push success and branch tracking.
- Confirm latest local commit hash exists on remote branch.

6. Vercel hosting gate
- Confirm repository is ready for Vercel import/deploy.
- Confirm required environment variables are documented and mapped.
- Confirm auth callback URLs include local and production domains.
- If direct deploy is available, run it and verify deployment URL health.
- If direct deploy is not available, provide exact import + env steps and mark as readiness PASS only when prerequisites are complete.

7. Final gate report
- Return a concise checklist: Troubleshoot, Lint, Build, GitHub Push, Vercel.
- Mark each as PASS/FAIL/BLOCKED with one-line evidence.

## Decision Branches
- If lint fails: fix code and re-run lint before moving to build.
- If build fails: fix code and re-run build before publishing.
- If no GitHub remote exists and push is required: request repo URL and add remote.
- If push is rejected (auth/permissions): provide exact command and credential steps; mark blocked.
- If Vercel cannot be deployed from environment: mark as readiness-verified only after confirming env/callback prerequisites; provide manual deploy steps.
- If GitHub push is required but commit is missing: create commit first, then push.
- If repo is dirty with unrelated changes: include only intended files in commit and report scope.

## Completion Checks
A task is complete only when all required items below are true:
- Troubleshooting pass completed (or blocker clearly identified).
- `npm run lint` passes.
- `npm run build` passes.
- If requested, code is pushed to the target GitHub remote/branch.
- Vercel gate is satisfied: deployed and verified, or readiness validated with explicit next command.
- Final response includes a gate-by-gate status table with evidence.

Hard stop rule:
- If any required gate is FAIL or BLOCKED, result must be BLOCKED (not done).

## Output Format
- Start with overall result: `All required gates passed` or `Blocked`.
- Provide gate list in order with PASS/FAIL/BLOCKED.
- Include the exact blocker and next action only when blocked.
- Do not claim done while any required gate is failing.

Required gate order in output:
1. Troubleshoot
2. Lint
3. Build
4. GitHub Push
5. Vercel Hosting

## Example Prompts
- Run troubleshoot-release-gate on this branch and do not finish until lint and build pass.
- Use troubleshoot-release-gate, then push to GitHub and confirm Vercel readiness.
- Run full troubleshoot-release-gate and only mark done when all gates are green.
- Fix issues, pass lint/build, push to origin main, and report gate evidence.
