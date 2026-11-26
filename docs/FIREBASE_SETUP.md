# SunFix Field — Firebase setup

Firebase is optional for the local demo experience. Authentication and cloud sync require a real Firebase project.

## 1. Create a Firebase Web App

1. Open Firebase Console and select your project.
2. Go to Project settings -> General -> Your apps and register a Web App if one does not exist.
3. Copy the Web App configuration values into .env.local using the variable names in .env.example.
4. Set VITE_FIRESTORE_DATABASE_ID to your Firestore database ID. Use (default) for the default database.

Browser Firebase configuration is public client configuration. Do not place service-account JSON, Admin SDK private keys, or other server secrets in the Vite app.

The application reads these exact variables (all names are present in `.env.example`):

| Variable | Requirement |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Required Web App config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required for Google sign-in |
| `VITE_FIREBASE_PROJECT_ID` | Required |
| `VITE_FIREBASE_APP_ID` | Required |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web App config value |
| `VITE_FIREBASE_STORAGE_BUCKET` | Web App config value |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional; only if Analytics is configured |
| `VITE_FIRESTORE_DATABASE_ID` | Database ID; `(default)` when using the default database |
| `VITE_FIREBASE_AI_MODEL` | Optional override; defaults to `gemini-3.5-flash-lite` |
| `VITE_RECAPTCHA_SITE_KEY` | Required when App Check uses reCAPTCHA Enterprise |
| `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | Local development only; register the generated token in App Check |
| `VITE_USE_FIREBASE_EMULATORS` | Local development only; leave `false` in production |
| `VITE_FIREBASE_AUTH_EMULATOR_URL` | Emulator-only; defaults to `http://127.0.0.1:9099` |
| `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST` | Emulator-only; defaults to `127.0.0.1` |
| `VITE_FIREBASE_FIRESTORE_EMULATOR_PORT` | Emulator-only; defaults to `8080` |

`GEMINI_API_KEY` is deliberately blank and unused by the browser app. Never add a Gemini secret to a `VITE_*` variable.

## 2. Enable Authentication

1. In Firebase Console, open Authentication -> Sign-in method.
2. Enable Google sign-in.
3. Add localhost and your production hostname to the authorized domains.
4. Verify OAuth redirect flows on desktop and mobile.

## 3. Configure Cloud Firestore

1. Create the Firestore database in the selected project and region.
2. Review firestore.rules.
3. Deploy rules only after validating them against the Firebase Emulator Suite.
4. Ensure the configured database ID matches VITE_FIRESTORE_DATABASE_ID.

The app uses owner-scoped documents. A client-side role or hidden UI control is not an authorization boundary; Firestore rules must enforce every read and write.

## 4. Configure App Check

1. Register the Web App in Firebase App Check using reCAPTCHA Enterprise.
2. Add the site key to VITE_RECAPTCHA_SITE_KEY.
3. For local development only, set VITE_FIREBASE_APPCHECK_DEBUG_TOKEN in .env.local and register the debug token in Firebase Console. The application ignores this variable in production builds.
4. Keep debug tokens out of source control and rotate any token that has been committed or shared. Enable enforcement only after verifying valid tokens for production clients.

## 5. AI configuration

1. In Firebase Console, select **AI Services -> AI Logic -> Get started** for the same Firebase project as the Web App.
2. Choose and enable the Gemini provider. The Gemini Developer API is the simplest setup; Vertex AI may require a billing account and additional project configuration.
3. Confirm the desired model is enabled for that provider. The app defaults to `gemini-3.5-flash-lite`; override it with `VITE_FIREBASE_AI_MODEL` only with a model supported by the selected provider.
4. Complete the setup workflow's Firebase AI Logic API and App Check steps. The app sends requests through `firebase/ai` and does not use a browser-held Gemini key.

The browser must not receive a private Gemini API key. Do not use a `VITE_GEMINI_API_KEY` variable. For a different provider or private credentials, use a server-side endpoint that stores secrets in a secret manager.

## 6. Local on-device model requirements

Firebase AI Logic's web on-device adapter currently requires desktop Chrome 139 or later and the built-in Prompt API. In Chrome, open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, enable it, restart Chrome, and use **Prepare On-device AI** to download/initialize the model after a user click. Availability depends on Chrome's supported device requirements and model download; the app must report `CLOUD`, `LOCAL`, or `DEMO RULES` from the actual response/fallback path.

Do not claim a local inference demo until a successful response records `on_device` from Firebase AI Logic. Desktop Chrome without the required API/model can still use configured cloud inference, or deterministic rules when Firebase AI Logic is unavailable.

The deterministic demo fallback is not a live AI service and must be labelled accordingly.

## 7. Local Emulator Suite

1. Install dependencies with `bun install`.
2. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` only for local development.
3. Start Auth and Firestore emulators with `bunx firebase-tools emulators:start --only auth,firestore --project demo-sunfix-field`.
4. In a second terminal, run `bun run dev`.
5. For actual rules tests, run `bun run test:rules`.
6. For authenticated SDK sync and browser checks, run `bunx firebase-tools emulators:exec --only auth,firestore --project demo-sunfix-field "bun run test:e2e"`.

The app only connects to emulators when both Vite development mode and `VITE_USE_FIREBASE_EMULATORS=true` are active. Production builds ignore this switch.

## 8. Before production

- Test sign-in, sign-out, owner isolation, and revoked-user access with the real project.
- Run Firestore rules tests against the Firebase Emulator Suite.
- Verify App Check in production and local debug mode separately.
- Configure backups, retention, monitoring, billing alerts, and incident response.
- Never use simulated telemetry or AI output to make safety-critical electrical decisions.

For the complete automated test matrix and opt-in live Firebase AI Logic smoke test, see [docs/TESTING.md](./TESTING.md).
