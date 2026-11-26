import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type GenerativeModel,
  type Part,
} from 'firebase/ai';
import type {
  AIInferenceRecord,
  ComponentType,
  DeviceModelAvailability,
  DiagnosticAssessment,
  HybridRuntimeCapabilities,
  InferenceSourceKind,
  KnowledgeSource,
} from '../types/sunfix';
import {
  evaluateSafetyGate,
  parseAndValidateAssessment,
  runDeterministicFallbackAssessment,
} from '../utils/diagnosticsLogic';
import { mapInferenceSource } from '../utils/inferenceSource';
import { firebaseApp, getAppCheckStatus } from './firebase';

function getSafeProviderErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error) || typeof error.code !== 'string') {
    return null;
  }
  const code = error.code.trim().slice(0, 80);
  return /^[a-z0-9/_-]+$/i.test(code) ? code : null;
}

export const CLOUD_MODEL_NAME =
  (import.meta.env.VITE_FIREBASE_AI_MODEL as string | undefined)?.trim() || 'gemini-3.5-flash-lite';

const SYSTEM_INSTRUCTION = `You are SunFix Field's solar photovoltaic diagnostic assistant.
Strict rules:
1. Respond ONLY with a single valid JSON object matching the exact schema requested.
2. Never fabricate numerical confidence scores or percentages.
3. Never suggest opening energized electrical equipment, touching live conductors, bypassing protection devices, or hazardous voltage testing.
4. Only cite sourceIds from the provided verified knowledge library list. If none match, return an empty sourceIds array [].
5. If any physical/electrical safety hazard is present, set stopWork: true and assessmentStatus: "stop_work_required".`;

const COPILOT_SYSTEM_INSTRUCTION = `You are SunFix Copilot, a grounded solar photovoltaic field-service assistant.
Strict rules:
1. Ground every technical explanation in the provided retrieved Knowledge Library entries and cite their exact IDs in square brackets (for example [kb-inv-g04]). Never invent citation IDs.
2. Never fabricate numerical confidence percentages or telemetry readings that were not provided.
3. Never instruct the technician to open energized electrical covers, touch live/bare conductors, bypass rapid-shutdown or interlocks, or probe high-voltage buses.
4. Distinguish observed evidence from possible causes and clearly list missing measurements.
5. Keep answers structured, concise, and actionable for field technicians.`;

let aiInstance: ReturnType<typeof getAI> | null = null;
let hybridModelInstance: GenerativeModel | null = null;
let cloudOnlyModelInstance: GenerativeModel | null = null;
let copilotHybridTextModel: GenerativeModel | null = null;
let copilotCloudChatModel: GenerativeModel | null = null;

function getAIInstance() {
  if (!aiInstance) {
    aiInstance = getAI(firebaseApp, {
      backend: new GoogleAIBackend(),
    });
  }
  return aiInstance;
}

export function getHybridModel(): GenerativeModel {
  if (!hybridModelInstance) {
    const ai = getAIInstance();
    hybridModelInstance = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: CLOUD_MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
      onDeviceParams: {
        createOptions: {},
      },
    });
  }
  return hybridModelInstance;
}

export function getCloudOnlyModel(): GenerativeModel {
  if (!cloudOnlyModelInstance) {
    const ai = getAIInstance();
    cloudOnlyModelInstance = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
    });
  }
  return cloudOnlyModelInstance;
}

export function getCopilotHybridTextModel(): GenerativeModel {
  if (!copilotHybridTextModel) {
    const ai = getAIInstance();
    copilotHybridTextModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: CLOUD_MODEL_NAME,
        systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.25,
        },
      },
      onDeviceParams: {
        createOptions: {},
      },
    });
  }
  return copilotHybridTextModel;
}

export function getCopilotCloudChatModel(): GenerativeModel {
  if (!copilotCloudChatModel) {
    const ai = getAIInstance();
    copilotCloudChatModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_MODEL_NAME,
        systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.25,
        },
      },
    });
  }
  return copilotCloudChatModel;
}

