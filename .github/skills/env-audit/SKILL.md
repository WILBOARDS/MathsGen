---
name: env-audit
description: 'Audit required environment variables across local, preview, and production before release.'
argument-hint: 'Describe app stack and target environments to validate (local/preview/production).'
user-invocable: true
---

# Env Audit

Validate environment configuration before deployment or release.

## When to Use
- User is preparing deployment to Vercel.
- Auth, storage, or third-party integration failures are suspected.
- User wants a release checklist for env configuration.

## Inputs
Collect from the prompt when available:
- Required integrations (for example Supabase, Cloudinary, Analytics).
- Target environments: local, preview, production.
- Whether to enforce strict blocking on missing values.

If details are missing, proceed with defaults:
- Validate local plus hosted deployment expectations.
- Treat auth and database keys as required blockers.

## Operating Rules
1. Validate key presence and expected format, never print secret values.
2. Distinguish required vs optional env vars.
3. Map each variable to where it is used in code.
4. Report blockers before claiming release readiness.

## Procedure
1. Discover env usage from code and config.
2. Build a required/optional variable matrix.
3. Validate local env availability.
4. Validate hosted env checklist for preview and production.
5. Validate auth callback and canonical site URL alignment.
6. Return pass/fail report with exact missing keys.

## Default Required Variables (Next.js + Supabase + Cloudinary)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL

## Default Optional Variables
- ADMIN_ALLOWLIST_EMAILS
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- NEXT_PUBLIC_GA_MEASUREMENT_ID
- NEXT_PUBLIC_ADSENSE_CLIENT

## Decision Branches
- If required var missing: mark blocked and provide fix steps.
- If format invalid (for example non-http URL): mark blocked.
- If optional vars missing: mark warning, not blocker.
- If callback URLs mismatch env/site domain: mark blocked.

## Completion Checks
A task is complete only when all are true:
- Required vars are present and format-valid.
- Environment matrix for local/preview/production is provided.
- Callback URL readiness is validated for auth flows.
- Final report includes blockers and remediation commands.

## Output Format
- Start with overall status: ready or blocked.
- Provide a table-like list by environment and variable status.
- Separate blockers from warnings.
- Include only variable names, never secret values.

## Example Prompts
- Run env-audit for local, preview, and production before Vercel deploy.
- Audit all required auth and storage env vars and tell me blockers.
- Validate release env readiness for Supabase Google OAuth callbacks.
