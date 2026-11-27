import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  DEMO_ASSETS,
  DEMO_CASES,
  DEMO_EVIDENCE,
  DEMO_FAULT_SCENARIOS,
  DEMO_KNOWLEDGE_LIBRARY,
  DEMO_REPORTS,
  DEMO_WORK_ORDERS,
  LIFECYCLE_STAGES,
} from '../data/demoData';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import {
  auth,
  getAppCheckStatus,
  signInWithGoogle,
  signOutUser,
  testFirestoreConnection,
  type AppCheckStatusInfo,
} from '../services/firebase';
import {
  fetchUserCloudRecordCounts,
  syncQueueItemToFirestore,
  upsertUserProfileInFirestore,
} from '../services/firestoreSync';
import { fetchUserCloudWorkspace, type CloudWorkspaceRecords } from '../services/firestoreWorkspace';
import { reconcileCloudWorkspace } from '../services/workspaceReconcile';
import {
  checkInitialDeviceAvailability,
  inspectBrowserOnDeviceSupport,
  inspectHybridRuntimeCapabilities,
  prepareOnDeviceModel,
  runCopilotTurn,
  runHybridDiagnosis,
  type BrowserOnDeviceSupport,
  type DiagnosisRequestPayload,
} from '../services/hybridAI';
import {
  clearAllIDB,
  loadSyncQueueFromIDB,
  loadWorkspaceFromIDB,
  saveSyncQueueItemToIDB,
  saveWorkspaceToIDB,
  getStorageScopeId,
} from '../services/offlineStore';
import { coalesceQueuedMutation, MAX_SYNC_ATTEMPTS } from '../services/syncQueue';
import type {
  AIInferenceRecord,
  AppLanguage,
  Asset,
  ComponentType,
  CopilotActionChip,
  CopilotFeedback,
  CopilotMessage,
  CopilotThread,
  DeviceModelAvailability,
  DiagnosticCase,
  DigitalTwinComponentId,
  EvidenceRecord,
  HybridComparisonEntry,
  HybridRuntimeCapabilities,
  KnowledgeSource,
  LifecycleSlug,
  QualityTier,
  RepairTask,
  ReviewStatus,
  ScreenRoute,
  ServiceReport,
  SimulatedFaultScenario,
  SyncQueueItem,
  TimelineEvent,
  WorkOrder,
  WorkOrderStatus,
} from '../types/sunfix';
import { computeCasePriority, evaluateSafetyGate } from '../utils/diagnosticsLogic';
import { buildCanonicalReportPayload, computeCanonicalSha256 } from '../utils/reportCrypto';

export interface WizardDraft {
  assetId: string;
  componentId: string;
  twinComponentId: DigitalTwinComponentId;
  componentType: ComponentType;
  componentName: string;
  symptoms: string[];
  symptomNotes: string;
  faultCode: string;
  readings: Array<{ label: string; value: string; unit: string }>;
  safetyFlags: string[];
  imageEvidenceName?: string;
  imageEvidenceDataUrl?: string;
}

export type GlobalSyncStatus = 'online' | 'offline' | 'sync_pending' | 'syncing' | 'sync_failed' | 'synced' | 'local_only';

interface SunFixContextValue {
  route: ScreenRoute;
  activeLifecycleSlug: LifecycleSlug;
  navigate: (
    route: ScreenRoute,
    opts?: { assetId?: string; caseId?: string; workOrderId?: string; lifecycleSlug?: LifecycleSlug },
  ) => void;
  user: User | null;
  authReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;

  assets: Asset[];
  cases: DiagnosticCase[];
  workOrders: WorkOrder[];
  evidence: EvidenceRecord[];
  reports: ServiceReport[];
  knowledgeDocs: KnowledgeSource[];
  inferenceHistory: AIInferenceRecord[];
  comparisons: HybridComparisonEntry[];

  selectedAssetId: string;
  setSelectedAssetId: (id: string) => void;
  selectedTwinComponentId: DigitalTwinComponentId;
  setSelectedTwinComponentId: (id: DigitalTwinComponentId) => void;
  activeCaseId: string;
  setActiveCaseId: (id: string) => void;
  activeWorkOrderId: string;
  setActiveWorkOrderId: (id: string) => void;
  activeReportId: string;
  setActiveReportId: (id: string) => void;
  activeFaultScenario: SimulatedFaultScenario;
  applyFaultScenario: (scenarioId: string) => void;
  twinRecoveryPulse: boolean;
  twinHourDecimal: number;
  setTwinHourDecimal: (hour: number) => void;

  wizardDraft: WizardDraft;
  setWizardDraft: React.Dispatch<React.SetStateAction<WizardDraft>>;
  startDiagnosisForComponent: (assetId: string, twinId: DigitalTwinComponentId) => void;

  // Hybrid AI runtime
  browserSupport: BrowserOnDeviceSupport;
  runtimeCapabilities: HybridRuntimeCapabilities;
  refreshRuntimeCapabilities: () => Promise<void>;
  deviceAvailability: DeviceModelAvailability;
  downloadProgress: number;
  deviceStatusDetail: string;
  lastInferenceRecord: AIInferenceRecord | null;
  lastAiWarning: string | null;
  prepareOnDeviceAI: () => Promise<void>;
  submitDiagnosis: (forceCloudOnly?: boolean) => Promise<DiagnosticCase>;
  runCloudDeepAnalysisForCase: (caseId: string) => Promise<DiagnosticCase | null>;
  runComparisonForCase: (
    caseId: string,
    targetMode: 'prefer_on_device' | 'only_in_cloud',
  ) => Promise<HybridComparisonEntry | null>;

  // Operations mutations
  addOrUpdateAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'> & { id?: string }) => Asset;
  createWorkOrderFromCase: (caseId: string) => WorkOrder;
  updateWorkOrderTaskStatus: (workOrderId: string, taskId: string, status: WorkOrderStatus) => void;
  updateWorkOrderNotes: (workOrderId: string, technicianNotes: string, verificationNotes: string) => void;
  escalateWorkOrder: (workOrderId: string, reason: string) => void;
  completeWorkOrder: (workOrderId: string) => void;
  addEvidenceRecord: (
    record: Omit<EvidenceRecord, 'id' | 'ownerId' | 'timestamp'>,
  ) => EvidenceRecord;
  addKnowledgeSource: (
    doc: Omit<KnowledgeSource, 'id' | 'isDemoPack' | 'isUserImported'>,
  ) => KnowledgeSource;
  generateServiceReport: (params: {
    caseId: string;
    workOrderId?: string;
    estimatedImpactKwh?: number;
    outstandingIssues: string;
  }) => ServiceReport;

  // Connectivity, App Check & Offline Sync
  browserOnline: boolean;
  simulatedOffline: boolean;
  effectiveOnline: boolean;
  toggleSimulatedOffline: () => void;
  syncQueue: SyncQueueItem[];
  syncStatus: GlobalSyncStatus;
  processSyncQueue: () => Promise<void>;
  retrySyncItem: (itemId: string) => Promise<void>;
  resolveSyncConflictKeepLocal: (itemId: string) => Promise<void>;
  appCheckStatus: AppCheckStatusInfo;
  firestoreStatus: { ok: boolean; detail: string } | null;
  localStorageError: string | null;
  cloudHydrationWarning: string | null;
  cloudCounts: { assets: number; cases: number; workOrders: number; reports: number } | null;

  // V3: Language, Adaptive Quality, Supervisor Review & SunFix Copilot
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  qualityTier: QualityTier;
  setQualityTier: (tier: QualityTier) => void;
  supervisorRoleActive: boolean;
  setSupervisorRoleActive: (active: boolean) => void;
  submitForReview: (kind: 'case' | 'workOrder', id: string) => void;
  decideReview: (kind: 'case' | 'workOrder', id: string, decision: Extract<ReviewStatus, 'approved' | 'changes_requested'>, note: string) => void;

  copilotDrawerOpen: boolean;
  setCopilotDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  copilotIncludeContext: boolean;
  setCopilotIncludeContext: React.Dispatch<React.SetStateAction<boolean>>;
  copilotThreads: CopilotThread[];
  activeCopilotThreadId: string;
  setActiveCopilotThreadId: (id: string) => void;
  copilotBusy: boolean;
  copilotStreamingText: string;
  createCopilotThread: () => CopilotThread;
  sendCopilotMessage: (userText: string, mode?: 'cloud_chat' | 'on_device_single') => Promise<void>;
  rateCopilotMessage: (threadId: string, messageId: string, feedback: CopilotFeedback) => void;
  executeCopilotAction: (action: CopilotActionChip) => void;

  resetDemoWorkspace: () => Promise<void>;
}

const SunFixContext = createContext<SunFixContextValue | null>(null);

function makeInitialDraft(assets: Asset[]): WizardDraft {
  const primary = assets[0] || DEMO_ASSETS[0];
  const invComp = primary.components.find((c) => c.twinId === 'inverter') || primary.components[0];
  return {
    assetId: primary.id,
    componentId: invComp?.id || 'comp-mesa-inv',
    twinComponentId: invComp?.twinId || 'inverter',
    componentType: invComp?.type || 'inverter',
    componentName: invComp?.name || 'Primary Hybrid String Inverter',
    symptoms: ['No power production', 'Inverter fault warning'],
    symptomNotes: 'Recurring grid-related warning and AC export halted.',
    faultCode: 'G04-UV',
    readings: [
      { label: 'AC Grid Voltage (L2-N)', value: '196.4', unit: 'V' },
      { label: 'Active AC Output', value: '0.0', unit: 'kW' },
    ],
    safetyFlags: [],
  };
}

