# SunFix Field — Verification & Test Results (V2)

All checks below were executed after final code edits.

## 1. Automated Unit & Security Rule Tests
Command: `npx tsx --test src/utils/diagnosticsLogic.test.ts firestore.rules.test.ts`
- **12 / 12 tests passed** (`0` failures):
  1. `firestore.rules enforces deny-by-default and owner-scoped authorization` — **PASS**
  2. `firestore.rules explicitly validates all blueprint collections` — **PASS**
  3. `firestore.rules forbids unauthenticated writes and role escalation on users collection` — **PASS**
  4. `Safety Gate blocks work when burning smell or smoke is reported` — **PASS**
  5. `Priority ranking forces critical when safety hazard is present` — **PASS**
  6. `Energy Loss Impact Calculator computes power gap and energy difference accurately` — **PASS**
  7. `Zod parser validates structured AI output and strips unverified sourceIds` — **PASS**
  8. `Zod parser rejects incomplete malformed JSON cleanly` — **PASS**
  9. `runMalformedSchemaDemo rejects invalid fields and reports stripped unverified source IDs` — **PASS**
  10. `Deterministic offline fallback enforces safety hold when hazards reported` — **PASS**
  11. `simulateIrradianceFactor clamps 06:00-18:00 and peaks at solar noon` — **PASS**
  12. `computeSimulatedTwinTelemetry reflects nominal, inverterFault, stringFault, and isSimulated flag` — **PASS**

## 2. Security Rules Static Audit & Deployment
- `npx eslint firestore.rules` (`@firebase/eslint-plugin-security-rules`) — **PASS (0 errors)**
- `DeployRules` RPC against project `avid-grin-p01dl` — **DEPLOYED**

## 3. TypeScript & Production Build
- `npx tsc --noEmit` — **PASS (0 errors)**
- `npm run build` (`vite build` + PWA precache generation) — **PASS**

## 4. Headless Chromium Browser Verification (`playwright-cli`)
Verified on `http://localhost:3000` at Desktop (`1440×900`) and Mobile (`390×844`):
- V2 Editorial Landing (`/`), Fraunces typography, organic `--ink`/`--moss`/`--brass` token system, `[DEMO]` proof strip, and live Mesa Ridge 48 kWp 3D rooftop canvas — **PASS**
- Interactive `03 · Honest Hybrid Inference Architecture` panels (`5.1`–`5.10`), live browser capability probe, and **"Run Malformed Demo Sample"** Zod rejection + stripped `fabricated-oem-manual-99x` / `unknown-nec-999` verification — **PASS**
- Dedicated `/lifecycle/:slug` stage routing (`/lifecycle/fieldproof`) with interactive Before/After wipe slider, Inputs/Outputs, Safety Guardrails, and Knowledge IDs — **PASS**
- Workspace (`?autostart=1`), Command Center KPIs & Recharts diurnal curve, Full 3D Digital Twin (`Explode Inverter` zoomed mechanical breakdown + `2D View` isometric SVG fallback) — **PASS**
- 8-Step AI Diagnostic Wizard Step `07 Safety Gate` (`Visible smoke` -> immediate Stop-Work Hold) and Step `08 Run AI` submission -> honest `DEMO RULES` fallback attribution when `firebasevertexai.googleapis.com` returns 403 without Firebase Console AI Logic activation — **PASS**
- Mobile `390×844` layout (`scrollWidth === clientWidth === 390`, clean wrapped 3D HUD controls, zero JS runtime errors) — **PASS**
