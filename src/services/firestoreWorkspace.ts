import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { z } from 'zod';
import type {
  Asset,
  CopilotThread,
  DiagnosticCase,
  EvidenceRecord,
  KnowledgeSource,
  ServiceReport,
  WorkOrder,
} from '../types/sunfix';
import { auth, db } from './firebase';

export const FIRESTORE_SCHEMA_VERSION = 2;
export const MAX_DOMAIN_PAYLOAD_CHARS = 180_000;
const MAX_DOMAIN_PAYLOAD_BYTES = 700_000;
export const FIRESTORE_PAGE_SIZE = 100;

export type CloudEntityType = 'asset' | 'case' | 'workOrder' | 'evidence' | 'report' | 'knowledge' | 'copilotThread';
export interface CloudWorkspaceRecords {
  assets: Asset[];
  cases: DiagnosticCase[];
  workOrders: WorkOrder[];
  evidence: EvidenceRecord[];
  reports: ServiceReport[];
  knowledgeDocs: KnowledgeSource[];
  copilotThreads: CopilotThread[];
}
export interface IncompleteCloudRecord {
  collection: string;
  id: string;
  reason: 'legacy_schema' | 'invalid_record' | 'owner_mismatch';
}
export interface CloudWorkspaceSnapshot {
  records: CloudWorkspaceRecords;
  profileFound: boolean;
  incomplete: IncompleteCloudRecord[];
  counts: { assets: number; cases: number; workOrders: number; reports: number };
}

const shortId = z.string().min(1).max(128);
const boundedText = (max: number) => z.string().max(max);
const dateText = z.string().min(1).max(40);
const stringList = z.array(boundedText(500)).max(200);
const assessment = z.object({
  caseTitle: boundedText(180),
  summary: boundedText(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  assessmentStatus: z.enum(['evidence_available', 'needs_inspection', 'stop_work_required']),
  possibleCauses: z.array(z.object({
    cause: boundedText(500),
    supportingEvidence: stringList,
    missingEvidence: stringList,
    assessment: z.enum(['likely', 'possible', 'requires_inspection', 'unverified']),
  })).max(50),
  requiredInformation: stringList,
  safeNextActions: stringList,
  stopWork: z.boolean(),
  stopWorkReason: boundedText(1200).nullable(),
  sourceIds: z.array(shortId).max(100),
}).strict();
const inference = z.object({
  id: shortId,
  caseId: shortId,
  modeRequested: z.enum(['prefer_on_device', 'only_in_cloud', 'deterministic_fallback']),
  inferenceSource: z.enum(['on_device', 'in_cloud', 'demo_rules', 'unavailable']),
  modelName: boundedText(120),
  timestamp: dateText,
  latencyMs: z.number().finite().nonnegative().max(600_000),
  errorDetail: boundedText(1000).optional(),
  validationPassed: z.boolean().optional(),
  validationError: boundedText(1000).optional(),
  droppedSourceIds: z.array(shortId).max(100).optional(),
  supportingCount: z.number().int().nonnegative().max(200).optional(),
  missingCount: z.number().int().nonnegative().max(200).optional(),
  requestSnapshot: z.object({
    assetName: boundedText(140), componentName: boundedText(120), faultCode: boundedText(40),
    symptoms: stringList, readingsCount: z.number().int().nonnegative().max(100),
  }).strict().optional(),
}).strict();
const timeline = z.array(z.object({
  id: shortId, timestamp: dateText,
  kind: z.enum(['safety_check', 'ai_inference', 'evidence', 'checklist_step', 'status_change', 'review']),
  title: boundedText(180), detail: boundedText(1200), badge: boundedText(40).optional(),
}).strict()).max(200);
const component = z.object({
  id: shortId, assetId: shortId,
  twinId: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'site_load']),
  type: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'other']),
  name: boundedText(120), modelIdentifier: boundedText(120), serialNumber: boundedText(80),
  status: z.enum(['nominal', 'warning', 'fault', 'investigating', 'resolved']),
  lastInspectionAt: dateText, notes: boundedText(1200),
}).strict();

