# SunFix Field

**Offline-ready solar diagnostics and field-service workspace**

SunFix Field is a React + TypeScript progressive web app prototype for solar asset operations. Cloud identity and data persistence are provided by Firebase; the repository does not contain a separate Express/API server. It combines an evidence-first diagnostic workflow, repair and service-report flows, an interactive 3D solar digital twin with a 2D fallback, a hybrid AI interface with deterministic demo fallbacks, and local offline persistence.

> **Important:** Demo assets, telemetry, fault scenarios, AI explanations, and generated evidence are simulated unless explicitly connected to verified live systems. Do not use demo output as electrical safety advice or as a substitute for a qualified technician's inspection.

## Features

- Solar asset dashboard, lifecycle views, diagnostic wizard, repair work orders, evidence capture, knowledge library, and service reports.
- Interactive Three.js / React Three Fiber digital twin with a 2D SVG fallback.
- Hybrid AI service abstraction with schema validation and deterministic fallback behaviour.
- Firebase Authentication and Cloud Firestore integration.
- Firebase App Check integration when configured.
- IndexedDB offline workspace and sync queue, scoped separately for anonymous and authenticated users.
- PWA support and responsive layouts.

## Technology

React 19 · TypeScript · Vite · Tailwind CSS · Three.js · React Three Fiber · Firebase · IndexedDB · Zod.

## Requirements

- Node.js 22 or newer
- npm 10+ (or Bun compatible with the committed lockfile)

## Local development

1. Clone the repository and install dependencies:

   bun install

2. Create your local environment file:

   cp .env.example .env.local

3. Fill in the Firebase Web App values in .env.local. Firebase is optional for the local demo experience, but sign-in and cloud sync require a valid Firebase project, enabled Google provider, and deployed Firestore rules.

4. Start the app:

   bun run dev

## Quality checks

Run the same checks used by CI:

- bun run lint
- bun run lint:eslint
- bun test
- bun run build

Or run bun run check.

## Firebase configuration and security

See docs/FIREBASE_SETUP.md and firestore.rules.

- Never commit .env.local, Firebase Admin credentials, service-account keys, or real API secrets.
- Browser Firebase Web App config is not an Admin credential, but configure Authentication, Firestore rules, and App Check correctly.
- Never put a Gemini secret in a VITE_* variable. Vite exposes VITE_* values to browser bundles.
- Client-side Firebase rules are the actual data authorization boundary; UI role checks are not security controls.
- Validate rules in a Firebase emulator before production deployment.

## Documentation

- CHANGELOG.md
- docs/PRODUCT_SPEC.md
- docs/ARCHITECTURE.md
- docs/FIREBASE_SETUP.md
- docs/DEMO_SCRIPT.md
- docs/TEST_PLAN.md

## Production readiness

This repository is a development/demo baseline, not a certified solar operations product. Before production use:

1. Configure Firebase credentials and verify Google sign-in.
2. Run Firestore rules tests against the Firebase Emulator Suite (static checks alone are insufficient).
3. Validate all AI provider paths and rate limits; use server-side secrets for provider APIs.
4. Perform accessibility, browser, mobile, and offline/online transition testing.
5. Review simulated data labels, technician safety procedures, data retention, and privacy requirements.

## License

Apache-2.0. See LICENSE.
