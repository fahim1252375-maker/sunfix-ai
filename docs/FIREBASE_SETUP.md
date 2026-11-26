# SunFix Field — Firebase setup

Firebase is optional for the local demo experience. Authentication and cloud sync require a real Firebase project.

## 1. Create a Firebase Web App

1. Open Firebase Console and select your project.
2. Go to Project settings -> General -> Your apps and register a Web App if one does not exist.
3. Copy the Web App configuration values into .env.local using the variable names in .env.example.
4. Set VITE_FIRESTORE_DATABASE_ID to your Firestore database ID. Use (default) for the default database.

Browser Firebase configuration is public client configuration. Do not place service-account JSON, Admin SDK private keys, or other server secrets in the Vite app.

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
3. For local development only, set VITE_FIREBASE_APPCHECK_DEBUG_TOKEN and register the debug token in Firebase Console.
4. Enable enforcement only after verifying valid tokens for production clients.

## 5. AI configuration

The browser must not receive a private Gemini API key. Do not use a VITE_GEMINI_API_KEY variable. Prefer Firebase AI Logic with the appropriate Firebase project configuration, or call a server-side endpoint that stores provider credentials in a secret manager.

The deterministic demo fallback is not a live AI service and must be labelled accordingly.

## 6. Before production

- Test sign-in, sign-out, owner isolation, and revoked-user access.
- Run Firestore rules tests against the Firebase Emulator Suite.
- Verify App Check in production and local debug mode separately.
- Configure backups, retention, monitoring, billing alerts, and incident response.
- Never use simulated telemetry or AI output to make safety-critical electrical decisions.
