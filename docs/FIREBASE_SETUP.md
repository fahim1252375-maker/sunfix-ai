# SunFix AI — Firebase setup

Firebase is optional for the local deterministic demo. Real authentication, cloud sync, and live Firebase AI Logic require a configured Firebase project.

## 1. Register the SunFix AI Web App

1. Open the [Firebase console](https://console.firebase.google.com/) and select the project you intend to use for SunFix AI. If you do not have one, create a project first.
2. From Project Overview, choose the **Web** app icon, or open Project settings -> General -> Your apps -> Add app -> Web.
3. For **App nickname**, use `SunFix AI Web`.
4. Firebase Hosting is optional. Leave its setup unchecked for now; hosting can be configured after live integration tests.
5. Click **Register app**.
6. On the **Add Firebase SDK** screen, choose the **npm** option. This repository already declares the `firebase` package in `package.json`; do not create a second project or replace the existing package manager/lockfile just to follow the generic install snippet.
7. Copy the Firebase Web App configuration object shown by the console. Map its values to the environment variables below; do not paste the object into a public source file.

The application reads these exact variables (all are present in `.env.example`):

| Firebase config property | Environment variable | Requirement |
| --- | --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` | Required Web App config |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | Required for Google sign-in |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | Required |
| `appId` | `VITE_FIREBASE_APP_ID` | Required |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web App config value |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | Web App config value |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` | Optional; only if Analytics is configured |

Also set:

| Variable | Requirement |
| --- | --- |
| `VITE_FIRESTORE_DATABASE_ID` | Exact Cloud Firestore database ID. Use `(default)` only for the default database or the isolated local emulator. |
| `VITE_FIREBASE_AI_MODEL` | Optional model override; the current app default is `gemini-3.5-flash-lite` |
| `VITE_RECAPTCHA_SITE_KEY` | The reCAPTCHA Enterprise site key registered for the app's App Check provider |
| `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | Development-only App Check debug token; never use in production |
| `VITE_USE_FIREBASE_EMULATORS` | Local development only; set `false` for live Firebase tests |
| `VITE_FIREBASE_AUTH_EMULATOR_URL` | Emulator-only; defaults to `http://127.0.0.1:9099` |
| `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST` | Emulator-only; defaults to `127.0.0.1` |
| `VITE_FIREBASE_FIRESTORE_EMULATOR_PORT` | Emulator-only; defaults to `8080` |

For the Firebase project `avid-grin-p01dl`, the Firebase Console currently shows the existing Firestore database ID `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`. Use that exact value for live Firebase configuration; do not create a second database. Keep `(default)` for the isolated local emulator unless you have intentionally configured a named emulator database. Create `.env.local` in the repository root on your own machine and fill the values there. Do not commit it. Firebase Web App configuration is client configuration, not an Admin credential; nevertheless, keep local environment files out of Git. Never put a Firebase service-account JSON, Admin SDK private key, or private Gemini API key in the browser app.

`GEMINI_API_KEY` is deliberately blank and unused by the browser app. Never add a Gemini secret to a `VITE_*` variable.

## 2. Enable Google Authentication

1. In Firebase Console, open **Authentication** (the console may group this under **Security**).
2. Open **Sign-in method** or **Sign-in providers**.
3. Enable **Google** and save.
4. Under Authentication settings, add `localhost` and the actual deployed hostname to **Authorized domains** for browser sign-in.
5. Verify sign-in and sign-out after the app has a valid Web App configuration.

The Authentication authorized-domain list is separate from the domain allowlist on a reCAPTCHA Enterprise key.

## 3. Create Cloud Firestore safely

1. In Firebase Console, open **Databases & Storage -> Firestore** and click **Create database**.
2. Use **Standard edition** and choose the database location carefully for your expected users and data-residency needs.
3. Use the default database unless you have deliberately configured another database ID.
4. Choose **Production mode**. Do not leave a client database in Test mode, which can permit broad unauthenticated access.
5. The initial Production-mode rules deny client reads and writes. After checking the project ID and reviewing this repository's `firestore.rules`, deploy the repository rules from the project root:

```sh
bunx firebase-tools login
bunx firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

Replace `YOUR_FIREBASE_PROJECT_ID` with the exact `projectId` from the Firebase Web App configuration. The repository's `firebase.json` points the deploy command to `firestore.rules`. Do not deploy to a project until you have confirmed its project ID.

The app uses owner-scoped documents, verified-user authorization, validation, and deny-by-default rules. A client-side role or hidden UI control is not an authorization boundary; Firestore rules must enforce every read and write. The rules have passed the repository's Firestore Emulator tests, but you must still verify the intended live project after deployment.

## 4. Configure App Check (required for live Firebase AI Logic)

**Important current requirement:** Firebase automatically enforced App Check for Firebase AI Logic in all projects on **November 2, 2026**. Live AI requests must include a valid App Check token. Do not plan to leave App Check disabled for Firebase AI Logic.

For production web traffic:

1. In the Google Cloud Console, open **Security -> reCAPTCHA** (Fraud Defense) for the same Google Cloud project.
2. If prompted, enable the reCAPTCHA Enterprise API.
3. Create a **score-based Web key** for the real production hostname(s). Leave **Use checkbox challenge** unselected.
4. In Firebase Console, open **Security -> App Check -> Apps**, register the SunFix AI Web app with the **reCAPTCHA Enterprise** provider, and provide that site key.
5. Set that key as `VITE_RECAPTCHA_SITE_KEY` in the production environment.

**Do not add `localhost` to a reCAPTCHA key that is used in production.** Firebase's App Check guidance says localhost requests are not valid production attestations. For local development or CI, use the Firebase App Check debug-provider workflow and register the development/CI debug token in Firebase Console. Keep debug tokens separate from production configuration, out of source control, and out of public logs. Never use a debug token as evidence of production App Check attestation.

The current app reads `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` only in Vite development builds. If the CI live-smoke test is run against a localhost Vite server, first verify that the workflow provides an appropriate registered debug token or uses another valid non-production test setup. Do not reuse the production reCAPTCHA key for localhost.

For details, see [Firebase App Check with reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) and [App Check for Firebase AI Logic](https://firebase.google.com/docs/ai-logic/app-check).

## 5. Enable Firebase AI Logic

1. In Firebase Console, select the same project used by the Web App.
2. Open **AI Services -> AI Logic** and click **Get started**.
3. Follow the guided workflow to enable the required APIs and resources.
4. Choose the **Gemini Developer API** provider to get started quickly; Vertex AI may require billing and additional configuration.
5. Confirm that the selected model is supported by the chosen provider. SunFix AI currently defaults to `gemini-3.5-flash-lite`; override it with `VITE_FIREBASE_AI_MODEL` only when you have verified that the chosen model is available to the configured provider.
6. Complete the App Check setup. A valid App Check token is required for Firebase AI Logic requests.

The app sends model requests through the Firebase AI Logic Web SDK (`firebase/ai`). The browser must not receive a private Gemini API key. Do not use a `VITE_GEMINI_API_KEY` variable. For private credentials or custom server-side model calls, use a backend endpoint and a secret manager.

## 6. Verify on-device inference separately

Firebase AI Logic's Web hybrid/on-device path requires a compatible desktop Chrome environment (the current guide specifies Chrome Desktop 139 or later and the built-in Prompt API). Availability also depends on device capability, browser flags/API exposure, and model readiness.

1. Use a compatible desktop Chrome build.
2. Follow the current [Firebase Web hybrid setup guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) to enable and prepare the Prompt API/model.
3. In SunFix AI, click **Prepare On-device AI** after a user gesture.
4. Wait for the app to report the model is ready.
5. Run a safe, non-hazardous sample case.
6. Claim `LOCAL` only when the successful Firebase AI Logic response reports `inferenceSource: on_device`. Claim `CLOUD` only when the response reports `inferenceSource: in_cloud`. A deterministic response must remain labelled `DEMO RULES`.

Do not use a Stop-Work hazard sample to test inference: the deterministic safety gate is designed to stop before making a model request.

## 7. Local Emulator Suite

1. Install dependencies with `bun install`.
2. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` only for local development.
3. Start Auth and Firestore emulators with `bunx firebase-tools emulators:start --only auth,firestore --project demo-sunfix-field`.
4. In a second terminal, run `bun run dev`.
5. For actual rules tests, run `bun run test:rules`.
6. For authenticated SDK sync and browser checks, run `bunx firebase-tools emulators:exec --only auth,firestore --project demo-sunfix-field "bun run test:e2e"`.

The app only connects to emulators when both Vite development mode and `VITE_USE_FIREBASE_EMULATORS=true` are active. Production builds ignore this switch.

## 8. Before production release

- Verify real Google sign-in and sign-out on the deployed hostname.
- Verify the production reCAPTCHA Enterprise App Check attestation with the actual production domain.
- Verify Firebase AI Logic cloud inference in the real project.
- Verify owner isolation and cloud sync with separate real test accounts.
- Confirm the deployed Firestore rules and database ID.
- Configure monitoring, billing alerts, backups, retention, and incident response as appropriate.
- Never use simulated telemetry or AI output to make safety-critical electrical decisions.

For the complete automated test matrix and opt-in live Firebase AI Logic smoke test, see [docs/TESTING.md](./TESTING.md).
