import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-sunfix-field';
const OWNER_UID = 'technician-owner';
const OTHER_UID = 'different-technician';

let testEnv: RulesTestEnvironment;

before(async () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function verifiedDb(uid = OWNER_UID) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  }).firestore();
}

function unverifiedDb(uid = OWNER_UID) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: false,
  }).firestore();
}

function assetRecord(ownerId = OWNER_UID) {
  const now = Timestamp.now();
  return {
    id: 'asset-one',
    ownerId,
    name: 'Test solar installation',
    siteType: 'commercial',
    locationLabel: 'Emulator test site',
    capacityKw: 48,
    status: 'nominal',
    inverterModel: 'Test inverter',
    inverterSerial: 'TEST-INV-001',
    panelCount: 120,
    isDemo: false,
    schemaVersion: 2,
    revision: 1,
    lastMutationId: 'asset-mutation-1',
    domainPayload: '{}',
    createdAt: now,
    updatedAt: now,
  };
}

function diagnosticCaseRecord(ownerId = OWNER_UID, stopWork = false) {
  const now = Timestamp.now();
  return {
    id: stopWork ? 'case-stop-work' : 'case-safe',
    ownerId,
    assetId: 'asset-one',
    componentId: 'inverter-one',
    componentType: 'inverter',
    title: stopWork ? 'Stop-Work test case' : 'Safe test case',
    safetyHazardDetected: stopWork,
    stopWork,
    priority: stopWork ? 'critical' : 'medium',
    status: stopWork ? 'safety_blocked' : 'investigating',
    inferenceSource: 'demo_rules',
    assessmentSummary: 'Emulator fixture; not a real diagnostic result.',
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
    revision: 1,
    lastMutationId: 'case-mutation-1',
    domainPayload: '{}',
  };
}

async function seedOwnedAssetAndCase(stopWork = false, ownerId = OWNER_UID) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'assets', 'asset-one'), assetRecord(ownerId));
    await setDoc(
      doc(db, 'diagnosticCases', stopWork ? 'case-stop-work' : 'case-safe'),
      diagnosticCaseRecord(ownerId, stopWork),
    );
  });
}

