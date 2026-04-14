---
description: "Use when deploying or preparing to deploy this project to Firebase. Enforces an automatic pre-deploy system scan and blocks deploy until the scan passes."
name: "Firebase Pre-Deploy System Scan Gate"
applyTo: "**"
---

# Firebase Pre-Deploy System Scan Gate

Use this workflow whenever a deploy to Firebase is requested.

## Required Gate

1. Run the pre-deploy checks in this exact order:
   - npm run secret:scan
   - npm run lint
   - npm run build
   - cd functions && npm run lint
2. If any check fails or reports critical findings:
   - Stop immediately.
   - Do not run any Firebase deploy command.
   - Report findings and what must be fixed.
3. If all checks succeed:
   - Deploy to Firebase using:
   - npm run deploy:firebase

## Enforcement Rules

- Never skip the scan gate for convenience.
- Never deploy after any failed pre-deploy check.
- Always show concise pass or fail evidence for each required check before deploy.
- If npm script execution is unavailable, explain the blocker and refuse deployment until all required check evidence is provided.

## Optional Hardening Checks

Run these checks before deploy when time allows:

1. Confirm active Firebase project is correct before deploy.
2. Use non-interactive deploy flags in CI environments.
