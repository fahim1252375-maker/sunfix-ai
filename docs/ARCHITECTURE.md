# SunFix Field — Architecture (V2)

## 1. Module Boundaries
- `src/theme/tokens.ts` & `src/index.css`: Single source of truth for the V2 organic color tokens (`--ink`, `--moss`, `--moss-raised`, `--moss-deep`, `--bone`, `--sage`, `--brass`, `--mint`, `--terracotta`, `--sky`, `--amber-warn`) and Fraunces / Inter / IBM Plex Mono typography rules.
- `src/services/firebase.ts`: Initializes Firebase App, **Firebase App Check (`ReCaptchaEnterpriseProvider`) before Firestore/AI**, Cloud Firestore (`getFirestore(app, firestoreDatabaseId)`), and Google Auth.
- `src/services/hybridAI.ts`: Configures Firebase AI Logic (`getAI(app, { backend: new GoogleAIBackend() })`) with:
  - `InferenceMode.PREFER_ON_DEVICE` (`gemini-3.5-flash-lite` cloud fallback by default + browser Prompt API on-device path via `model.initializeDeviceModel`)
  - `InferenceMode.ONLY_IN_CLOUD` (deep cross-component correlation & PDF manual extraction)
  - Honest reporting of `result.response.inferenceSource` (`on_device` -> `LOCAL`, `in_cloud` -> `CLOUD`, missing hybrid source -> `UNAVAILABLE`, deterministic non-generative fallback -> `DEMO RULES`), plus browser runtime capability probing and Two-Source comparison support.
- `src/utils/diagnosticsLogic.ts`: Pure, unit-tested domain logic — `DiagnosticAssessmentSchema` (Zod), `runMalformedSchemaDemo`, `evaluateSafetyGate`, `computeCasePriority`, `calculateEnergyImpact`, `simulateIrradianceFactor`, `computeSimulatedTwinTelemetry`, and `runDeterministicFallbackAssessment`.
- `src/services/offlineStore.ts` & `src/services/firestoreSync.ts`: Local-first IndexedDB persistence (`sunfix-field-db`) with `inferenceHistory` & `comparisons` stores, queued mutations, retry/conflict resolution, and owner-scoped Firestore synchronization.
- `src/components/SolarDigitalTwin3D.tsx` & `src/components/SolarTwinSvg2D.tsx`: Procedural React Three Fiber / Three.js `34×22 m` Mesa Ridge 48 kWp rooftop scene using `THREE.InstancedMesh` (120 PV modules + flow pulses), 4-layer exploded inverter, `CanvasTexture` LCD & roof finishes, software-WebGL detection/demand pacing, manual 3D-to-2D projected DOM callout refs (`useFrame`, zero `drei Html` nested roots), and interactive 2D isometric SVG fallback.
- `src/views/WelcomeView.tsx`, `src/views/LifecycleStageView.tsx`, `src/components/HybridAISection.tsx`: Editorial landing architecture, 6 animated/clickable `/lifecycle/:slug` stage pages, and interactive 10-panel Honest Hybrid Inference Architecture showcase.

## 2. Security & Capability Architecture
- Deny-by-default `firestore.rules` validating `request.auth.token.email_verified == true`, owner-scoped CRUD (`ownerId == request.auth.uid`), immutable `createdAt`, and server-enforced schema bounds.
- App Check initialized prior to Firestore & AI calls. No hardcoded debug tokens or private API secrets in client source.
- `metadata.json` leaves `majorCapabilities` free of server-side Gemini declarations; all generative AI calls run client-side via the Firebase AI Logic JS Modular SDK (`firebase/ai`) protected by Firebase App Check.
