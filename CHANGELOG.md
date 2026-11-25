# Changelog

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
