import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
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

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'id-0';
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
): Promise<{ status: 'synced' | 'conflict' | 'failed'; error?: string }> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return { status: 'failed', error: 'Verified Google sign-in required for cloud sync.' };
  }

  const docId = safeId(item.entityId);

  try {
    if (item.entityType === 'asset') {
      const a = item.payload as Asset;
      const ref = doc(db, 'assets', docId);
      const snap = await getDoc(ref);
      const payload = {
        id: docId,
        ownerId: uid,
        name: a.name.slice(0, 140),
        siteType: a.siteType,
        locationLabel: a.locationLabel.slice(0, 140),
        capacityKw: Math.max(0, Math.min(100000, a.capacityKw)),
        status: a.status,
        inverterModel: a.inverterModel.slice(0, 120),
        inverterSerial: a.inverterSerial.slice(0, 80),
        ...(a.batteryModel ? { batteryModel: a.batteryModel.slice(0, 120) } : {}),
        ...(typeof a.batteryCapacityKwh === 'number'
          ? { batteryCapacityKwh: Math.max(0, Math.min(100000, a.batteryCapacityKwh)) }
          : {}),
        panelCount: Math.max(0, Math.min(100000, a.panelCount)),
        isDemo: Boolean(a.isDemo),
        updatedAt: serverTimestamp(),
      };
      if (!snap.exists()) {
        await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(ref, {
          name: payload.name,
          siteType: payload.siteType,
          locationLabel: payload.locationLabel,
          capacityKw: payload.capacityKw,
          status: payload.status,
          inverterModel: payload.inverterModel,
          inverterSerial: payload.inverterSerial,
          panelCount: payload.panelCount,
          updatedAt: serverTimestamp(),
        });
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'case') {
      const c = item.payload as DiagnosticCase;
      const assetId = safeId(c.assetId);
      const ref = doc(db, 'diagnosticCases', docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: docId,
          ownerId: uid,
          assetId,
          componentId: safeId(c.componentId),
          componentType: c.componentType,
          title: c.title.slice(0, 180),
          faultCode: (c.faultCode || '').slice(0, 40),
          readingsSummary: c.readings
            .map((r) => `${r.label}: ${r.value} ${r.unit}`)
            .join('; ')
            .slice(0, 500),
          safetyHazardDetected: Boolean(c.safetyHazardDetected),
          stopWork: Boolean(c.stopWork),
          priority: c.priority,
          status: c.status,
          inferenceSource: c.inferenceRecord.inferenceSource,
          assessmentSummary: c.assessment.summary.slice(0, 2000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (snap.data().status !== 'resolved') {
        await updateDoc(ref, {
          status: c.status,
          priority: c.priority,
          assessmentSummary: c.assessment.summary.slice(0, 2000),
          updatedAt: serverTimestamp(),
        });
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'workOrder') {
      const w = item.payload as WorkOrder;
      const ref = doc(db, 'workOrders', docId);
      const snap = await getDoc(ref);
      const completedSteps = w.tasks.filter((t) => t.status === 'completed').length;
      const totalSteps = Math.max(1, w.tasks.length);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: docId,
          ownerId: uid,
          caseId: safeId(w.caseId),
          assetId: safeId(w.assetId),
          componentId: safeId(w.componentId),
          title: w.title.slice(0, 180),
          status: w.status,
          priority: w.priority,
          safetyCleared: Boolean(w.safetyCleared),
          technicianNotes: (w.technicianNotes || '').slice(0, 2000),
          completedSteps,
          totalSteps,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const remote = snap.data();
        if (remote.status === 'completed' && w.status !== 'completed') {
          return {
            status: 'conflict',
            error: 'Remote work order is already marked completed in Firestore.',
          };
        }
        if (remote.status !== 'completed') {
          await updateDoc(ref, {
            status: w.status,
            priority: w.priority,
            safetyCleared: Boolean(w.safetyCleared),
            technicianNotes: (w.technicianNotes || '').slice(0, 2000),
            completedSteps,
            updatedAt: serverTimestamp(),
          });
        }
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'evidence') {
      const ev = item.payload as EvidenceRecord;
      const ref = doc(db, 'evidenceRecords', docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: docId,
          ownerId: uid,
          caseId: safeId(ev.caseId),
          assetId: safeId(ev.assetId),
          componentId: safeId(ev.componentId),
          evidenceType: ev.evidenceType,
          originKind: ev.originKind,
          caption: ev.caption.slice(0, 180),
          note: (ev.note || '').slice(0, 1200),
          createdAt: serverTimestamp(),
        });
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'report') {
      const r = item.payload as ServiceReport;
      const ref = doc(db, 'serviceReports', docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: docId,
          ownerId: uid,
          caseId: safeId(r.caseId),
          assetId: safeId(r.assetId),
          reportCode: r.reportCode.slice(0, 40),
          title: r.title.slice(0, 180),
          status: r.status,
          summary: r.summary.slice(0, 2000),
          isSimulated: Boolean(r.isSimulated),
          ...(r.canonicalHash ? { canonicalHash: r.canonicalHash.slice(0, 64) } : {}),
          createdAt: serverTimestamp(),
        });
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'knowledge') {
      const k = item.payload as KnowledgeSource;
      const ref = doc(db, 'knowledgeDocs', docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: docId,
          ownerId: uid,
          title: k.title.slice(0, 180),
          publisher: k.publisher.slice(0, 120),
          category: k.category,
          faultCode: (k.faultCode || '').slice(0, 40),
          summary: k.guidance.slice(0, 2000),
          sourceUrl: (k.documentUrl || '').slice(0, 300),
          verifiedDate: k.verifiedDate.slice(0, 40),
          createdAt: serverTimestamp(),
        });
      }
      return { status: 'synced' };
    }

    if (item.entityType === 'copilotThread') {
      const th = item.payload as CopilotThread;
      const ref = doc(db, 'copilotThreads', docId);
      const snap = await getDoc(ref);
      const lastMsg = th.messages[th.messages.length - 1];
      const payload = {
        id: docId,
        ownerId: uid,
        title: th.title.slice(0, 180),
        language: th.language,
        messageCount: Math.max(0, Math.min(500, th.messages.length)),
        lastMessagePreview: (lastMsg?.text || 'Empty thread').slice(0, 500),
        updatedAt: serverTimestamp(),
      };
      if (!snap.exists()) {
        await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(ref, payload);
      }
      return { status: 'synced' };
    }

    return { status: 'synced' };
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
