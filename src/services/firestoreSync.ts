import {
  collection,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  runTransaction,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  Asset,
  CopilotThread,
  DiagnosticCase,
  EvidenceRecord,
  KnowledgeSource,
  ServiceReport,
  SyncQueueItem,
  UserProfile,
  WorkOrder,
} from '../types/sunfix';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { encodeDomainPayload, type CloudEntityType, FIRESTORE_SCHEMA_VERSION } from './firestoreWorkspace';

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'id-0';
}

function versionedPayload(type: CloudEntityType, payload: unknown, uid: string, revision: number, mutationId: string) {
  return {
    schemaVersion: FIRESTORE_SCHEMA_VERSION,
    revision,
    lastMutationId: mutationId,
    domainPayload: encodeDomainPayload(type, payload, uid),
  };
}

function buildWireFields(item: SyncQueueItem, uid: string, docId: string): Record<string, unknown> {
  if (item.entityType === 'asset') {
    const asset = item.payload as Asset;
    return {
      id: docId, ownerId: uid, name: asset.name.slice(0, 140), siteType: asset.siteType,
      locationLabel: asset.locationLabel.slice(0, 140), capacityKw: Math.max(0, Math.min(100000, asset.capacityKw)),
      status: asset.status, inverterModel: asset.inverterModel.slice(0, 120), inverterSerial: asset.inverterSerial.slice(0, 80),
      ...(asset.batteryModel ? { batteryModel: asset.batteryModel.slice(0, 120) } : {}),
      ...(typeof asset.batteryCapacityKwh === 'number' ? { batteryCapacityKwh: Math.max(0, Math.min(100000, asset.batteryCapacityKwh)) } : {}),
      panelCount: Math.max(0, Math.min(100000, asset.panelCount)), isDemo: Boolean(asset.isDemo),
    };
  }
  if (item.entityType === 'case') {
    const diagnosticCase = item.payload as DiagnosticCase;
    return {
      id: docId, ownerId: uid, assetId: safeId(diagnosticCase.assetId), componentId: safeId(diagnosticCase.componentId),
      componentType: diagnosticCase.componentType, title: diagnosticCase.title.slice(0, 180),
      faultCode: (diagnosticCase.faultCode || '').slice(0, 40),
      readingsSummary: diagnosticCase.readings.map((reading) => `${reading.label}: ${reading.value} ${reading.unit}`).join('; ').slice(0, 500),
      safetyHazardDetected: Boolean(diagnosticCase.safetyHazardDetected), stopWork: Boolean(diagnosticCase.stopWork),
      priority: diagnosticCase.priority, status: diagnosticCase.status,
      inferenceSource: diagnosticCase.inferenceRecord.inferenceSource,
      assessmentSummary: diagnosticCase.assessment.summary.slice(0, 2000),
      ...(diagnosticCase.reviewStatus ? { reviewStatus: diagnosticCase.reviewStatus } : {}),
      ...(diagnosticCase.reviewNote ? { reviewNote: diagnosticCase.reviewNote.slice(0, 600) } : {}),
    };
  }
  if (item.entityType === 'workOrder') {
    const workOrder = item.payload as WorkOrder;
    const totalSteps = Math.max(1, Math.min(100, workOrder.tasks.length));
    return {
      id: docId, ownerId: uid, caseId: safeId(workOrder.caseId), assetId: safeId(workOrder.assetId),
      componentId: safeId(workOrder.componentId), title: workOrder.title.slice(0, 180), status: workOrder.status,
      priority: workOrder.priority, safetyCleared: Boolean(workOrder.safetyCleared),
      technicianNotes: (workOrder.technicianNotes || '').slice(0, 2000),
      completedSteps: workOrder.tasks.filter((task) => task.status === 'completed').length,
      totalSteps,
      ...(workOrder.reviewStatus ? { reviewStatus: workOrder.reviewStatus } : {}),
      ...(workOrder.reviewNote ? { reviewNote: workOrder.reviewNote.slice(0, 600) } : {}),
    };
  }
  if (item.entityType === 'evidence') {
    const evidence = item.payload as EvidenceRecord;
    return {
      id: docId, ownerId: uid, caseId: safeId(evidence.caseId), assetId: safeId(evidence.assetId),
      componentId: safeId(evidence.componentId), evidenceType: evidence.evidenceType, originKind: evidence.originKind,
      caption: evidence.caption.slice(0, 180), note: (evidence.note || '').slice(0, 1200),
    };
  }
  if (item.entityType === 'report') {
    const report = item.payload as ServiceReport;
    return {
      id: docId, ownerId: uid, caseId: safeId(report.caseId), assetId: safeId(report.assetId),
      reportCode: report.reportCode.slice(0, 40), title: report.title.slice(0, 180), status: report.status,
      summary: report.summary.slice(0, 2000), isSimulated: Boolean(report.isSimulated),
      ...(report.canonicalHash ? { canonicalHash: report.canonicalHash.slice(0, 64) } : {}),
    };
  }
  if (item.entityType === 'knowledge') {
    const source = item.payload as KnowledgeSource;
    return {
      id: docId, ownerId: uid, title: source.title.slice(0, 180), publisher: source.publisher.slice(0, 120),
      category: source.category, faultCode: (source.faultCode || '').slice(0, 40),
      summary: source.guidance.slice(0, 2000), sourceUrl: (source.documentUrl || '').slice(0, 300),
      verifiedDate: source.verifiedDate.slice(0, 40),
    };
  }
  const thread = item.payload as CopilotThread;
  const lastMessage = thread.messages[thread.messages.length - 1];
  return {
    id: docId, ownerId: uid, title: thread.title.slice(0, 180), language: thread.language,
    messageCount: Math.max(0, Math.min(500, thread.messages.length)),
    lastMessagePreview: (lastMessage?.text || 'Empty thread').slice(0, 500),
  };
}

