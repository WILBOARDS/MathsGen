# Admin Localhost Mini App Spec

## Goal

Build a localhost-only admin utility for role management in MathGen.

This mini app is used to:

- Read user accounts from the database (username, email, uid, current role).
- Search and filter users quickly.
- Update user role (`admin` or `user`).
- Review troubleshooting alerts and recent incident signals.
- Review user feedback stream submitted from the app feedback widget.
- Review custom career requests submitted when users pick `Other` during registration/profile updates.
- Manage feature flags, inspect audit logs, and inspect rate-limiter state.

## How To Run (Localhost)

1. Install dependencies at project root:
   - `npm install`
2. Start the local mini app server:
   - `npm run admin:miniapp`
3. Open the app:
   - `http://127.0.0.1:4177/local-hostd.html`
4. Click **Sign in with Google** and sign in as `wilbertamadeuspo@gmail.com` for edit access.
5. Optional fallback: enter owner access key in the **Owner access key** field, then click **Save Key**.
6. Click `Refresh All Panels`.
7. Optional: enable auto refresh from the **Auto refresh** selector.
8. Optional: click **Copy Diagnostics** to export a runtime snapshot for debugging.
9. Optional: click **Run Self Check** to validate admin endpoint connectivity and auth.

If the page does not load, verify port `4177` is free and rerun the command.

If callables return `401` or browser CORS errors, redeploy Functions after config/code updates:

- `npm run deploy:firebase`

## Required Local Configuration

The mini app file [tools/local-hostd.html](../tools/local-hostd.html) must contain valid Firebase config values.

Replace the placeholder values in `firebaseConfig` with your project settings.

Use the same key in the mini app UI that is configured in Cloud Functions env:

- `DEV_OWNER_BYPASS_ENABLED=true`
- `DEV_OWNER_BYPASS_TOKEN=<your-secret>`

Google editor allowlist (backend authorization) is configured with:

- `ADMIN_ALLOWED_EMAILS=wilbertamadeuspo@gmail.com`

Owner bypass mode is intentionally constrained:

- Allowed only for localhost origins.
- Disabled in production-like environments.
- Still audited with auth mode markers.
- Callable CORS must allow your localhost origin (for example `http://127.0.0.1:4177`).

Google login behavior:

- Allowed editor email can perform write actions.
- Other Google accounts are treated as read-only in UI and blocked from write operations.

If Google sign-in shows `Firebase: Error (auth/unauthorized-domain)`:

1. Open Firebase Console for your project.
2. Go to Authentication -> Settings -> Authorized domains.
3. Add both domains:
   - `localhost`
   - `127.0.0.1`
4. Save and reload `http://127.0.0.1:4177/local-hostd.html`.
5. Retry **Sign in with Google**.

Expected callable functions used by this mini app:

- `adminListRegisteredUsers`
- `adminSetUserRole`
- `adminCleanupUserByEmail`
- `adminGetTroubleshootingAlerts`
- `adminGetUserFeedback`
- `adminListFeatureFlags`
- `adminSetFeatureFlag`
- `adminGetAuditLogs`
- `adminRateLimiterInfo`
- `adminListCareerRequests`
- `adminMarkCareerRequestReviewed`
- `getSystemHealth`

If these callables fail with permission errors, verify owner bypass env vars and key match.

## Scope

In scope:

- Local web app running only on localhost.
- Read-only list view for usernames and emails.
- Controlled role update actions.
- Troubleshooting alerts and issue triage workflow.
- Feedback stream view for developer triage.
- Custom career request queue for moderator review and status updates.
- Feature flags, audit logs, rate limiter and health inspection panels.
- Auto-refresh with failure pause protection for panel reloads.
- Staged refresh progress visibility for operator feedback.
- Pagination and page-jump controls for users, feedback, and audit panels.
- Diagnostics snapshot export for incident reporting.
- Per-panel cancel controls for users, alerts, feedback, flags, audit, and health.
- Per-panel retry counters visible in panel headers.
- One-click endpoint self-check for safe admin callable health verification.

Out of scope:

