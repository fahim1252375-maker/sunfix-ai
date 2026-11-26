import React from 'react';
import { useSunFix } from '../context/SunFixContext';

export function SunFixSyncHarness() {
  const {
    user,
    authReady,
    addOrUpdateAsset,
    syncQueue,
    syncStatus,
    cloudCounts,
  } = useSunFix();

  const assetId = `playwright-offline-${user?.uid || 'anonymous'}`;

  return (
    <section aria-label="SunFix authenticated sync test harness">
      <output data-testid="auth-ready">{authReady ? 'ready' : 'loading'}</output>
      <output data-testid="sync-user-id">{user?.uid || ''}</output>
      <output data-testid="global-sync-status">{syncStatus}</output>
      <output data-testid="sync-cloud-assets">{cloudCounts?.assets ?? 'loading'}</output>
      <output data-testid="sync-queue-status">
        {syncQueue.map((item) => `${item.entityId}:${item.status}`).join('|')}
      </output>
      <button
        type="button"
        onClick={() => {
          addOrUpdateAsset({
            id: assetId,
            name: 'Playwright offline-to-online sync asset',
            siteType: 'commercial',
            locationLabel: 'Automated offline queue verification',
            capacityKw: 12,
            status: 'nominal',
            inverterModel: 'Test inverter',
            inverterSerial: `PW-${user?.uid.slice(0, 8) || 'ANON'}`,
            panelCount: 30,
            installedYear: 2022,
            lastInspectionAt: new Date().toISOString(),
            isDemo: false,
            components: [],
          });
        }}
      >
        Queue asset while offline
      </button>
    </section>
  );
}
