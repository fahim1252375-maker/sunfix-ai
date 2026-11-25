import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEnergyImpact,
  computeCasePriority,
  computeSimulatedTwinTelemetry,
  evaluateSafetyGate,
  formatHourLabel,
  parseAndValidateAssessment,
  runDeterministicFallbackAssessment,
  runMalformedSchemaDemo,
  simulateIrradianceFactor,
} from './diagnosticsLogic';

test('Safety Gate blocks work when burning smell or smoke is reported', () => {
  const safe = evaluateSafetyGate([]);
  assert.equal(safe.stopWork, false);
  assert.equal(safe.hazardDetected, false);

  const hazardous = evaluateSafetyGate(['burning_smell', 'abnormal_heat']);
  assert.equal(hazardous.hazardDetected, true);
  assert.equal(hazardous.stopWork, true);
  assert.ok(hazardous.stopWorkReason?.includes('Burning smell'));
});

test('Priority ranking forces critical when safety hazard is present', () => {
  const priority = computeCasePriority({
    safetyHazardDetected: true,
    stopWork: true,
    severity: 'low',
    evidenceCount: 5,
    assetStatus: 'nominal',
  });
  assert.equal(priority, 'critical');
});

test('Energy Loss Impact Calculator computes power gap and energy difference accurately', () => {
  const impact = calculateEnergyImpact({
    expectedKw: 42.5,
    observedKw: 2.5,
    durationHours: 4,
    irradianceDeratePct: 100,
  });
  assert.equal(impact.powerGapKw, 40);
  assert.equal(impact.estimatedEnergyGapKwh, 160);
  assert.ok(impact.limitations.some((l) => l.includes('not a revenue-grade')));
});

test('Zod parser validates structured AI output and strips unverified sourceIds', () => {
  const raw = `\`\`\`json
  {
    "caseTitle": "Inverter Grid Undervoltage",
    "summary": "Observed grid voltage is below ride-through threshold.",
    "severity": "high",
    "assessmentStatus": "evidence_available",
    "possibleCauses": [
      {
        "cause": "Utility grid sag on Phase L2",
        "supportingEvidence": ["AC Grid L2: 198 V"],
        "missingEvidence": ["15-min utility log"],
        "assessment": "possible"
      }
    ],
    "requiredInformation": ["Verify external disconnect"],
    "safeNextActions": ["Document inverter screen"],
    "stopWork": false,
    "stopWorkReason": null,
    "sourceIds": ["kb-inv-g04", "hallucinated-id-999"]
  }
  \`\`\``;
  const parsed = parseAndValidateAssessment(raw, ['kb-inv-g04', 'kb-nec-690']);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.data.sourceIds, ['kb-inv-g04']);
    assert.deepEqual(parsed.droppedSourceIds, ['hallucinated-id-999']);
  }
});

test('Zod parser rejects incomplete malformed JSON cleanly', () => {
  const parsed = parseAndValidateAssessment('{"caseTitle": ""}', ['kb-inv-g04']);
  assert.equal(parsed.ok, false);
});

test('runMalformedSchemaDemo rejects invalid fields and reports stripped unverified source IDs', () => {
  const result = runMalformedSchemaDemo(['kb-inv-g04', 'kb-nec-690']);
  assert.equal(result.ok, false);
  assert.deepEqual(result.droppedSourceIds, ['fabricated-oem-manual-99x', 'unknown-nec-999']);
});

test('Deterministic offline fallback enforces safety hold when hazards reported', () => {
  const result = runDeterministicFallbackAssessment(
    {
      assetName: 'Mesa Ridge',
      componentType: 'inverter',
      componentName: 'HelioCore X50-PRO',
      symptoms: ['No power production'],
      faultCode: 'G04-UV',
      readings: [{ label: 'AC Voltage', value: '196', unit: 'V' }],
      safetyFlags: ['smoke'],
    },
    [],
  );
  assert.equal(result.stopWork, true);
  assert.equal(result.assessmentStatus, 'stop_work_required');
});

test('simulateIrradianceFactor clamps 06:00-18:00 and peaks at solar noon', () => {
  const dawn = simulateIrradianceFactor(4);
  const sixAm = simulateIrradianceFactor(6);
  const noon = simulateIrradianceFactor(12);
  const sixPm = simulateIrradianceFactor(18);
  const dusk = simulateIrradianceFactor(21);

  assert.equal(dawn, sixAm);
  assert.equal(dusk, sixPm);
  assert.ok(noon > sixAm);
  assert.ok(noon > sixPm);
  assert.equal(noon, 0.96);
  assert.equal(formatHourLabel(12.5), '12:30');
  assert.equal(formatHourLabel(6), '06:00');
});

test('computeSimulatedTwinTelemetry reflects nominal, inverterFault, stringFault, and isSimulated flag', () => {
  const nominal = computeSimulatedTwinTelemetry({
    capacityKw: 48,
    hourDecimal: 12,
    inverterFault: false,
    gridFault: false,
    stringFault: false,
    batteryFault: false,
  });
  assert.equal(nominal.isSimulated, true);
  assert.equal(nominal.expectedKw, 46.1);
  assert.equal(nominal.observedKw, 46.1);
  assert.equal(nominal.powerGapKw, 0);

  const inverterTrip = computeSimulatedTwinTelemetry({
    capacityKw: 48,
    hourDecimal: 12,
    inverterFault: true,
    gridFault: false,
    stringFault: false,
    batteryFault: false,
  });
  assert.equal(inverterTrip.observedKw, 0);
  assert.equal(inverterTrip.powerGapKw, 46.1);

  const stringLoss = computeSimulatedTwinTelemetry({
    capacityKw: 48,
    hourDecimal: 12,
    inverterFault: false,
    gridFault: false,
    stringFault: true,
    batteryFault: false,
  });
  assert.equal(stringLoss.observedKw, 36.0);
  assert.equal(stringLoss.powerGapKw, 10.1);

  const gridTrip = computeSimulatedTwinTelemetry({
    capacityKw: 48,
    hourDecimal: 12,
    inverterFault: false,
    gridFault: true,
    stringFault: false,
    batteryFault: false,
  });
  assert.equal(gridTrip.observedKw, 0);

  const battDerate = computeSimulatedTwinTelemetry({
    capacityKw: 48,
    hourDecimal: 12,
    inverterFault: false,
    gridFault: false,
    stringFault: false,
    batteryFault: true,
  });
  assert.equal(battDerate.observedKw, 42.4);
});
