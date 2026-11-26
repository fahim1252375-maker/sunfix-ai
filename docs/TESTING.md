# SunFix AI — Test plan

## Automated test layers

- Unit/static regression tests: `bun run test`
- Firestore authorization rules against the Firebase Emulator: `bun run test:rules`
- Desktop and mobile browser QA, WCAG axe checks, simulated offline mode, and authenticated Auth/Firestore emulator sync: `bunx firebase-tools emulators:exec --only auth,firestore --project demo-sunfix-field "bun run test:e2e"`
- Production bundle: `bun run build`

The browser test suite starts the Vite development server at `127.0.0.1:4173` and uses emulator-only Firebase configuration for the default CI run. No production project credentials are used by the default CI run. The Auth emulator E2E test creates a disposable test user, verifies its email through the Auth Emulator OOB-code flow, and force-refreshes its ID token to obtain the `email_verified` claim. The offline-to-online browser test mounts the real `SunFixProvider`, queues a new asset while the browser is offline, verifies the account-scoped IndexedDB workspace and pending queue, reconnects the browser, waits for the provider's automatic `processSyncQueue` effect, and verifies both the persisted `synced` queue state and the owner-scoped Firestore record count. This exercises the app context and reconnect path rather than directly calling only the lower-level sync service.

## Live Firebase App Check and AI Logic checks

The `@live-app-check` and `@live-ai` Playwright tests are intentionally opt-in and run once in desktop Chromium. They use a real Firebase project and make a real Firebase AI Logic cloud request. Because GitHub Actions runs this Playwright server on `127.0.0.1:4173`, its App Check test must use a **registered Firebase App Check debug token**, not a production reCAPTCHA attestation.

Current setup requirements:

1. Configure a real Firebase Web App and enable Firebase AI Logic / Gemini Developer API in the Firebase project.
2. Register the web app in Firebase App Check with the production reCAPTCHA Enterprise provider and its score-based Web key. Keep the production reCAPTCHA key restricted to actual production hostnames; **do not add `localhost` or `127.0.0.1` to a production key**.
3. Generate a development/CI App Check debug token, register it in Firebase Console -> App Check -> the Web app -> Manage debug tokens, and keep it private.
4. Add these GitHub Actions repository secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_RECAPTCHA_SITE_KEY`, and `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`.
5. Add repository Actions variable `SUNFIX_RUN_LIVE_AI_SMOKE=true`. Optionally set `VITE_FIREBASE_AI_MODEL`.
6. Run the Quality checks workflow on the hackathon branch. The local CI smoke test must report `active_debug`, return an App Check token, and complete a genuine Firebase AI Logic cloud request without falling back to `DEMO RULES`.

**Important distinction:** A successful CI run with a registered debug token proves the Firebase AI Logic request works with the authorized debug-token path. It does **not** prove production reCAPTCHA Enterprise attestation. Production App Check must be verified separately from the real deployed hostname using the production reCAPTCHA key.

Firebase automatically enforced App Check for Firebase AI Logic across projects on **November 2, 2026**. A valid App Check token is required for live AI Logic requests; do not plan to disable App Check for this test.

Local run:

```sh
SUNFIX_RUN_LIVE_AI_SMOKE=true bun run test:e2e --grep @live
```

Export the real Firebase Web App variables, the registered debug token, and the matching App Check configuration in the local shell first. Do not place a private Gemini key in a `VITE_*` variable or commit any environment file.

## Manual production Google Auth and App Check checklist

1. Enable Google as a provider in the intended Firebase Authentication project.
2. Add the production hostname to Authentication -> Authorized domains. You may add `localhost` here for Google sign-in development; this is separate from the reCAPTCHA Enterprise key's domain allowlist.
3. Verify a real Google account can sign in and sign out in desktop and mobile browsers.
4. Deploy SunFix AI to its actual production hostname and verify that the production reCAPTCHA Enterprise provider returns a valid App Check attestation there.
5. Verify Firebase AI Logic cloud inference from the deployed hostname and confirm the SDK reports `in_cloud`.
6. Create and read a user-owned cloud record, then repeat with a second account and confirm owner isolation.
7. Test offline edits, reconnect, pending queue drain, conflict handling, and account switching with real accounts.

The emulator suite verifies owner-scoped Firestore rules and an authenticated, email-verified test principal writing through the actual Firebase SDK sync service. It does not replace real Google OAuth, live Firestore verification, or production reCAPTCHA Enterprise attestation.
