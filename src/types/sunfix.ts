export type LifecycleSlug =
  | 'digital-twin'
  | 'safety-gate'
  | 'hybrid-diagnosis'
  | 'safety-gated-repair'
  | 'fieldproof'
  | 'service-report';

export type ScreenRoute =
  | 'welcome'
  | 'lifecycle'
  | 'dashboard'
  | 'assets'
  | 'asset-detail'
  | 'digital-twin'
  | 'diagnostics'
  | 'diagnostic-results'
  | 'copilot'
  | 'knowledge'
  | 'repairs'
  | 'fieldproof'
  | 'calculator'
  | 'reports'
  | 'verify-report'
  | 'settings';

export type AppLanguage = 'en' | 'bn';

export type QualityTier = 'high' | 'balanced' | 'low';

export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested';

export type ComponentType =
  | 'solar_panel'
  | 'inverter'
  | 'battery'
  | 'connection'
  | 'grid_meter'
  | 'other';

export type DigitalTwinComponentId =
  | 'solar_panel'
  | 'inverter'
  | 'battery'
  | 'connection'
  | 'grid_meter'
  | 'site_load';

export type ComponentHealthStatus = 'nominal' | 'warning' | 'fault' | 'investigating' | 'resolved';

export type CasePriority = 'critical' | 'high' | 'medium' | 'low';

export type CaseStatus = 'open' | 'investigating' | 'safety_blocked' | 'resolved';

export type WorkOrderStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'escalated';

export type InferenceSourceKind = 'on_device' | 'in_cloud' | 'demo_rules' | 'unavailable';

export type DeviceModelAvailability =
  | 'unchecked'
  | 'unsupported'
  | 'downloadable'
  | 'downloading'
  | 'ready'
  | 'error';

export type AppCheckState =
  | 'active_enterprise'
  | 'active_debug'
  | 'unconfigured_missing_site_key'
  | 'error';

export type EvidenceType =
  | 'before_photo'
  | 'after_photo'
  | 'condition_photo'
  | 'observed_reading'
  | 'inspection_note'
  | 'repair_note'
  | 'completion_evidence';

export type EvidenceOriginKind =
  | 'original_evidence'
  | 'simulated_demo_evidence'
  | 'ai_explanatory_text';

export type FilePersistenceStatus = 'local_only' | 'uploading' | 'uploaded' | 'failed';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'technician' | 'engineer' | 'supervisor';
  createdAt: string;
  updatedAt: string;
}

export interface AssetComponent {
  id: string;
  assetId: string;
  twinId: DigitalTwinComponentId;
  type: ComponentType;
  name: string;
  modelIdentifier: string;
  serialNumber: string;
  status: ComponentHealthStatus;
  lastInspectionAt: string;
  notes: string;
}

export interface Asset {
  id: string;
  ownerId: string;
  name: string;
  siteType: 'residential' | 'commercial' | 'microgrid';
  locationLabel: string;
  capacityKw: number;
  status: 'nominal' | 'warning' | 'fault' | 'offline';
  inverterModel: string;
  inverterSerial: string;
  batteryModel?: string;
  batteryCapacityKwh?: number;
  panelCount: number;
  installedYear: number;
  lastInspectionAt: string;
  isDemo: boolean;
  components: AssetComponent[];
  createdAt: string;
  updatedAt: string;
  cloudRevision?: number;
}

export interface PossibleCause {
  cause: string;
  supportingEvidence: string[];
  missingEvidence: string[];
  assessment: 'likely' | 'possible' | 'requires_inspection' | 'unverified';
}

export interface DiagnosticAssessment {
  caseTitle: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assessmentStatus: 'evidence_available' | 'needs_inspection' | 'stop_work_required';
  possibleCauses: PossibleCause[];
  requiredInformation: string[];
  safeNextActions: string[];
  stopWork: boolean;
  stopWorkReason: string | null;
  sourceIds: string[];
}

export interface AIInferenceRecord {
  id: string;
  caseId: string;
  modeRequested: 'prefer_on_device' | 'only_in_cloud' | 'deterministic_fallback';
  inferenceSource: InferenceSourceKind;
  modelName: string;
  timestamp: string;
  latencyMs: number;
  errorDetail?: string;
  validationPassed?: boolean;
  validationError?: string;
  droppedSourceIds?: string[];
  supportingCount?: number;
  missingCount?: number;
  requestSnapshot?: {
    assetName: string;
    componentName: string;
    faultCode: string;
    symptoms: string[];
    readingsCount: number;
  };
}

export interface HybridRuntimeCapabilities {
  browserLabel: string;
  chromeVersion: number | null;
  chromeDesktopEligible: boolean;
  webGpuAvailable: boolean;
  webGpuDetail: string;
  storageQuotaMb: number | null;
  storageUsageMb: number | null;
  appCheckState: AppCheckState;
  online: boolean;
  sdkLanguageModelStatus: string;
  eligibilitySummary: string;
}

export interface HybridComparisonEntry {
  caseId: string;
  promptSummary: string;
  primaryRecord?: AIInferenceRecord;
  primaryAssessment?: DiagnosticAssessment;
  secondaryRecord?: AIInferenceRecord;
  secondaryAssessment?: DiagnosticAssessment;
  secondaryUnavailableReason?: string;
  updatedAt: string;
}

export interface SafetyHazardCheck {
  id: string;
  label: string;
  description: string;
  criticalEmergency: boolean;
}

