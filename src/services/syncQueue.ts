import type { SyncQueueItem } from '../types/sunfix';

export const MAX_SYNC_ATTEMPTS = 8;

export function coalesceQueuedMutation(
  queue: SyncQueueItem[],
  next: SyncQueueItem,
): SyncQueueItem[] {
  const inFlight = queue.find((item) => item.entityType === next.entityType
    && item.entityId === next.entityId && item.status === 'syncing');
  const safeNext = inFlight?.id === next.id
    ? { ...next, id: `${next.id}-queued-${(next.mutationId || 'next').replace(/[^a-zA-Z0-9_-]/g, '-').slice(-32)}` }
    : next;
  const existing = queue.find((item) => item.entityType === next.entityType
    && item.entityId === next.entityId
    && !['conflict', 'local_only', 'syncing'].includes(item.status));
  const replacement = existing
    ? { ...safeNext, id: existing.id, attempts: existing.attempts, baseRevision: existing.baseRevision }
    : safeNext;
  return [replacement, ...queue.filter((item) => item.id !== replacement.id)];
}
