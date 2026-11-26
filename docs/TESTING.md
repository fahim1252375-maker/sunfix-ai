# SunFix Field — Test plan

## Automated test layers

- Unit/static regression tests: `bun run test`
- Firestore authorization rules against the Firebase Emulator: `bun run test:rules`
- Desktop and mobile browser QA, WCAG axe checks, simulated offline mode, and authenticated Auth/Firestore emulator sync: `bunx firebase-tools emulators:exec --only auth,firestore --project demo-sunfix-field "bun run test:e2e"`
- Production bundle: `bun run build`

The browser test suite starts the Vite development server and uses emulator-only Firebase configuration. No production project credentials are used by the default CI run. The Auth emulator E2E test creates a disposable test user, verifies its email through the Auth Emulator OOB-code flow, force-refreshes its ID token to obtain the `email_verified` claim, calls the same Firestore sync service used by the app, and verifies the owner-scoped cloud record count. The browser suite separately checks that an offline workspace remains available in IndexedDB after the browser reconnects.

## Live Firebase App Check and AI Logic checks

The `@live-app-check` and `@live-ai` Playwright tests are intentionally opt-in and run once in desktop Chromium. To enable it:

1. Configure a real Firebase Web App and enable Firebase AI Logic / Gemini Developer API in the Firebase project.
2. Register the Web App in Firebase App Check with a reCAPTCHA Enterprise site key. Add `localhost` as an allowed site for the CI browser test if your App Check setup requires it.
3. Add these GitHub Actions repository secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, and `VITE_RECAPTCHA_SITE_KEY`.
4. Add repository Actions variable `SUNFIX_RUN_LIVE_AI_SMOKE=true`. Optionally set `VITE_FIREBASE_AI_MODEL`.
5. Run the workflow. The App Check test must retrieve a real attestation token from the configured site key; the AI test uses the real Firebase AI Logic provider and fails when the result falls back to deterministic demo rules.

Local run:

```sh
SUNFIX_RUN_LIVE_AI_SMOKE=true bun run test:e2e --grep @live
```

Export the real Firebase Web App variables and App Check site key in the shell first. Do not place a private Gemini key in a `VITE_*` variable.

## Manual production Google Auth and App Check checklist

1. Enable Google as a provider in the intended Firebase Authentication project.
2. Add the production hostname and local test hostname to Authorized domains.
3. Register the web app in App Check with the matching reCAPTCHA Enterprise site key.
4. Verify a real Google account can sign in and sign out in desktop and mobile browsers.
5. Verify App Check attestation in Firebase Console before enabling enforcement.
6. Create and read a user-owned cloud record, then repeat with a second account and confirm owner isolation.
7. Test offline edits, reconnect, pending queue drain, conflict handling, and account switching with real accounts.

The emulator suite verifies owner-scoped Firestore rules and an authenticated, email-verified test principal writing through the actual Firebase SDK sync service. It does not replace real Google OAuth or production App Check verification.
