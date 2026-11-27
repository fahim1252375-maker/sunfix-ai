# SunFix AI — Three-Minute Demo Plan

**Recording language:** English
**Maximum runtime:** 3:00
**Current public-demo status:** The deployed preview has no Firebase Web App environment configuration. It uses simulated site data, browser-local persistence, and deterministic `DEMO RULES`. Google sign-in, Firestore cloud sync, App Check, and live Gemini inference are not active on the public demo. Do not present a local or cloud model call as verified.

## Before recording

1. Configure a Firebase project, Firebase AI Logic provider, web-app settings, Google sign-in, Firestore rules, and production App Check. Keep credentials out of the recording and repository.
2. On Chrome Desktop 139 or later, check the Prompt API and prepare the on-device model using SunFix's user-activated control. Confirm the response record says `LOCAL` from the Firebase SDK's `inferenceSource`.
3. Run a cloud-only diagnosis and confirm the response record says `CLOUD`. Confirm the Firebase App Check status is active.
4. If either inference source cannot be verified, show the actual `UNAVAILABLE` or `DEMO RULES` status and describe the setup limitation. Do not stage or relabel an output.
5. Use only the app's labeled demonstration assets and readings. They are simulated, not live telemetry or field measurements.

## Timed script

### 0:00–0:20 — Problem and value

“Solar field teams receive fragmented readings, photos, and alarm codes. SunFix AI turns that evidence into a reviewable repair workflow while keeping safety checks in front of diagnosis.”

### 0:20–0:45 — Operations context

Show the Command Center. Point out the clearly marked demo assets, fault queue, and simulated production trend. Open the Mesa Ridge digital twin and identify the inverter fault context.

“These assets and measurements are demonstration data. The interface keeps that provenance visible.”

### 0:45–1:10 — Safety before analysis

Open a demonstration diagnosis and select **Visible smoke** in the Safety Gate.

“A reported hazard immediately triggers a deterministic Stop-Work Hold before any model request or repair completion. It directs the technician to site emergency procedures and qualified personnel.”

Use the saved non-hazard demonstration case for the rest of the walkthrough. Never clear a real field hazard to continue work.

### 1:10–1:40 — Honest inference status

On the public demo, run the prepared non-hazardous sample diagnosis and show the `DEMO RULES` badge. Open the Hybrid AI section and point out the browser capability probe and the fact that LOCAL and CLOUD remain inactive until their prerequisites are met.

“The public preview is running deterministic, non-generative rules. SunFix does not label a fallback as Gemini. A real LOCAL or CLOUD result is shown only after the SDK returns that inference source and the Firebase/App Check setup is verified.”

For a separately configured test environment, show `LOCAL` or `CLOUD` only after every preflight check above succeeds. Never stage or relabel an inference result.

### 1:40–2:20 — Evidence to repair

Review the diagnostic summary, readings supplied, missing verification, and cited library entries. Accept it into a work order and show its checklist and human review controls.

“The model output is a recommendation. The technician reviews it, and the deterministic safety gate remains in force.”

### 2:20–2:45 — Field workflow and provenance

Show the 2D/3D twin fallback, FieldProof evidence origins, and offline status control. Keep `[DEMO]` and `[SIMULATED]` labels visible when showing sample values.

### 2:45–3:00 — Close

“SunFix AI connects simulated field evidence to reviewable repair steps, with deterministic safety checks, browser-local workflows, and explicit data provenance. Its Firebase AI Logic paths are designed to activate after project and App Check configuration. Inspect smarter. Diagnose faster. Repair with evidence.”