const payloadSchemas: Record<CloudEntityType, z.ZodTypeAny> = {
  asset: z.object({
    id: shortId, ownerId: shortId, name: z.string().min(1).max(140),
    siteType: z.enum(['residential', 'commercial', 'microgrid']), locationLabel: z.string().min(1).max(140),
    capacityKw: z.number().finite().min(0).max(100000), status: z.enum(['nominal', 'warning', 'fault', 'offline']),
    inverterModel: z.string().min(1).max(120), inverterSerial: z.string().min(1).max(80),
    batteryModel: boundedText(120).optional(), batteryCapacityKwh: z.number().finite().min(0).max(100000).optional(),
    panelCount: z.number().int().min(0).max(100000), installedYear: z.number().int().min(1800).max(2200),
    lastInspectionAt: dateText, isDemo: z.boolean(), components: z.array(component).max(200),
    createdAt: dateText, updatedAt: dateText,
  }).strict(),
  case: z.object({
    id: shortId, ownerId: shortId, assetId: shortId, assetName: boundedText(140), componentId: shortId,
    twinComponentId: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'site_load']),
    componentType: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'other']),
    componentName: boundedText(120), title: z.string().min(1).max(180), symptoms: stringList,
    symptomNotes: boundedText(1200), faultCode: boundedText(40),
    readings: z.array(z.object({ label: boundedText(120), value: boundedText(80), unit: boundedText(40) }).strict()).max(100),
    imageEvidenceName: boundedText(180).optional(), imageEvidenceDataUrl: z.string().optional(),
    safetyHazardDetected: z.boolean(), safetyFlags: z.array(shortId).max(50), stopWork: z.boolean(),
    stopWorkReason: boundedText(1200).nullable(), priority: z.enum(['critical', 'high', 'medium', 'low']),
    status: z.enum(['open', 'investigating', 'safety_blocked', 'resolved']), inferenceRecord: inference,
    assessment, cloudDeepAnalysis: assessment.optional(), cloudInferenceRecord: inference.optional(),
    reviewStatus: z.enum(['draft', 'pending_review', 'approved', 'changes_requested']).optional(),
    reviewedBy: shortId.optional(), reviewedAt: dateText.optional(), reviewNote: boundedText(600).optional(),
    timeline: timeline.optional(), isDemo: z.boolean(), createdAt: dateText, updatedAt: dateText,
  }).strict(),
  workOrder: z.object({
    id: shortId, ownerId: shortId, caseId: shortId, assetId: shortId, assetName: boundedText(140),
    componentId: shortId, twinComponentId: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'site_load']),
    componentName: boundedText(120), title: z.string().min(1).max(180), problemDescription: boundedText(1200),
    status: z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'escalated']),
    priority: z.enum(['critical', 'high', 'medium', 'low']), safetyCleared: z.boolean(),
    tasks: z.array(z.object({ id: shortId, title: boundedText(180), safetyNote: boundedText(600),
      requiresVerification: z.boolean(), status: z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'escalated']),
      completedAt: dateText.optional() }).strict()).max(100),
    technicianNotes: boundedText(2000), verificationNotes: boundedText(1200), escalatedReason: boundedText(600).optional(),
    reviewStatus: z.enum(['draft', 'pending_review', 'approved', 'changes_requested']).optional(),
    reviewedBy: shortId.optional(), reviewedAt: dateText.optional(), reviewNote: boundedText(600).optional(),
    timeline: timeline.optional(), isDemo: z.boolean(), createdAt: dateText, updatedAt: dateText,
  }).strict(),
  evidence: z.object({
    id: shortId, ownerId: shortId, caseId: shortId, workOrderId: shortId.optional(), assetId: shortId,
    componentId: shortId, componentName: boundedText(120),
    evidenceType: z.enum(['before_photo', 'after_photo', 'condition_photo', 'observed_reading', 'inspection_note', 'repair_note', 'completion_evidence']),
    originKind: z.enum(['original_evidence', 'simulated_demo_evidence', 'ai_explanatory_text']),
    caption: z.string().min(1).max(180), note: boundedText(1200), readingValue: boundedText(80).optional(),
    readingUnit: boundedText(40).optional(), imageDataUrl: z.string().optional(), audioDataUrl: z.string().optional(),
    geoTag: z.object({ lat: z.number().finite(), lng: z.number().finite(), accuracyMeters: z.number().finite().nonnegative(), capturedAt: dateText, note: boundedText(300) }).strict().optional(),
    audioDurationSec: z.number().finite().nonnegative().max(3600).optional(), voiceTranscript: boundedText(3000).optional(),
    filePersistenceStatus: z.enum(['local_only', 'uploading', 'uploaded', 'failed']).optional(), timestamp: dateText,
  }).strict(),
  report: z.object({
    id: shortId, ownerId: shortId, reportCode: z.string().min(3).max(40), caseId: shortId,
    workOrderId: shortId.optional(), assetId: shortId, title: z.string().min(1).max(180),
    status: z.enum(['completed', 'escalated', 'pending_verification']), summary: z.string().min(1).max(2000),
    estimatedImpactKwh: z.number().finite().nonnegative().max(1e9).optional(), outstandingIssues: boundedText(2000),
    isSimulated: z.boolean(), sourceIds: z.array(shortId).max(100), canonicalHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    createdAt: dateText,
  }).strict(),
  knowledge: z.object({
    id: shortId, title: z.string().min(1).max(180), publisher: z.string().min(1).max(120),
    category: z.enum(['inverter', 'solar_panel', 'battery', 'grid_connection', 'safety']), faultCode: boundedText(40).optional(),
    symptoms: stringList, guidance: z.string().min(1).max(2000), safetyNotice: boundedText(1200),
    documentUrl: boundedText(300), sectionRef: boundedText(120), verifiedDate: dateText,
    isDemoPack: z.boolean(), isUserImported: z.boolean().optional(),
  }).strict(),
  copilotThread: z.object({
    id: shortId, ownerId: shortId, title: z.string().min(1).max(180), assetId: shortId.optional(),
    componentId: z.enum(['solar_panel', 'inverter', 'battery', 'connection', 'grid_meter', 'site_load']).optional(),
    caseId: shortId.optional(), language: z.enum(['en', 'bn']),
    messages: z.array(z.object({ id: shortId, role: z.enum(['user', 'assistant']), text: boundedText(12000),
      timestamp: dateText, inferenceSource: z.enum(['on_device', 'in_cloud', 'demo_rules', 'unavailable']).optional(),
    }).passthrough()).max(500), createdAt: dateText, updatedAt: dateText,
  }).passthrough(),
};

