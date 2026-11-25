import { z } from 'zod';
import type {
  CasePriority,
  ComponentType,
  DiagnosticAssessment,
  KnowledgeSource,
  SafetyHazardCheck,
} from '../types/sunfix';

export const PossibleCauseSchema = z.object({
  cause: z.string().min(1).max(300),
  supportingEvidence: z.array(z.string().max(240)).max(8),
  missingEvidence: z.array(z.string().max(240)).max(8),
  assessment: z.enum(['likely', 'possible', 'requires_inspection', 'unverified']),
});

export const DiagnosticAssessmentSchema = z.object({
  caseTitle: z.string().min(1).max(180),
  summary: z.string().min(1).max(1600),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  assessmentStatus: z.enum(['evidence_available', 'needs_inspection', 'stop_work_required']),
  possibleCauses: z.array(PossibleCauseSchema).min(1).max(6),
  requiredInformation: z.array(z.string().max(240)).max(8),
  safeNextActions: z.array(z.string().max(300)).max(8),
  stopWork: z.boolean(),
  stopWorkReason: z.string().max(400).nullable(),
  sourceIds: z.array(z.string().max(128)).max(10),
});

export const SAFETY_HAZARD_CHECKS: SafetyHazardCheck[] = [
  {
    id: 'burning_smell',
    label: 'Burning smell',
    description: 'Acrid insulation, scorched plastic, or electrical ozone odor near enclosures.',
    criticalEmergency: true,
  },
  {
    id: 'smoke',
    label: 'Visible smoke',
    description: 'Any smoke or charring from inverter, combiner, conduit, or battery rack.',
    criticalEmergency: true,
  },
  {
    id: 'sparks',
    label: 'Sparks or arcing',
    description: 'Visible sparking, popping sounds, or arc-fault indication.',
    criticalEmergency: true,
  },
  {
    id: 'exposed_conductors',
    label: 'Exposed electrical conductors',
    description: 'Bare copper, damaged MC4 insulation, or open live busbars.',
    criticalEmergency: true,
  },
  {
    id: 'visible_damage',
    label: 'Visible physical enclosure damage',
    description: 'Cracked inverter housing, shattered glass module, or melted terminals.',
    criticalEmergency: false,
  },
  {
    id: 'water_ingress',
    label: 'Flood or water ingress',
    description: 'Standing water around equipment pad or moisture inside conduit/enclosure.',
    criticalEmergency: true,
  },
  {
    id: 'storm_damage',
    label: 'Recent storm or lightning impact',
    description: 'Structural racking shift, downed lines, or surge arrestor trip.',
    criticalEmergency: false,
  },
  {
    id: 'abnormal_heat',
    label: 'Abnormal heat',
    description: 'Enclosure surface or cable termination noticeably overheated.',
    criticalEmergency: false,
  },
  {
    id: 'other_hazard',
    label: 'Other immediate site hazard',
    description: 'Roof instability, wildlife intrusion, or blocked emergency egress.',
    criticalEmergency: false,
  },
];

export interface SafetyEvaluationResult {
  hazardDetected: boolean;
  stopWork: boolean;
  stopWorkReason: string | null;
  flaggedLabels: string[];
}

export function evaluateSafetyGate(selectedHazardIds: string[]): SafetyEvaluationResult {
  if (!selectedHazardIds || selectedHazardIds.length === 0) {
    return {
      hazardDetected: false,
      stopWork: false,
      stopWorkReason: null,
      flaggedLabels: [],
    };
  }

  const matched = SAFETY_HAZARD_CHECKS.filter((item) => selectedHazardIds.includes(item.id));
  if (matched.length === 0) {
    return {
      hazardDetected: false,
      stopWork: false,
      stopWorkReason: null,
      flaggedLabels: [],
    };
  }

  const flaggedLabels = matched.map((m) => m.label);
  return {
    hazardDetected: true,
    stopWork: true,
    stopWorkReason: `Immediate safety gate hold triggered due to reported site condition(s): ${flaggedLabels.join(', ')}. Do not open energized enclosures or perform diagnostic probing. Follow site emergency procedures and refer to authorized high-voltage/emergency personnel.`,
    flaggedLabels,
  };
}

