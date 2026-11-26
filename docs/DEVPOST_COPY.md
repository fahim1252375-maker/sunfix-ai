# SunFix AI — Devpost Submission Copy

## Project name

SunFix AI — Evidence-First Solar Field Operations

## Tagline

Diagnose solar equipment with accountable evidence, safety gates, and honest hybrid inference.

## Short description

SunFix AI is a solar field-service workflow prototype that connects a digital twin and technician-entered evidence to safety-screened diagnostics, repair work orders, and FieldProof records. Firebase AI Logic supports on-device-first and cloud-only inference where configured; the interface labels the SDK-reported source and clearly separates deterministic demo rules.

## Project story

Solar technicians work across fragmented alarm codes, field observations, photos, and service records. SunFix AI brings those inputs into one reviewable path: select an asset and component, record observed symptoms and readings, screen for immediate hazards, review a diagnostic assessment, and turn accepted findings into a checklist-based work order.

Safety holds are deterministic. A reported smoke, arcing, exposed conductor, or other hazard blocks ordinary repair progression and creates an escalation path. The application does not ask a generative model to clear a hold.

Firebase AI Logic provides the hybrid inference integration. The app requests on-device-first inference when using `PREFER_ON_DEVICE`, supports cloud-only requests, validates structured assessments and source citations, and records the inference source reported by the Firebase SDK. If configuration, connectivity, validation, or a model request fails, it displays a deterministic fallback as `DEMO RULES`; it does not relabel fallback output as AI.

## What to try

1. Open the Command Center and inspect the sample site. Sample assets and telemetry are labeled demo/simulated.
2. Open AI Diagnostics and select **Visible smoke** at the Safety Gate. Confirm the Stop-Work Hold appears before model inference.
3. Use the offline or unconfigured path to see the deterministic `DEMO RULES` label and create a safety-reviewed work order from a cleared sample case.
4. Review FieldProof and the service report to see evidence origins and audit details.
5. With a configured Firebase project, follow the preflight in [DEMO_SCRIPT.md](./DEMO_SCRIPT.md). Only demonstrate `LOCAL` or `CLOUD` after the inference record confirms the Firebase SDK source.

## Technology

React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, Firebase App Check, Firebase AI Logic, IndexedDB, Playwright, and the Firebase Emulator Suite.

## Setup and test access

See [README.md](../README.md), [FIREBASE_SETUP.md](./FIREBASE_SETUP.md), and [TESTING.md](./TESTING.md). The checked-in `.env.example` contains placeholders only. Never add a Gemini API secret or Firebase Admin credential to a browser `VITE_*` variable.

Latest automated verification: [GitHub Actions run 45807310075](https://github.com/fahim1252375-maker/sunfix-ai/actions/runs/45807310075). It passed 39 unit/static tests, 6 Firestore Emulator authorization tests, 13 desktop/mobile Playwright tests, and the production build. The live Firebase App Check and AI checks were skipped because this repository environment does not have the required project credentials and configuration.

## Limitations and truthful claims

- This prototype has no production deployment and no verified live Firebase project in the current environment.
- Genuine local and cloud model responses have not yet been observed here. Do not claim that either route was demonstrated until the SDK source is recorded in a live run.
- The supplied site, telemetry, and fault scenarios are simulated demo data, not operational site measurements.
- SunFix AI is not electrical safety advice and does not replace qualified inspection or site procedures.