export interface BrowserOnDeviceSupport {
  supported: boolean;
  reason: string;
  chromeVersion: number | null;
}

export function inspectBrowserOnDeviceSupport(): BrowserOnDeviceSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'Browser runtime unavailable.', chromeVersion: null };
  }

  const ua = navigator.userAgent;
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const chromeVersion = chromeMatch ? Number.parseInt(chromeMatch[1], 10) : null;

  const hasLanguageModelApi =
    typeof (globalThis as Record<string, unknown>).LanguageModel !== 'undefined' ||
    typeof (window as unknown as { ai?: { languageModel?: unknown } }).ai?.languageModel !== 'undefined';

  if (isMobile || !chromeVersion || chromeVersion < 139) {
    return {
      supported: false,
      chromeVersion,
      reason:
        'Web on-device Gemini Nano requires Chrome Desktop v139+ with Prompt API enabled. Cloud fallback or local rule-based fallback will be used.',
    };
  }

  if (!hasLanguageModelApi) {
    return {
      supported: false,
      chromeVersion,
      reason: `Chrome Desktop ${chromeVersion} detected, but browser Prompt API (LanguageModel) is not exposed on this device.`,
    };
  }

  return {
    supported: true,
    chromeVersion,
    reason: `Chrome Desktop ${chromeVersion} with Prompt API detected. User activation required to initialize on-device model.`,
  };
}

export async function inspectHybridRuntimeCapabilities(
  onlineOverride?: boolean,
): Promise<HybridRuntimeCapabilities> {
  const browser = inspectBrowserOnDeviceSupport();
  const appCheck = getAppCheckStatus();
  const online =
    typeof onlineOverride === 'boolean'
      ? onlineOverride
      : typeof navigator !== 'undefined'
        ? navigator.onLine
        : true;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browserLabel = ua.includes('Edg/')
    ? `Edge ${browser.chromeVersion || ''}`.trim()
    : browser.chromeVersion
      ? `Chrome ${browser.chromeVersion}${/Android|iPhone|iPad|iPod/i.test(ua) ? ' Mobile' : ' Desktop'}`
      : ua.includes('Firefox/')
        ? 'Firefox'
        : ua.includes('Safari/')
          ? 'Safari'
          : 'Unknown Browser';

  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const chromeDesktopEligible = Boolean(!isMobile && browser.chromeVersion && browser.chromeVersion >= 139);

  let webGpuAvailable = false;
  let webGpuDetail = 'navigator.gpu not exposed';
  try {
    const navGpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
    if (navGpu && typeof navGpu.requestAdapter === 'function') {
      const adapter = await navGpu.requestAdapter();
      webGpuAvailable = Boolean(adapter);
      webGpuDetail = adapter ? 'WebGPU adapter available' : 'WebGPU API present, no hardware adapter';
    }
  } catch {
    webGpuAvailable = false;
    webGpuDetail = 'WebGPU adapter probe unavailable';
  }

  let storageQuotaMb: number | null = null;
  let storageUsageMb: number | null = null;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (typeof est.quota === 'number') storageQuotaMb = Math.round(est.quota / (1024 * 1024));
      if (typeof est.usage === 'number') storageUsageMb = Math.round(est.usage / (1024 * 1024));
    }
  } catch {
    // ignore storage probe restriction
  }

  let sdkLanguageModelStatus = 'API not exposed in browser';
  try {
    const lm = (globalThis as Record<string, unknown>).LanguageModel as
      | { availability?: () => Promise<string> }
      | undefined;
    if (lm && typeof lm.availability === 'function') {
      sdkLanguageModelStatus = String(await lm.availability());
    }
  } catch (err) {
    sdkLanguageModelStatus = 'Browser on-device model availability could not be checked.';
  }

  return {
    browserLabel,
    chromeVersion: browser.chromeVersion,
    chromeDesktopEligible,
    webGpuAvailable,
    webGpuDetail,
    storageQuotaMb,
    storageUsageMb,
    appCheckState: appCheck.state,
    online,
    sdkLanguageModelStatus,
    eligibilitySummary: browser.reason,
  };
}

