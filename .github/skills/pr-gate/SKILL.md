---
name: pr-gate
description: 'Run pull request readiness gates: troubleshooting, lint/build checks, commit hygiene, and branch policy validation.'
argument-hint: 'Describe target branch, required checks, and whether to open or merge after gates pass.'
user-invocable: true
---

# PR Gate

Enforce pre-PR quality gates so only review-ready changes move forward.

## When to Use
- User wants a strict pre-PR checklist.
- Team requires lint/build pass before opening PR.
- Branch policy and commit hygiene must be validated.

## Inputs
Collect from the prompt when available:
- Base and head branches.
- Required checks (lint/build/tests).
- Branch naming policy and commit format expectations.
- Whether to open PR or just verify readiness.

If details are missing, proceed with defaults:
- Validate current branch against main/master flow.
- Require lint and build minimum gates.
- Require clean commit scope and non-draft readiness summary.

## Operating Rules
1. Do not mark PR-ready if any required gate fails.
2. Troubleshoot first, then run deterministic checks.
3. Report evidence for each gate.
4. Keep commit history understandable and scoped.

## Procedure
1. Baseline repository health
- Check branch, remote tracking, and dirty status.
- Confirm no unresolved conflicts.

2. Troubleshoot obvious blockers
- Fix straightforward issues that will fail checks.

3. Required gates
- Run lint.
- Run build.
- Run tests if configured and requested.

4. Commit and branch hygiene
- Verify commit scope aligns with change intent.
- Ensure branch name and target branch policy compliance.

5. PR readiness report
- Return explicit PASS/FAIL/BLOCKED by gate.
- Provide merge-risk notes and remaining actions.

## Decision Branches
- If lint/build fails: fix and re-run before proceeding.
- If tests are unavailable: mark as risk and document gap.
- If branch policy unknown: apply repo default and note assumption.
- If dirty unrelated files exist: exclude from release commit and report scope.

## Completion Checks
A task is complete only when all are true:
- Troubleshooting complete with no unresolved blockers.
- Required checks pass (lint/build and requested tests).
- Branch and commit hygiene checks pass.
- Final output states PR-ready or blocked with evidence.

## Output Format
- Start with overall result: PR-ready or blocked.
- List gate statuses in order.
- Include exact blocker and next action when blocked.
- Include residual risks (for example tests not configured).

## Example Prompts
- Run pr-gate for this branch against main and tell me if it is PR-ready.
- Execute pr-gate with lint, build, and tests required before merge.
- Validate branch policy and commit hygiene, then give a release risk summary.
