# SunFix AI — Test plan

## Automated test layers

- Unit/static regression tests: `bun run test`
- Firestore authorization rules against the Firebase Emulator: `bun run test:rules`
- Desktop and mobile browser QA, WCAG axe checks, simulated offline mode, and authenticated Auth/Firestore emulator sync: `bunx firebase-tools@15.37.0 emulators:exec --config firebase.emulator.json --only auth,firestore --project demo-sunfix-field "bun run test:e2e"`

Live Firestore rules deployment targets only the named database configured in `firebase.json`. Emulator tests must use `firebase.emulator.json`, which isolates the default emulator database.
- Production bundle: `bun run build`
- Vercel static output configuration: `vercel.json` (build output `dist`; local validation does not deploy).
- Dependency risk: run `bun audit` and `bun audit --production`; record unresolved advisories and do not force out-of-range overrides.

The browser test suite starts the Vite development server at `127.0.0.1:4173` and uses emulator-only Firebase configuration for the default CI run. No production project credentials are used by the default CI run. The Auth emulator E2E test creates a disposable test user, verifies its email through the Auth Emulator OOB-code flow, and force-refreshes its ID token to obtain the `email_verified` claim. The offline-to-online browser test mounts the real `SunFixProvider`, queues a new asset while the browser is offline, verifies the account-scoped IndexedDB workspace and pending queue, reconnects the browser, waits for the provider's automatic `processSyncQueue` effect, and verifies both the persisted `synced` queue state and the owner-scoped Firestore record count. This exercises the app context and reconnect path rather than directly calling only the lower-level sync service.

## Live Firebase App Check and AI Logic checks

The `@live-app-check` and `@live-ai` Playwright tests are intentionally opt-in and run once in desktop Chromium. They use a real Firebase project and make a real Firebase AI Logic cloud request. Because GitHub Actions runs this Playwright server on `127.0.0.1:4173`, its App Check test must use a **registered Firebase App Check debug token**, not a production reCAPTCHA attestation.

Current setup requirements:

