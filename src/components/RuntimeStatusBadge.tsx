import React from 'react';
import type { GlobalSyncStatus } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import type { InferenceSourceKind } from '../types/sunfix';

export const AIRuntimeIndicator: React.FC<{
  source: InferenceSourceKind;
  compact?: boolean;
}> = ({ source, compact = false }) => {
  const config: Record<
    InferenceSourceKind,
    { label: string; detail: string; color: string; bg: string }
  > = {
    on_device: {
      label: 'LOCAL',
      detail: 'On-device inference',
      color: TOKENS.mint,
      bg: TOKENS.mossRaised,
    },
    in_cloud: {
      label: 'CLOUD',
      detail: 'Cloud inference',
      color: TOKENS.sky,
      bg: TOKENS.mossRaised,
    },
    demo_rules: {
      label: 'DEMO RULES',
      detail: 'Deterministic fallback (non-generative)',
      color: TOKENS.amberWarn,
      bg: TOKENS.brassSoft,
    },
    unavailable: {
      label: 'UNAVAILABLE',
      detail: 'AI unavailable',
      color: TOKENS.terracotta,
      bg: TOKENS.mossRaised,
    },
  };

  const c = config[source];
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-mono-tech whitespace-nowrap shrink-0"
      style={{
        color: c.color,
        borderColor: c.color,
        backgroundColor: c.bg,
      }}
      title={`${c.label} — ${c.detail}`}
    >
      <span className="font-semibold tracking-wide">{c.label}</span>
      {!compact && (
        <span className="font-sans" style={{ color: TOKENS.sage }}>
          — {c.detail}
        </span>
      )}
    </span>
  );
};

export const SyncStatusIndicator: React.FC<{
  status: GlobalSyncStatus;
  pendingCount: number;
}> = ({ status, pendingCount }) => {
  const map: Record<GlobalSyncStatus, { label: string; color: string }> = {
    online: { label: 'Online', color: TOKENS.mint },
    offline: { label: 'Offline', color: TOKENS.amberWarn },
    sync_pending: { label: `Sync pending (${pendingCount})`, color: TOKENS.amberWarn },
    syncing: { label: 'Syncing...', color: TOKENS.sky },
    sync_failed: { label: 'Sync failed', color: TOKENS.terracotta },
    synced: { label: 'Synced', color: TOKENS.mint },
  };
  const item = map[status];
  return (
    <span
      className="text-xs font-mono-tech whitespace-nowrap shrink-0"
      style={{ color: item.color }}
    >
      {item.label}
    </span>
  );
};
