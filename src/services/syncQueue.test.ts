import assert from 'node:assert/strict';
import test from 'node:test';
import type { SyncQueueItem } from '../types/sunfix';
import { coalesceQueuedMutation, MAX_SYNC_ATTEMPTS } from './syncQueue';

function item(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'asset-a',
    entityType: 'asset',
    entityId: 'asset-a',
    operation: 'upsert',
    label: 'Asset A',
    payload: { name: 'first' },
    status: 'pending',
    attempts: 2,
    updatedAt: '2026-11-27T00:00:00Z',
    ...overrides,
  };
}

test('coalesces repeated updates for one entity under a stable id', () => {
  const original = item();
  const next = item({ id: 'new-attempt', payload: { name: 'latest' }, attempts: 0 });
  const result = coalesceQueuedMutation([original], next);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, original.id);
  assert.equal(result[0].attempts, original.attempts);
  assert.deepEqual(result[0].payload, { name: 'latest' });
});

test('does not replace unresolved conflict or local-only copies', () => {
  for (const status of ['conflict', 'local_only'] as const) {
    const preserved = item({ id: `preserved-${status}`, status, remoteSnapshot: { status: 'completed' } });
    const result = coalesceQueuedMutation([preserved], item({ id: 'new-local-change' }));
    assert.equal(result.length, 2);
    assert.ok(result.some((entry) => entry.id === preserved.id && entry.remoteSnapshot));
  }
});

test('does not replace an in-flight write when a newer edit arrives', () => {
  const inFlight = item({ id: 'in-flight', status: 'syncing', mutationId: 'm1' });
  const next = item({ id: 'next', status: 'pending', mutationId: 'm2' });
  const result = coalesceQueuedMutation([inFlight], next);
  assert.equal(result.length, 2);
  assert.ok(result.some((entry) => entry.id === inFlight.id && entry.status === 'syncing'));
  assert.ok(result.some((entry) => entry.id === next.id && entry.status === 'pending'));
});

test('disambiguates a new mutation whose generated queue id collides with the in-flight item', () => {
  const inFlight = item({ id: 'stable-id', status: 'syncing', mutationId: 'm1' });
  const next = item({ id: 'stable-id', status: 'pending', mutationId: 'm2' });
  const result = coalesceQueuedMutation([inFlight], next);
  assert.equal(result.length, 2);
  assert.ok(result.some((entry) => entry.id === 'stable-id' && entry.status === 'syncing'));
  assert.ok(result.some((entry) => entry.id.startsWith('stable-id-queued-') && entry.status === 'pending'));
});

test('manual retry budget is finite', () => {
  assert.equal(MAX_SYNC_ATTEMPTS, 8);
});