1. Configure a real Firebase Web App and enable Firebase AI Logic / Gemini Developer API in the Firebase project.
2. Register the web app in Firebase App Check with the production reCAPTCHA Enterprise provider and its score-based Web key. Keep the production reCAPTCHA key restricted to actual production hostnames; **do not add `localhost` or `127.0.0.1` to a production key**.
3. Generate a development/CI App Check debug token, register it in Firebase Console -> App Check -> the Web app -> Manage debug tokens, and keep it private.
4. Add these GitHub Actions repository secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_RECAPTCHA_SITE_KEY`, and `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`.
5. Add repository Actions variables `SUNFIX_RUN_LIVE_AI_SMOKE=true` and `VITE_FIRESTORE_DATABASE_ID=ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`. The database ID is configuration, not a secret. Optionally set `VITE_FIREBASE_AI_MODEL`.
6. Run the Quality checks workflow on the hackathon branch. The local CI smoke test must report `active_debug`, return an App Check token, and complete a genuine Firebase AI Logic cloud request without falling back to `DEMO RULES`.

**Important distinction:** A successful CI run with a registered debug token proves the Firebase AI Logic request works with the authorized debug-token path. It does **not** prove production reCAPTCHA Enterprise attestation. Production App Check must be verified separately from the real deployed hostname using the production reCAPTCHA key.

Firebase automatically enforced App Check for Firebase AI Logic across projects on **November 2, 2026**. A valid App Check token is required for live AI Logic requests; do not plan to disable App Check for this test.

Local run:

```sh
SUNFIX_RUN_LIVE_AI_SMOKE=true bun run test:e2e --grep @live
```

Export the real Firebase Web App variables, the registered debug token, and the matching App Check configuration in the local shell first. Do not place a private Gemini key in a `VITE_*` variable or commit any environment file.

## Live Firestore CRUD and owner-isolation check

The `@live-firestore` Playwright test uses the Firebase client SDK from a browser against project `avid-grin-p01dl` and the named database `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`. It signs in two distinct, pre-created, email-verified test accounts, creates a uniquely named disposable asset, confirms its owner can read it, confirms the second account receives `permission-denied`, and deletes and verifies cleanup of only that generated asset. Playwright tracing, screenshots, and video are disabled for this test so credentials are not captured in CI artifacts.

The test is opt-in. Set the repository Actions variable `SUNFIX_RUN_LIVE_FIRESTORE_TEST=true` and add these protected Actions secrets before running it:

- `SUNFIX_LIVE_TEST_EMAIL`
- `SUNFIX_LIVE_TEST_PASSWORD`
- `SUNFIX_LIVE_TEST_SECOND_EMAIL`
- `SUNFIX_LIVE_TEST_SECOND_PASSWORD`

The accounts must be distinct and email-verified. The Firebase **Email/Password** provider must be enabled for these accounts; do not enable or change a production provider solely for this smoke test without project-owner review. Never paste passwords into chat or commit them. The test stops unless the configured project and database exactly match the approved target. Its default gate is off; emulator CI never receives these credentials.

## Manual production Google Auth and App Check checklist

1. Enable Google as a provider in the intended Firebase Authentication project.
2. Add the production hostname to Authentication -> Authorized domains. You may add `localhost` here for Google sign-in development; this is separate from the reCAPTCHA Enterprise key's domain allowlist.
3. Verify a real Google account can sign in and sign out in desktop and mobile browsers.
4. Deploy SunFix AI to its actual production hostname and verify that the production reCAPTCHA Enterprise provider returns a valid App Check attestation there.
5. Verify Firebase AI Logic cloud inference from the deployed hostname and confirm the SDK reports `in_cloud`.
6. Create and read a user-owned cloud record, then repeat with a second account and confirm owner isolation.
7. Test offline edits, reconnect, pending queue drain, conflict handling, and account switching with real accounts.

The emulator suite verifies owner-scoped Firestore rules and an authenticated, email-verified test principal writing through the actual Firebase SDK sync service. It does not replace real Google OAuth, live Firestore verification, or production reCAPTCHA Enterprise attestation.

At the 2026-11-27 handoff check, the live Firestore test was not configured: the four test-account secrets and `SUNFIX_RUN_LIVE_FIRESTORE_TEST` variable were absent. The live App Check/AI test was also not enabled because the App Check debug token/site key and Firebase AI Logic setup were unavailable.

## Current run evidence and known gaps (2026-11-27)

The latest GitHub Actions run at handoff is [run 45878864269](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45878864269), passing TypeScript, ESLint, unit/security checks (40 tests), Firestore emulator authorization, authenticated emulator sync, responsive/accessibility browser checks, and production build on commit `73deb94`. The optional live Firestore and Firebase AI Logic checks were skipped because their explicit gates and credentials were not configured. A passing emulator test is not a live project test.

The signed-in app now has paginated v2 owner-filtered entity hydration and schema validation. The existing E2E suite still needs a dedicated multi-page restore, account-switch, and conflict-merge scenario. Remote file storage and Vercel Functions have no integration tests because no remote file provider or API route is implemented.

For the initial backend-readiness checkpoint, local validation on 2026-11-27 reported 42/42 unit tests and a successful Vite build. The follow-up Phase 2 changes now pass TypeScript, ESLint, **58 unit tests**, and Vite production build locally. Added unit coverage includes full-domain encode/decode, schema acceptance for representative records in each collection, owner mismatch and malformed payload rejection, local/cloud reconciliation, offline storage failures, and queue conflicts. The Firestore emulator cannot start on this host: `bunx firebase-tools@15.37.0` returns `EPERM` before emulator execution. Emulator integration rules cover malformed envelopes and monotonic revisions, but local execution awaits a working emulator runner.

The previously pushed checkpoint on `56dd4ef` passed GitHub Actions run [45937375780](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45937375780), including typecheck, lint, unit/security checks, Firestore emulator rules, authenticated emulator sync, browser/accessibility checks, and production build. Optional live Firestore and Firebase AI Logic jobs were skipped because their live gates/credentials were not configured. The Phase 2 working tree is newer than that CI run; rerun branch CI after it is pushed. Do not treat the checkpoint run as verification of the Phase 2 changes or of live Firebase behavior.

## Phase 2 backend restoration and reconnect verification (2026-11-27)

The signed-in workspace now restores the complete supported v2 domain payloads from owner-filtered, paginated Firestore collections. Local IndexedDB hydration is account-scoped and independent of connectivity changes, so an offline/online transition does not reset an active diagnostic workflow. On reconnect, cloud restore and reconciliation run before pending queue replay. Queue processing uses a synchronous in-flight guard; in-flight mutations are retained during reconciliation; reconciled queue snapshots are persisted in a single IndexedDB read/write transaction.

The decoder validates the schema version, bounded domain payload, owner, document ID, and revision. Summary-only or otherwise incomplete legacy documents are quarantined and reported as incomplete; missing fields are not invented. Existing device copies are preserved. Local IndexedDB failures surface visibly instead of being reported as successful persistence.

Verified on branch head `ef6b667f09f1f367d90ee77219b6593c1fe17ab4` by GitHub Actions [run 45999820226](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45999820226):

- TypeScript check and ESLint passed.
- Unit and static security tests: **60 passed, 0 failed**.
- Firestore Emulator authorization tests: **10 passed, 0 failed**.
- Authenticated offline/reconnect, responsive, and accessibility browser QA: **13 passed**. This includes the desktop and mobile offline-to-online queue replay regression.
- Production Vite build passed.
- Optional live Firestore CRUD/owner-isolation and Firebase AI Logic/App Check checks were skipped because their explicit live credentials/configuration were not enabled. This run verifies emulator behavior, not the live Firebase project.

**Live-project boundary:** the v2 rules are committed in the repository but have not been deployed to the named live Firestore database. V1 summary-only documents have not been migrated or backfilled. FieldProof image/PDF binaries remain local-only because no remote file-storage provider has been configured. No production data writes, live migration, billing change, Firebase Hosting deployment, or Vercel deployment were performed.

## Latest handoff — 2026-11-27 (commit ce8212c)

This section supersedes the earlier checkpoint status above where the recorded commit or run is older.

- GitHub Actions Quality checks run 46025033327 (https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/46025033327) completed successfully for branch hackathon/buildhybridai-2026-11-26 at commit ce8212cc4445377ac4c3218b6c829748d009db56: TypeScript and ESLint passed; unit/static-security tests passed 60/60; Firestore Emulator authorization tests passed 10/10; desktop/mobile Playwright, accessibility, offline and authenticated emulator-sync browser tests passed 13/13; production build passed. The two optional live integration jobs were skipped.
- The associated pull-request workflow run 46024978079 (https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/46024978079) also completed successfully on the same commit.
- The unconfigured-Firebase startup regression is fixed: Demo Mode initializes without a real Firebase API key and bypasses the Auth listener until actual Firebase Web App configuration is present.
- Vercel (https://sunfix-ai.vercel.app/) and Render (https://sunfix-ai-preview.onrender.com/) both returned the app shell, rendered the React workspace, and entered Demo Workspace during browser verification. This verifies the static demo experience only.

### Still not verified / not enabled

- The public deployments have no real Firebase Web App environment values configured. Google sign-in, live Firestore writes/reads, cross-device sync, production reCAPTCHA Enterprise App Check, and Firebase AI Logic cloud inference are therefore not verified or enabled on those deployments.
- The live Firestore owner-isolation and live Firebase AI/App Check Playwright tests remain opt-in and were not run. Emulator authorization and sync tests do not prove live-project behavior.
- Firestore rules in this branch have not been deployed to the existing named production database. Compare the live Rules tab with firestore.rules and obtain a reviewed backup before any deployment.
- FieldProof photo/PDF binaries remain browser-local; only evidence metadata is synchronized by the current Firestore model. A remote object-storage provider and associated retention/access controls are not implemented.
- Dedicated end-to-end scenarios for multi-page restore, account switching, and conflict merging remain outstanding. No production API server or remote file-storage service is implemented.
- The dependency audit remains 1 High, 2 Moderate, 1 Low, 0 Critical on the recorded lockfile, as detailed in SECURITY_REVIEW.md. Recheck the published package versions and rerun audits before production release; do not force out-of-range overrides.

The app is currently a verified static Demo Mode deployment, not a production-ready solar operations system. Pull request #4 was merged into main on 2026-11-27 as commit `b9287718415a8607cbaabf0b07a3a2c4df7e8260`; the merge does not resolve the live Firebase, storage, backup, or dependency-security release gates below.

## Post-merge production branch check — 2026-11-27

- Pull request [#4](https://github.com/fahim1252375-maker/sunfix-ai/pull/4) is merged into `main`. Main HEAD is `b9287718415a8607cbaabf0b07a3a2c4df7e8260`.
- GitHub Actions [main Quality checks run 46028623023](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/46028623023) completed successfully on the merge commit.
- Vercel's current Production deployment is `READY` from that same main commit and is assigned to [sunfix-ai.vercel.app](https://sunfix-ai.vercel.app/).
- Vercel has zero project environment variables configured. The public Vercel deployment is therefore the static Demo Mode build, not a live Firebase deployment.
- The Render preview service still tracks `hackathon/buildhybridai-2026-11-26`; at the time of this check its deployment was on the earlier `ce8212c` commit, while the branch was one merge commit behind main. The app source is equivalent, but Render should be refreshed to the merged main revision after the current readiness patch is accepted.
- The landing-page readiness notice and marketing metadata are being tightened so an online network connection is not described as proof that cloud inference is reachable, and App Check is not advertised as active when it is not configured.

### Release decision

**Demo presentation: ready. Production operations: not ready.** Do not use the demo for real technician work, electrical safety decisions, live telemetry, or customer records. Release gates remain: compatible dependency remediation; real Firebase Auth/Firestore/App Check/AI configuration and live tests; reviewed production Firestore rules deployment; durable object storage for evidence files; backup/restore and account-switch/conflict E2E coverage; privacy, retention, monitoring, and operational incident procedures.