export interface DiagnosticCase {
  id: string;
  ownerId: string;
  assetId: string;
  assetName: string;
  componentId: string;
  twinComponentId: DigitalTwinComponentId;
  componentType: ComponentType;
  componentName: string;
  title: string;
  symptoms: string[];
  symptomNotes: string;
  faultCode: string;
  readings: Array<{ label: string; value: string; unit: string }>;
  imageEvidenceName?: string;
  imageEvidenceDataUrl?: string;
  safetyHazardDetected: boolean;
  safetyFlags: string[];
  stopWork: boolean;
  stopWorkReason: string | null;
  priority: CasePriority;
  status: CaseStatus;
  inferenceRecord: AIInferenceRecord;
  assessment: DiagnosticAssessment;
  cloudDeepAnalysis?: DiagnosticAssessment;
  cloudInferenceRecord?: AIInferenceRecord;
  reviewStatus?: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  timeline?: TimelineEvent[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  cloudRevision?: number;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  publisher: string;
  category: 'inverter' | 'solar_panel' | 'battery' | 'grid_connection' | 'safety';
  faultCode?: string;
  symptoms: string[];
  guidance: string;
  safetyNotice: string;
  documentUrl: string;
  sectionRef: string;
  verifiedDate: string;
  isDemoPack: boolean;
  isUserImported?: boolean;
  cloudRevision?: number;
}

export interface RepairTask {
  id: string;
  title: string;
  safetyNote: string;
  requiresVerification: boolean;
  status: WorkOrderStatus;
  completedAt?: string;
}

export interface WorkOrder {
  id: string;
  ownerId: string;
  caseId: string;
  assetId: string;
  assetName: string;
  componentId: string;
  twinComponentId: DigitalTwinComponentId;
  componentName: string;
  title: string;
  problemDescription: string;
  status: WorkOrderStatus;
  priority: CasePriority;
  safetyCleared: boolean;
  tasks: RepairTask[];
  technicianNotes: string;
  verificationNotes: string;
  escalatedReason?: string;
  reviewStatus?: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  timeline?: TimelineEvent[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  cloudRevision?: number;
}

export interface GeoTag {
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: string;
  note: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  kind: 'safety_check' | 'ai_inference' | 'evidence' | 'checklist_step' | 'status_change' | 'review';
  title: string;
  detail: string;
  badge?: string;
}

export interface EvidenceRecord {
  id: string;
  ownerId: string;
  caseId: string;
  workOrderId?: string;
  assetId: string;
  componentId: string;
  componentName: string;
  evidenceType: EvidenceType;
  originKind: EvidenceOriginKind;
  caption: string;
  note: string;
  readingValue?: string;
  readingUnit?: string;
  imageDataUrl?: string;
  geoTag?: GeoTag;
  audioDataUrl?: string;
  audioDurationSec?: number;
  voiceTranscript?: string;
  filePersistenceStatus?: FilePersistenceStatus;
  timestamp: string;
  cloudRevision?: number;
}

export interface ServiceReport {
  id: string;
  ownerId: string;
  reportCode: string;
  caseId: string;
  workOrderId?: string;
  assetId: string;
  title: string;
  status: 'completed' | 'escalated' | 'pending_verification';
  summary: string;
  estimatedImpactKwh?: number;
  outstandingIssues: string;
  isSimulated: boolean;
  sourceIds: string[];
  canonicalHash?: string;
  createdAt: string;
  cloudRevision?: number;
}

export interface SyncQueueItem {
  id: string;
  mutationId?: string;
  baseRevision?: number;
  entityType: 'asset' | 'case' | 'workOrder' | 'evidence' | 'report' | 'knowledge' | 'copilotThread';
  entityId: string;
  operation: 'upsert' | 'delete';
  label: string;
  payload: unknown;
  status: 'persisting' | 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict' | 'local_only';
  attempts: number;
  lastError?: string;
  remoteSnapshot?: unknown;
  updatedAt: string;
}

export interface CopilotFeedback {
  rating: 'helpful' | 'not_helpful';
  reason?: string;
  timestamp: string;
}

export interface CopilotActionChip {
  id: string;
  label: string;
  actionType: 'highlight_3d' | 'open_wizard' | 'start_checklist' | 'add_fieldproof' | 'open_calculator';
  targetComponentId?: DigitalTwinComponentId;
  caseId?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  inferenceSource?: InferenceSourceKind;
  modelName?: string;
  latencyMs?: number;
  evidenceStatus?: 'evidence_available' | 'needs_readings' | 'possible_cause' | 'unverified' | 'requires_inspection';
  citedSourceIds?: string[];
  droppedSourceIds?: string[];
  actions?: CopilotActionChip[];
  stopWorkHold?: boolean;
  safetyFiltered?: boolean;
  error?: string;
  feedback?: CopilotFeedback;
  payloadSentPreview?: string;
  intent?: 'diagnose' | 'lookup_fault' | 'energy_impact' | 'open_twin' | 'start_checklist';
}

export interface CopilotThread {
  id: string;
  ownerId: string;
  title: string;
  assetId?: string;
  componentId?: DigitalTwinComponentId;
  caseId?: string;
  language: AppLanguage;
  messages: CopilotMessage[];
  createdAt: string;
  updatedAt: string;
  cloudRevision?: number;
}

export interface TelemetryPoint {
  hour: string;
  expectedKw: number;
  observedKw: number;
  label: string;
}

export interface SimulatedFaultScenario {
  id: string;
  name: string;
  componentId: DigitalTwinComponentId;
  faultCode: string;
  description: string;
  severity: 'warning' | 'fault';
  sampleReadings: Array<{ label: string; value: string; unit: string }>;
}

export interface LifecycleStageMeta {
  slug: LifecycleSlug;
  indexLabel: string;
  shortTitle: string;
  headline: string;
  summary: string;
  fieldPurpose: string;
  inputs: string[];
  outputs: string[];
  safetyNotes: string[];
  knowledgeIds: string[];
  targetRoute: ScreenRoute;
  ctaLabel: string;
}
