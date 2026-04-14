# Cloudflare Turnstile Setup (Strict Tutor Verification)

This project enforces Turnstile verification for every tutor request.

## 1) Create a Turnstile Widget

1. Open Cloudflare Dashboard.
2. Go to Turnstile -> Add site.
3. Choose a widget name (example: `mathgen-tutor`).
4. Widget mode: Managed challenge.
5. Allowed domains:
   - `localhost`
   - `127.0.0.1`
   - your production domain(s)

After creation, copy:

- Site key (frontend)
- Secret key (backend)

## 2) Configure Frontend

Set in `.env`:

```env
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key
```

The tutor UI renders Turnstile explicitly and requires a valid token before sending a request.

## 3) Configure Backend

Set in Firebase Functions Secret Manager:

```bash
firebase functions:secrets:set CLOUDFLARE_TURNSTILE_SECRET --project mathquizzizz
```

Optionally mirror in local `.env` for emulator-only testing:

```env
CLOUDFLARE_TURNSTILE_SECRET=your_secret_key
```

Backend callable `aiTutorExplain` rejects requests when:

- Secret is missing (misconfigured)
- Token is missing
- Token is invalid or expired

## 4) Local Testing Checklist

1. Start frontend and functions emulator.
2. Open a quiz page and open tutor panel.
3. Complete Turnstile challenge.
4. Send tutor prompt and confirm success.
5. Refresh challenge token and verify expired token is rejected.
6. Clear/invalid key and verify user-safe error message appears.
7. Run strict readiness check and confirm no missing Turnstile secret:

```bash
npm run preflight:firebase:strict
```

## 5) Common Errors

- `secret_missing`: backend secret not configured.
- `token_missing`: frontend did not send token.
- `timeout-or-duplicate`: token expired or reused.
- `invalid-input-secret`: wrong backend secret.
- `invalid-input-response`: malformed/invalid frontend token.

## 6) Security Notes

- Never expose `CLOUDFLARE_TURNSTILE_SECRET` in client code.
- Rotate secrets periodically.
- Keep allowed domains minimal and updated.
- Keep bot heuristics enabled as a second layer after Turnstile.
