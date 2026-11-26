import test from 'node:test';
import assert from 'node:assert/strict';
import { getStorageScopeId, getWorkspaceStorageKey } from './offlineStore';

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