export async function upsertUserProfileInFirestore(profile: {
  uid: string;
  displayName: string;
  email: string;
  role: UserProfile['role'];
}): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  const uid = safeId(profile.uid);
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        displayName: profile.displayName.slice(0, 120) || 'Technician',
        email: profile.email.slice(0, 160),
        role: profile.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: profile.displayName.slice(0, 120) || 'Technician',
        role: profile.role,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncQueueItemToFirestore(
  item: SyncQueueItem,
  uid: string,
): Promise<{ status: 'synced' | 'conflict' | 'failed' | 'local_only'; error?: string; remoteSnapshot?: unknown; revision?: number }> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return { status: 'failed', error: 'Verified Google sign-in required for cloud sync.' };
  }

  if (item.operation !== 'upsert') return { status: 'failed', error: 'Delete replay is disabled until a user-confirmed deletion workflow exists.' };

  const rawPayload = item.payload && typeof item.payload === 'object'
    ? item.payload as Record<string, unknown>
    : {};
  if (rawPayload.isDemo === true || rawPayload.isDemoPack === true || rawPayload.isSimulated === true
    || rawPayload.ownerId === 'demo-user' || rawPayload.originKind === 'simulated_demo_evidence') {
    return { status: 'local_only', error: 'Demo or simulated records remain local and were not copied into the real account.' };
  }

  const docId = safeId(item.entityId);

  try {
    const collectionByType: Record<SyncQueueItem['entityType'], string> = {
      asset: 'assets', case: 'diagnosticCases', workOrder: 'workOrders', evidence: 'evidenceRecords',
      report: 'serviceReports', knowledge: 'knowledgeDocs', copilotThread: 'copilotThreads',
    };
    const type = item.entityType as CloudEntityType;
    const ref = doc(db, collectionByType[item.entityType], docId);
    const payloadJson = encodeDomainPayload(type, item.payload, uid);
    const mutationId = item.mutationId || item.id;
    const fields = buildWireFields(item, uid, docId);
    const updateAllowed = ['asset', 'case', 'workOrder', 'copilotThread'].includes(item.entityType);
    return await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const expectedRevision = item.baseRevision ?? 0;
      if (snapshot.exists()) {
        const remote = snapshot.data();
        const remoteRevision = Number.isInteger(remote.revision) ? remote.revision as number : 0;
        if (remote.lastMutationId === mutationId) return { status: 'synced', revision: remoteRevision };
        if (remote.ownerId !== uid) return { status: 'conflict', error: 'The target document belongs to another account.' };
        if (expectedRevision !== remoteRevision) {
          return { status: 'conflict', error: 'The cloud record changed after this local draft was created.', remoteSnapshot: remote };
        }
        if (!updateAllowed) return { status: 'conflict', error: 'This cloud record is immutable; the local copy was preserved.', remoteSnapshot: remote };
        if (item.entityType === 'case' && remote.status === 'resolved') {
          return { status: 'conflict', error: 'The cloud case is resolved; the local draft was preserved.', remoteSnapshot: remote };
        }
        if (item.entityType === 'workOrder' && remote.status === 'completed') {
          return { status: 'conflict', error: 'The cloud work order is already completed; the local draft was preserved.', remoteSnapshot: remote };
        }
        const revision = remoteRevision + 1;
        transaction.update(ref, { ...fields, ...versionedPayload(type, item.payload, uid, revision, mutationId), updatedAt: serverTimestamp() });
        return { status: 'synced', revision };
      }
      if (expectedRevision > 0) return { status: 'conflict', error: 'The cloud record was removed after this local draft was created.' };
      transaction.set(ref, {
        id: docId,
        ownerId: uid,
        ...fields,
        ...versionedPayload(type, item.payload, uid, 1, mutationId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { status: 'synced', revision: 1 };
    });
  } catch (err) {
    const errorCode =
      err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? (/^[a-z0-9/_-]{1,80}$/i.test(err.code) ? err.code : null)
        : null;
    if (errorCode?.toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `${item.entityType}/${docId}`);
    }
    return {
      status: 'failed',
      error: errorCode
        ? `Cloud sync failed (${errorCode}). Check your connection and access permissions.`
        : 'Cloud sync failed. Check your connection and Firebase configuration.',
    };
  }
}

export async function fetchUserCloudRecordCounts(uid: string): Promise<{
  assets: number;
  cases: number;
  workOrders: number;
  reports: number;
}> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return { assets: 0, cases: 0, workOrders: 0, reports: 0 };
  }

  try {
    const [aCount, cCount, wCount, rCount] = await Promise.all([
      getCountFromServer(query(collection(db, 'assets'), where('ownerId', '==', uid))),
      getCountFromServer(query(collection(db, 'diagnosticCases'), where('ownerId', '==', uid))),
      getCountFromServer(query(collection(db, 'workOrders'), where('ownerId', '==', uid))),
      getCountFromServer(query(collection(db, 'serviceReports'), where('ownerId', '==', uid))),
    ]);
    return {
      assets: aCount.data().count,
      cases: cCount.data().count,
      workOrders: wCount.data().count,
      reports: rCount.data().count,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'assets');
  }
}
