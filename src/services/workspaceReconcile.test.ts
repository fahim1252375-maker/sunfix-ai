import assert from 'node:assert/strict';
import test from 'node:test';
import type { Asset, SyncQueueItem } from '../types/sunfix';
import type { CloudWorkspaceRecords, IncompleteCloudRecord } from './firestoreWorkspace';
import { reconcileCloudWorkspace } from './workspaceReconcile';

const uid = 'owner-one';

function asset(id: string, changes: Partial<Asset> = {}): Asset {
  return {
    id, ownerId: uid, name: `Array ${id}`, siteType: 'commercial', locationLabel: 'Roof A',
    capacityKw: 24, status: 'nominal', inverterModel: 'Inverter', inverterSerial: `SN-${id}`,
    panelCount: 60, installedYear: 2022, lastInspectionAt: '2026-11-27T00:00:00.000Z',
    isDemo: false, components: [], createdAt: '2026-11-27T00:00:00.000Z', updatedAt: '2026-11-27T00:00:00.000Z',
    ...changes,
  };
}

function workspace(assets: Asset[] = []): CloudWorkspaceRecords {
  return { assets, cases: [], workOrders: [], evidence: [], reports: [], knowledgeDocs: [], copilotThreads: [] };
}

test('cloud records restore on first login and cloud fields win over stale local copies', () => {
  const remote = asset('restored', { name: 'Cloud name', cloudRevision: 3 });
  const local = asset('restored', { name: 'Old local name' });
  const result = reconcileCloudWorkspace(workspace([remote]), workspace([local]), [], [], uid);
  assert.equal(result.records.assets[0].name, 'Cloud name');
  assert.equal(result.records.assets[0].cloudRevision, 3);
  assert.deepEqual(result.queue, []);
});

test('pending local mutations win restore and keep their replay queue', () => {
  const local = asset('pending', { name: 'Edited offline' });
  const queue: SyncQueueItem[] = [{
    id: 'q1', mutationId: 'm1', baseRevision: 0, entityType: 'asset', entityId: local.id,
    operation: 'upsert', label: local.name, payload: local, status: 'pending', attempts: 0, updatedAt: '2026-11-27T00:00:00.000Z',
  }];
  const result = reconcileCloudWorkspace(workspace([asset('pending', { name: 'Cloud old', cloudRevision: 1 })]), workspace([local, asset('pending', { name: 'Edited offline', cloudRevision: 1 })]), queue, [], uid);
  assert.equal(result.records.assets[0].name, 'Edited offline');
  assert.equal(result.queue[0].status, 'pending');
  assert.equal(result.queue[0].baseRevision, 1);
  assert.equal((result.queue[0].payload as Asset).cloudRevision, 1);
});

test('cloud deletion preserves a known cloud revision as a conflict', () => {
  const local = asset('missing', { cloudRevision: 7 });
  const result = reconcileCloudWorkspace(workspace(), workspace([local]), [], [], uid);
  assert.equal(result.records.assets[0].id, 'missing');
  assert.equal(result.queue[0].status, 'conflict');
  assert.deepEqual(result.queue[0].remoteSnapshot, { missingAtRead: true, lastKnownRevision: 7 });
});

test('legacy cloud records preserve a matching device copy without unsafe replay', () => {
  const local = asset('legacy');
  const incomplete: IncompleteCloudRecord[] = [{ collection: 'assets', id: 'legacy', reason: 'legacy_schema' }];
  const result = reconcileCloudWorkspace(workspace(), workspace([local]), [], incomplete, uid);
  assert.equal(result.records.assets[0].id, 'legacy');
  assert.deepEqual(result.queue, []);
});

test('local-only data is retained explicitly and demo fixtures are excluded', () => {
  const result = reconcileCloudWorkspace(workspace(), workspace([
    asset('device-only'), asset('demo', { isDemo: true }),
  ]), [], [], uid);
  assert.deepEqual(result.records.assets.map((record) => record.id), ['device-only']);
  assert.equal(result.queue[0].status, 'local_only');
});