export async function checkInitialDeviceAvailability(): Promise<{
  availability: DeviceModelAvailability;
  detail: string;
}> {
  const browserSupport = inspectBrowserOnDeviceSupport();
  if (!browserSupport.supported) {
    return {
      availability: 'unsupported',
      detail: browserSupport.reason,
    };
  }

  try {
    const lm = (globalThis as Record<string, unknown>).LanguageModel as
      | { availability?: () => Promise<string> }
      | undefined;
    if (lm && typeof lm.availability === 'function') {
      const status = await lm.availability();
      if (status === 'available' || status === 'readily') {
        return { availability: 'ready', detail: 'On-device model is downloaded and ready.' };
      }
      if (status === 'downloadable' || status === 'after-download') {
        return {
          availability: 'downloadable',
          detail: 'On-device model can be downloaded after clicking Prepare On-device AI.',
        };
      }
      if (status === 'downloading') {
        return { availability: 'downloading', detail: 'On-device model download in progress.' };
      }
      return { availability: 'unsupported', detail: `Browser reported availability: ${status}.` };
    }
    return {
      availability: 'downloadable',
      detail: 'Click Prepare On-device AI to attempt local model initialization.',
    };
  } catch (err) {
    return {
      availability: 'unsupported',
      detail: 'Unable to query browser on-device model availability. Cloud or deterministic fallback remains available.',
    };
  }
}

export async function prepareOnDeviceModel(
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; availability: DeviceModelAvailability; detail: string }> {
  const support = inspectBrowserOnDeviceSupport();
  if (!support.supported) {
    return {
      ok: false,
      availability: 'unsupported',
      detail: support.reason,
    };
  }

  try {
    const model = getHybridModel();
    onProgress(5);
    await model.initializeDeviceModel((progressValue) => {
      const pct = Math.min(100, Math.max(0, Math.round(progressValue * 100)));
      onProgress(pct);
    });
    onProgress(100);
    return {
      ok: true,
      availability: 'ready',
      detail: 'On-device Gemini model initialized and ready for local inference.',
    };
  } catch (err) {
    return {
      ok: false,
      availability: 'error',
      detail: 'On-device initialization failed. Cloud fallback remains available when connected.',
    };
  }
}

function dataUrlToInlinePart(dataUrl: string): Part | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  return {
    type: 'inlineData',
    inlineData: {
      mimeType,
      data: match[2],
    },
  };
}

export interface DiagnosisRequestPayload {
  caseId: string;
  assetName: string;
  componentType: ComponentType;
  componentName: string;
  symptoms: string[];
  symptomNotes: string;
  faultCode: string;
  readings: Array<{ label: string; value: string; unit: string }>;
  safetyFlags: string[];
  imageDataUrl?: string;
  knowledgeLibrary: KnowledgeSource[];
  forceCloudOnly?: boolean;
  onDeviceReady?: boolean;
}

export interface DiagnosisExecutionResult {
  assessment: DiagnosticAssessment;
  inferenceRecord: AIInferenceRecord;
  usedFallbackRules: boolean;
  warningMessage?: string;
}

function buildSnapshot(req: DiagnosisRequestPayload) {
  return {
    assetName: req.assetName,
    componentName: req.componentName,
    faultCode: req.faultCode || 'None',
    symptoms: req.symptoms,
    readingsCount: req.readings.length,
  };
}

function countEvidence(assessment: DiagnosticAssessment) {
  let supportingCount = 0;
  let missingCount = 0;
  for (const c of assessment.possibleCauses) {
    supportingCount += c.supportingEvidence.length;
    missingCount += c.missingEvidence.length;
  }
  return { supportingCount, missingCount };
}

