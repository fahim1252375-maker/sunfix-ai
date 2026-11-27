# SunFix Field — Production Security & Operations Readiness

**Status:** Not approved for real customer or technician data until every release gate below is evidenced.

## Identity and account access
- [ ] Configure the existing Firebase Web App for the production Vercel project using the exact values from Firebase Console.
- [ ] Enable Google as an Authentication provider.
- [ ] Add the production hostname to Firebase Authentication authorized domains.
- [ ] Verify sign-in, sign-out, token refresh, revoked sessions, unauthorized-domain handling, and two-account isolation from the production hostname.
- [ ] Confirm cloud data paths require verified identity and never mix anonymous browser data with a signed-in account.

## Firebase and data security
- [ ] Verify the intended project and named Firestore database ID before any live action.
- [ ] Compare live Firestore rules with firestore.rules; run Emulator Suite authorization tests; deploy only the named database after explicit approval.
- [ ] Verify App Check with the production reCAPTCHA Enterprise site key from the real hostname. Never ship a debug token or use one as proof of production attestation.
- [ ] Confirm Firebase AI Logic is enabled and a genuine cloud request succeeds with a valid production App Check token.
- [ ] Enable and test Firebase Storage only after a storage design and budget/plan eligibility review. Add owner-scoped, content-type/size-limited Storage rules before enabling uploads.
- [ ] Keep service-account credentials, Admin SDK keys, and private provider keys out of browser bundles, Git, and Vercel VITE_* variables.

## Security and application hardening
- [x] Vercel baseline security headers: MIME sniffing protection, clickjacking protection, strict referrer policy, HSTS, least-privilege camera/microphone permissions, and popup-compatible COOP.
- [ ] Review CSP after auditing every Firebase, Google sign-in, reCAPTCHA, AI, worker, blob, and asset origin. Do not deploy an untested restrictive CSP that breaks sign-in or PWA behavior.
- [ ] Re-run full and production dependency audits after upstream fixes are published. Do not force out-of-range overrides.
- [ ] Verify rate limits, abuse controls, account recovery, and incident response for all public write paths.
- [ ] Review privacy notice, consent, data retention/deletion, export, and breach response with the actual deployment operator.

## Backup, restore, and evidence retention
- [ ] Confirm the existing Firebase plan/database is eligible for the intended backup/export mechanism before enabling anything paid.
- [ ] Define RPO, RTO, retention, encryption, and least-privilege backup access.
- [ ] Run a non-production export and restore drill; record duration, counts, and integrity checks.
- [ ] Decide whether FieldProof binaries remain device-local or use a supported object-storage service. If cloud storage is enabled, apply strict per-user Storage rules and lifecycle/retention controls.
- [ ] Provide user-initiated export and clear warnings for evidence that remains device-local.

## Operational readiness
- [ ] Add error monitoring and privacy-safe operational logs.
- [ ] Add uptime and synthetic checks for the public app and Firebase dependencies.
- [ ] Define support contact, incident owner, rollback procedure, and release checklist.
- [ ] Run production-hostname smoke tests for mobile/desktop, accessibility, offline/online transitions, and account isolation.
- [ ] Obtain a qualified solar-domain safety review. AI output must remain advisory and never replace certified electrical procedures or technician judgement.

## Current blocker
The production Vercel project currently has no Firebase environment variables. Google sign-in cannot succeed until the real Firebase Web App values are added to the Vercel Production environment and a fresh deployment is built. Firebase Web App config values are browser client configuration; never substitute Firebase Admin credentials or a private key.

No paid plan, backup feature, live rules deployment, Storage bucket, or production Firebase resource should be enabled without the owner's explicit plan and cost approval.