function stripLocalBinary(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLocalBinary);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (['imageDataUrl', 'audioDataUrl', 'imageEvidenceDataUrl', 'cloudRevision'].includes(key)) continue;
    result[key] = stripLocalBinary(entry);
  }
  return result;
}

export function encodeDomainPayload(type: CloudEntityType, payload: unknown, ownerId: string): string {
  const candidate = stripLocalBinary(payload);
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Cloud record validation failed: expected an object payload.');
  }
  const withOwner = { ...(candidate as Record<string, unknown>) };
  if (type !== 'knowledge') withOwner.ownerId = ownerId;
  const validated = payloadSchemas[type].parse(withOwner);
  const serialized = JSON.stringify(validated);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (serialized.length > MAX_DOMAIN_PAYLOAD_CHARS || byteLength > MAX_DOMAIN_PAYLOAD_BYTES) {
    throw new Error(`Cloud record is too large for safe Firestore metadata (${MAX_DOMAIN_PAYLOAD_CHARS} characters / ${MAX_DOMAIN_PAYLOAD_BYTES} bytes limit).`);
  }
  return serialized;
}

function normalizeRestoredEntity(type: CloudEntityType, payload: unknown, envelope: DocumentData, uid: string): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid_payload');
  const entity = payload as Record<string, unknown>;
  if (entity.id !== envelope.id) throw new Error('id_mismatch');
  if (type !== 'knowledge' && entity.ownerId !== uid) throw new Error('payload_owner_mismatch');
  const common: Record<string, unknown> = { ...entity, id: envelope.id };
  if (type !== 'knowledge') common.ownerId = uid;
  if (type === 'asset') {
    return { ...common, name: envelope.name, siteType: envelope.siteType, locationLabel: envelope.locationLabel,
      capacityKw: envelope.capacityKw, status: envelope.status, inverterModel: envelope.inverterModel,
      inverterSerial: envelope.inverterSerial, panelCount: envelope.panelCount, isDemo: envelope.isDemo,
      cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  }
  if (type === 'case') {
    const stop = envelope.stopWork === true;
    const hazard = envelope.safetyHazardDetected === true;
    const wireStatus = envelope.status;
    const safeStatus = wireStatus === 'safety_blocked' || wireStatus === 'resolved' || wireStatus === 'investigating' ? wireStatus : 'open';
    const restoredAssessment = entity.assessment as Record<string, unknown>;
    const restoredInference = entity.inferenceRecord as Record<string, unknown>;
    return { ...common, assetId: envelope.assetId, componentId: envelope.componentId, componentType: envelope.componentType,
      title: envelope.title, faultCode: envelope.faultCode || '', safetyHazardDetected: hazard, stopWork: stop,
      priority: envelope.priority, status: safeStatus,
      inferenceRecord: { ...restoredInference, inferenceSource: envelope.inferenceSource },
      assessment: { ...restoredAssessment, summary: envelope.assessmentSummary, stopWork: stop,
        stopWorkReason: stop ? restoredAssessment.stopWorkReason : null },
      cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  }
  if (type === 'workOrder') {
    const tasks = entity.tasks as Array<Record<string, unknown>>;
    if (tasks.length !== envelope.totalSteps || tasks.filter((task) => task.status === 'completed').length !== envelope.completedSteps) {
      throw new Error('work_order_task_summary_mismatch');
    }
    return { ...common, caseId: envelope.caseId, assetId: envelope.assetId, componentId: envelope.componentId,
      title: envelope.title, status: envelope.status, priority: envelope.priority, safetyCleared: envelope.safetyCleared,
      technicianNotes: envelope.technicianNotes || '', cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  }
  if (type === 'evidence') return { ...common, caseId: envelope.caseId, assetId: envelope.assetId,
    componentId: envelope.componentId, evidenceType: envelope.evidenceType, originKind: envelope.originKind,
    caption: envelope.caption, note: envelope.note || '', imageDataUrl: undefined,
    filePersistenceStatus: entity.filePersistenceStatus || 'local_only',
    cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  if (type === 'report') return { ...common, caseId: envelope.caseId, assetId: envelope.assetId,
    reportCode: envelope.reportCode, title: envelope.title, status: envelope.status, summary: envelope.summary,
    isSimulated: envelope.isSimulated, canonicalHash: envelope.canonicalHash,
    cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  if (type === 'knowledge') return { ...common, title: envelope.title, publisher: envelope.publisher,
    category: envelope.category, faultCode: envelope.faultCode, guidance: envelope.summary,
    documentUrl: envelope.sourceUrl || '', verifiedDate: envelope.verifiedDate,
    cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
  const messages = entity.messages as Array<Record<string, unknown>>;
  if (messages.length !== envelope.messageCount) throw new Error('copilot_message_summary_mismatch');
  return { ...common, title: envelope.title, language: envelope.language,
    cloudRevision: typeof envelope.revision === 'number' ? envelope.revision : undefined };
}

function decodeV2(type: CloudEntityType, envelope: DocumentData, uid: string): unknown {
  if (envelope.schemaVersion !== FIRESTORE_SCHEMA_VERSION || typeof envelope.domainPayload !== 'string'
    || envelope.domainPayload.length > MAX_DOMAIN_PAYLOAD_CHARS || !Number.isInteger(envelope.revision)
    || (envelope.revision as number) < 1) {
    throw new Error('legacy_schema');
  }
  const json = JSON.parse(envelope.domainPayload) as unknown;
  const validated = payloadSchemas[type].parse(json);
  return normalizeRestoredEntity(type, validated, envelope, uid);
}

export function decodeCloudEntityDocument<T>(type: CloudEntityType, envelope: DocumentData, uid: string): T {
  if (envelope.ownerId !== uid) throw new Error('owner_mismatch');
  return decodeV2(type, envelope, uid) as T;
}

async function fetchPagedCollection<T>(
  path: string,
  type: CloudEntityType,
  uid: string,
  pageSize: number,
): Promise<{ records: T[]; incomplete: IncompleteCloudRecord[]; count: number }> {
  const records: T[] = [];
  const incomplete: IncompleteCloudRecord[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  let count = 0;
  while (true) {
    if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) throw new Error('account_changed');
    const parts = [where('ownerId', '==', uid), limit(pageSize)];
    const pageQuery = query(collection(db, path), ...(cursor ? [...parts.slice(0, 1), startAfter(cursor), parts[1]] : parts));
    const page = await getDocs(pageQuery);
    count += page.size;
    for (const snapshot of page.docs) {
      const raw = snapshot.data();
      if (raw.ownerId !== uid) {
        incomplete.push({ collection: path, id: snapshot.id, reason: 'owner_mismatch' });
        continue;
      }
      try {
        const restored = decodeCloudEntityDocument<T>(type, { ...raw, id: snapshot.id }, uid);
        records.push(restored);
      } catch (error) {
        incomplete.push({ collection: path, id: snapshot.id,
          reason: error instanceof Error && error.message === 'legacy_schema' ? 'legacy_schema' : 'invalid_record' });
      }
    }
    if (page.size < pageSize) break;
    cursor = page.docs[page.docs.length - 1];
  }
  return { records, incomplete, count };
}

export async function fetchUserCloudWorkspace(uid: string, pageSize = FIRESTORE_PAGE_SIZE): Promise<CloudWorkspaceSnapshot> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    throw new Error('A verified signed-in account is required to restore cloud data.');
  }
  const profileRef = doc(db, 'users', uid);
  const profilePromise = getDoc(profileRef);
  const [profile, assets, cases, workOrders, evidence, reports, knowledge, threads] = await Promise.all([
    profilePromise,
    fetchPagedCollection<Asset>('assets', 'asset', uid, pageSize),
    fetchPagedCollection<DiagnosticCase>('diagnosticCases', 'case', uid, pageSize),
    fetchPagedCollection<WorkOrder>('workOrders', 'workOrder', uid, pageSize),
    fetchPagedCollection<EvidenceRecord>('evidenceRecords', 'evidence', uid, pageSize),
    fetchPagedCollection<ServiceReport>('serviceReports', 'report', uid, pageSize),
    fetchPagedCollection<KnowledgeSource>('knowledgeDocs', 'knowledge', uid, pageSize),
    fetchPagedCollection<CopilotThread>('copilotThreads', 'copilotThread', uid, pageSize),
  ]);
  if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) throw new Error('account_changed');
  const incomplete = [...assets.incomplete, ...cases.incomplete, ...workOrders.incomplete, ...evidence.incomplete,
    ...reports.incomplete, ...knowledge.incomplete, ...threads.incomplete];
  return {
    records: { assets: assets.records, cases: cases.records, workOrders: workOrders.records,
      evidence: evidence.records, reports: reports.records, knowledgeDocs: knowledge.records,
      copilotThreads: threads.records },
    profileFound: profile.exists(), incomplete,
    counts: { assets: assets.count, cases: cases.count, workOrders: workOrders.count, reports: reports.count },
  };
}
