# Firebase Deployment Guide

## Current Status

✅ **Build Ready**: `dist/` folder is compiled and ready for deployment
✅ **Firebase Config**: `.firebaserc` configured for project `mathquizzizz`
✅ **Cloud Functions**: Ready at `functions/` directory
✅ **Firestore Rules**: Configured in `firestore.rules`
✅ **Database Rules**: Configured in `config/DATABASE_RULES.json`

## What Will Be Deployed

1. **Hosting** → `mathquizzizz.web.app` (from `dist/` folder)
2. **Cloud Functions** → Custom backend functions from `functions/`
3. **Firestore Rules** → Security rules for database access
4. **Database Rules** → Realtime Database rules

## Complete These Manual Steps to Deploy

### Step 1: Authenticate Firebase CLI

Run this command:

```bash
firebase login
```

Or for CI/headless environments:

```bash
firebase login:ci
```

You will see a prompt with a URL and session ID. Visit the URL in your browser, sign in with your Google account, and copy the authorization code.

### Step 2: Set Required Firebase Function Secrets

Run these commands and paste the correct values when prompted:

```bash
firebase functions:secrets:set UPSTASH_REDIS_REST_URL --project mathquizzizz
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN --project mathquizzizz
firebase functions:secrets:set RESEND_API_KEY --project mathquizzizz
```

For full strict-mode readiness (admin + AI + tutor verification), also set:

```bash
firebase functions:secrets:set OPENROUTER_API_KEY --project mathquizzizz
firebase functions:secrets:set GEMINI_API_KEY --project mathquizzizz
firebase functions:secrets:set CLOUDFLARE_TURNSTILE_SECRET --project mathquizzizz
firebase functions:secrets:set ADMIN_DASHBOARD_PASSWORD --project mathquizzizz
```

For local free fallback generation via Ollama, run an Ollama server and pull a model used by your `.env` config (example):

```bash
ollama serve
ollama pull qwen2.5:7b-instruct
```

### Step 3: Run Launch Preflight + Required Gate

Run these checks before deploy:

```bash
npm run preflight:firebase
npm run secret:scan
npm run lint
npm run build
cd functions && npm run lint
```

Use strict preflight when validating admin/AI readiness:

```bash
npm run preflight:firebase:strict
```

### Step 4: Deploy to Firebase

Once authenticated, run:

```bash
npm run deploy:firebase
```

Or manually:

```bash
firebase deploy
```

### Expected Deployment Output

```
=== Deploying to 'mathquizzizz'...

i  deploying hosting
i  deploying firestore
i  deploying functions
i  deploying database

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/mathquizzizz/overview
Hosting URL: https://mathquizzizz.web.app
```

## If Deployment Fails

### Issue: "Failed to authenticate"

**Solution**: Run `firebase login` again to re-authenticate

### Issue: "Missing source files"

**Solution**: Ensure `dist/` folder exists with build files. Run:

```bash
npm install
npm run build
```

### Issue: "Functions deployment failed"

**Solution**: Check Cloud Functions prerequisites:

1. Node.js 18+ installed
2. Firebase project has billing enabled
3. Check `functions/package.json` dependencies

### Issue: "Firestore Rules validation failed"

**Solution**: Validate rules syntax:

```bash
firebase deploy --only firestore:rules
```

## Environment Configuration

**Frontend Environment Variables** (in `.env`):

- `VITE_FIREBASE_API_KEY` - Firebase web API key (public)
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase Auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_MEASUREMENT_ID` - Google Analytics ID

**Backend Secrets** (stored in Firebase Functions Secrets Manager):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `OPENROUTER_API_KEY` (required for OpenRouter fallback provider)
- `GEMINI_API_KEY` (required for AI tutor/material features)
- `CLOUDFLARE_TURNSTILE_SECRET` (required for strict tutor verification)
- `ADMIN_DASHBOARD_PASSWORD` (required for admin auth)
- Optional: OAuth client secret and webhook integrations as needed

Set the Resend key before deploying Functions:

```bash
firebase functions:secrets:set RESEND_API_KEY --project mathquizzizz
```

Optional sender identity for auth reset emails (local/.env or Functions env):

- `RESEND_FROM_EMAIL` (example: `MathQuizzizz <no-reply@yourdomain.com>`)

Optional AI fallback environment values (`.env`):

- `AI_FALLBACK_MAX_ATTEMPTS` (default: 9)
- `OLLAMA_BASE_URL`, `OLLAMA_TUTOR_MODEL`, `OLLAMA_IMAGE_MODEL`
- `OPENROUTER_BASE_URL`, `OPENROUTER_TUTOR_MODEL`, `OPENROUTER_IMAGE_MODEL`
- `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`

These are injected at runtime and never exposed in source code.

## Deployment from CI/CD (GitHub Actions, etc.)

Set up a `FIREBASE_TOKEN` secret:

```bash
firebase login:ci
# Copy the token output
```

Then in your CI workflow:

```yaml
- name: Deploy to Firebase
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
  run: npm run deploy:firebase
```

## Post-Deployment Verification

After successful deployment:

1. **Test Hosting**: Visit https://mathquizzizz.web.app
2. **Check Functions**: Test API endpoints
3. **Verify Rules**: Test database access permissions
4. **Monitor**: Check Firebase Console for errors/logs

## Support

- Firebase Console: https://console.firebase.google.com/project/mathquizzizz
- Project ID: `mathquizzizz`
- Region: `asia-southeast2` (Firestore)