export function extractJsonFromModelText(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function parseAndValidateAssessment(
  rawText: string,
  validKnowledgeIds: string[],
):
  | { ok: true; data: DiagnosticAssessment; droppedSourceIds: string[] }
  | { ok: false; error: string; droppedSourceIds: string[] } {
  try {
    const jsonString = extractJsonFromModelText(rawText);
    const parsed = JSON.parse(jsonString);
    const validSet = new Set(validKnowledgeIds);
    const rawSourceIds: string[] = Array.isArray(parsed?.sourceIds)
      ? parsed.sourceIds.filter((s: unknown): s is string => typeof s === 'string')
      : [];
    const droppedSourceIds = rawSourceIds.filter((id) => !validSet.has(id));

    const result = DiagnosticAssessmentSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { ok: false, error: `Schema validation failed (${issues})`, droppedSourceIds };
    }
    const sanitizedSources = result.data.sourceIds.filter((id) => validSet.has(id));
    return {
      ok: true,
      droppedSourceIds,
      data: {
        ...result.data,
        sourceIds: sanitizedSources,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to parse structured AI response.',
      droppedSourceIds: [],
    };
  }
}

export const MALFORMED_DEMO_RAW_OUTPUT = `{
  "caseTitle": "",
  "summary": "Unverified voltage claim with 97.4% confidence and hallucinated source citation.",
  "severity": "extreme",
  "assessmentStatus": "evidence_available",
  "possibleCauses": [],
  "requiredInformation": [],
  "safeNextActions": ["Open live DC junction cover to inspect busbar"],
  "stopWork": false,
  "stopWorkReason": null,
  "sourceIds": ["kb-inv-g04", "fabricated-oem-manual-99x", "unknown-nec-999"]
}`;

export function runMalformedSchemaDemo(validKnowledgeIds: string[]) {
  return parseAndValidateAssessment(MALFORMED_DEMO_RAW_OUTPUT, validKnowledgeIds);
}

export function computeCasePriority(params: {
  safetyHazardDetected: boolean;
  stopWork: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidenceCount: number;
  assetStatus: 'nominal' | 'warning' | 'fault' | 'offline';
}): CasePriority {
  if (params.safetyHazardDetected || params.stopWork) {
    return 'critical';
  }
  if (params.severity === 'critical') return 'critical';
  if (params.severity === 'high' || params.assetStatus === 'fault') return 'high';
  if (params.severity === 'medium' || params.assetStatus === 'warning' || params.evidenceCount < 2) {
    return 'medium';
  }
  return 'low';
}

export interface EnergyImpactResult {
  expectedKw: number;
  observedKw: number;
  powerGapKw: number;
  durationHours: number;
  estimatedEnergyGapKwh: number;
  assumptions: string[];
  limitations: string[];
}

export function calculateEnergyImpact(params: {
  expectedKw: number;
  observedKw: number;
  durationHours: number;
  irradianceDeratePct?: number;
}): EnergyImpactResult {
  const expectedKw = Math.max(0, Number.isFinite(params.expectedKw) ? params.expectedKw : 0);
  const observedKw = Math.max(0, Number.isFinite(params.observedKw) ? params.observedKw : 0);
  const durationHours = Math.max(0, Number.isFinite(params.durationHours) ? params.durationHours : 0);
  const derateFactor =
    params.irradianceDeratePct !== undefined && Number.isFinite(params.irradianceDeratePct)
      ? Math.min(1, Math.max(0.1, params.irradianceDeratePct / 100))
      : 1;

  const adjustedExpectedKw = Number((expectedKw * derateFactor).toFixed(2));
  const powerGapKw = Number((adjustedExpectedKw - observedKw).toFixed(2));
  const estimatedEnergyGapKwh = Number((powerGapKw * durationHours).toFixed(2));

  return {
    expectedKw: adjustedExpectedKw,
    observedKw: Number(observedKw.toFixed(2)),
    powerGapKw,
    durationHours: Number(durationHours.toFixed(2)),
    estimatedEnergyGapKwh,
    assumptions: [
      'Power gap = Expected power (kW) - Observed power (kW).',
      'Estimated energy difference = Power gap (kW) × Duration (hours).',
      `Irradiance / site derate factor applied: ${Math.round(derateFactor * 100)}%.`,
    ],
    limitations: [
      'Calculated estimate only — not a revenue-grade utility meter measurement.',
      'Assumes steady irradiance and constant load/curtailment across the selected duration.',
      'Does not account for cloud transients, temperature coefficient shifts, or utility export limits.',
    ],
  };
}

/**
 * Computes a smooth simulated solar irradiance curve (0..1) for hours 06:00..18:00.
 * Explicitly simulated for Digital Twin time-of-day visualization — never real sensor telemetry.
 */
export function simulateIrradianceFactor(hourDecimal: number): number {
  const clamped = Math.min(18, Math.max(6, Number.isFinite(hourDecimal) ? hourDecimal : 12));
  const normalized = (clamped - 6) / 12; // 0 at 06:00, 0.5 at 12:00, 1 at 18:00
  const rawSin = Math.sin(normalized * Math.PI);
  return Number(Math.max(0.06, Math.pow(rawSin, 1.15) * 0.96).toFixed(3));
}

export function formatHourLabel(hourDecimal: number): string {
  const whole = Math.floor(hourDecimal);
  const mins = Math.round((hourDecimal - whole) * 60);
  return `${String(whole).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function computeSimulatedTwinTelemetry(params: {
  capacityKw: number;
  hourDecimal: number;
  inverterFault: boolean;
  gridFault: boolean;
  stringFault: boolean;
  batteryFault: boolean;
}) {
  const irradianceFactor = simulateIrradianceFactor(params.hourDecimal);
  const expectedKw = Number((params.capacityKw * irradianceFactor).toFixed(1));
  let observedKw = expectedKw;
  if (params.inverterFault || params.gridFault) {
    observedKw = 0.0;
  } else if (params.stringFault) {
    // 1 of 6 strings impaired plus mismatch loss (~22% total array loss)
    observedKw = Number((expectedKw * 0.78).toFixed(1));
  } else if (params.batteryFault) {
    observedKw = Number((expectedKw * 0.92).toFixed(1));
  }

  const impact = calculateEnergyImpact({
    expectedKw,
    observedKw,
    durationHours: 1,
    irradianceDeratePct: 100,
  });

  return {
    irradianceFactor,
    irradianceWm2: Math.round(irradianceFactor * 1000),
    expectedKw,
    observedKw,
    powerGapKw: impact.powerGapKw,
    isSimulated: true as const,
  };
}

export function runDeterministicFallbackAssessment(
  input: {
    assetName: string;
    componentType: ComponentType;
    componentName: string;
    symptoms: string[];
    faultCode: string;
    readings: Array<{ label: string; value: string; unit: string }>;
    safetyFlags: string[];
  },
  knowledgeLibrary: KnowledgeSource[],
): DiagnosticAssessment {
  const safetyEval = evaluateSafetyGate(input.safetyFlags);
  const normalizedCode = input.faultCode.trim().toUpperCase();

  const matchedSources = knowledgeLibrary.filter((k) => {
    const codeMatch = normalizedCode && k.faultCode && normalizedCode.includes(k.faultCode.toUpperCase());
    const categoryMatch =
      (input.componentType === 'inverter' && k.category === 'inverter') ||
      (input.componentType === 'solar_panel' && k.category === 'solar_panel') ||
      (input.componentType === 'battery' && k.category === 'battery') ||
      ((input.componentType === 'connection' || input.componentType === 'grid_meter') &&
        k.category === 'grid_connection');
    return Boolean(codeMatch || categoryMatch || k.category === 'safety');
  });

  const sourceIds = matchedSources.slice(0, 3).map((s) => s.id);

  if (safetyEval.stopWork) {
    return {
      caseTitle: `Safety Gate Hold — ${input.componentName}`,
      summary:
        'Local deterministic safety rules halted diagnostic progression because hazardous site conditions were reported. Escalate to authorized personnel before further inspection.',
      severity: 'critical',
      assessmentStatus: 'stop_work_required',
      possibleCauses: [
        {
          cause: 'Active physical or electrical site hazard reported during pre-work screening',
          supportingEvidence: safetyEval.flaggedLabels,
          missingEvidence: ['Authorized site clearance and lockout verification'],
          assessment: 'requires_inspection',
        },
      ],
      requiredInformation: ['Site emergency clearance by qualified electrical personnel'],
      safeNextActions: [
        'Maintain safe standoff distance and restrict unauthorized access to the equipment area.',
        'Follow site emergency isolation procedures only if trained and authorized to do so.',
        'Escalate this record to a licensed electrical supervisor with attached exterior photographs.',
      ],
      stopWork: true,
      stopWorkReason: safetyEval.stopWorkReason,
      sourceIds,
    };
  }

  const readingsText =
    input.readings.length > 0
      ? input.readings.map((r) => `${r.label}: ${r.value} ${r.unit}`).join(', ')
      : 'No numerical field readings attached yet';

  if (input.componentType === 'inverter' || normalizedCode.includes('G04')) {
    return {
      caseTitle: `${input.componentName} Grid & Production Fault Review (${normalizedCode || 'Offline Rules'})`,
      summary: `Offline deterministic rule assessment for ${input.assetName}. Reported symptoms (${input.symptoms.join(', ') || 'unspecified'}) and readings (${readingsText}) indicate potential AC grid voltage/frequency excursion or inverter protection trip requiring external verification.`,
      severity: 'high',
      assessmentStatus: input.readings.length > 0 ? 'evidence_available' : 'needs_inspection',
      possibleCauses: [
        {
          cause: 'Utility AC grid voltage or phase synchronization outside inverter ride-through window',
          supportingEvidence: [
            ...(normalizedCode ? [`Fault code logged: ${normalizedCode}`] : []),
            ...(input.readings.length > 0 ? [`Field readings recorded: ${readingsText}`] : []),
          ],
          missingEvidence: ['Utility feeder voltage stability log over 15-minute window'],
          assessment: 'possible',
        },
        {
          cause: 'AC isolator or breaker tripped downstream of inverter output terminals',
          supportingEvidence: input.symptoms.length > 0 ? input.symptoms : ['Zero active AC export reported'],
          missingEvidence: ['Visual external breaker handle position check'],
          assessment: 'requires_inspection',
        },
      ],
      requiredInformation: [
        'Confirm external AC disconnect handle position visually without opening live covers.',
        'Record inverter front-panel display fault history timestamps.',
      ],
      safeNextActions: [
        'Inspect external AC disconnect and utility meter display status without opening energized enclosures.',
        'Verify inverter ventilation clearance and ambient temperature around heat-sink fins.',
        'Document front-panel fault code screen with a before-service photograph in FieldProof.',
        'If fault persists after authorized utility check, escalate to a qualified solar electrician.',
      ],
      stopWork: false,
      stopWorkReason: null,
      sourceIds,
    };
  }

  return {
    caseTitle: `${input.componentName} Diagnostic Triage (Offline Rules)`,
    summary: `Offline deterministic rule assessment for ${input.assetName} (${input.componentName}). Evidence provided: ${readingsText}. Generative AI was not available offline; follow cautious non-invasive inspection steps.`,
    severity: 'medium',
    assessmentStatus: 'needs_inspection',
    possibleCauses: [
      {
        cause: `${input.componentName} performance degradation or protection state trip`,
        supportingEvidence: input.symptoms.length > 0 ? input.symptoms : ['Technician symptom report'],
        missingEvidence: ['Manufacturer-specific telemetry export and baseline comparison'],
        assessment: 'unverified',
      },
    ],
    requiredInformation: [
      'Capture external nameplate and display status photograph.',
      'Verify non-invasive visual condition of conduits, connectors, and mounting hardware.',
    ],
    safeNextActions: [
      'Perform non-invasive visual inspection from outside equipment enclosures.',
      'Capture FieldProof condition photos and log observed telemetry values.',
      'Consult the verified Knowledge Library reference for the manufacturer model before repair.',
    ],
    stopWork: false,
    stopWorkReason: null,
    sourceIds,
  };
}