export async function runHybridDiagnosis(
  req: DiagnosisRequestPayload,
): Promise<DiagnosisExecutionResult> {
  const startedAt = performance.now();
  const safetyEval = evaluateSafetyGate(req.safetyFlags);
  const snapshot = buildSnapshot(req);

  // Hard safety gate: never bypass safety holds or ask AI to generate risky repair steps
  if (safetyEval.stopWork) {
    const assessment = runDeterministicFallbackAssessment(
      {
        assetName: req.assetName,
        componentType: req.componentType,
        componentName: req.componentName,
        symptoms: req.symptoms,
        faultCode: req.faultCode,
        readings: req.readings,
        safetyFlags: req.safetyFlags,
      },
      req.knowledgeLibrary,
    );
    const counts = countEvidence(assessment);
    return {
      assessment,
      usedFallbackRules: true,
      inferenceRecord: {
        id: `inf-${Date.now()}`,
        caseId: req.caseId,
        modeRequested: 'deterministic_fallback',
        inferenceSource: 'demo_rules',
        modelName: 'SunFix Safety Gate Policy Engine',
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        validationPassed: true,
        ...counts,
        requestSnapshot: snapshot,
      },
    };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline && !req.onDeviceReady) {
    const assessment = runDeterministicFallbackAssessment(
      {
        assetName: req.assetName,
        componentType: req.componentType,
        componentName: req.componentName,
        symptoms: req.symptoms,
        faultCode: req.faultCode,
        readings: req.readings,
        safetyFlags: req.safetyFlags,
      },
      req.knowledgeLibrary,
    );
    const counts = countEvidence(assessment);
    return {
      assessment,
      usedFallbackRules: true,
      warningMessage:
        'Device is offline and on-device generative model is not initialized. Returned cached deterministic rule assessment (non-generative fallback).',
      inferenceRecord: {
        id: `inf-${Date.now()}`,
        caseId: req.caseId,
        modeRequested: 'deterministic_fallback',
        inferenceSource: 'demo_rules',
        modelName: 'SunFix Offline Rule Knowledge Base (Non-Generative)',
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        validationPassed: true,
        ...counts,
        requestSnapshot: snapshot,
      },
    };
  }

  const kbContext = req.knowledgeLibrary.map((k) => ({
    id: k.id,
    title: k.title,
    faultCode: k.faultCode || null,
    category: k.category,
    guidance: k.guidance,
  }));

  const promptText = `Analyze this solar photovoltaic field diagnostic intake and return STRICT JSON matching the schema below.

Installation Asset: ${req.assetName}
Selected Component: ${req.componentName} (type: ${req.componentType})
Reported Symptoms: ${req.symptoms.join(', ') || 'None selected'}
Technician Symptom Notes: ${req.symptomNotes || 'None provided'}
Fault Code: ${req.faultCode || 'None reported'}
Observed Readings: ${req.readings.length > 0 ? req.readings.map((r) => `${r.label}: ${r.value} ${r.unit}`).join(' | ') : 'None provided'}
Safety Gate Screening: Cleared (no immediate burning smell, smoke, sparks, exposed conductors, or water ingress reported)

Verified Knowledge Library Entries (ONLY cite IDs from this list in sourceIds):
${JSON.stringify(kbContext)}

Required JSON schema:
{
  "caseTitle": string,
  "summary": string,
  "severity": "low" | "medium" | "high" | "critical",
  "assessmentStatus": "evidence_available" | "needs_inspection" | "stop_work_required",
  "possibleCauses": [
    {
      "cause": string,
      "supportingEvidence": string[],
      "missingEvidence": string[],
      "assessment": "likely" | "possible" | "requires_inspection" | "unverified"
    }
  ],
  "requiredInformation": string[],
  "safeNextActions": string[],
  "stopWork": boolean,
  "stopWorkReason": string | null,
  "sourceIds": string[]
}`;

  const parts: Array<string | Part> = [promptText];
  if (req.imageDataUrl) {
    const imgPart = dataUrlToInlinePart(req.imageDataUrl);
    if (imgPart) {
      parts.push(imgPart);
    }
  }

  try {
    const model = req.forceCloudOnly ? getCloudOnlyModel() : getHybridModel();
    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    const actualSource = mapInferenceSource(result.response.inferenceSource, req.forceCloudOnly ? 'only_in_cloud' : 'prefer_on_device');
    const validIds = req.knowledgeLibrary.map((k) => k.id);
    const parsed = parseAndValidateAssessment(rawText, validIds);

    if (!parsed.ok) {
      throw new Error(`Invalid structured response from Firebase AI Logic: ${parsed.error}`);
    }

    const counts = countEvidence(parsed.data);
    return {
      assessment: parsed.data,
      usedFallbackRules: false,
      inferenceRecord: {
        id: `inf-${Date.now()}`,
        caseId: req.caseId,
        modeRequested: req.forceCloudOnly ? 'only_in_cloud' : 'prefer_on_device',
        inferenceSource: actualSource,
        modelName:
          actualSource === 'on_device'
            ? 'Gemini Nano (On-Device via Firebase AI Logic)'
            : actualSource === 'in_cloud'
              ? `${CLOUD_MODEL_NAME} (Cloud via Firebase AI Logic)`
              : 'Firebase AI Logic (inference source unavailable)',
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        validationPassed: true,
        droppedSourceIds: parsed.droppedSourceIds,
        ...counts,
        requestSnapshot: snapshot,
      },
    };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    const isPermissionOrApiDisabled =
      rawError.includes('403') ||
      rawError.includes('ACCESS_DENIED') ||
      rawError.includes('api-not-enabled') ||
      rawError.includes('Permission denied');
    const providerErrorCode = getSafeProviderErrorCode(err);
    const cleanDetail = isPermissionOrApiDisabled
      ? 'Firebase AI Logic returned an access error. Enable Firebase AI Logic and configure App Check in Firebase Console.'
      : providerErrorCode
        ? `Firebase AI Logic request failed (${providerErrorCode}).`
        : 'Firebase AI Logic request failed. A deterministic fallback was used.';

    const appCheck = getAppCheckStatus();
    const assessment = runDeterministicFallbackAssessment(
      {
        assetName: req.assetName,
        componentType: req.componentType,
        componentName: req.componentName,
        symptoms: req.symptoms,
        faultCode: req.faultCode,
        readings: req.readings,
        safetyFlags: req.safetyFlags,
      },
      req.knowledgeLibrary,
    );

    const hint = isPermissionOrApiDisabled
      ? 'Cloud Firebase AI Logic is not yet enabled or permitted on this Firebase project (enable AI Logic in Firebase Console). Showing deterministic offline rule assessment instead.'
      : appCheck.state === 'unconfigured_missing_site_key'
        ? 'Firebase AI Logic request could not complete (App Check site key is not configured or Firebase AI Logic API needs enabling in Console). Showing deterministic offline rules instead.'
        : `Firebase AI Logic call fell back to deterministic rules: ${cleanDetail}`;

    const counts = countEvidence(assessment);
    return {
      assessment,
      usedFallbackRules: true,
      warningMessage: hint,
      inferenceRecord: {
        id: `inf-${Date.now()}`,
        caseId: req.caseId,
        modeRequested: req.forceCloudOnly ? 'only_in_cloud' : 'prefer_on_device',
        inferenceSource: 'demo_rules',
        modelName: 'SunFix Offline Rule Fallback (Non-Generative)',
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - startedAt),
        errorDetail: cleanDetail,
        validationPassed: !rawError.includes('Schema validation failed'),
        validationError: rawError.includes('Schema validation failed') ? cleanDetail : undefined,
        ...counts,
        requestSnapshot: snapshot,
      },
    };
  }
}

