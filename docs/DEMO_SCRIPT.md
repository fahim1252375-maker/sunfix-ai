# SunFix AI — Three-Minute Demo Plan

**Recording language:** English
**Maximum runtime:** 3:00
**Current live status:** Firebase AI Logic and App Check are not configured in the checked-out environment. The browser review produced an honestly labeled `DEMO RULES` response. Do not present a local or cloud model call as verified until the preflight below succeeds.

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

### 1:10–1:40 — Verified hybrid inference

Run the prepared local diagnosis and show the `LOCAL` badge. Then run **Force Cloud Gemini Analysis** and show the `CLOUD` badge, with App Check active. Point to the recorded execution source for each result.

“Firebase AI Logic selects the actual execution route. SunFix reports only the source returned by the SDK; an unreported source remains `UNAVAILABLE`.”

Only show these claims if the preflight passed. Otherwise show the actual fallback status and say the Firebase project still needs configuration.

### 1:40–2:20 — Evidence to repair

Review the diagnostic summary, readings supplied, missing verification, and cited library entries. Accept it into a work order and show its checklist and human review controls.

“The model output is a recommendation. The technician reviews it, and the deterministic safety gate remains in force.”

### 2:20–2:45 — Field workflow and provenance

Show the 2D/3D twin fallback, FieldProof evidence origins, and offline status control. Keep `[DEMO]` and `[SIMULATED]` labels visible when showing sample values.

### 2:45–3:00 — Close

“SunFix AI connects field evidence to accountable repair steps, with Firebase AI Logic hybrid inference, local-first workflows, and explicit safety and data provenance. Inspect smarter. Diagnose faster. Repair with evidence.”