function makeInitialCopilotThread(): CopilotThread {
  const now = new Date().toISOString();
  return {
    id: 'thread-demo-mesa',
    ownerId: 'demo-user',
    title: 'Mesa Ridge G04-UV Field Triage',
    assetId: DEMO_ASSETS[0].id,
    componentId: 'inverter',
    caseId: DEMO_CASES[0].id,
    language: 'en',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseInitialLocation(): { route: ScreenRoute; lifecycleSlug: LifecycleSlug } {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname || '/';
    const match = pathname.match(/^\/lifecycle\/([a-z0-9-]+)\/?$/i);
    if (match && match[1]) {
      const slug = match[1] as LifecycleSlug;
      if (LIFECYCLE_STAGES.some((s) => s.slug === slug)) {
        return { route: 'lifecycle', lifecycleSlug: slug };
      }
    }
    if (/^\/copilot\/?$/i.test(pathname)) {
      return { route: 'copilot', lifecycleSlug: 'digital-twin' };
    }
    if (/^\/verify-report\/?$/i.test(pathname)) {
      return { route: 'verify-report', lifecycleSlug: 'digital-twin' };
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return { route: 'dashboard', lifecycleSlug: 'digital-twin' };
    }
  }
  return { route: 'welcome', lifecycleSlug: 'digital-twin' };
}

export const SunFixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const browserOnline = useOnlineStatus();
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const effectiveOnline = browserOnline && !simulatedOffline;

  const initialLoc = useMemo(() => parseInitialLocation(), []);
  const [route, setRoute] = useState<ScreenRoute>(initialLoc.route);
  const [activeLifecycleSlug, setActiveLifecycleSlug] = useState<LifecycleSlug>(initialLoc.lifecycleSlug);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const storageScopeId = getStorageScopeId(user?.uid);

  const [assets, setAssets] = useState<Asset[]>(DEMO_ASSETS);
  const [cases, setCases] = useState<DiagnosticCase[]>(DEMO_CASES);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(DEMO_WORK_ORDERS);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(DEMO_EVIDENCE);
  const [reports, setReports] = useState<ServiceReport[]>(DEMO_REPORTS);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeSource[]>(DEMO_KNOWLEDGE_LIBRARY);
  const [inferenceHistory, setInferenceHistory] = useState<AIInferenceRecord[]>([
    DEMO_CASES[0].inferenceRecord,
  ]);
  const [comparisons, setComparisons] = useState<HybridComparisonEntry[]>([]);
  const [hydratedScopeId, setHydratedScopeId] = useState<string | null>(null);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(DEMO_ASSETS[0].id);
  const [selectedTwinComponentId, setSelectedTwinComponentId] =
    useState<DigitalTwinComponentId>('inverter');
  const [activeCaseId, setActiveCaseId] = useState<string>(DEMO_CASES[0].id);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string>(DEMO_WORK_ORDERS[0].id);
  const [activeReportId, setActiveReportId] = useState<string>(DEMO_REPORTS[0].id);
  const [activeFaultScenario, setActiveFaultScenario] = useState<SimulatedFaultScenario>(
    DEMO_FAULT_SCENARIOS[1],
  );
  const [twinRecoveryPulse, setTwinRecoveryPulse] = useState(false);
  const [twinHourDecimal, setTwinHourDecimal] = useState<number>(12.5);

  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(() => makeInitialDraft(DEMO_ASSETS));

  const [browserSupport] = useState<BrowserOnDeviceSupport>(() => inspectBrowserOnDeviceSupport());
  const [appCheckStatus] = useState<AppCheckStatusInfo>(() => getAppCheckStatus());
  const [runtimeCapabilities, setRuntimeCapabilities] = useState<HybridRuntimeCapabilities>(() => ({
    browserLabel: 'Detecting browser...',
    chromeVersion: browserSupport.chromeVersion,
    chromeDesktopEligible: false,
    webGpuAvailable: false,
    webGpuDetail: 'Probing WebGPU...',
    storageQuotaMb: null,
    storageUsageMb: null,
    appCheckState: appCheckStatus.state,
    online: effectiveOnline,
    sdkLanguageModelStatus: 'Checking...',
    eligibilitySummary: browserSupport.reason,
  }));
  const [deviceAvailability, setDeviceAvailability] =
    useState<DeviceModelAvailability>('unchecked');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [deviceStatusDetail, setDeviceStatusDetail] = useState(
    'Click Prepare On-device AI to check and initialize local model support.',
  );
  const [lastInferenceRecord, setLastInferenceRecord] = useState<AIInferenceRecord | null>(
    DEMO_CASES[0].inferenceRecord,
  );
  const [lastAiWarning, setLastAiWarning] = useState<string | null>(null);

  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const inFlightEntityKeysRef = useRef(new Set<string>());
  const acknowledgedRevisionsRef = useRef(new Map<string, number>());
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<{ ok: boolean; detail: string } | null>(
    null,
  );
  const [localStorageError, setLocalStorageError] = useState<string | null>(null);
  const [cloudHydrationWarning, setCloudHydrationWarning] = useState<string | null>(null);
  const [cloudCounts, setCloudCounts] = useState<{
    assets: number;
    cases: number;
    workOrders: number;
    reports: number;
  } | null>(null);

  const [language, setLanguage] = useState<AppLanguage>('en');
  const [qualityTier, setQualityTier] = useState<QualityTier>('high');
  const [supervisorRoleActive, setSupervisorRoleActive] = useState(false);

  const [copilotDrawerOpen, setCopilotDrawerOpen] = useState(false);
  const [copilotIncludeContext, setCopilotIncludeContext] = useState(true);
  const [copilotThreads, setCopilotThreads] = useState<CopilotThread[]>([
    {
      id: 'thread-demo-mesa',
      ownerId: 'demo-user',
      title: 'Mesa Ridge G04-UV Field Triage',
      assetId: DEMO_ASSETS[0].id,
      componentId: 'inverter',
      caseId: DEMO_CASES[0].id,
      language: 'en',
      messages: [],
      createdAt: '2026-11-25T08:16:00Z',
      updatedAt: '2026-11-25T08:16:00Z',
    },
  ]);
  const [activeCopilotThreadId, setActiveCopilotThreadId] = useState('thread-demo-mesa');
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotStreamingText, setCopilotStreamingText] = useState('');

  // Keep the latest records available to a reconnect restore without making the
  // restore effect depend on every workspace mutation.
  const effectiveOnlineRef = useRef(effectiveOnline);
  effectiveOnlineRef.current = effectiveOnline;
  const workspaceRef = useRef<CloudWorkspaceRecords & { syncQueue: SyncQueueItem[] }>({
    assets, cases, workOrders, evidence, reports, knowledgeDocs, copilotThreads, syncQueue,
  });
  workspaceRef.current = {
    assets, cases, workOrders, evidence, reports, knowledgeDocs, copilotThreads, syncQueue,
  };

  const refreshRuntimeCapabilities = useCallback(async () => {
    const caps = await inspectHybridRuntimeCapabilities(effectiveOnline);
    setRuntimeCapabilities(caps);
  }, [effectiveOnline]);

  // Sync browser popstate for /lifecycle/:slug back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const parsed = parseInitialLocation();
      setRoute(parsed.route);
      setActiveLifecycleSlug(parsed.lifecycleSlug);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Re-probe runtime capabilities when online status shifts
  useEffect(() => {
    refreshRuntimeCapabilities();
  }, [refreshRuntimeCapabilities]);

  // Hydrate a distinct local workspace after Firebase Auth has resolved.
  // Never reuse the prior account's records while a different account is loading.
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const scopeId = storageScopeId;
    inFlightEntityKeysRef.current.clear();
    acknowledgedRevisionsRef.current.clear();
    setHydratedScopeId(null);
    setAssets(DEMO_ASSETS);
    setCases(DEMO_CASES);
    setWorkOrders(DEMO_WORK_ORDERS);
    setEvidence(DEMO_EVIDENCE);
    setReports(DEMO_REPORTS);
    setKnowledgeDocs(DEMO_KNOWLEDGE_LIBRARY);
    setInferenceHistory([DEMO_CASES[0].inferenceRecord]);
    setComparisons([]);
    setSyncQueue([]);
    setCopilotThreads([makeInitialCopilotThread()]);
    setActiveCopilotThreadId('thread-demo-mesa');
    setSelectedAssetId(DEMO_ASSETS[0].id);
    setSelectedTwinComponentId('inverter');
    setActiveCaseId(DEMO_CASES[0].id);
    setActiveWorkOrderId(DEMO_WORK_ORDERS[0].id);
    setActiveReportId(DEMO_REPORTS[0].id);
    setActiveFaultScenario(DEMO_FAULT_SCENARIOS[1]);
    setTwinHourDecimal(12.5);
    setWizardDraft(makeInitialDraft(DEMO_ASSETS));
    setLanguage('en');
    setQualityTier('high');
    setSupervisorRoleActive(false);
    setLastAiWarning(null);
    setCloudCounts(null);
    setIsSyncingNow(false);

    (async () => {
      let saved: Awaited<ReturnType<typeof loadWorkspaceFromIDB>>;
      let queue: SyncQueueItem[];
      try {
        [saved, queue] = await Promise.all([
          loadWorkspaceFromIDB(scopeId),
          loadSyncQueueFromIDB(scopeId),
        ]);
        setLocalStorageError(null);
      } catch {
        if (!active) return;
        setLocalStorageError('Local workspace storage could not be read. Changes are not safely persisted in this browser.');
        return;
      }
      queue = queue.map((item) => item.status === 'persisting' ? { ...item, status: 'pending' } : item);
      for (const item of queue) {
        if (item.status === 'pending') {
          void saveSyncQueueItemToIDB(item, scopeId).catch(() => {
            if (active) setLocalStorageError('A recovered pending change could not be saved. Keep this tab open and resolve the storage issue.');
          });
        }
      }
      const [avail, fsStatus, caps] = await Promise.all([
        checkInitialDeviceAvailability(),
        testFirestoreConnection(),
        inspectHybridRuntimeCapabilities(effectiveOnlineRef.current),
      ]);
      if (!active) return;
      const localRecords: CloudWorkspaceRecords = saved ? {
        assets: saved.assets || [], cases: saved.cases || [], workOrders: saved.workOrders || [],
        evidence: saved.evidence || [], reports: saved.reports || [], knowledgeDocs: saved.knowledgeDocs || [],
        copilotThreads: saved.copilotThreads || [],
      } : { assets: [], cases: [], workOrders: [], evidence: [], reports: [], knowledgeDocs: [], copilotThreads: [] };
      const records = user
        ? localRecords
        : saved ? localRecords : {
          assets: DEMO_ASSETS, cases: DEMO_CASES, workOrders: DEMO_WORK_ORDERS,
          evidence: DEMO_EVIDENCE, reports: DEMO_REPORTS, knowledgeDocs: DEMO_KNOWLEDGE_LIBRARY,
          copilotThreads: [makeInitialCopilotThread()],
        };

      if (user) {
        setCloudCounts(null);
        setCloudHydrationWarning(!user.emailVerified
          ? 'Email verification is required before cloud restore or sync.'
          : effectiveOnlineRef.current
            ? 'Cloud restore is loading for this account.'
            : 'Offline: showing this account’s local snapshot. Cloud records will refresh after reconnect.');
      } else {
        setCloudHydrationWarning(null);
      }
      if (records.assets) setAssets(records.assets);
      if (records.cases) setCases(records.cases);
      if (records.workOrders) setWorkOrders(records.workOrders);
      if (records.evidence) setEvidence(records.evidence);
      if (records.reports) setReports(records.reports);
      if (records.knowledgeDocs) setKnowledgeDocs(records.knowledgeDocs);
      if (saved) {
        if (saved.inferenceHistory) setInferenceHistory(saved.inferenceHistory);
        if (saved.comparisons) setComparisons(saved.comparisons);
        if (saved.language) setLanguage(saved.language);
        if (saved.qualityTier) setQualityTier(saved.qualityTier);
      }
      if (records.copilotThreads.length) {
        setCopilotThreads(records.copilotThreads);
        setActiveCopilotThreadId(records.copilotThreads[0].id);
      } else if (user) {
        setCopilotThreads([]);
      }
      setSyncQueue(queue);
      setDeviceAvailability(avail.availability);
      setDeviceStatusDetail(avail.detail);
      setFirestoreStatus(fsStatus);
      setRuntimeCapabilities(caps);
      setHydratedScopeId(scopeId);
    })();

    return () => {
      active = false;
    };
  }, [authReady, storageScopeId, user?.uid, user?.emailVerified]);

  // Restore cloud records only after the matching account's local workspace is
  // ready. Connectivity changes refresh cloud data without rerunning local
  // hydration or resetting an in-progress diagnostic/repair workflow.
  useEffect(() => {
    if (!authReady || hydratedScopeId !== storageScopeId || !user?.emailVerified || !effectiveOnline) {
      return;
    }

    let active = true;
    const scopeId = storageScopeId;
    const userId = user.uid;

    (async () => {
      try {
        const cloud = await fetchUserCloudWorkspace(userId);
        if (!active || auth.currentUser?.uid !== userId || scopeId !== storageScopeId) return;

        const current = workspaceRef.current;
        const localRecords: CloudWorkspaceRecords = {
          assets: current.assets,
          cases: current.cases,
          workOrders: current.workOrders,
          evidence: current.evidence,
          reports: current.reports,
          knowledgeDocs: current.knowledgeDocs,
          copilotThreads: current.copilotThreads,
        };
        const reconciled = reconcileCloudWorkspace(
          cloud.records,
          localRecords,
          current.syncQueue,
          cloud.incomplete,
          userId,
        );
        if (!active || auth.currentUser?.uid !== userId) return;

        setAssets(reconciled.records.assets);
        setCases(reconciled.records.cases);
        setWorkOrders(reconciled.records.workOrders);
        setEvidence(reconciled.records.evidence);
        setReports(reconciled.records.reports);
        setKnowledgeDocs(reconciled.records.knowledgeDocs);
        setCopilotThreads(reconciled.records.copilotThreads);
        setSyncQueue(reconciled.queue);
        setCloudCounts(cloud.counts);
        setCloudHydrationWarning(cloud.incomplete.length
          ? `${cloud.incomplete.length} legacy or invalid cloud record(s) could not be fully restored. This device's matching local copies were preserved.`
          : null);
      } catch (error) {
        if (!active) return;
        const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code.toLowerCase() : '';
        setCloudHydrationWarning(code.includes('permission')
          ? 'Cloud restore was denied by Firestore rules. Local data remains available; no cloud records were changed.'
          : code.includes('resource-exhausted')
            ? 'Cloud restore paused because the Firebase quota was reached. Local data remains available.'
            : code.includes('account_changed')
              ? 'Account changed during cloud restore. The other account’s data was not applied.'
              : 'Cloud restore is unavailable. The account-scoped local snapshot remains in use.');
        setCloudCounts(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [authReady, effectiveOnline, hydratedScopeId, storageScopeId, user?.uid, user?.emailVerified]);

  // Persist only after the matching account workspace has finished hydration.
  useEffect(() => {
    if (!authReady || hydratedScopeId !== storageScopeId) return;
    void saveWorkspaceToIDB({
      assets,
      cases,
      workOrders,
      evidence,
      reports,
      knowledgeDocs,
      inferenceHistory,
      comparisons,
      copilotThreads,
      language,
      qualityTier,
      updatedAt: new Date().toISOString(),
    }, storageScopeId).then(() => {
      setLocalStorageError((current) => current?.startsWith('Local workspace') ? null : current);
    }).catch(() => {
      setLocalStorageError('Local workspace could not be saved. Keep this browser open and export or copy unsaved work before leaving.');
    });
  }, [
    assets,
    cases,
    workOrders,
    evidence,
    reports,
    knowledgeDocs,
    inferenceHistory,
    comparisons,
    copilotThreads,
    language,
    qualityTier,
    authReady,
    hydratedScopeId,
    storageScopeId,
  ]);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser && nextUser.emailVerified) {
        try {
          await upsertUserProfileInFirestore({
            uid: nextUser.uid,
            displayName: nextUser.displayName || 'Solar Technician',
            email: nextUser.email || '',
            role: 'technician',
          });
        } catch {
          // Non-blocking
        }
      } else {
        setCloudCounts(null);
      }
    });
    return () => unsub();
  }, []);

  const enqueueSyncItem = useCallback(
    (
      entityType: SyncQueueItem['entityType'],
      entityId: string,
      label: string,
      payload: unknown,
    ) => {
      const entityKey = `${entityType}:${entityId}`;
      const hasPreservedConflict = inFlightEntityKeysRef.current.has(entityKey) || syncQueue.some((queued) => queued.entityType === entityType
        && queued.entityId === entityId
        && ['conflict', 'local_only', 'syncing'].includes(queued.status));
      const item: SyncQueueItem = {
        id: `sync-${entityType}-${entityId}${hasPreservedConflict ? `-${Date.now()}` : ''}`,
        mutationId: `${entityType}:${entityId}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        baseRevision: payload && typeof payload === 'object' && 'cloudRevision' in payload
          && typeof payload.cloudRevision === 'number' ? payload.cloudRevision : 0,
        entityType,
        entityId,
        operation: 'upsert',
        label,
        payload,
        status: 'persisting',
        attempts: 0,
        updatedAt: new Date().toISOString(),
      };
      setSyncQueue((prev) => coalesceQueuedMutation(prev, item));
      void saveSyncQueueItemToIDB(item, storageScopeId).then(async () => {
        const pending: SyncQueueItem = { ...item, status: 'pending' };
        setSyncQueue((prev) => prev.map((queued) => queued.id === item.id ? pending : queued));
        await saveSyncQueueItemToIDB(pending, storageScopeId);
        setLocalStorageError((current) => current?.startsWith('A pending change') ? null : current);
      }).catch(() => {
        setLocalStorageError('A pending change could not be saved to this browser. Do not close this tab until the storage issue is resolved.');
        setSyncQueue((prev) => prev.map((queued) => queued.id === item.id
          ? { ...queued, status: 'failed', lastError: 'Local persistence failed; this change may be lost if the page closes.' }
          : queued));
      });
    },
    [storageScopeId, syncQueue],
  );

  const processSyncQueue = useCallback(async () => {
    if (!authReady || !effectiveOnline || isSyncingNow) return;
    const pendingItems = syncQueue.filter((q) => q.status === 'pending'
      || (q.status === 'failed' && q.attempts < MAX_SYNC_ATTEMPTS
        && !q.lastError?.startsWith('Local persistence failed')));
    if (pendingItems.length === 0) return;

    setIsSyncingNow(true);
    try {
      for (const item of pendingItems) {
        if (storageScopeId !== getStorageScopeId(auth.currentUser?.uid)) break;
        const entityKey = `${item.entityType}:${item.entityId}`;
        inFlightEntityKeysRef.current.add(entityKey);
        const acknowledgedRevision = acknowledgedRevisionsRef.current.get(entityKey);
        const syncItem = acknowledgedRevision && acknowledgedRevision > (item.baseRevision ?? 0)
          ? {
            ...item,
            baseRevision: acknowledgedRevision,
            payload: item.payload && typeof item.payload === 'object'
              ? { ...item.payload as Record<string, unknown>, cloudRevision: acknowledgedRevision }
              : item.payload,
          }
          : item;
        const syncingItem: SyncQueueItem = { ...syncItem, status: 'syncing', attempts: item.attempts + 1 };
        setSyncQueue((prev) => prev.map((q) => (q.id === item.id ? syncingItem : q)));

        if (!user) {
          // Local demo mode: mark as synced to local IndexedDB store with note
          const localSynced: SyncQueueItem = {
            ...syncingItem,
            status: 'local_only',
            lastError: 'Saved locally only; sign in with a verified account to sync this record to Firestore.',
            updatedAt: new Date().toISOString(),
          };
          setSyncQueue((prev) => prev.map((q) => (q.id === item.id ? localSynced : q)));
          try {
            await saveSyncQueueItemToIDB(localSynced, storageScopeId);
          } catch {
            setLocalStorageError('A local-only change could not be saved to this browser. Keep this tab open.');
          }
          continue;
        }

        const res = await syncQueueItemToFirestore(syncItem, user.uid);
        if (storageScopeId !== getStorageScopeId(auth.currentUser?.uid)) break;
        if (res.status === 'synced' && typeof res.revision === 'number') {
          acknowledgedRevisionsRef.current.set(entityKey, res.revision);
        }
        const syncedPayload = res.status === 'synced' && typeof res.revision === 'number'
          && item.payload && typeof item.payload === 'object'
          ? { ...item.payload as Record<string, unknown>, cloudRevision: res.revision }
          : item.payload;
        const updatedItem: SyncQueueItem = {
          ...syncingItem,
          status: res.status,
          ...(res.status === 'synced' && typeof res.revision === 'number'
            ? { baseRevision: res.revision, payload: syncedPayload }
            : {}),
          lastError: res.error,
          remoteSnapshot: res.remoteSnapshot,
          updatedAt: new Date().toISOString(),
        };
        setSyncQueue((prev) => prev.map((q) => (q.id === item.id ? updatedItem : q)));
        if (res.status === 'synced' && typeof res.revision === 'number') {
          const withRevision = <T extends { id: string }>(records: T[]): T[] => records.map((record) =>
            record.id === item.entityId ? { ...record, cloudRevision: res.revision } : record);
          if (item.entityType === 'asset') setAssets((prev) => withRevision(prev) as Asset[]);
          else if (item.entityType === 'case') setCases((prev) => withRevision(prev) as DiagnosticCase[]);
          else if (item.entityType === 'workOrder') setWorkOrders((prev) => withRevision(prev) as WorkOrder[]);
          else if (item.entityType === 'evidence') setEvidence((prev) => withRevision(prev) as EvidenceRecord[]);
          else if (item.entityType === 'report') setReports((prev) => withRevision(prev) as ServiceReport[]);
          else if (item.entityType === 'knowledge') setKnowledgeDocs((prev) => withRevision(prev) as KnowledgeSource[]);
          else setCopilotThreads((prev) => withRevision(prev) as CopilotThread[]);
        }
        try {
          await saveSyncQueueItemToIDB(updatedItem, storageScopeId);
        } catch {
          setLocalStorageError('The cloud response could not be recorded locally. The remote write may have succeeded; this item is retained for safe retry.');
          setSyncQueue((prev) => prev.map((queued) => queued.id === item.id
            ? { ...queued, status: 'failed', lastError: 'Local persistence failed after cloud response; remote state must be checked before retry.' }
            : queued));
        }
      }

      if (user && storageScopeId === getStorageScopeId(auth.currentUser?.uid)) {
        const counts = await fetchUserCloudRecordCounts(user.uid);
        setCloudCounts(counts);
      }
    } finally {
      inFlightEntityKeysRef.current.clear();
      setIsSyncingNow(false);
    }
  }, [authReady, effectiveOnline, isSyncingNow, syncQueue, user, storageScopeId]);

  // Automatic sync when connectivity returns
  useEffect(() => {
    if (effectiveOnline && syncQueue.some((q) => q.status === 'pending')) {
      processSyncQueue();
    }
  }, [effectiveOnline, processSyncQueue, syncQueue]);

  const retrySyncItem = useCallback(
    async (itemId: string) => {
      const item = syncQueue.find((queued) => queued.id === itemId);
      if (!item || item.status !== 'failed') return;
      if (item.attempts >= MAX_SYNC_ATTEMPTS) {
        setLocalStorageError('This change reached the 8-attempt retry limit. Preserve the local and remote copies and resolve it manually.');
        return;
      }
      const pending: SyncQueueItem = { ...item, status: 'pending', lastError: undefined };
      try {
        await saveSyncQueueItemToIDB(pending, storageScopeId);
        setSyncQueue((prev) => prev.map((queued) => queued.id === itemId ? pending : queued));
        setLocalStorageError((current) => current?.startsWith('Retry could not') ? null : current);
        if (effectiveOnline) setTimeout(() => { void processSyncQueue(); }, 50);
      } catch {
        setLocalStorageError('Retry could not be recorded in local storage. The cloud write was not retried.');
      }
    },
    [effectiveOnline, processSyncQueue, storageScopeId, syncQueue],
  );

  const resolveSyncConflictKeepLocal = useCallback(async (itemId: string) => {
    const item = syncQueue.find((queued) => queued.id === itemId);
    if (!item || item.status !== 'conflict') return;
    const preserved: SyncQueueItem = {
      ...item,
      status: 'local_only',
      lastError: 'Local draft preserved. Firestore remains unchanged; remote snapshot is retained with this conflict.',
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveSyncQueueItemToIDB(preserved, storageScopeId);
      setSyncQueue((prev) => prev.map((queued) => queued.id === itemId ? preserved : queued));
      setLocalStorageError(null);
    } catch {
      setLocalStorageError('Could not persist the conflict copy locally. The conflict remains unresolved.');
    }
  }, [storageScopeId, syncQueue]);

  const syncStatus: GlobalSyncStatus = useMemo(() => {
    if (!effectiveOnline) return 'offline';
    if (isSyncingNow) return 'syncing';
    if (syncQueue.some((q) => q.status === 'failed' || q.status === 'conflict')) return 'sync_failed';
    if (syncQueue.some((q) => q.status === 'pending')) return 'sync_pending';
    if (syncQueue.some((q) => q.status === 'local_only')) return 'local_only';
    if (syncQueue.some((q) => q.status === 'synced')) return 'synced';
    return 'online';
  }, [effectiveOnline, isSyncingNow, syncQueue]);

  const navigate = useCallback(
    (
      nextRoute: ScreenRoute,
      opts?: { assetId?: string; caseId?: string; workOrderId?: string; lifecycleSlug?: LifecycleSlug },
    ) => {
      if (opts?.assetId) setSelectedAssetId(opts.assetId);
      if (opts?.caseId) setActiveCaseId(opts.caseId);
      if (opts?.workOrderId) setActiveWorkOrderId(opts.workOrderId);
      if (nextRoute === 'lifecycle') {
        const targetSlug = opts?.lifecycleSlug || activeLifecycleSlug;
        setActiveLifecycleSlug(targetSlug);
        if (typeof window !== 'undefined') {
          const targetPath = `/lifecycle/${targetSlug}`;
          if (window.location.pathname !== targetPath) {
            window.history.pushState({}, '', targetPath);
          }
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else if (nextRoute === 'copilot') {
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/copilot') {
            window.history.pushState({}, '', '/copilot');
          }
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else if (nextRoute === 'verify-report') {
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/verify-report') {
            window.history.pushState({}, '', '/verify-report');
          }
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else if (typeof window !== 'undefined') {
        if (
          window.location.pathname.startsWith('/lifecycle/') ||
          window.location.pathname === '/copilot' ||
          window.location.pathname === '/verify-report'
        ) {
          window.history.pushState({}, '', '/');
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setRoute(nextRoute);
    },
    [activeLifecycleSlug],
  );

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
      if (route === 'welcome') setRoute('dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  }, [route]);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const applyFaultScenario = useCallback(
    (scenarioId: string) => {
      const scenario =
        DEMO_FAULT_SCENARIOS.find((s) => s.id === scenarioId) || DEMO_FAULT_SCENARIOS[0];
      setActiveFaultScenario(scenario);
      setSelectedTwinComponentId(scenario.componentId);

      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.id !== selectedAssetId) return asset;
          const isNormal = scenario.id === 'scenario-normal';
          return {
            ...asset,
            status: isNormal ? 'nominal' : scenario.severity,
            updatedAt: new Date().toISOString(),
            components: asset.components.map((comp) => {
              if (isNormal) {
                return { ...comp, status: 'nominal' };
              }
              if (comp.twinId === scenario.componentId) {
                return { ...comp, status: scenario.severity };
              }
              return { ...comp, status: 'nominal' };
            }),
          };
        }),
      );
    },
    [selectedAssetId],
  );

  const startDiagnosisForComponent = useCallback(
    (assetId: string, twinId: DigitalTwinComponentId) => {
      const targetAsset = assets.find((a) => a.id === assetId) || assets[0];
      const targetComp =
        targetAsset.components.find((c) => c.twinId === twinId) || targetAsset.components[0];
      setSelectedAssetId(targetAsset.id);
      setSelectedTwinComponentId(twinId);
      setWizardDraft({
        assetId: targetAsset.id,
        componentId: targetComp?.id || `comp-${twinId}`,
        twinComponentId: twinId,
        componentType: targetComp?.type || 'inverter',
        componentName: targetComp?.name || twinId,
        symptoms:
          twinId === 'inverter'
            ? ['No power production', 'Inverter fault warning']
            : twinId === 'battery'
              ? ['Battery not charging']
              : ['Reduced output'],
        symptomNotes: targetComp?.notes || '',
        faultCode:
          twinId === 'inverter' ? 'G04-UV' : twinId === 'battery' ? 'BMS-12' : '',
        readings:
          activeFaultScenario.componentId === twinId && activeFaultScenario.sampleReadings.length
            ? activeFaultScenario.sampleReadings
            : [{ label: 'Observed Output', value: '0.0', unit: 'kW' }],
        safetyFlags: [],
      });
      setRoute('diagnostics');
    },
    [activeFaultScenario, assets],
  );

  const prepareOnDeviceAI = useCallback(async () => {
    setDeviceAvailability('downloading');
    setDownloadProgress(2);
    setDeviceStatusDetail('Initializing on-device Gemini model...');
    const res = await prepareOnDeviceModel((pct) => {
      setDownloadProgress(pct);
    });
    setDeviceAvailability(res.availability);
    setDeviceStatusDetail(res.detail);
    await refreshRuntimeCapabilities();
  }, [refreshRuntimeCapabilities]);

  const submitDiagnosis = useCallback(
    async (forceCloudOnly = false): Promise<DiagnosticCase> => {
      const targetAsset = assets.find((a) => a.id === wizardDraft.assetId) || assets[0];
      const caseId = `case-${Date.now()}`;
      const safetyEval = evaluateSafetyGate(wizardDraft.safetyFlags);

      const payload: DiagnosisRequestPayload = {
        caseId,
        assetName: targetAsset.name,
        componentType: wizardDraft.componentType,
        componentName: wizardDraft.componentName,
        symptoms: wizardDraft.symptoms,
        symptomNotes: wizardDraft.symptomNotes,
        faultCode: wizardDraft.faultCode,
        readings: wizardDraft.readings,
        safetyFlags: wizardDraft.safetyFlags,
        imageDataUrl: wizardDraft.imageEvidenceDataUrl,
        knowledgeLibrary: knowledgeDocs,
        forceCloudOnly: forceCloudOnly && effectiveOnline,
        onDeviceReady: deviceAvailability === 'ready',
      };

      const aiRes = await runHybridDiagnosis(payload);
      setLastInferenceRecord(aiRes.inferenceRecord);
      setLastAiWarning(aiRes.warningMessage || null);
      setInferenceHistory((prev) => [aiRes.inferenceRecord, ...prev.slice(0, 29)]);

      const priority = computeCasePriority({
        safetyHazardDetected: safetyEval.hazardDetected || aiRes.assessment.stopWork,
        stopWork: safetyEval.stopWork || aiRes.assessment.stopWork,
        severity: aiRes.assessment.severity,
        evidenceCount: wizardDraft.readings.length + (wizardDraft.imageEvidenceDataUrl ? 1 : 0),
        assetStatus: targetAsset.status,
      });

      const now = new Date().toISOString();
      const initialTimeline: TimelineEvent[] = [
        {
          id: `tl-safety-${Date.now()}`,
          timestamp: now,
          kind: 'safety_check',
          title: safetyEval.hazardDetected ? 'Safety Gate Stop-Work Hold Triggered' : 'Safety Gate Cleared',
          detail: safetyEval.hazardDetected
            ? safetyEval.stopWorkReason || 'Hazard flags detected during pre-diagnosis screening.'
            : 'Pre-inspection non-invasive safety checks passed.',
          badge: safetyEval.hazardDetected ? 'STOP WORK' : 'CLEARED',
        },
        {
          id: `tl-ai-${Date.now() + 1}`,
          timestamp: now,
          kind: 'ai_inference',
          title: 'Hybrid AI Assessment Recorded',
          detail: `${aiRes.inferenceRecord.modelName} (${aiRes.inferenceRecord.inferenceSource.toUpperCase()})`,
          badge:
            aiRes.inferenceRecord.inferenceSource === 'on_device'
              ? 'LOCAL'
              : aiRes.inferenceRecord.inferenceSource === 'in_cloud'
                ? 'CLOUD'
                : aiRes.inferenceRecord.inferenceSource === 'demo_rules'
                  ? 'DEMO RULES'
                  : 'UNAVAILABLE',
        },
      ];
      const newCase: DiagnosticCase = {
        id: caseId,
        ownerId: user?.uid || 'demo-user',
        assetId: targetAsset.id,
        assetName: targetAsset.name,
        componentId: wizardDraft.componentId,
        twinComponentId: wizardDraft.twinComponentId,
        componentType: wizardDraft.componentType,
        componentName: wizardDraft.componentName,
        title: aiRes.assessment.caseTitle,
        symptoms: wizardDraft.symptoms,
        symptomNotes: wizardDraft.symptomNotes,
        faultCode: wizardDraft.faultCode,
        readings: wizardDraft.readings,
        imageEvidenceName: wizardDraft.imageEvidenceName,
        imageEvidenceDataUrl: wizardDraft.imageEvidenceDataUrl,
        safetyHazardDetected: safetyEval.hazardDetected,
        safetyFlags: safetyEval.flaggedLabels,
        stopWork: safetyEval.stopWork || aiRes.assessment.stopWork,
        stopWorkReason: safetyEval.stopWorkReason || aiRes.assessment.stopWorkReason,
        priority,
        status: safetyEval.stopWork || aiRes.assessment.stopWork ? 'safety_blocked' : 'investigating',
        reviewStatus: 'draft',
        timeline: initialTimeline,
        inferenceRecord: aiRes.inferenceRecord,
        assessment: aiRes.assessment,
        isDemo: targetAsset.isDemo,
        createdAt: now,
        updatedAt: now,
      };

      setCases((prev) => [newCase, ...prev]);
      setActiveCaseId(newCase.id);
      setSelectedTwinComponentId(wizardDraft.twinComponentId);

      // Highlight affected component in 3D twin
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== targetAsset.id) return a;
          const nextStatus = newCase.stopWork || priority === 'critical' ? 'fault' : 'warning';
          return {
            ...a,
            status: nextStatus,
            updatedAt: now,
            components: a.components.map((c) =>
              c.twinId === wizardDraft.twinComponentId
                ? { ...c, status: newCase.stopWork ? 'fault' : 'investigating' }
                : c,
            ),
          };
        }),
      );

      // Attach image evidence to FieldProof if supplied
      if (wizardDraft.imageEvidenceDataUrl) {
        const ev: EvidenceRecord = {
          id: `ev-${Date.now()}`,
          ownerId: user?.uid || 'demo-user',
          caseId: newCase.id,
          assetId: targetAsset.id,
          componentId: wizardDraft.componentId,
          componentName: wizardDraft.componentName,
          evidenceType: 'before_photo',
          originKind: 'original_evidence',
          caption: wizardDraft.imageEvidenceName || 'Pre-Diagnosis Field Photo',
          note: `Uploaded during diagnostic intake for ${newCase.title}`,
          imageDataUrl: wizardDraft.imageEvidenceDataUrl,
          timestamp: now,
        };
        setEvidence((prev) => [ev, ...prev]);
        enqueueSyncItem('evidence', ev.id, ev.caption, ev);
      }

      enqueueSyncItem('case', newCase.id, newCase.title, newCase);
      setRoute('diagnostic-results');
      return newCase;
    },
    [
      assets,
      deviceAvailability,
      effectiveOnline,
      enqueueSyncItem,
      knowledgeDocs,
      user?.uid,
      wizardDraft,
    ],
  );

  const runCloudDeepAnalysisForCase = useCallback(
    async (caseId: string): Promise<DiagnosticCase | null> => {
      const target = cases.find((c) => c.id === caseId);
      if (!target) return null;

      const aiRes = await runHybridDiagnosis({
        caseId: target.id,
        assetName: target.assetName,
        componentType: target.componentType,
        componentName: target.componentName,
        symptoms: target.symptoms,
        symptomNotes: `${target.symptomNotes} [Requesting deeper cloud correlation across system components and knowledge references]`,
        faultCode: target.faultCode,
        readings: target.readings,
        safetyFlags: target.safetyFlags,
        imageDataUrl: target.imageEvidenceDataUrl,
        knowledgeLibrary: knowledgeDocs,
        forceCloudOnly: true,
        onDeviceReady: false,
      });

      setLastInferenceRecord(aiRes.inferenceRecord);
      setLastAiWarning(aiRes.warningMessage || null);
      setInferenceHistory((prev) => [aiRes.inferenceRecord, ...prev.slice(0, 29)]);

      const updated: DiagnosticCase = {
        ...target,
        cloudDeepAnalysis: aiRes.assessment,
        cloudInferenceRecord: aiRes.inferenceRecord,
        updatedAt: new Date().toISOString(),
      };
      setCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      enqueueSyncItem('case', updated.id, `${updated.title} (Cloud Analysis)`, updated);
      return updated;
    },
    [cases, enqueueSyncItem, knowledgeDocs],
  );

  const runComparisonForCase = useCallback(
    async (
      caseId: string,
      targetMode: 'prefer_on_device' | 'only_in_cloud',
    ): Promise<HybridComparisonEntry | null> => {
      const target = cases.find((c) => c.id === caseId) || cases[0];
      if (!target) return null;

      const aiRes = await runHybridDiagnosis({
        caseId: target.id,
        assetName: target.assetName,
        componentType: target.componentType,
        componentName: target.componentName,
        symptoms: target.symptoms,
        symptomNotes: target.symptomNotes,
        faultCode: target.faultCode,
        readings: target.readings,
        safetyFlags: target.safetyFlags,
        imageDataUrl: target.imageEvidenceDataUrl,
        knowledgeLibrary: knowledgeDocs,
        forceCloudOnly: targetMode === 'only_in_cloud' && effectiveOnline,
        onDeviceReady: deviceAvailability === 'ready',
      });

      setLastInferenceRecord(aiRes.inferenceRecord);
      setLastAiWarning(aiRes.warningMessage || null);
      setInferenceHistory((prev) => [aiRes.inferenceRecord, ...prev.slice(0, 29)]);

      const now = new Date().toISOString();
      let resultEntry: HybridComparisonEntry | null = null;
      setComparisons((prev) => {
        const existing = prev.find((e) => e.caseId === target.id);
        const base: HybridComparisonEntry = existing || {
          caseId: target.id,
          promptSummary: `${target.assetName} · ${target.componentName} · Fault ${target.faultCode || 'None'}`,
          primaryRecord: target.inferenceRecord,
          primaryAssessment: target.assessment,
          updatedAt: now,
        };
        const next: HybridComparisonEntry =
          targetMode === 'only_in_cloud'
            ? {
                ...base,
                secondaryRecord: aiRes.inferenceRecord,
                secondaryAssessment: aiRes.assessment,
                secondaryUnavailableReason: !effectiveOnline
                  ? 'Offline mode active — cloud path unavailable without network.'
                  : aiRes.usedFallbackRules
                    ? aiRes.warningMessage || aiRes.inferenceRecord.errorDetail
                    : undefined,
                updatedAt: now,
              }
            : {
                ...base,
                primaryRecord: aiRes.inferenceRecord,
                primaryAssessment: aiRes.assessment,
                updatedAt: now,
              };
        resultEntry = next;
        return existing ? prev.map((e) => (e.caseId === target.id ? next : e)) : [next, ...prev];
      });

      return resultEntry;
    },
    [cases, deviceAvailability, effectiveOnline, knowledgeDocs],
  );

  const addOrUpdateAsset = useCallback(
    (input: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'> & { id?: string }): Asset => {
      const now = new Date().toISOString();
      const id = input.id || `asset-${Date.now()}`;
      const existing = assets.find((a) => a.id === id);
      const saved: Asset = {
        ...input,
        id,
        ownerId: user?.uid || 'demo-user',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      setAssets((prev) => (existing ? prev.map((a) => (a.id === id ? saved : a)) : [saved, ...prev]));
      enqueueSyncItem('asset', saved.id, saved.name, saved);
      return saved;
    },
    [assets, enqueueSyncItem, user?.uid],
  );

  const createWorkOrderFromCase = useCallback(
    (caseId: string): WorkOrder => {
      const existing = workOrders.find((w) => w.caseId === caseId);
      if (existing) {
        setActiveWorkOrderId(existing.id);
        setRoute('repairs');
        return existing;
      }
      const targetCase = cases.find((c) => c.id === caseId) || cases[0];
      const now = new Date().toISOString();
      const tasks: RepairTask[] = targetCase.stopWork
        ? [
            {
              id: 'task-esc-1',
              title: 'Maintain Stop-Work Hold & restrict access to affected equipment zone',
              safetyNote: 'Safety Gate blocked ordinary repair progression.',
              requiresVerification: true,
              status: 'blocked',
            },
            {
              id: 'task-esc-2',
              title: 'Escalate hazard evidence package to authorized electrical supervisor',
              safetyNote: 'Only qualified personnel may clear hazardous site holds.',
              requiresVerification: true,
              status: 'escalated',
            },
          ]
        : targetCase.assessment.safeNextActions.slice(0, 5).map((action, idx) => ({
            id: `task-${Date.now()}-${idx}`,
            title: action,
            safetyNote:
              'Non-invasive verification only. Follow LOTO & manufacturer guidelines before energized work.',
            requiresVerification: idx === targetCase.assessment.safeNextActions.length - 1,
            status: 'not_started',
          }));

      const wo: WorkOrder = {
        id: `wo-${Date.now()}`,
        ownerId: user?.uid || 'demo-user',
        caseId: targetCase.id,
        assetId: targetCase.assetId,
        assetName: targetCase.assetName,
        componentId: targetCase.componentId,
        twinComponentId: targetCase.twinComponentId,
        componentName: targetCase.componentName,
        title: `Repair Workflow — ${targetCase.title}`,
        problemDescription: targetCase.assessment.summary,
        status: targetCase.stopWork ? 'blocked' : 'not_started',
        priority: targetCase.priority,
        safetyCleared: !targetCase.stopWork,
        tasks,
        technicianNotes: '',
        verificationNotes: '',
        isDemo: targetCase.isDemo,
        createdAt: now,
        updatedAt: now,
      };
      setWorkOrders((prev) => [wo, ...prev]);
      setActiveWorkOrderId(wo.id);
      enqueueSyncItem('workOrder', wo.id, wo.title, wo);
      setRoute('repairs');
      return wo;
    },
    [cases, enqueueSyncItem, user?.uid, workOrders],
  );

  const updateWorkOrderTaskStatus = useCallback(
    (workOrderId: string, taskId: string, status: WorkOrderStatus) => {
      const now = new Date().toISOString();
      setWorkOrders((prev) =>
        prev.map((wo) => {
          if (wo.id !== workOrderId) return wo;
          if (!wo.safetyCleared && status === 'completed') return wo;
          const nextTasks = wo.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status, completedAt: status === 'completed' ? now : undefined }
              : t,
          );
          const allDone = nextTasks.every((t) => t.status === 'completed');
          const anyActive = nextTasks.some(
            (t) => t.status === 'in_progress' || t.status === 'completed',
          );
          const nextStatus: WorkOrderStatus = allDone
            ? 'in_progress'
            : anyActive
              ? 'in_progress'
              : wo.status;
          const updated: WorkOrder = {
            ...wo,
            tasks: nextTasks,
            status: nextStatus,
            updatedAt: now,
          };
          enqueueSyncItem('workOrder', updated.id, updated.title, updated);
          return updated;
        }),
      );
    },
    [enqueueSyncItem],
  );

  const updateWorkOrderNotes = useCallback(
    (workOrderId: string, technicianNotes: string, verificationNotes: string) => {
      const now = new Date().toISOString();
      setWorkOrders((prev) =>
        prev.map((wo) => {
          if (wo.id !== workOrderId) return wo;
          const updated = { ...wo, technicianNotes, verificationNotes, updatedAt: now };
          enqueueSyncItem('workOrder', updated.id, `${updated.title} (Notes)`, updated);
          return updated;
        }),
      );
    },
    [enqueueSyncItem],
  );

  const escalateWorkOrder = useCallback(
    (workOrderId: string, reason: string) => {
      const now = new Date().toISOString();
      setWorkOrders((prev) =>
        prev.map((wo) => {
          if (wo.id !== workOrderId) return wo;
          const updated: WorkOrder = {
            ...wo,
            status: 'escalated',
            escalatedReason: reason,
            updatedAt: now,
          };
          enqueueSyncItem('workOrder', updated.id, `${updated.title} (Escalated)`, updated);
          return updated;
        }),
      );
    },
    [enqueueSyncItem],
  );

  const completeWorkOrder = useCallback(
    (workOrderId: string) => {
      const targetWo = workOrders.find((w) => w.id === workOrderId);
      if (!targetWo || !targetWo.safetyCleared) return;
      const now = new Date().toISOString();

      const updatedWo: WorkOrder = {
        ...targetWo,
        status: 'completed',
        tasks: targetWo.tasks.map((t) => ({
          ...t,
          status: 'completed',
          completedAt: t.completedAt || now,
        })),
        timeline: [
          ...(targetWo.timeline || []),
          {
            id: `tl-complete-${Date.now()}`,
            timestamp: now,
            kind: 'status_change',
            title: 'Work Order Verified & Completed',
            detail: 'All non-invasive checklist items verified nominal.',
            badge: 'COMPLETED',
          },
        ],
        updatedAt: now,
      };
      setWorkOrders((prev) => prev.map((w) => (w.id === workOrderId ? updatedWo : w)));
      enqueueSyncItem('workOrder', updatedWo.id, `${updatedWo.title} (Completed)`, updatedWo);

      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== targetWo.caseId) return c;
          const updatedCase: DiagnosticCase = {
            ...c,
            status: 'resolved',
            timeline: [
              ...(c.timeline || []),
              {
                id: `tl-resolved-${Date.now()}`,
                timestamp: now,
                kind: 'status_change',
                title: 'Case Resolved via Verified Repair',
                detail: `Work order ${updatedWo.title} completed.`,
                badge: 'RESOLVED',
              },
            ],
            updatedAt: now,
          };
          enqueueSyncItem('case', updatedCase.id, `${updatedCase.title} (Resolved)`, updatedCase);
          return updatedCase;
        }),
      );

      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== targetWo.assetId) return a;
          const updatedComponents = a.components.map((comp) =>
            comp.id === targetWo.componentId || comp.twinId === targetWo.twinComponentId
              ? { ...comp, status: 'nominal' as const, lastInspectionAt: now }
              : comp,
          );
          const anyFault = updatedComponents.some((c) => c.status === 'fault');
          const anyWarn = updatedComponents.some((c) => c.status === 'warning');
          const updatedAsset: Asset = {
            ...a,
            status: anyFault ? 'fault' : anyWarn ? 'warning' : 'nominal',
            lastInspectionAt: now,
            updatedAt: now,
            components: updatedComponents,
          };
          enqueueSyncItem('asset', updatedAsset.id, updatedAsset.name, updatedAsset);
          return updatedAsset;
        }),
      );

      setActiveFaultScenario(DEMO_FAULT_SCENARIOS[0]);
      setTwinRecoveryPulse(true);
      setTimeout(() => setTwinRecoveryPulse(false), 3200);
    },
    [enqueueSyncItem, workOrders],
  );

  const addEvidenceRecord = useCallback(
    (record: Omit<EvidenceRecord, 'id' | 'ownerId' | 'timestamp'>): EvidenceRecord => {
      const ev: EvidenceRecord = {
        ...record,
        id: `ev-${Date.now()}`,
        ownerId: user?.uid || 'demo-user',
        timestamp: new Date().toISOString(),
      };
      setEvidence((prev) => [ev, ...prev]);
      enqueueSyncItem('evidence', ev.id, ev.caption, ev);
      return ev;
    },
    [enqueueSyncItem, user?.uid],
  );

  const addKnowledgeSource = useCallback(
    (docInput: Omit<KnowledgeSource, 'id' | 'isDemoPack' | 'isUserImported'>): KnowledgeSource => {
      const newDoc: KnowledgeSource = {
        ...docInput,
        id: `kb-user-${Date.now()}`,
        isDemoPack: false,
        isUserImported: true,
      };
      setKnowledgeDocs((prev) => [newDoc, ...prev]);
      enqueueSyncItem('knowledge', newDoc.id, newDoc.title, newDoc);
      return newDoc;
    },
    [enqueueSyncItem],
  );

  const generateServiceReport = useCallback(
    (params: {
      caseId: string;
      workOrderId?: string;
      estimatedImpactKwh?: number;
      outstandingIssues: string;
    }): ServiceReport => {
      const targetCase = cases.find((c) => c.id === params.caseId) || cases[0];
      const targetWo = workOrders.find((w) => w.id === params.workOrderId || w.caseId === targetCase.id);
      const status: ServiceReport['status'] =
        targetWo?.status === 'completed' || targetCase.status === 'resolved'
          ? 'completed'
          : targetWo?.status === 'escalated' || targetCase.stopWork
            ? 'escalated'
            : 'pending_verification';
      const report: ServiceReport = {
        id: `rep-${Date.now()}`,
        ownerId: user?.uid || 'demo-user',
        reportCode: `SF-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        caseId: targetCase.id,
        workOrderId: targetWo?.id,
        assetId: targetCase.assetId,
        title: `FieldProof Report — ${targetCase.title}`,
        status,
        summary: targetCase.assessment.summary,
        estimatedImpactKwh: params.estimatedImpactKwh,
        outstandingIssues: params.outstandingIssues || 'None recorded.',
        isSimulated: targetCase.isDemo,
        sourceIds: targetCase.assessment.sourceIds,
        createdAt: new Date().toISOString(),
      };
      setReports((prev) => [report, ...prev]);
      setActiveReportId(report.id);
      const linkedEvidence = evidence.filter(
        (e) => e.caseId === targetCase.id || (targetWo && e.workOrderId === targetWo.id),
      );
      const canonical = buildCanonicalReportPayload({
        report,
        linkedCase: targetCase,
        linkedWo: targetWo,
        linkedEvidence,
      });
      computeCanonicalSha256(canonical)
        .then((hash) => {
          const hashedReport = { ...report, canonicalHash: hash };
          setReports((prev) => prev.map((r) => (r.id === report.id ? hashedReport : r)));
          enqueueSyncItem('report', hashedReport.id, hashedReport.reportCode, hashedReport);
        })
        .catch(() => {
          enqueueSyncItem('report', report.id, report.reportCode, report);
        });
      setRoute('reports');
      return report;
    },
    [cases, enqueueSyncItem, evidence, user?.uid, workOrders],
  );

  const submitForReview = useCallback(
    (kind: 'case' | 'workOrder', id: string) => {
      const now = new Date().toISOString();
      const event: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: now,
        kind: 'review',
        title: 'Submitted for Supervisor Review',
        detail: 'Moved into supervisor sign-off queue (status: pending_review).',
        badge: 'PENDING REVIEW',
      };
      if (kind === 'case') {
        setCases((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const next = {
              ...c,
              reviewStatus: 'pending_review' as const,
              timeline: [...(c.timeline || []), event],
              updatedAt: now,
            };
            enqueueSyncItem('case', next.id, `${next.title} (Pending Review)`, next);
            return next;
          }),
        );
      } else {
        setWorkOrders((prev) =>
          prev.map((w) => {
            if (w.id !== id) return w;
            const next = {
              ...w,
              reviewStatus: 'pending_review' as const,
              timeline: [...(w.timeline || []), event],
              updatedAt: now,
            };
            enqueueSyncItem('workOrder', next.id, `${next.title} (Pending Review)`, next);
            return next;
          }),
        );
      }
    },
    [enqueueSyncItem],
  );

  const decideReview = useCallback(
    (
      kind: 'case' | 'workOrder',
      id: string,
      decision: Extract<ReviewStatus, 'approved' | 'changes_requested'>,
      note: string,
    ) => {
      if (!supervisorRoleActive) return;
      const now = new Date().toISOString();
      const reviewer = user?.displayName || 'Field Supervisor (Preview)';
      const event: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: now,
        kind: 'review',
        title: decision === 'approved' ? 'Supervisor Approved' : 'Supervisor Requested Changes',
        detail: note || (decision === 'approved' ? 'Signed off for audit archive.' : 'Additional FieldProof verification requested.'),
        badge: decision.toUpperCase(),
      };
      if (kind === 'case') {
        setCases((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const next = {
              ...c,
              reviewStatus: decision,
              reviewedBy: reviewer,
              reviewedAt: now,
              reviewNote: note,
              timeline: [...(c.timeline || []), event],
              updatedAt: now,
            };
            enqueueSyncItem('case', next.id, `${next.title} (${decision})`, next);
            return next;
          }),
        );
      } else {
        setWorkOrders((prev) =>
          prev.map((w) => {
            if (w.id !== id) return w;
            const next = {
              ...w,
              reviewStatus: decision,
              reviewedBy: reviewer,
              reviewedAt: now,
              reviewNote: note,
              timeline: [...(w.timeline || []), event],
              updatedAt: now,
            };
            enqueueSyncItem('workOrder', next.id, `${next.title} (${decision})`, next);
            return next;
          }),
        );
      }
    },
    [enqueueSyncItem, supervisorRoleActive, user?.displayName],
  );

  const createCopilotThread = useCallback((): CopilotThread => {
    const now = new Date().toISOString();
    const activeAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
    const th: CopilotThread = {
      id: `thread-${Date.now()}`,
      ownerId: user?.uid || 'demo-user',
      title: `${activeAsset?.name?.replace(' [DEMO]', '') || 'Site'} · ${selectedTwinComponentId}`,
      assetId: activeAsset?.id,
      componentId: selectedTwinComponentId,
      caseId: activeCaseId,
      language,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setCopilotThreads((prev) => [th, ...prev]);
    setActiveCopilotThreadId(th.id);
    return th;
  }, [activeCaseId, assets, language, selectedAssetId, selectedTwinComponentId, user?.uid]);

  const sendCopilotMessage = useCallback(
    async (userText: string, mode: 'cloud_chat' | 'on_device_single' = 'cloud_chat') => {
      const trimmed = userText.trim();
      if (!trimmed || copilotBusy) return;

      let targetThread =
        copilotThreads.find((t) => t.id === activeCopilotThreadId) || copilotThreads[0];
      if (!targetThread) {
        targetThread = createCopilotThread();
      }

      const activeAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
      const openCase = cases.find((c) => c.id === activeCaseId);
      const now = new Date().toISOString();
      const userMsg: CopilotMessage = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: now,
      };

      const prevHistory = targetThread.messages;
      setCopilotThreads((prev) =>
        prev.map((th) =>
          th.id === targetThread.id
            ? {
                ...th,
                title: th.messages.length === 0 ? trimmed.slice(0, 56) : th.title,
                messages: [...th.messages, userMsg],
                updatedAt: now,
              }
            : th,
        ),
      );
      setCopilotBusy(true);
      setCopilotStreamingText('');

      try {
        const res = await runCopilotTurn({
          userMessage: trimmed,
          historyMessages: prevHistory,
          context: {
            includeContext: copilotIncludeContext,
            assetId: activeAsset?.id,
            assetName: activeAsset?.name,
            componentId: selectedTwinComponentId,
            componentLabel:
              activeAsset?.components.find((c) => c.twinId === selectedTwinComponentId)?.name ||
              selectedTwinComponentId,
            openCaseId: openCase?.id,
            openCaseTitle: openCase?.title,
            faultCode: openCase?.faultCode,
            readingsSummary: openCase?.readings.map((r) => `${r.label}: ${r.value} ${r.unit}`).join('; '),
            language,
          },
          knowledgeDocs,
          mode,
          onDeviceReady: deviceAvailability === 'ready',
          readingsCount: openCase?.readings.length || 0,
          onStreamChunk: (partial) => setCopilotStreamingText(partial),
        });

        const assistantMsg: CopilotMessage = {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          text: res.text,
          timestamp: new Date().toISOString(),
          inferenceSource: res.inferenceSource,
          modelName: res.modelName,
          latencyMs: res.latencyMs,
          evidenceStatus: res.evidenceStatus,
          citedSourceIds: res.citedSourceIds,
          droppedSourceIds: res.droppedSourceIds,
          actions: res.actions,
          stopWorkHold: res.stopWorkHold,
          safetyFiltered: res.safetyFiltered,
          error: res.errorNotice,
          payloadSentPreview: res.payloadSentPreview,
          intent: res.intent,
        };

        const finishedAt = new Date().toISOString();
        setCopilotThreads((prev) =>
          prev.map((th) => {
            if (th.id !== targetThread.id) return th;
            const nextThread: CopilotThread = {
              ...th,
              messages: [...th.messages, assistantMsg],
              updatedAt: finishedAt,
            };
            enqueueSyncItem('copilotThread', nextThread.id, nextThread.title, nextThread);
            return nextThread;
          }),
        );
      } finally {
        setCopilotBusy(false);
        setCopilotStreamingText('');
      }
    },
    [
      activeCaseId,
      activeCopilotThreadId,
      assets,
      cases,
      copilotBusy,
      copilotIncludeContext,
      copilotThreads,
      createCopilotThread,
      deviceAvailability,
      enqueueSyncItem,
      knowledgeDocs,
      language,
      selectedAssetId,
      selectedTwinComponentId,
    ],
  );

  const rateCopilotMessage = useCallback(
    (threadId: string, messageId: string, feedback: CopilotFeedback) => {
      setCopilotThreads((prev) =>
        prev.map((th) =>
          th.id === threadId
            ? {
                ...th,
                messages: th.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
              }
            : th,
        ),
      );
    },
    [],
  );

  const executeCopilotAction = useCallback(
    (action: CopilotActionChip) => {
      if (action.actionType === 'highlight_3d') {
        const target = action.targetComponentId || selectedTwinComponentId;
        setSelectedTwinComponentId(target);
        setCopilotDrawerOpen(false);
        navigate('digital-twin');
        return;
      }
      if (action.actionType === 'open_wizard') {
        setCopilotDrawerOpen(false);
        startDiagnosisForComponent(
          selectedAssetId,
          action.targetComponentId || selectedTwinComponentId,
        );
        return;
      }
      if (action.actionType === 'start_checklist') {
        setCopilotDrawerOpen(false);
        createWorkOrderFromCase(action.caseId || activeCaseId);
        return;
      }
      if (action.actionType === 'add_fieldproof') {
        setCopilotDrawerOpen(false);
        navigate('fieldproof');
        return;
      }
      if (action.actionType === 'open_calculator') {
        setCopilotDrawerOpen(false);
        navigate('calculator');
      }
    },
    [
      activeCaseId,
      createWorkOrderFromCase,
      navigate,
      selectedAssetId,
      selectedTwinComponentId,
      startDiagnosisForComponent,
    ],
  );

  const resetDemoWorkspace = useCallback(async () => {
    await clearAllIDB(storageScopeId);
    setAssets(DEMO_ASSETS);
    setCases(DEMO_CASES);
    setWorkOrders(DEMO_WORK_ORDERS);
    setEvidence(DEMO_EVIDENCE);
    setReports(DEMO_REPORTS);
    setKnowledgeDocs(DEMO_KNOWLEDGE_LIBRARY);
    setInferenceHistory([DEMO_CASES[0].inferenceRecord]);
    setComparisons([]);
    setSyncQueue([]);
    setSelectedAssetId(DEMO_ASSETS[0].id);
    setSelectedTwinComponentId('inverter');
    setActiveCaseId(DEMO_CASES[0].id);
    setActiveWorkOrderId(DEMO_WORK_ORDERS[0].id);
    setActiveReportId(DEMO_REPORTS[0].id);
    setActiveFaultScenario(DEMO_FAULT_SCENARIOS[1]);
    setTwinHourDecimal(12.5);
    setWizardDraft(makeInitialDraft(DEMO_ASSETS));
    setLastAiWarning(null);
    setCopilotThreads([
      {
        id: 'thread-demo-mesa',
        ownerId: 'demo-user',
        title: 'Mesa Ridge G04-UV Field Triage',
        assetId: DEMO_ASSETS[0].id,
        componentId: 'inverter',
        caseId: DEMO_CASES[0].id,
        language: 'en',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    setActiveCopilotThreadId('thread-demo-mesa');
  }, [storageScopeId]);

  const value: SunFixContextValue = {
    route,
    activeLifecycleSlug,
    navigate,
    user,
    authReady,
    signIn,
    signOut,
    authError,
    assets,
    cases,
    workOrders,
    evidence,
    reports,
    knowledgeDocs,
    inferenceHistory,
    comparisons,
    selectedAssetId,
    setSelectedAssetId,
    selectedTwinComponentId,
    setSelectedTwinComponentId,
    activeCaseId,
    setActiveCaseId,
    activeWorkOrderId,
    setActiveWorkOrderId,
    activeReportId,
    setActiveReportId,
    activeFaultScenario,
    applyFaultScenario,
    twinRecoveryPulse,
    twinHourDecimal,
    setTwinHourDecimal,
    wizardDraft,
    setWizardDraft,
    startDiagnosisForComponent,
    browserSupport,
    runtimeCapabilities,
    refreshRuntimeCapabilities,
    deviceAvailability,
    downloadProgress,
    deviceStatusDetail,
    lastInferenceRecord,
    lastAiWarning,
    prepareOnDeviceAI,
    submitDiagnosis,
    runCloudDeepAnalysisForCase,
    runComparisonForCase,
    addOrUpdateAsset,
    createWorkOrderFromCase,
    updateWorkOrderTaskStatus,
    updateWorkOrderNotes,
    escalateWorkOrder,
    completeWorkOrder,
    addEvidenceRecord,
    addKnowledgeSource,
    generateServiceReport,
    browserOnline,
    simulatedOffline,
    effectiveOnline,
    toggleSimulatedOffline: () => setSimulatedOffline((s) => !s),
    syncQueue,
    syncStatus,
    processSyncQueue,
    retrySyncItem,
    resolveSyncConflictKeepLocal,
    appCheckStatus,
    firestoreStatus,
    localStorageError,
    cloudHydrationWarning,
    cloudCounts,
    language,
    setLanguage,
    qualityTier,
    setQualityTier,
    supervisorRoleActive,
    setSupervisorRoleActive,
    submitForReview,
    decideReview,
    copilotDrawerOpen,
    setCopilotDrawerOpen,
    copilotIncludeContext,
    setCopilotIncludeContext,
    copilotThreads,
    activeCopilotThreadId,
    setActiveCopilotThreadId,
    copilotBusy,
    copilotStreamingText,
    createCopilotThread,
    sendCopilotMessage,
    rateCopilotMessage,
    executeCopilotAction,
    resetDemoWorkspace,
  };

  const workspaceReady = authReady && hydratedScopeId === storageScopeId;

  return (
    <SunFixContext.Provider value={value}>
      {workspaceReady ? (
        children
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-[#0E1A17] px-6 text-center text-[#DDE8DC]" role="status" aria-live="polite">
          <div>
            <p className="text-sm font-semibold tracking-wide">SunFix Field</p>
            <p className="mt-2 text-xs text-[#AAB9AA]">Loading your private workspace…</p>
          </div>
        </div>
      )}
    </SunFixContext.Provider>
  );
};

export function useSunFix(): SunFixContextValue {
  const ctx = useContext(SunFixContext);
  if (!ctx) throw new Error('useSunFix must be used within SunFixProvider');
  return ctx;
}
