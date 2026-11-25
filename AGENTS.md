# SunFix Field — Agent & Engineering Guardrails

This document defines non-negotiable engineering, safety, Firebase AI Logic, and truth-in-UI rules for contributors and automated agents working in this repository.

## 1. Hybrid AI & Runtime Honesty
- Use the **Firebase JS Modular SDK** (`firebase/app`, `firebase/ai`, `firebase/app-check`, `firebase/auth`, `firebase/firestore`).
- Use `getAI(firebaseApp, { backend: new GoogleAIBackend() })` with `InferenceMode.PREFER_ON_DEVICE` for primary diagnosis and `InferenceMode.ONLY_IN_CLOUD` for cloud deep correlation and PDF manual analysis.
- Never fake `on_device` status. Read `result.response.inferenceSource` directly (`InferenceSource.ON_DEVICE` -> `LOCAL`, `InferenceSource.IN_CLOUD` -> `CLOUD`). If offline/unconfigured fallback runs, label it honestly as `DEMO RULES` (deterministic non-generative fallback).
- On-device web inference requires explicit user activation via `Prepare On-device AI` calling `model.initializeDeviceModel(progress => ...)`.

## 2. Electrical & Field Safety Gate
- Never instruct users to open energized electrical covers, touch live DC/AC conductors, bypass rapid-shutdown circuits, or perform hazardous live voltage testing.
- Any hazard flag selected in `SAFETY_HAZARD_CHECKS` (`evaluateSafetyGate`) MUST trigger an immediate Stop-Work Hold (`stopWork: true`), block normal repair completion (`safetyCleared: false`), and route to supervisor escalation.

## 3. Security & App Check
- Initialize Firebase App Check (`initializeAppCheck` with `ReCaptchaEnterpriseProvider`) **before** Firestore or AI Logic calls.
- Never commit secrets, API keys, or hardcoded `FIREBASE_APPCHECK_DEBUG_TOKEN` values. Read debug tokens only from environment variables (`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`).
- Maintain strict owner-scoped `firestore.rules` with deny-by-default fallback, email-verification checks, immutable `createdAt`, and server-enforced field lengths.

## 4. Verification Before Completion
- Run unit tests: `npx tsx --test src/utils/diagnosticsLogic.test.ts firestore.rules.test.ts`
- Run ESLint security rules check: `npx eslint firestore.rules`
- Run TypeScript check (`npx tsc --noEmit`) and production build (`npm run build`).
