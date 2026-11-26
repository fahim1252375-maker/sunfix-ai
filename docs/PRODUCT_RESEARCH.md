# SunFix Field — Solar O&M Product Research

**Research snapshot:** 26 November 2026  
**Purpose:** Ground the next SunFix product decisions in an initial market scan and the repository's current implementation.  
**Evidence boundary:** This is a focused first-pass review, not a comprehensive vendor due-diligence study. The competitor descriptions below are summaries shown on Gartner Peer Insights' Renewable Energy Management Solutions category page. They are useful for discovering product categories, but they are not audited feature tests or primary vendor documentation. Verify current capabilities, APIs, pricing and regional availability directly with each vendor before making product or sales claims.

## Executive recommendation

Position SunFix Field as an **offline-first solar O&M technician execution and evidence-to-repair workspace** rather than a SCADA replacement or a full renewable-energy management suite.

The repository already has a coherent prototype journey: asset context and a 3D demonstration twin, a deterministic electrical safety gate, hybrid AI with a rule-based fallback, work orders, evidence capture, offline persistence and service reports. The strongest next step is to connect this technician workflow to trustworthy site data and make every diagnosis traceable to observed evidence.

Do not market the current demo telemetry, 3D scene, AI fallback or sample evidence as live field data.

## 1. Market capability baseline

Gartner's category definition describes renewable-energy management software as a platform that brings together operational/condition data with environmental and weather inputs to manage renewable assets and their O&M. Its category page lists capabilities including asset/work management, inventory, shutdown/outage management, work orders, monitoring and data integration, predictive analytics, compliance/reporting, benchmarking and multi-site scalability.

The product listings on that page describe these examples:

| Product | Vendor | Public category-page description (summary) | Relevance to SunFix |
|---|---|---|---|
| UNITY | Power Factors | Portfolio suite spanning SCADA/EMS, asset performance, field-service work orders, scheduling, inventory and commercial oversight | Broad enterprise benchmark; avoid trying to reproduce a full utility-scale suite in the first release |
| The Qantum | QOS Energy | Multi-source renewable asset data aggregation, monitoring, visualization, reporting and predictive analytics | Reference for normalized multi-site telemetry and reporting |
| Delfos | Delfos Energy | AI/data analytics for renewable asset monitoring, failure prediction and preventive maintenance | Reference for explainable fault triage and prioritization |
| EnOS Solar | Univers | Solar performance monitoring, operational analysis, fault detection and remote management | Reference for plant-level monitoring and asset health |
| SolarPulse | Mahindra Teqo | PV generation monitoring, performance analytics, fault detection and operational reporting | Direct solar O&M comparison point |
| Grid SMOC | Grid | Utility workflow platform with mobile field-staff data collection, operational visualization and reporting | Useful adjacent reference for mobile field execution |
| FutrOS | Futr Energy | Distributed-energy-resource monitoring/control and orchestration across solar, storage, EV and flexible assets | Adjacent DER orchestration category, not a direct technician-workflow substitute |

**Important:** these are category-page descriptions, not proof that every feature is available in every plan, region or integration. The same page includes products with very different deployment scopes.

## 2. SunFix position against that baseline

| Capability | Current repository evidence | Product status / next gap |
|---|---|---|
| Asset workspace and lifecycle | Product spec defines asset dashboard and six lifecycle stages | Prototype flow exists; connect to actual customer/site records |
| 3D digital twin | Three.js / React Three Fiber scene with 120 demo PV modules, inverter breakdown and 2D fallback | Impressive demo; telemetry-to-geometry state mapping is still needed for a true operational twin |
| Safety gate | Deterministic hazard evaluation and Stop-Work rules; Firestore work-order restrictions | Keep deterministic and server-enforced; do not delegate safety clearance to generative AI |
| Hybrid AI diagnosis | Firebase AI Logic client integration, schema validation, verified source IDs and deterministic fallback | Live Firebase AI Logic smoke test remains unverified |
| Evidence-to-repair | FieldProof evidence and before/after report flow in product specification | Strengthen provenance, metadata, reviewer sign-off and evidence lifecycle |
| Offline operation | IndexedDB workspace and account-scoped queue; emulator reconnect test | Emulator path is tested; production conflicts, real-device behavior and recovery need validation |
| Service reports | Client-side PDF report and report schema | Add traceable evidence manifest and approval/audit metadata |
| Live monitoring / device integrations | Not demonstrated by the current CI or product spec as live vendor telemetry | Major product gap: build a read-only telemetry ingestion layer before considering remote control |
| Work scheduling / inventory / cost | Work-order lifecycle exists; enterprise scheduling and inventory are not demonstrated | Add assignments, due dates, parts, labor, actual cost and status history after data integrations |

## 3. Product roadmap

### P0 — Trustworthy operational data foundation

1. Create a vendor-neutral telemetry adapter boundary. Each observation should carry asset ID, device ID, parameter, value, unit, observed timestamp, received timestamp, source/vendor, quality state and whether the value is simulated.
2. Start with read-only ingestion and a small set of supported inverter/device sources. Do not promise universal compatibility until each adapter is tested against real hardware or vendor sandboxes.
3. Normalize device alarms and map them to a versioned fault-code catalogue; preserve the original vendor code and raw payload reference.
4. Replace the current simple expected-vs-observed power estimate with an explicitly qualified performance model that can account for irradiance, module temperature, clipping, curtailment, grid outages and data gaps. Keep assumptions visible.
5. Add stale-data, missing-data and clock-skew indicators. Never render stale or simulated telemetry as live.

### P1 — Evidence-to-repair traceability