function workOrderPayload(options: {
  caseId?: string;
  safetyCleared?: boolean;
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'escalated';
  completedSteps?: number;
  totalSteps?: number;
} = {}) {
  return {
    id: 'work-order-one',
    ownerId: OWNER_UID,
    caseId: options.caseId || 'case-safe',
    assetId: 'asset-one',
    componentId: 'inverter-one',
    title: 'Emulator test work order',
    status: options.status || 'in_progress',
    priority: 'medium',
    safetyCleared: options.safetyCleared ?? true,
    completedSteps: options.completedSteps ?? 0,
    totalSteps: options.totalSteps ?? 2,
    schemaVersion: 2,
    revision: 1,
    lastMutationId: 'work-order-mutation-1',
    domainPayload: '{}',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

test('Firestore enforces authenticated owner isolation for reads and writes', async () => {
  await seedOwnedAssetAndCase();

  const owner = verifiedDb();
  const other = verifiedDb(OTHER_UID);
  const anonymous = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(owner, 'assets', 'asset-one')));
  await assertFails(getDoc(doc(other, 'assets', 'asset-one')));
  await assertFails(getDoc(doc(anonymous, 'assets', 'asset-one')));

  // An authenticated, verified account may check an unused ID before creating it.
  // That does not grant access to another owner's existing documents.
  const missingSnapshot = await assertSucceeds(getDoc(doc(other, 'assets', 'asset-not-yet-created')));
  assert.equal(missingSnapshot.exists(), false);
  await assertFails(getDoc(doc(anonymous, 'assets', 'asset-not-yet-created')));

  await assertFails(
    setDoc(doc(other, 'assets', 'asset-two'), {
      ...assetRecord(OWNER_UID),
      id: 'asset-two',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('unverified accounts cannot create cloud records', async () => {
  const db = unverifiedDb();

  await assertFails(
    setDoc(doc(db, 'assets', 'asset-unverified'), {
      ...assetRecord(),
      id: 'asset-unverified',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('domain envelopes reject invalid versions, revisions, and oversized payloads', async () => {
  const db = verifiedDb();
  const invalidRevision = { ...assetRecord(), id: 'asset-revision-zero', revision: 0 };
  await assertFails(setDoc(doc(db, 'assets', invalidRevision.id), invalidRevision));

  const oversized = { ...assetRecord(), id: 'asset-too-large', domainPayload: 'x'.repeat(180001) };
  await assertFails(setDoc(doc(db, 'assets', oversized.id), oversized));

  const unsupportedVersion = { ...assetRecord(), id: 'asset-v1', schemaVersion: 1 };
  await assertFails(setDoc(doc(db, 'assets', unsupportedVersion.id), unsupportedVersion));
});

test('asset updates require the next monotonic revision', async () => {
  await seedOwnedAssetAndCase();
  const db = verifiedDb();
  const reference = doc(db, 'assets', 'asset-one');

  await assertFails(updateDoc(reference, {
    name: 'Stale update', revision: 1, lastMutationId: 'asset-stale',
    domainPayload: '{"id":"asset-one"}', updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(reference, {
    name: 'Revision two', revision: 2, lastMutationId: 'asset-mutation-2',
    domainPayload: '{"id":"asset-one"}', updatedAt: serverTimestamp(),
  }));
});

test('a Stop-Work diagnostic case cannot be written as an ordinary investigating case', async () => {
  await seedOwnedAssetAndCase();
  const db = verifiedDb();
  const invalid = {
    ...diagnosticCaseRecord(),
    id: 'case-stop-work-invalid',
    safetyHazardDetected: true,
    stopWork: true,
    status: 'investigating',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertFails(setDoc(doc(db, 'diagnosticCases', invalid.id), invalid));

  const valid = {
    ...invalid,
    id: 'case-stop-work-valid',
    status: 'safety_blocked',
  };
  await assertSucceeds(setDoc(doc(db, 'diagnosticCases', valid.id), valid));
});

test('a reported safety hazard cannot be stored without a Stop-Work hold', async () => {
  await seedOwnedAssetAndCase();
  const db = verifiedDb();
  const invalid = {
    ...diagnosticCaseRecord(),
    id: 'case-hazard-without-hold',
    safetyHazardDetected: true,
    stopWork: false,
    status: 'investigating',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertFails(setDoc(doc(db, 'diagnosticCases', invalid.id), invalid));
});

test('a work order cannot be safety-cleared while its linked case has a Stop-Work hold', async () => {
  await seedOwnedAssetAndCase(true);
  const db = verifiedDb();

  await assertFails(
    setDoc(
      doc(db, 'workOrders', 'work-order-one'),
      workOrderPayload({ caseId: 'case-stop-work', safetyCleared: true }),
    ),
  );

  await assertSucceeds(
    setDoc(
      doc(db, 'workOrders', 'work-order-blocked'),
      {
        ...workOrderPayload({
          caseId: 'case-stop-work',
          safetyCleared: false,
          status: 'blocked',
        }),
        id: 'work-order-blocked',
      },
    ),
  );
});

test('a work order cannot be safety-cleared against a legacy case with an inconsistent hazard flag', async () => {
  await seedOwnedAssetAndCase();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'diagnosticCases', 'case-legacy-inconsistent'), {
      ...diagnosticCaseRecord(),
      id: 'case-legacy-inconsistent',
      safetyHazardDetected: true,
      stopWork: false,
    });
  });

  await assertFails(
    setDoc(
      doc(verifiedDb(), 'workOrders', 'work-order-legacy-hazard'),
      {
        ...workOrderPayload({ caseId: 'case-legacy-inconsistent', safetyCleared: true }),
        id: 'work-order-legacy-hazard',
      },
    ),
  );
});

test('work-order completion requires safety clearance and every checklist step', async () => {
  await seedOwnedAssetAndCase(false);
  const db = verifiedDb();
  const reference = doc(db, 'workOrders', 'work-order-one');

  await assertSucceeds(
    setDoc(
      reference,
      workOrderPayload({
        caseId: 'case-safe',
        safetyCleared: true,
        status: 'in_progress',
        completedSteps: 0,
        totalSteps: 2,
      }),
    ),
  );

  await assertFails(
    updateDoc(reference, {
      status: 'completed',
      completedSteps: 1,
      revision: 2,
      lastMutationId: 'work-order-mutation-2',
      domainPayload: '{"id":"work-order-one","status":"completed"}',
      updatedAt: serverTimestamp(),
    }),
  );

  await assertSucceeds(
    updateDoc(reference, {
      status: 'completed',
      completedSteps: 2,
      revision: 2,
      lastMutationId: 'work-order-mutation-2',
      domainPayload: '{"id":"work-order-one","status":"completed"}',
      updatedAt: serverTimestamp(),
    }),
  );

  const saved = await assertSucceeds(getDoc(reference));
  assert.equal(saved.data()?.status, 'completed');
  assert.equal(saved.data()?.completedSteps, 2);
});

test('a technician cannot create a work order linked to another owner\'s case', async () => {
  await seedOwnedAssetAndCase(false, OTHER_UID);
  const db = verifiedDb();

  await assertFails(
    setDoc(
      doc(db, 'workOrders', 'cross-owner-work-order'),
      {
        ...workOrderPayload({ caseId: 'case-safe', safetyCleared: true }),
        id: 'cross-owner-work-order',
      },
    ),
  );
});