export async function analyzePdfManualCloudOnly(params: {
  fileName: string;
  base64Pdf: string;
}): Promise<{
  ok: boolean;
  extracted?: {
    title: string;
    publisher: string;
    category: KnowledgeSource['category'];
    faultCode: string;
    guidance: string;
    safetyNotice: string;
    sectionRef: string;
  };
  inferenceSource: InferenceSourceKind;
  error?: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      inferenceSource: 'unavailable',
      error: 'PDF manual analysis requires cloud-only Firebase AI Logic connectivity and is unavailable offline.',
    };
  }

  try {
    const model = getCloudOnlyModel();
    const result = await model.generateContent([
      `Extract structured technical solar maintenance reference details from this PDF document (${params.fileName}). Return ONLY JSON with keys: title, publisher, category ("inverter"|"solar_panel"|"battery"|"grid_connection"|"safety"), faultCode, guidance, safetyNotice, sectionRef.`,
      {
        type: 'inlineData',
        inlineData: {
          mimeType: 'application/pdf',
          data: params.base64Pdf,
        },
      },
    ]);
    const raw = result.response.text();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return {
      ok: true,
      inferenceSource: mapInferenceSource(result.response.inferenceSource, 'only_in_cloud'),
      extracted: {
        title: String(parsed.title || params.fileName).slice(0, 160),
        publisher: String(parsed.publisher || 'Imported Manual').slice(0, 100),
        category: ['inverter', 'solar_panel', 'battery', 'grid_connection', 'safety'].includes(
          parsed.category,
        )
          ? parsed.category
          : 'inverter',
        faultCode: String(parsed.faultCode || '').slice(0, 32),
        guidance: String(parsed.guidance || 'Extracted manual summary.').slice(0, 1200),
        safetyNotice: String(
          parsed.safetyNotice || 'Follow manufacturer LOTO and qualified personnel procedures.',
        ).slice(0, 600),
        sectionRef: String(parsed.sectionRef || 'Imported PDF').slice(0, 100),
      },
    };
  } catch (err) {
    return {
      ok: false,
      inferenceSource: 'unavailable',
      error: getSafeProviderErrorCode(err) ? `Cloud PDF analysis failed (${getSafeProviderErrorCode(err)}).` : 'Cloud PDF analysis failed. Check connectivity and Firebase AI configuration.',
    };
  }
}

