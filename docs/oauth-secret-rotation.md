# OAuth Client Secret Rotation and Leak Prevention

Use this checklist immediately whenever an OAuth client secret is exposed.

## 1) Rotate the Secret in Google Cloud Console

1. Open Google Cloud Console.
2. Go to APIs & Services > Credentials.
3. Open the OAuth 2.0 Client ID used by your app.
4. Click Reset Secret (or create a new secret if reset is unavailable).
5. Copy the new secret once and store it in a password manager.
6. Treat the old secret as compromised.

## 2) Store Secret in Backend Only (Never Frontend)

For this project, store secrets in Firebase Functions secrets.

```powershell
Set-Location "C:\Question Randomizer"
firebase functions:secrets:set OAUTH_CLIENT_SECRET --project mathquizzizz
```

If you also need client ID server-side:

```powershell
firebase functions:secrets:set OAUTH_CLIENT_ID --project mathquizzizz
```

## 3) Bind Secrets to Cloud Functions (v2)

In function options, bind secrets so `process.env` is populated at runtime.

Example:

```js
onCall({ region: "asia-southeast2", secrets: ["OAUTH_CLIENT_SECRET"] }, async () => {
  const secret = (process.env.OAUTH_CLIENT_SECRET || "").trim();
});
```

## 4) Remove Secrets from Local Files

1. Keep `credentials.json` out of version control (already ignored by `.gitignore`).
2. Keep only placeholder values in local shared files.
3. Use `credentials.example.json` for schema reference only.

## 5) Restrict OAuth Settings

1. Set exact Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://mathquizzizz.web.app`
2. Set exact Authorized redirect URIs for backend callback endpoints only.
3. Remove unused redirect URIs and origins.

## 6) Deploy and Verify

```powershell
Set-Location "C:\Question Randomizer"
firebase deploy --only "functions" --project mathquizzizz --non-interactive
```

Validation:

1. OAuth login/token exchange works.
2. Secret is not visible in browser dev tools or frontend code.
3. Cloud Function logs do not print secret values.

## 7) Add Leak Prevention in Team Workflow

1. Never paste secrets into chat, docs, or issue comments.
2. Use secret scanning in CI (Gitleaks or similar).
3. Add a pre-commit hook to reject high-entropy secret patterns.
4. Rotate exposed secrets immediately and document incident date.

## 8) Lightweight Local Secret Scanner (Already Wired)

This repo includes a fast scanner that blocks commits when potential secrets are
detected in staged changes.

Install once per clone:

```powershell
Set-Location "C:\Question Randomizer"
npm run hooks:install
```

Run manually:

```powershell
npm run secret:scan
npm run secret:scan:staged
```

Notes:

1. The pre-commit hook is in `.githooks/pre-commit`.
2. It scans staged added lines to keep checks fast and reduce false positives.
3. If it flags a real secret, rotate it and remove it from commit content before retrying.
