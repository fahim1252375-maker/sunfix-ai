# Vercel deployment preparation

## Prepared configuration

`vercel.json` selects Vite, runs `bun install --frozen-lockfile` and `bun run build`, publishes `dist`, and rewrites SPA deep links to `/index.html`. This matches the repository's Vite build output and current route handling. There are no Vercel Function routes yet. The official [Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite) documents the SPA fallback rewrite used here.

Do not use a root-directory override if importing the repository root. Keep `Bun 1.4.5` from `package.json` and Node.js 24.x as the runtime baseline. Verify current Vercel plan/runtime capabilities in the account before connecting a project; this repository configuration does not activate a service or incur usage.

## Environment variables

Public browser Firebase configuration is embedded at Vite build time and must be set separately for Production, Preview, and Development in Vercel:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIRESTORE_DATABASE_ID`
- `VITE_FIREBASE_AI_MODEL` (optional)
- `VITE_RECAPTCHA_SITE_KEY` (required for production App Check)

These Firebase Web SDK values are public client configuration, not service-account credentials. Do not add Admin credentials, private AI keys, or App Check debug tokens as `VITE_*`. No server-only variables are currently required. Production and Preview hostnames need appropriate Firebase Authentication authorized-domain entries and App Check provider restrictions. Never authorize an untrusted preview wildcard.

## Pre-deployment checks

1. Resolve the project-owner blockers for production App Check and Firebase AI Logic, and verify permitted no-cost usage.
2. Add exact production and approved preview hostnames to Firebase Auth and App Check configuration.
3. Confirm all required environment variables are present in each Vercel environment without printing their values.
4. Run the build and inspect `dist`; test a deep link such as `/verify-report` in a Vercel preview after deployment authorization.
5. Verify Google sign-in, sign-out, account switching, Firestore owner isolation, and App Check from the actual allowed hostname.
6. Review generated JavaScript for accidental private credentials. The Firebase client config is expected to be public.
7. Confirm preview environment secrets and hostname restrictions before enabling previews for untrusted contributors.

No Vercel project was linked and no Preview or Production deployment was created in this task.
