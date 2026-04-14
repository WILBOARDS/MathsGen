# Google AdSense Setup + Authorized Redirect URI Guide

This guide covers:

- AdSense web ad setup for MathGen.
- Authorized redirect URI setup for Google OAuth (Firebase Auth and optional API integrations).
- Validation checklist before Firebase deploy.

## 1) Prerequisites

1. You own and can verify your domain in AdSense.
2. Firebase project is active (`mathquizzizz`).
3. Hosting and Functions are deployable from this workspace.

## 2) AdSense Account + Site Setup

1. Open Google AdSense.
2. Add your site URL (production domain).
3. Complete AdSense ownership verification.
4. Wait for site approval status.

## 3) Configure Environment Variables

Set these values in `.env`:

- `VITE_ADS_ENABLED=true`
- `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`
- `VITE_ADSENSE_SLOT_LAYOUT_TOP=<slot id>`
- `VITE_ADSENSE_SLOT_LAYOUT_BOTTOM=<slot id>`
- `VITE_ADSENSE_SLOT_LEADERBOARD_INLINE=<slot id>`
- `VITE_ADSENSE_SLOT_PROFILE_INLINE=<slot id>`
- `VITE_ADSENSE_SLOT_ANALYTICS_INLINE=<slot id>`
- `VITE_ADSENSE_SLOT_PUBLIC_FOOTER=<slot id>`

Notes:

- Client ID format is `ca-pub-...`.
- Slot IDs are numeric.
- Keep ads disabled in local QA by setting `VITE_ADS_ENABLED=false` if needed.

## 4) Where Ads Render in This Project

Ad slots are already wired in:

- `src/components/DashboardLayout.jsx`
- `src/components/PublicLayout.jsx`
- `src/pages/Leaderboard.jsx`

Core ad logic is in:

- `src/components/AdSlot.jsx`
- `src/config/ads.js`

## 5) Authorized Redirect URIs (Step-by-step)

Important:

- AdSense script integration does not require OAuth redirect URIs.
- Redirect URIs are needed for Google OAuth flows (Firebase Google sign-in or optional Google API OAuth apps).

### 5.1 Firebase Google Sign-in Redirect URI

This project currently uses `signInWithPopup` in `src/api/auth.js`, backed by Firebase Auth.

1. Open Google Cloud Console.
2. Go to APIs & Services -> Credentials.
3. Open the OAuth 2.0 Client used by Firebase web auth.
4. Add Authorized redirect URIs:
   - `https://mathquizzizz.firebaseapp.com/__/auth/handler`
   - `https://mathquizzizz.web.app/__/auth/handler` (optional, only if `authDomain` is changed to `mathquizzizz.web.app`)
5. Save.

Also ensure Authorized JavaScript origins include:

- `https://mathquizzizz.web.app`
- `https://mathquizzizz.firebaseapp.com`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

### 5.2 Optional: If You Use AdSense Management API OAuth

Only needed if you build API-based AdSense reporting/management features.

1. Create a separate OAuth Client (Web application).
2. Choose your callback path, for example:
   - `https://mathquizzizz.web.app/admin/adsense/callback`
   - `http://localhost:5173/admin/adsense/callback`
3. Add those exact callback URLs to Authorized redirect URIs.
4. Store client ID/secret securely (never in frontend source).
5. Security note: if `credentials.json` was exposed or committed, rotate the OAuth client secret immediately and keep secrets on backend-only storage.

## 6) Connection Testing Checklist

1. Frontend env loaded:
   - Build picks up `VITE_ADSENSE_CLIENT` and slot vars.
2. Ad script injection:
   - `adsbygoogle.js` loads without console errors.
3. Route exclusions:
   - Ads are not shown on `/auth`, `/landing`, `/admin`.
4. Public footer slot:
   - Appears on eligible public pages.
5. Dashboard/leaderboard slots:
   - Render placeholders or ads based on config.
6. OAuth sign-in health:
   - Google sign-in popup works.
   - No redirect URI mismatch errors.
7. Turnstile strict tutor path:
   - Invalid token requests are blocked.
   - Valid token requests succeed.

## 7) Deploy Sequence

1. `npm run lint`
2. `npm run build`
3. `cd functions && npm run lint`
4. `npm run deploy:firebase`

If deploy fails:

- Re-auth with Firebase CLI (`firebase login`).
- Confirm project target (`mathquizzizz`) and billing/quota status.
- Re-check `.env` values and hosting build output in `dist`.

## 8) Common Errors

- AdSense no fill: account/site not approved yet.
- Blank ad containers: missing `VITE_ADSENSE_CLIENT` or slot IDs.
- OAuth `redirect_uri_mismatch`: URI not added exactly (scheme + host + path + port).
- Google popup blocked: browser popup restrictions.
- Firebase deploy permission denied: wrong account or missing project IAM role.
