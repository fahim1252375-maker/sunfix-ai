import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SyncQueueItem } from '../types/sunfix';
import type { PersistedWorkspaceData } from './offlineStore';
import {
  clearAllIDB,
  getStorageScopeId,
  getWorkspaceStorageKey,
  loadSyncQueueFromIDB,
  loadWorkspaceFromIDB,
  saveSyncQueueItemToIDB,
  saveWorkspaceToIDB,
} from './offlineStore';

test('anonymous workspace has a stable explicit scope', () => {
  assert.equal(getStorageScopeId(), 'anonymous');
  assert.equal(getStorageScopeId(null), 'anonymous');
  assert.equal(getStorageScopeId('   '), 'anonymous');
});

test('authenticated users receive isolated storage scopes', () => {
  assert.equal(getStorageScopeId('user-a'), 'user:user-a');
  assert.equal(getStorageScopeId('user-b'), 'user:user-b');
  assert.notEqual(getStorageScopeId('user-a'), getStorageScopeId('user-b'));
});

test('workspace storage keys include the complete scope', () => {
  assert.equal(getWorkspaceStorageKey('anonymous'), 'workspace:anonymous');
  assert.equal(getWorkspaceStorageKey('user:user-a'), 'workspace:user:user-a');
});

test('IndexedDB workspace data is persisted independently for each account scope', async () => {
  const userA = getStorageScopeId('user-a');
  const userB = getStorageScopeId('user-b');
  const workspaceA: PersistedWorkspaceData = {
    assets: [],
    cases: [],
    workOrders: [],
    evidence: [],
    reports: [],
    knowledgeDocs: [],
    updatedAt: '2026-11-25T00:00:00.000Z',
  };
  const workspaceB: PersistedWorkspaceData = {
    ...workspaceA,
    updatedAt: '2026-11-26T00:00:00.000Z',
  };

  await saveWorkspaceToIDB(workspaceA, userA);
  await saveWorkspaceToIDB(workspaceB, userB);

  assert.equal((await loadWorkspaceFromIDB(userA))?.updatedAt, workspaceA.updatedAt);
  assert.equal((await loadWorkspaceFromIDB(userB))?.updatedAt, workspaceB.updatedAt);
});

test('IndexedDB sync queues remain isolated and clearing one account does not erase another', async () => {
  const userA = getStorageScopeId('user-a');
  const userB = getStorageScopeId('user-b');
  const makeItem = (id: string): SyncQueueItem => ({
    id,
    entityType: 'asset',
    entityId: id,
    operation: 'upsert',
    label: id,
    payload: { id },
    status: 'pending',
    attempts: 0,
    updatedAt: '2026-11-25T00:00:00.000Z',
  });

  await saveSyncQueueItemToIDB(makeItem('queue-a'), userA);
  await saveSyncQueueItemToIDB(makeItem('queue-b'), userB);

  assert.deepEqual((await loadSyncQueueFromIDB(userA)).map((item) => item.id), ['queue-a']);
  assert.deepEqual((await loadSyncQueueFromIDB(userB)).map((item) => item.id), ['queue-b']);

  await clearAllIDB(userA);

  assert.deepEqual(await loadSyncQueueFromIDB(userA), []);
  assert.deepEqual((await loadSyncQueueFromIDB(userB)).map((item) => item.id), ['queue-b']);
});
