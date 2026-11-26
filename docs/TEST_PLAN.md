# SunFix Field — Verification and Test Plan

This document separates checks that passed in GitHub Actions from production checks that still require a real Firebase project. A local or emulator pass is not proof of a live production integration.

## Reproducible automated checks

Run from the repository root:

```sh
bun install
bun run lint
bun run lint:eslint
bun run test
bun run test:rules
bunx firebase-tools@15.37.0 emulators:exec --config firebase.emulator.json --only auth,firestore --project demo-sunfix-field "bun run test:e2e"
bun run build
```

- `bun run lint`: TypeScript no-emit check.
- `bun run lint:eslint`: ESLint.
- `bun run test`: unit and static regression tests.
- `bun run test:rules`: Firestore Rules Unit Testing against the Firestore Emulator.
- `test:e2e`: Playwright desktop/mobile browser suite; run inside Auth and Firestore emulators for the authenticated sync cases.
- `bun run build`: production Vite build.

## Latest GitHub Actions verification

Successful Quality checks run: [run 45807310075](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45807310075)

Verified commit: `e6095de337ae9ef0d72e916ff1c3ad14c18d35a8` on `hackathon/buildhybridai-2026-11-26`.

- TypeScript check — passed.
- ESLint — passed.
- Unit and static regression tests — **39/39 passed**.
- Firestore Emulator authorization tests — **6/6 passed**.
- Playwright on GitHub Actions Linux — **13 passed, 5 skipped** across desktop and mobile Chromium. This includes responsive layout, accessibility, safety Stop-Work, work-order creation, offline deterministic fallback, failed cloud-request fallback, and authenticated emulator sync. Four skips are the opt-in production App Check/AI checks across the two browser projects; one is the desktop-only provider failure smoke on mobile.
- Production Vite build — passed.
- Browser screenshots, traces and test report — uploaded as the `sunfix-browser-qa` artifact for the run.

Download the [browser QA artifact](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45807310075). GitHub retains it for seven days.

The emulator sync test creates an email-verified test identity, mounts the real `SunFixProvider`, queues an asset while offline, checks account-scoped IndexedDB state, reconnects, and verifies the Firestore write and synced queue status. This is stronger than a unit test of the low-level sync helper, but it is still an emulator test.

## Not verified against the production Firebase project

The successful CI run does **not** establish any of the following:

1. Google sign-in enabled and tested with a real Google account on the production hostname.
2. reCAPTCHA Enterprise App Check attestation issued successfully for the production web app and hostname.
3. Firebase AI Logic / Gemini cloud inference succeeding in the live project.
4. Multi-account owner isolation, production sync conflict behavior, or real-device offline recovery against the production Firestore database.
5. Firestore rules deployed to the intended production project.

To run the live checks, configure the real Firebase Web App values and App Check site key as repository Actions secrets, then set `SUNFIX_RUN_LIVE_AI_SMOKE=true` as an Actions variable. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md). Never put a private Gemini or Firebase Admin credential in a `VITE_*` variable.

## Safety and evidence boundaries

- Emulator authorization tests are not a production deployment.
- Deterministic demo diagnostics, synthetic telemetry and sample evidence must remain visibly labelled as simulated.
- A green build or browser test does not certify electrical safety, inverter interoperability, regulatory compliance or field readiness.
- Any real electrical work remains subject to site procedures and qualified personnel.