import type { CopilotActionChip, CopilotMessage } from '../types/sunfix';
import {
  buildCopilotPrompt,
  detectChatHazard,
  detectEvidenceStatus,
  extractCitedIdsFromText,
  filterCopilotResponse,
  retrieveRelevantKnowledge,
  routeCopilotIntent,
  runDeterministicCopilotFallback,
  type CopilotContextPayload,
} from '../utils/copilotLogic';

export interface RunCopilotTurnParams {
  userMessage: string;
  historyMessages: CopilotMessage[];
  context: CopilotContextPayload;
  knowledgeDocs: KnowledgeSource[];
  mode: 'cloud_chat' | 'on_device_single';
  onDeviceReady: boolean;
  readingsCount: number;
  onStreamChunk?: (partialText: string) => void;
}

export interface RunCopilotTurnResult {
  text: string;
  inferenceSource: InferenceSourceKind;
  modelName: string;
  latencyMs: number;
  citedSourceIds: string[];
  droppedSourceIds: string[];
  evidenceStatus: CopilotMessage['evidenceStatus'];
  actions: CopilotActionChip[];
  stopWorkHold: boolean;
  safetyFiltered: boolean;
  payloadSentPreview: string;
  intent: CopilotMessage['intent'];
  errorNotice?: string;
}

