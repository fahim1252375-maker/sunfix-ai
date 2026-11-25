# SunFix Field — Product Specification (V2)

## 1. Purpose
SunFix Field equips solar field technicians, operations engineers, and commercial PV asset managers to inspect solar installations, diagnose inverter/PV/battery/grid faults offline or online, enforce pre-work electrical safety gates, execute repair checklists, capture FieldProof photo/reading evidence, estimate energy impact, and generate verifiable service reports.

## 2. End-to-End Field Service Lifecycle (Interactive `/lifecycle/:slug` Stages)
1. **01 · Equipment & 48 kWp 3D Digital Twin (`/lifecycle/digital-twin`)**: Inspect the Mesa Ridge `34×22 m` rooftop installation (`120` instanced modules across `6` strings, 2 combiners, exploded-view 40 kW inverter, VoltVault LFP-60 rack, AC disconnect, utility pole/transformer, HVAC load), adjust the 06:00–18:00 irradiance slider, trigger simulated fault scenarios (`G04-UV`, `BMS-12`, `STR-LOW`, `COM-09`), or switch to the 2D isometric SVG fallback.
2. **02 · Mandatory Electrical Safety Gate (`/lifecycle/safety-gate`)**: Any checked hazard (`burning_smell`, `smoke`, `sparks`, `exposed_conductors`, `water_ingress`, etc.) triggers an immediate deterministic Stop-Work Hold, blocks normal repairs, and routes to supervisor escalation.
3. **03 · Honest Hybrid AI Diagnosis (`/lifecycle/hybrid-diagnosis`)**: 8-step intake collects asset, component, symptoms, fault code, readings, and optional photos; `PREFER_ON_DEVICE` / `ONLY_IN_CLOUD` / `DEMO RULES` responses are Zod-validated with supporting vs. missing evidence and verified Knowledge IDs.
4. **04 · Safety-Gated Repair Workflows (`/lifecycle/safety-gated-repair`)**: Convert cleared cases into prioritized Work Orders, check off non-invasive repair tasks, record technician/verification notes, and watch the 3D Digital Twin restore to nominal.
5. **05 · FieldProof Evidence Capture (`/lifecycle/fieldproof`)**: Log original condition photos and numerical readings separated from pre-populated `[DEMO]` data, with interactive before/after comparison.
6. **06 · Energy Impact & FieldProof Reports (`/lifecycle/service-report`)**: Compute transparent power/energy gaps with explicit assumptions/limitations and export a 17-section printable / client-side PDF FieldProof report.
