# SunFix Field

**Offline-Ready Hybrid AI Solar Diagnostics & Field Operations Platform**

SunFix Field connects a **Mesa Ridge 48 kWp 3D Solar Digital Twin** (with 2D isometric SVG fallback), **6 interactive Field Service Lifecycle stage pages** (`/lifecycle/:slug`), an **8-step Evidence-First AI Diagnostic Wizard**, a **Mandatory Electrical Safety Gate**, **Safety-Gated Repair Workflows**, **FieldProof Evidence Capture**, an **Energy Impact Calculator**, and **Verifiable PDF Service Reports** — backed by **Firebase AI Logic (`PREFER_ON_DEVICE` + `ONLY_IN_CLOUD`)**, **Firebase App Check**, **Cloud Firestore**, and **IndexedDB / PWA offline persistence**.

## Core Architecture & Stack
- **Frontend & Design System**: React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons, Recharts, Fraunces + Inter + IBM Plex Mono (`src/theme/tokens.ts` + CSS variables in `src/index.css`)
- **3D Digital Twin**: Three.js + `@react-three/fiber` + `@react-three/drei` (`1 unit = 1 m` commercial `34×22 m` rooftop, 120 instanced 400 Wp PV modules, 2 string combiners, 4-layer exploded-view 40 kW inverter with reactive LCD, VoltVault LFP-60 battery container, AC disconnect & background utility pole/transformer, 06:00–18:00 irradiance slider, layer toggles, camera presets, and interactive 2D SVG fallback)
- **Hybrid AI**: `firebase/ai` (`GoogleAIBackend`, `InferenceMode.PREFER_ON_DEVICE`, `InferenceMode.ONLY_IN_CLOUD`) + live browser capability probe + interactive 10-panel Honest Hybrid Inference Architecture section + Zod schema validation (`DiagnosticAssessmentSchema`) + deterministic offline rule fallback
- **Security & Persistence**: Firebase Auth (Google), Cloud Firestore (owner-scoped rules), Firebase App Check (`ReCaptchaEnterpriseProvider`), IndexedDB (`sunfix-field-db`) sync queue, `vite-plugin-pwa`
- **Reports**: Printable 17-section FieldProof template + client-side PDF export (`jsPDF`)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env.local` if supplying App Check keys):
   - `VITE_RECAPTCHA_SITE_KEY`: reCAPTCHA Enterprise site key from Firebase Console -> App Check
   - `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`: Optional local development debug token (never commit)
3. Start development server:
   ```bash
   npm run dev
   ```
4. Run tests and build checks:
   ```bash
   npx tsx --test src/utils/diagnosticsLogic.test.ts firestore.rules.test.ts
   npx eslint firestore.rules
   npx tsc --noEmit
   npm run build
   ```

## Demonstration Data Notice
All pre-populated assets (such as `Mesa Ridge Commercial Rooftop 48 kW [DEMO]`), irradiance/telemetry curves, fault scenarios (`G04-UV`, `BMS-12`, `STR-LOW`, `COM-09`), and pre-cached Knowledge Library entries are **explicitly labelled as `[DEMO]` or `SIMULATED`** until replaced by your own technician records.

## Documentation
- [`CHANGELOG.md`](CHANGELOG.md)
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md)

## License
Licensed under the Apache License, Version 2.0. See [`LICENSE`](LICENSE).
