# SunFix Field — Firebase Setup Guide

## 1. Provisioned Project Details
- **Project ID**: `avid-grin-p01dl` (configured in `firebase-applet-config.json`)
- **Firestore Database ID**: `ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33`
- **Firestore Security Rules**: Deployed from `firestore.rules` (validated against `firebase-blueprint.json` with `@firebase/eslint-plugin-security-rules`).

## 2. Enabling Firebase AI Logic (Gemini Developer API)
1. Open **Firebase Console** -> select project `avid-grin-p01dl`.
2. Navigate to **AI Logic** (Build -> AI Logic) and enable the **Gemini Developer API** backend.
3. For **On-Device Web Inference** (`InferenceMode.PREFER_ON_DEVICE`):
   - Use Chrome Desktop v139+ with Prompt API (`LanguageModel`) enabled.
   - Click **Prepare On-device AI** inside Diagnostic Wizard Step 8 or Settings to trigger `model.initializeDeviceModel(...)`.

## 3. Enabling Firebase App Check (reCAPTCHA Enterprise)
1. In Google Cloud / Firebase Console -> **App Check**, register your Web app with **reCAPTCHA Enterprise**.
2. Add your reCAPTCHA Enterprise site key to `VITE_RECAPTCHA_SITE_KEY` (or `recaptchaSiteKey` in `firebase-applet-config.json`).
3. For local development only, generate a debug token in Firebase Console -> App Check -> Apps -> Manage debug tokens, and set `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` in `.env.local` (never commit `.env.local`).
4. Enforce App Check for Cloud Firestore and Firebase AI Logic once verified.