function buildActionChips(params: {
  intent: ReturnType<typeof routeCopilotIntent>;
  componentId?: CopilotContextPayload['componentId'];
  caseId?: string;
  stopWorkHold: boolean;
}): CopilotActionChip[] {
  if (params.stopWorkHold) {
    return [
      {
        id: 'act-fp-hazard',
        label: 'Add FieldProof photo',
        actionType: 'add_fieldproof',
        caseId: params.caseId,
      },
      {
        id: 'act-wizard-hazard',
        label: 'Open diagnostic wizard',
        actionType: 'open_wizard',
        targetComponentId: params.componentId || 'inverter',
      },
    ];
  }
  const chips: CopilotActionChip[] = [
    {
      id: 'act-3d',
      label: 'Highlight component in 3D',
      actionType: 'highlight_3d',
      targetComponentId: params.componentId || 'inverter',
    },
    {
      id: 'act-wizard',
      label: 'Open diagnostic wizard',
      actionType: 'open_wizard',
      targetComponentId: params.componentId || 'inverter',
    },
    {
      id: 'act-checklist',
      label: 'Start repair checklist',
      actionType: 'start_checklist',
      caseId: params.caseId,
    },
    {
      id: 'act-fp',
      label: 'Add FieldProof photo',
      actionType: 'add_fieldproof',
      caseId: params.caseId,
    },
  ];
  if (params.intent === 'energy_impact') {
    chips.unshift({
      id: 'act-calc',
      label: 'Open energy calculator',
      actionType: 'open_calculator',
    });
  }
  return chips;
}

