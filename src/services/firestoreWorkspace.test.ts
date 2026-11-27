import assert from 'node:assert/strict';
import test from 'node:test';
import type { Asset, EvidenceRecord } from '../types/sunfix';
import {
  DEMO_ASSETS, DEMO_CASES, DEMO_EVIDENCE, DEMO_KNOWLEDGE_LIBRARY, DEMO_REPORTS, DEMO_WORK_ORDERS,
} from '../data/demoData';
import {
  decodeCloudEntityDocument,
  encodeDomainPayload,
  FIRESTORE_SCHEMA_VERSION,
} from './firestoreWorkspace';

const uid = 'verified-user-1';

function asset(): Asset {
  return {
    id: 'asset-one', ownerId: uid, name: 'Array A', siteType: 'commercial', locationLabel: 'Site A',
    capacityKw: 24, status: 'nominal', inverterModel: 'Inverter', inverterSerial: 'SN-1',
    panelCount: 60, installedYear: 2022, lastInspectionAt: '2026-11-27T00:00:00.000Z',
    isDemo: false, components: [], createdAt: '2026-11-27T00:00:00.000Z', updatedAt: '2026-11-27T00:00:00.000Z',
  };
}

test('versioned asset wire record restores complete validated fields and server revision', () => {
  const original = asset();
  const domainPayload = encodeDomainPayload('asset', original, uid);
  const restored = decodeCloudEntityDocument<Asset>('asset', {
    id: original.id, ownerId: uid, schemaVersion: FIRESTORE_SCHEMA_VERSION, revision: 4,
    domainPayload, name: original.name, siteType: original.siteType, locationLabel: original.locationLabel,
    capacityKw: original.capacityKw, status: original.status, inverterModel: original.inverterModel,
    inverterSerial: original.inverterSerial, panelCount: original.panelCount, isDemo: original.isDemo,
  }, uid);
  assert.deepEqual(restored, { ...original, cloudRevision: 4 });
});

test('legacy, malformed, oversized, and cross-owner cloud records are rejected', () => {
  const original = asset();
  assert.throws(() => decodeCloudEntityDocument('asset', { id: original.id, ownerId: uid }, uid));
  assert.throws(() => decodeCloudEntityDocument('asset', {
    id: original.id, ownerId: uid, schemaVersion: 2, revision: 1, domainPayload: '{invalid',
  }, uid));
  assert.throws(() => decodeCloudEntityDocument('asset', {
    id: original.id, ownerId: 'somebody-else', schemaVersion: 2, revision: 1,
    domainPayload: encodeDomainPayload('asset', original, uid),
  }, uid), /owner_mismatch/);
  assert.throws(() => encodeDomainPayload('asset', { ...original, unknownField: 'not in schema' }, uid));
});

test('FieldProof binary bytes are excluded from Firestore domain payloads', () => {
  const evidence: EvidenceRecord = {
    id: 'evidence-one', ownerId: uid, caseId: 'case-one', assetId: 'asset-one', componentId: 'inverter-one',
    componentName: 'Inverter', evidenceType: 'before_photo', originKind: 'original_evidence', caption: 'Front label',
    note: '', imageDataUrl: 'data:image/jpeg;base64,private-image-bytes', filePersistenceStatus: 'local_only',
    timestamp: '2026-11-27T00:00:00.000Z',
  };
  const payload = JSON.parse(encodeDomainPayload('evidence', evidence, uid)) as Record<string, unknown>;
  assert.equal('imageDataUrl' in payload, false);
  assert.equal(payload.filePersistenceStatus, 'local_only');
});

test('domain schemas accept representative application records for every collection', () => {
  assert.doesNotThrow(() => encodeDomainPayload('asset', DEMO_ASSETS[0], uid));
  assert.doesNotThrow(() => encodeDomainPayload('case', DEMO_CASES[0], uid));
  assert.doesNotThrow(() => encodeDomainPayload('workOrder', DEMO_WORK_ORDERS[0], uid));
  assert.doesNotThrow(() => encodeDomainPayload('evidence', DEMO_EVIDENCE[0], uid));
  assert.doesNotThrow(() => encodeDomainPayload('report', DEMO_REPORTS[0], uid));
  assert.doesNotThrow(() => encodeDomainPayload('knowledge', DEMO_KNOWLEDGE_LIBRARY[0], uid));
});
