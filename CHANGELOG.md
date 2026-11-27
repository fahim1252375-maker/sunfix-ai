# Changelog

## 2026-11-27 — Demo startup recovery

### Fixed
- Prevented Firebase Auth initialization from crashing an unconfigured Demo Mode deployment by keeping real Firebase readiness separate from inert SDK initialization placeholders.
- Skip the Firebase Auth state listener when real Firebase Web App configuration is absent, allowing the local demo workspace to render and hydrate.

### Verified
- GitHub Actions Quality checks passed on commit ce8212cc4445377ac4c3218b6c829748d009db56 (run 46025033327: https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/46025033327).
- Vercel and Render demo deployments rendered the workspace and opened the Demo Workspace without browser JavaScript errors.

### Remaining release gates
- Firebase sign-in, live Firestore persistence, production App Check, and Firebase AI Logic still require the real project configuration and live integration tests.
- The dependency audit remains open; see docs/SECURITY_REVIEW.md. No out-of-range dependency override was applied.


## V2.0 — Mesa Ridge 48 kWp Digital Twin, Editorial Redesign & Honest Hybrid AI Showcase

### Added
- **Mesa Ridge 48 kWp 3D Rooftop Digital Twin** (`src/components/SolarDigitalTwin3D.tsx`): Upgraded to a `34×22 m` (`1 unit = 1 m`) commercial flat roof with 120 instanced 400 Wp PV modules (`THREE.InstancedMesh`), 2 string combiners, `TubeGeometry` DC/AC/Load conduits, 4-layer smoothly damped exploded 40 kW hybrid inverter with dynamic `CanvasTexture` LCD telemetry, VoltVault LFP-60 container, AC disconnect + off-roof utility pole & transformer, HVAC load, layer toggles, camera presets (`Overview`, `PV Strings`, `Inverter`, `Battery`, `Grid Tie`), 06:00–18:00 simulated irradiance slider, downstream fault pulse halting, and clickable manual 3D-to-2D projected DOM callout labels inside `useFrame` (avoiding `drei Html` nested React 19 root unmount races).
- **2D Isometric SVG Fallback** (`src/components/SolarTwinSvg2D.tsx`): Interactive vector schematic used both as `<Suspense>` loading state and WebGL/2D View toggle.
- **6 Dedicated Lifecycle Stage Pages** (`/lifecycle/:slug` via `src/views/LifecycleStageView.tsx` & `src/components/LifecycleStageVisuals.tsx`): Animated, clickable lifecycle stages (`digital-twin`, `safety-gate`, `hybrid-diagnosis`, `safety-gated-repair`, `fieldproof`, `service-report`) with reduced-motion support, interactive Before/After FieldProof wipe slider, inputs/outputs, safety guardrails, linked Knowledge IDs, and `"Try it in the app"` CTAs.
- **Interactive 10-Panel Honest Hybrid Inference Architecture** (`src/components/HybridAISection.tsx`): Live browser & Prompt API (`LanguageModel`) probe, active request routing diagram, capability matrix, user-activated model lifecycle timeline, interactive Zod schema validator with `"Run Malformed Demo Sample"`, Two-Source (`PREFER_ON_DEVICE` vs `ONLY_IN_CLOUD`) comparison runner persisted in IndexedDB, privacy/App Check panels, and recent `inferenceHistory` audit table.
- **Design System Tokens** (`src/theme/tokens.ts`, `src/index.css`): Organic dark palette (`--ink`, `--moss`, `--moss-raised`, `--moss-deep`, `--bone`, `--sage`, `--brass`, `--mint`, `--terracotta`, `--sky`, `--amber-warn`) paired with Fraunces display typography, Inter UI copy, and IBM Plex Mono tabular numerals.

### Changed
- Redesigned landing view (`src/views/WelcomeView.tsx`) and all workspace shell/views to hairline borders, tokenized styles, and explicit `[DEMO]` / `SIMULATED` badges.
- Expanded pure logic tests (`src/utils/diagnosticsLogic.test.ts`) to cover irradiance curve simulation, twin telemetry fault scenarios, and Zod schema rejection diagnostics.
