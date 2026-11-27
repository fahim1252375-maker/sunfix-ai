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
const DB_VERSION = 2;
const STORE_STATE = 'workspace_state';
const STORE_QUEUE = 'sync_queue';

interface StoredSyncQueueItem extends SyncQueueItem {
  scopeId: string;
}

export function getStorageScopeId(userId?: string | null): string {
  const normalizedUserId = userId?.trim();
  return normalizedUserId ? `user:${normalizedUserId}` : 'anonymous';
}

export function getWorkspaceStorageKey(scopeId: string): string {
  return `workspace:${scopeId}`;
}

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
      const stateStore = db.objectStoreNames.contains(STORE_STATE)
        ? request.transaction!.objectStore(STORE_STATE)
        : db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      const queueStore = db.objectStoreNames.contains(STORE_QUEUE)
        ? request.transaction!.objectStore(STORE_QUEUE)
        : db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });

      // Legacy records were stored globally and cannot be assigned safely to an account.
      stateStore.delete('active_workspace');
      const legacyQueueRequest = queueStore.getAll();
      legacyQueueRequest.onsuccess = () => {
        const legacyRecords = legacyQueueRequest.result as Array<{ id: string; scopeId?: string }>;
        for (const record of legacyRecords) {
          if (!record.scopeId) queueStore.delete(record.id);
        }
      };
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadWorkspaceFromIDB(scopeId: string): Promise<PersistedWorkspaceData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATE, 'readonly');
    const req = tx.objectStore(STORE_STATE).get(getWorkspaceStorageKey(scopeId));
    req.onsuccess = () => {
      const record = req.result as { key: string; data: PersistedWorkspaceData } | undefined;
      resolve(record ? record.data : null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveWorkspaceToIDB(
  data: PersistedWorkspaceData,
  scopeId: string,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_STATE, 'readwrite');
    tx.objectStore(STORE_STATE).put({ key: getWorkspaceStorageKey(scopeId), data });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadSyncQueueFromIDB(scopeId: string): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => {
      const records = (req.result as StoredSyncQueueItem[]) || [];
      resolve(
        records
          .filter((record) => record.scopeId === scopeId)
          .map(({ scopeId: _scopeId, ...item }) => item),
      );
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveSyncQueueItemToIDB(
  item: SyncQueueItem,
  scopeId: string,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put({ ...item, scopeId } satisfies StoredSyncQueueItem);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveSyncQueueItemsToIDB(
  items: SyncQueueItem[],
  scopeId: string,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);

    try {
      for (const item of items) {
        store.put({ ...item, scopeId } satisfies StoredSyncQueueItem);
      }
    } catch (error) {
      // Abort the entire snapshot if any item cannot be enqueued. IndexedDB
      // rolls back earlier puts in the same readwrite transaction.
      try { tx.abort(); } catch { /* The transaction may already be inactive. */ }
      db.close();
      reject(error);
      return;
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Sync queue snapshot transaction aborted.'));
    };
  });
}


export async function clearAllIDB(scopeId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_STATE, STORE_QUEUE], 'readwrite');
    tx.objectStore(STORE_STATE).delete(getWorkspaceStorageKey(scopeId));

    const queueStore = tx.objectStore(STORE_QUEUE);
    const req = queueStore.getAll();
    req.onsuccess = () => {
      const records = (req.result as StoredSyncQueueItem[]) || [];
      for (const record of records) {
        if (record.scopeId === scopeId) queueStore.delete(record.id);
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
