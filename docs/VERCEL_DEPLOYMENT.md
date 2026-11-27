# Vercel deployment and Render preview status

**Last checked:** 2026-11-27  
**Source branch:** `hackathon/buildhybridai-2026-11-26`  
**Validated source commit:** `b56ebd26de8f76b020f7fb4a7c7ff83d518ed6cc`

## Vercel project

The `sunfix-ai` Vercel project is linked to `fahim1252375-maker/sunfix-ai` in the `minhazfahim442-8685` Hobby team. Its production branch is `main`. The project uses the repository-root Vite configuration:

- Framework: Vite
- Node.js: 24.x
- Install: `bun install --frozen-lockfile`
- Build: `bun run build`
- Output: `dist`
- SPA deep-link fallback: `/(.*) -> /index.html`

### Verified Preview deployment

A Preview deployment was created from the exact validated source branch/commit above and reached **READY**. The HTML endpoint returned HTTP 200 when checked. The Preview URL is:

`https://sunfix-ai-git-hackathon-buildhybrida-cf62ed-minhazfahim442-8685.vercel.app`

The project currently has Vercel SSO protection enabled for deployment URLs; visitors may need access to the owning Vercel team. The deployment is a Preview, not a Production release. No custom domain has been assigned.

### Environment configuration is still missing

The Vercel project currently has **zero environment variables configured**. Consequently, this deployment is suitable for inspecting the static UI and deterministic demo mode only. It does not prove live Firebase sign-in, Firestore sync, App Check, or Firebase AI Logic.

Before enabling those features, add the correct client configuration from the existing Firebase Web App to the Vercel Production and approved Preview environments:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIRESTORE_DATABASE_ID` (the existing named database ID, not `(default)`, for live Firebase)
- `VITE_RECAPTCHA_SITE_KEY` (the registered production App Check site key)
- Optional: `VITE_FIREBASE_AI_MODEL`

Use the existing project `avid-grin-p01dl` and named database `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`; do not create another project/database or enable billing. Never put Firebase Admin credentials, service-account JSON, private Gemini keys, or App Check debug tokens in `VITE_*` variables. Web SDK configuration is public client configuration, but it must still match the actual registered Web App.

After configuring a deployment hostname, add only the intended hostname(s) to Firebase Authentication authorized domains and the reCAPTCHA Enterprise/App Check key allowlist. Do not add a broad untrusted preview wildcard.

### Build observations

The Vercel build completed successfully. It emitted a Vite warning about `__dirname` in `vite.config.ts` under the native config loader and a large-chunk warning (the 3D solar digital twin chunk is approximately 967 kB before gzip). These are non-blocking but should be addressed in a later performance/compatibility pass.

## Render Static Site preview

A Render Static Site named `sunfix-ai-preview` was created in the confirmed `My Workspace` and linked to the same GitHub repository and source branch. The initial deploy completed successfully and Render reports its state as **live**.

- URL: `https://sunfix-ai-preview.onrender.com`
- Branch: `hackathon/buildhybridai-2026-11-26`
- Commit: `b56ebd26de8f76b020f7fb4a7c7ff83d518ed6cc`
- Build: `bun install --frozen-lockfile && bun run build`
- Publish directory: `dist`
- Auto-deploy: enabled for commits on the configured branch

The Render Static Site also has no Firebase environment variables. It is a static UI/demo deployment until the same Firebase Web App configuration and approved hostnames are configured. Render workspace inspection found no existing PostgreSQL or Key Value instance for this project; none was created. SunFix is a client-side Vite app whose cloud data provider is Firebase, and this repository does not define a separate Express/API server. A Render web service or database would therefore be unnecessary without a separately designed backend.

## Netlify

No Netlify site was created or modified, as requested. The existing 34-site account inventory did not show a clearly named SunFix site.

## Production release gates

Do not promote either preview to production until all of the following are complete:

1. Resolve the open dependency audit findings recorded in `SECURITY_REVIEW.md` (currently 1 High, 2 Moderate, 1 Low, 0 Critical in the committed Bun audit).
2. Configure and verify the actual Firebase Web App values in the hosting provider's environment settings.
3. Configure the intended Auth authorized domains and production App Check/reCAPTCHA Enterprise attestation.
4. Deploy the reviewed Firestore rules to the existing named database only after a backup and restore plan is approved.
5. Verify live user sign-in, owner-isolated Firestore CRUD, cloud/offline reconciliation, App Check and Firebase AI Logic from an approved deployed hostname.
6. Establish backup/export and recovery procedures; IndexedDB is not a backup and FieldProof image/audio/PDF files remain local-only.

The GitHub branch and PR remain under review. This Preview deployment does not merge PR #4, change `main`, deploy Firestore rules, enable billing, or constitute a production release.
