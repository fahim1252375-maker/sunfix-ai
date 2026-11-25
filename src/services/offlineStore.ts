import type {
  AIInferenceRecord,
  AppLanguage,
  Asset,
  CopilotThread,
  DiagnosticCase,
  EvidenceRecord,
  HybridComparisonEntry,
  KnowledgeSource,
  QualityTier,
  ServiceReport,
  SyncQueueItem,
  WorkOrder,
} from '../types/sunfix';

const DB_NAME = 'sunfix-field-db';
const DB_VERSION = 1;
const STORE_STATE = 'workspace_state';
const STORE_QUEUE = 'sync_queue';
const WORKSPACE_KEY = 'active_workspace';

export interface PersistedWorkspaceData {
  assets: Asset[];
  cases: DiagnosticCase[];
  workOrders: WorkOrder[];
  evidence: EvidenceRecord[];
  reports: ServiceReport[];
  knowledgeDocs: KnowledgeSource[];
  inferenceHistory?: AIInferenceRecord[];
  comparisons?: HybridComparisonEntry[];
  copilotThreads?: CopilotThread[];
  language?: AppLanguage;
  qualityTier?: QualityTier;
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadWorkspaceFromIDB(): Promise<PersistedWorkspaceData | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const store = tx.objectStore(STORE_STATE);
      const req = store.get(WORKSPACE_KEY);
      req.onsuccess = () => {
        const record = req.result as { key: string; data: PersistedWorkspaceData } | undefined;
        resolve(record ? record.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveWorkspaceToIDB(data: PersistedWorkspaceData): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readwrite');
      const store = tx.objectStore(STORE_STATE);
      store.put({ key: WORKSPACE_KEY, data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Graceful no-op if IDB blocked in restricted mode
  }
}

export async function loadSyncQueueFromIDB(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as SyncQueueItem[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveSyncQueueItemToIDB(item: SyncQueueItem): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Graceful no-op
  }
}

export async function clearAllIDB(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_STATE, STORE_QUEUE], 'readwrite');
      tx.objectStore(STORE_STATE).clear();
      tx.objectStore(STORE_QUEUE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Graceful no-op
  }
}