export async function runCopilotTurn(params: RunCopilotTurnParams): Promise<RunCopilotTurnResult> {
  const startedAt = performance.now();
  const intent = routeCopilotIntent(params.userMessage);
  const retrievedDocs = retrieveRelevantKnowledge(
    params.userMessage,
    params.knowledgeDocs,
    params.context.componentId,
    params.context.faultCode,
    3,
  );
  const promptText = buildCopilotPrompt({
    userMessage: params.userMessage,
    context: params.context,
    retrievedDocs,
    intent,
  });

  // 1. Pre-call deterministic electrical/physical hazard screen (zero model call)
  const hazard = detectChatHazard(params.userMessage, params.context.readingsSummary || '');
  if (hazard.triggered) {
    return {
      text: hazard.reason,
      inferenceSource: 'demo_rules',
      modelName: 'SunFix Safety Gate Pre-Screen (Zero Model Call)',
      latencyMs: Math.round(performance.now() - startedAt),
      citedSourceIds: ['kb-nfpa-70e', 'kb-nec-690'].filter((id) =>
        params.knowledgeDocs.some((d) => d.id === id),
      ),
      droppedSourceIds: [],
      evidenceStatus: 'requires_inspection',
      actions: buildActionChips({
        intent,
        componentId: params.context.componentId,
        caseId: params.context.openCaseId,
        stopWorkHold: true,
      }),
      stopWorkHold: true,
      safetyFiltered: false,
      payloadSentPreview: promptText,
      intent,
    };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const shouldUseFallbackImmediately =
    (!isOnline && !(params.mode === 'on_device_single' && params.onDeviceReady));

  if (shouldUseFallbackImmediately) {
    const fb = runDeterministicCopilotFallback({
      userMessage: params.userMessage,
      context: params.context,
      retrievedDocs,
      intent,
    });
    return {
      text: fb.text,
      inferenceSource: 'demo_rules',
      modelName: 'SunFix Offline Grounded Rules (Non-Generative)',
      latencyMs: Math.round(performance.now() - startedAt),
      citedSourceIds: fb.citedIds,
      droppedSourceIds: [],
      evidenceStatus: detectEvidenceStatus({
        text: fb.text,
        citedCount: fb.citedIds.length,
        readingsCount: params.readingsCount,
      }),
      actions: buildActionChips({
        intent,
        componentId: params.context.componentId,
        caseId: params.context.openCaseId,
        stopWorkHold: false,
      }),
      stopWorkHold: false,
      safetyFiltered: false,
      payloadSentPreview: promptText,
      intent,
    };
  }

  try {
    let rawText = '';
    let actualSource: InferenceSourceKind = 'in_cloud';

    if (params.mode === 'on_device_single') {
      // Single-shot independent request via PREFER_ON_DEVICE (never multi-turn on-device)
      const model = getCopilotHybridTextModel();
      const streamResult = await model.generateContentStream(promptText);
      for await (const chunk of streamResult.stream) {
        const piece = chunk.text();
        if (piece) {
          rawText += piece;
          params.onStreamChunk?.(rawText);
        }
      }
      const finalResp = await streamResult.response;
      if (!rawText) rawText = finalResp.text();
      actualSource = mapInferenceSource(finalResp.inferenceSource, 'prefer_on_device');
    } else {
      // Multi-turn streaming on cloud via ONLY_IN_CLOUD startChat + sendMessageStream
      const model = getCopilotCloudChatModel();
      const validHistory = params.historyMessages
        .filter((m) => !m.error && m.text.trim().length > 0)
        .slice(-10)
        .map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ type: 'text' as const, text: m.text }],
        }));
      const chat = model.startChat({ history: validHistory });
      const streamResult = await chat.sendMessageStream(promptText);
      for await (const chunk of streamResult.stream) {
        const piece = chunk.text();
        if (piece) {
          rawText += piece;
          params.onStreamChunk?.(rawText);
        }
      }
      const finalResp = await streamResult.response;
      if (!rawText) rawText = finalResp.text();
      actualSource = mapInferenceSource(finalResp.inferenceSource, 'only_in_cloud');
    }

    // 2. Post-response deterministic safety filter
    const filtered = filterCopilotResponse(rawText, params.context.language);
    const citedSourceIds = extractCitedIdsFromText(filtered.sanitizedText, params.knowledgeDocs);
    const rawMentioned = (filtered.sanitizedText.match(/\bkb-[a-z0-9-]+\b/gi) || []).map((s) =>
      s.toLowerCase(),
    );
    const validSet = new Set(citedSourceIds);
    const droppedSourceIds = rawMentioned.filter((id) => !validSet.has(id));
    if (droppedSourceIds.length > 0) {
      console.warn('[SunFix Copilot] Dropped unknown citation IDs:', droppedSourceIds);
    }

    const finalCited =
      citedSourceIds.length > 0 ? citedSourceIds : retrievedDocs.slice(0, 2).map((d) => d.id);

    return {
      text: filtered.sanitizedText,
      inferenceSource: actualSource,
      modelName:
        actualSource === 'on_device'
          ? 'Gemini Nano (Single-Shot On-Device)'
          : actualSource === 'in_cloud'
            ? `${CLOUD_MODEL_NAME} (Cloud Streaming via Firebase AI Logic)`
            : 'Firebase AI Logic (inference source unavailable)',
      latencyMs: Math.round(performance.now() - startedAt),
      citedSourceIds: finalCited,
      droppedSourceIds,
      evidenceStatus: filtered.safe
        ? detectEvidenceStatus({
            text: filtered.sanitizedText,
            citedCount: finalCited.length,
            readingsCount: params.readingsCount,
          })
        : 'requires_inspection',
      actions: buildActionChips({
        intent,
        componentId: params.context.componentId,
        caseId: params.context.openCaseId,
        stopWorkHold: !filtered.safe,
      }),
      stopWorkHold: !filtered.safe,
      safetyFiltered: !filtered.safe,
      payloadSentPreview: promptText,
      intent,
    };
  } catch (err) {
    console.warn('[SunFix Copilot] AI request failed; deterministic fallback used.');
    const fb = runDeterministicCopilotFallback({
      userMessage: params.userMessage,
      context: params.context,
      retrievedDocs,
      intent,
    });
    return {
      text: fb.text,
      inferenceSource: 'demo_rules',
      modelName: 'SunFix Offline Grounded Rules (Fallback)',
      latencyMs: Math.round(performance.now() - startedAt),
      citedSourceIds: fb.citedIds,
      droppedSourceIds: [],
      evidenceStatus: detectEvidenceStatus({
        text: fb.text,
        citedCount: fb.citedIds.length,
        readingsCount: params.readingsCount,
      }),
      actions: buildActionChips({
        intent,
        componentId: params.context.componentId,
        caseId: params.context.openCaseId,
        stopWorkHold: false,
      }),
      stopWorkHold: false,
      safetyFiltered: false,
      payloadSentPreview: promptText,
      intent,
      errorNotice:
        'Live Firebase AI Logic service is currently unreachable or unconfigured; showing grounded deterministic reference guidance instead.',
    };
  }
}