1. Link every diagnostic finding to the exact reading, original photo, device event or verified knowledge source that supports it.
2. Store media in object storage rather than embedding large image payloads in Firestore documents. Retain a manifest with hash, capture time, uploader, asset/component, before/after stage and consent/retention metadata.
3. Record each work-order transition as an append-only event: actor, timestamp, previous/new state, reason and evidence references.
4. Require a qualified human reviewer to approve safety-sensitive conclusions. AI can summarize and suggest; it must not clear a Stop-Work hold.
5. Add exportable evidence manifests to service reports so reviewers can trace each conclusion to its underlying source.

### P2 — Field-service operations

1. Add technician assignment, due dates, priority queues, escalation and work-order history.
2. Add parts/material usage, labor time, cost estimates versus actuals, warranty references and return visits.
3. Support supervisor review, customer sign-off and incomplete-evidence warnings.
4. Add offline conflict handling and a visible per-record sync state; test account switching and retry/idempotency against real Firebase before production.

### P3 — Portfolio intelligence

1. Add fleet/site comparison, performance benchmarking and recurring underperformance queues.
2. Compare production shortfall with site irradiance and weather-normal baselines before attributing it to equipment.
3. Support alert triage and technician dispatch recommendations only after event quality, ownership and site permissions are established.
4. Keep remote write/control functions out of scope until vendor APIs, interlocks, authorization, auditability and safety certification requirements are explicitly established.

## 4. 3D digital twin and UI direction

The current 3D view should become an operational interface, not just a visual centerpiece. Recommended flow:

**Portfolio → Site → Digital Twin → Component → Evidence → Safety Gate → Work Order → Verification → Service Report**

- Selecting a module, string, inverter or battery should open an evidence panel with the latest known measurements, observation time, source, quality and history.
- Fault states should be driven by validated device events or explicitly labelled simulation scenarios.
- The twin should show an event timeline and highlight exactly which component is affected; do not animate healthy-looking equipment when the underlying asset is in a fault or stale-data state.
- Keep the 2D fallback, keyboard-accessible controls, reduced-motion support and clear non-3D alternatives.
- Use a compact right-side evidence drawer and a persistent safety/status rail so technicians can inspect data without losing the site context.

## 5. Data-source and integration research

The Firecrawl Alexandria catalogue exposed the following documented capability contracts. These were **discovered, not executed** in this review; no site-specific weather, imagery or energy records were retrieved.

| Capability | Potential use | Important limitation |
|---|---|---|
| NASA POWER `weather-history/daily_weather` | Daily solar radiation and weather context; catalogue workflow uses `ALLSKY_SFC_SW_DWN`, temperature and precipitation | Validate site coverage, date availability, units and resolution before using values in an asset model |
| NASA POWER `weather-history/climate_normals` | Compare current irradiance against a monthly climate normal to estimate the weather-explained share of production loss | Climate normals are context, not a substitute for on-site pyranometer or plane-of-array sensors |
| Element 84 Earth Search `satellite-imagery/search_scenes` | Find Sentinel-2 L2A scenes over a site | Cloud cover is initially tile-level; inspect scene metadata and field-level conditions |
| Element 84 Earth Search `satellite-imagery/render_clip` | Render true-colour or NDVI context around an array | Native pixels are 10 m; useful for broad site context such as flooding or vegetation, not individual panel inspection or electrical fault diagnosis |
| US National Weather Service `weather/alerts_history` | Historical smoke, storm or wind alerts for covered US sites | US coverage only; it is not an appropriate alert source for Bangladesh sites |
| IEA `energy/data` | Country-level generation and energy-transition context | National statistics are not site-level solar production or irradiance observations |

For a Bangladesh deployment, use local or global weather services with verified Bangladesh coverage and station/grid resolution. Do not silently substitute a US-only alert service. Any weather-derived conclusion should state the spatial precision, source timestamp and uncertainty.

## 6. Implementation acceptance criteria

Before describing the system as operational rather than a prototype:

- Real device telemetry is ingested, timestamped, normalized and labelled with its source and data quality.
- A technician can trace every AI statement to actual evidence or a verified knowledge source.
- A Stop-Work event cannot be cleared by client-side state or AI output; the required authorized human workflow is enforced server-side.
- Work-order state changes and evidence uploads are auditable and idempotent.
- Offline queue drain, retry, duplicate prevention, conflict resolution and multi-account isolation are tested with the intended production Firebase project.
- Google authentication and App Check are verified on the real hostname; AI cloud inference is verified independently of deterministic fallback.
- Site/device integration compatibility and safety procedures are validated with qualified domain professionals.

## Sources and evidence

1. [Gartner Peer Insights — Renewable Energy Management Solutions](https://www.gartner.com/reviews/market/renewable-energy-management-solutions) — market definition, category capability criteria and product listing summaries. Page retrieved 26 November 2026; the category's feature criteria section is labelled “Updated February 2025”.
2. Firecrawl Alexandria catalogue capability contracts read 26 November 2026: `power-larc-nasa-gov/weather-history/daily_weather`, `power-larc-nasa-gov/weather-history/climate_normals`, `earth-search-aws-element84-com/satellite-imagery/search_scenes`, `earth-search-aws-element84-com/satellite-imagery/render_clip`, `api-weather-gov/weather/alerts_history`, and `iea-org/energy/data`. These are capability descriptions, not executed datasets.
3. Repository implementation baseline: [SunFix Field Product Specification](./PRODUCT_SPEC.md), [Architecture](./ARCHITECTURE.md), [Firebase setup](./FIREBASE_SETUP.md) and [Verification & Test Plan](./TEST_PLAN.md).

This document is a product-planning aid. It is not an engineering certification, an electrical safety procedure, a vendor compatibility claim or a market-size estimate.
