import type {
  Asset, CopilotThread, DiagnosticCase, EvidenceRecord, KnowledgeSource, ServiceReport,
  SyncQueueItem, WorkOrder,
} from '../types/sunfix';
import type { CloudEntityType, CloudWorkspaceRecords, IncompleteCloudRecord } from './firestoreWorkspace';

export type WorkspaceRecord = Asset | DiagnosticCase | WorkOrder | EvidenceRecord | ServiceReport | KnowledgeSource | CopilotThread;
const collectionByEntity: Record<CloudEntityType, keyof CloudWorkspaceRecords> = {
  asset: 'assets', case: 'cases', workOrder: 'workOrders', evidence: 'evidence',
  report: 'reports', knowledge: 'knowledgeDocs', copilotThread: 'copilotThreads',
};
const entityTypes: CloudEntityType[] = ['asset', 'case', 'workOrder', 'evidence', 'report', 'knowledge', 'copilotThread'];
const preserveStatuses = new Set<string>(['persisting', 'pending', 'failed', 'conflict', 'local_only']);
const firestoreCollectionByEntity: Record<CloudEntityType, string> = {
  asset: 'assets', case: 'diagnosticCases', workOrder: 'workOrders', evidence: 'evidenceRecords',
  report: 'serviceReports', knowledge: 'knowledgeDocs', copilotThread: 'copilotThreads',
};

function isDemoRecord(record: WorkspaceRecord): boolean {
  const value = record as unknown as Record<string, unknown>;
  return value.isDemo === true || value.isDemoPack === true || value.isSimulated === true
    || value.ownerId === 'demo-user' || value.originKind === 'simulated_demo_evidence'
    || (typeof value.id === 'string' && value.id.startsWith('thread-demo-'));
}

function recordRevision(record: WorkspaceRecord): number | undefined {
  const value = record as unknown as Record<string, unknown>;
  return typeof value.cloudRevision === 'number' ? value.cloudRevision : undefined;
}

export function reconcileCloudWorkspace(
  remote: CloudWorkspaceRecords,
  local: CloudWorkspaceRecords,
  queue: SyncQueueItem[],
  incomplete: IncompleteCloudRecord[],
  uid: string,
): { records: CloudWorkspaceRecords; queue: SyncQueueItem[] } {
  const nextQueue: SyncQueueItem[] = [...queue].map((item) => item.status === 'persisting' ? { ...item, status: 'pending' as const } : item);
  const activeQueue = new Map<string, SyncQueueItem>();
  for (const item of nextQueue) {
    if (preserveStatuses.has(item.status)) activeQueue.set(`${item.entityType}:${item.entityId}`, item);
  }
  const incompleteIds = new Set(incomplete.map((record) => `${record.collection}:${record.id}`));
  const result = { ...remote } as CloudWorkspaceRecords;

  for (const entityType of entityTypes) {
    const collection = collectionByEntity[entityType];
    const remoteRecords = remote[collection] as WorkspaceRecord[];
    const localRecords = local[collection] as WorkspaceRecord[];
    const byId = new Map(remoteRecords.map((record) => [record.id, record]));
    for (const localRecord of localRecords) {
      if (isDemoRecord(localRecord)) continue;
      const queueKey = `${entityType}:${localRecord.id}`;
      const queued = activeQueue.get(queueKey);
      const remoteRecord = byId.get(localRecord.id);
      const hasLegacyRemote = incompleteIds.has(`${firestoreCollectionByEntity[entityType]}:${localRecord.id}`);

      if (queued) {
        const revision = recordRevision(localRecord);
        if (revision && revision > (queued.baseRevision ?? 0)
          && ['pending', 'persisting', 'failed'].includes(queued.status)) {
          const refreshed: SyncQueueItem = {
            ...queued,
            baseRevision: revision,
            payload: { ...(localRecord as unknown as Record<string, unknown>), cloudRevision: revision },
          };
          const index = nextQueue.findIndex((item) => item.id === queued.id);
          if (index >= 0) nextQueue[index] = refreshed;
          activeQueue.set(queueKey, refreshed);
        }
        byId.set(localRecord.id, localRecord);
        continue;
      }
      if (remoteRecord) continue;
      if (hasLegacyRemote) {
        // Legacy cloud metadata proves a remote record exists but cannot restore
        // missing fields. Keep this device's copy and leave it out of sync replay.
        byId.set(localRecord.id, localRecord);
        continue;
      }

      const revision = recordRevision(localRecord);
      const preserved: SyncQueueItem = {
        id: `reconcile-${entityType}-${localRecord.id}`,
        mutationId: `reconcile:${uid}:${entityType}:${localRecord.id}`,
        baseRevision: revision ?? 0,
        entityType,
        entityId: localRecord.id,
        operation: 'upsert',
        label: localRecord.id,
        payload: localRecord,
        status: revision ? 'conflict' : 'local_only',
        attempts: 0,
        lastError: revision
          ? 'A previously synced record is missing from the owner-filtered cloud result. The local copy is preserved for review.'
          : 'Local data has no complete cloud record and remains on this device; it will not upload automatically.',
        ...(revision ? { remoteSnapshot: { missingAtRead: true, lastKnownRevision: revision } } : {}),
        updatedAt: new Date().toISOString(),
      };
      nextQueue.push(preserved);
      activeQueue.set(queueKey, preserved);
      byId.set(localRecord.id, localRecord);
    }
    for (const item of nextQueue) {
      if (item.entityType !== entityType || !preserveStatuses.has(item.status)) continue;
      const value = item.payload as WorkspaceRecord;
      if (value && typeof value === 'object' && typeof value.id === 'string' && !isDemoRecord(value)) byId.set(value.id, value);
    }
    (result[collection] as WorkspaceRecord[]) = [...byId.values()];
  }
  return { records: result, queue: nextQueue };
}