- Public deployment.
- Self-service role edits by regular users.
- Bulk import/export workflows.

## Required Roles

- `owner-direct` (localhost bypass): developer/operator console access.
- `admin` claim: standard backend admin authorization path.
- `user`: default role with no admin privileges.

## Data Requirements

Minimum fields needed from user records:

- `uid`
- `username`
- `email`
- `role`
- `updatedAt`

Optional but useful:

- `displayName`
- `lastLoginAt`
- `createdAt`

## Suggested Architecture

- Frontend: small local React/Vite page or plain HTML app served on localhost.
- Backend: Firebase Callable Function for secure role updates.
- Auth check: backend validates either admin custom claim or dev-only owner bypass token.

Why this matters:

- Role changes must never be written directly from the client to database paths.
- Permission checks must be enforced server-side, not only in UI.

## API Contract (Proposal)

### 1) List users

Callable or HTTPS endpoint:

- Name: `adminListRegisteredUsers`
- Input: `{ query?: string, cursor?: string, limit?: number }`
- Output: `{ users: Array<{ uid, username, email, role }>, nextCursor?: string }`

### 2) Update role

Callable:

- Name: `adminSetUserRole`
- Input: `{ uid: string, role: "admin" | "user", ownerAccessKey?: string }`
- Output: `{ success: true, uid, role, message }`

### 3) Get feedback stream

- Name: `adminGetUserFeedback`
- Input: `{ minutes?: number, limit?: number, category?: string, minRating?: number, ownerAccessKey?: string }`
- Output: `{ windowMinutes, count, feedback: Array<{ id, timestamp, rating, category, message, uid }> }`

### 4) List feature flags

- Name: `adminListFeatureFlags`
- Input: `{ limit?: number, ownerAccessKey?: string }`
- Output: `{ flags: Array<{ featureKey, enabled, rolloutPercentage, allowedUids, description, updatedAt }>, count }`

### 5) List custom career requests

- Name: `adminListCareerRequests`
- Input: `{ status?: "pending" | "reviewed" | "all", limit?: number, pageToken?: string, search?: string, ownerAccessKey?: string }`
- Output: `{ requests: Array<{ id, uid, email, name, desiredCareer, customCareer, source, status, reviewedBy, reviewedAt, createdAt }>, count, nextPageToken?: string }`

### 6) Mark custom career request reviewed

- Name: `adminMarkCareerRequestReviewed`
- Input: `{ requestId: string, reviewed?: boolean, moderatorNote?: string, ownerAccessKey?: string }`
- Output: `{ success: true, requestId, status, message }`

## UI Flow

1. Developer opens localhost app.
2. App boots owner-direct mode using configured owner access key.
3. Panels load in staged sequence: users, alerts, feedback, feature flags, audit, health.
4. Developer applies role/flag actions and triages incidents.
5. App updates panel state and preserves local acknowledgements.
6. Developer can tune auto-refresh cadence or keep manual mode for controlled operations.
7. Developer can cancel noisy panel loads and inspect retry counters when dependencies are unstable.
8. Developer can run one-click endpoint self-check to isolate CORS/auth/deploy issues quickly.

## Audit Logging

Every role change should log:

- `actorUid`
- `targetUid`
- `targetEmail`
- `previousRole`
- `nextRole`
- `timestamp`
- `reason` (optional text)
- `authMode` (`firebase-admin-claim` or `owner-bypass`)

## Security Checklist

- Run only on `localhost` or approved internal host.
- Enforce auth token validation OR owner bypass secret for admin endpoints.
- Deny direct role writes in database security rules.
- Add rate limiting for role update endpoints.
- Record immutable audit entries for each role change.
- Disable owner bypass in production-like environments.

## Implementation Notes For This Repository

- Mini app intentionally uses owner-direct mode (no interactive sign-in UI).
- Keep role-write logic in Cloud Functions (region consistency with existing setup).
- Add a separate docs page later if you want this tool to be team-accessible.

## Future Enhancements

- Role change reason mandatory for `admin` edits.
- Diff view for recent permission changes.
- Temporary role assignments with automatic expiry.
- CSV export of audit logs.
