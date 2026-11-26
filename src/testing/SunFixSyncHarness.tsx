import React from 'react';
import { createRoot } from 'react-dom/client';
import { SunFixProvider, useSunFix } from '../context/SunFixContext';

function SyncHarness() {
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

/**
 * Mount the real application provider around a minimal test surface.
 * This exercises the same IndexedDB queue, account scope, reconnect listener,
 * and processSyncQueue effect used by the shipped application.
 */
export function mountSunFixSyncHarness(): void {
  const existing = document.getElementById('sunfix-sync-test-harness');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'sunfix-sync-test-harness';
  document.body.appendChild(host);

  createRoot(host).render(
    <SunFixProvider>
      <SyncHarness />
    </SunFixProvider>,
  );
}
