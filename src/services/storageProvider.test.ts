import assert from 'node:assert/strict';
import test from 'node:test';
import { getConfiguredStorageProvider } from './storageProvider';

test('unconfigured file storage reports no provider instead of claiming cloud persistence', () => {
  assert.equal(getConfiguredStorageProvider(), null);
});
