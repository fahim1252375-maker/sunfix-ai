import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Database,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  WifiOff,
} from 'lucide-react';
import { AIRuntimeIndicator, SyncStatusIndicator } from '../components/RuntimeStatusBadge';
import { AccountDialog } from '../components/AccountDialog';
import { useSunFix } from '../context/SunFixContext';
import { getFirebaseProjectInfo } from '../services/firebase';
import { TOKENS } from '../theme/tokens';

export const SettingsView: React.FC = () => {
  const {
    user,
    signOut,
    authError,
    appCheckStatus,
    firestoreStatus,
    cloudCounts,
    browserSupport,
    deviceAvailability,
    downloadProgress,
    deviceStatusDetail,
    prepareOnDeviceAI,
    inferenceHistory,
    effectiveOnline,
    toggleSimulatedOffline,
    syncQueue,
    syncStatus,
    localStorageError,
    cloudHydrationWarning,
    processSyncQueue,
    retrySyncItem,
    resolveSyncConflictKeepLocal,
    resetDemoWorkspace,
  } = useSunFix();

  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const projectInfo = getFirebaseProjectInfo();
  const pendingCount = syncQueue.filter((q) => q.status === 'pending' || q.status === 'failed').length;
  const appCheckHealthy =
    appCheckStatus.state === 'active_enterprise' || appCheckStatus.state === 'active_debug';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div
          className="text-[11px] font-mono-tech uppercase tracking-[0.18em] mb-1"
          style={{ color: TOKENS.sage }}
        >
          Runtime Diagnostics & Security
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold" style={{ color: TOKENS.bone }}>
          Settings, Account & <em className="italic font-normal" style={{ color: TOKENS.brass }}>Runtime</em>
        </h1>
        <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
          Firebase Authentication, App Check status, on-device Gemini readiness, and offline IndexedDB sync queue.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account & Firebase Connection */}
        <section
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-base font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
            <UserCheck className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Technician Account & Firebase Project
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Firebase Project ID</span>
              <span className="font-mono-tech" style={{ color: TOKENS.bone }}>{projectInfo.projectId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Firestore Database</span>
              <span className="font-mono-tech truncate max-w-[240px]" style={{ color: TOKENS.brass }}>
                {projectInfo.firestoreDatabaseId}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Firestore Endpoint</span>
              <span style={{ color: firestoreStatus?.ok ? TOKENS.mint : TOKENS.amberWarn }}>
                {firestoreStatus?.detail || 'Checking...'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span style={{ color: TOKENS.sage }}>Authenticated User</span>
              <span className="font-mono-tech" style={{ color: TOKENS.bone }}>
                {user ? `${user.displayName || user.email}` : 'Not signed in'}
              </span>
            </div>
          </div>

          {cloudCounts && (
            <div
              className="p-3 rounded-lg border text-xs font-mono-tech tabular-nums"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline, color: TOKENS.mint }}
            >
              Cloud Synced Totals — Assets: {cloudCounts.assets} · Cases: {cloudCounts.cases} · Work Orders: {cloudCounts.workOrders} · Reports: {cloudCounts.reports}
            </div>
          )}

          {authError && (
            <div
              className="text-xs p-2.5 rounded-lg border"
              style={{
                color: TOKENS.terracotta,
                borderColor: TOKENS.terracotta,
                backgroundColor: TOKENS.mossDeep,
              }}
            >
              {authError}
            </div>
          )}

          {localStorageError && (
            <div role="alert" className="text-xs p-2.5 rounded-lg border" style={{
              color: TOKENS.terracotta,
              borderColor: TOKENS.terracotta,
              backgroundColor: TOKENS.mossDeep,
            }}>
              {localStorageError}
            </div>
          )}

          {cloudHydrationWarning && (
            <div role="status" className="text-xs p-2.5 rounded-lg border" style={{
              color: TOKENS.amberWarn,
              borderColor: TOKENS.amberWarn,
              backgroundColor: TOKENS.mossDeep,
            }}>
              {cloudHydrationWarning}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {user ? (
              <button
                type="button"
                onClick={signOut}
                className="min-h-[44px] px-4 py-2 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAccountDialogOpen(true)}
                className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.mossDeep }}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </section>

        {/* Firebase App Check Status */}
        <section
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-base font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
            <ShieldCheck className="w-4 h-4" style={{ color: TOKENS.mint }} />
            Firebase App Check Protection
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Current State</span>
              <span
                className="font-mono-tech"
                style={{ color: appCheckHealthy ? TOKENS.mint : TOKENS.amberWarn }}
              >
                {appCheckStatus.state}
              </span>
            </div>
            <p className="leading-relaxed" style={{ color: TOKENS.sage }}>{appCheckStatus.detail}</p>
          </div>

          <div
            className="p-3 rounded-lg border text-[11px] space-y-1"
            style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline, color: TOKENS.sage }}
          >
            <div className="font-semibold" style={{ color: TOKENS.bone }}>Console & Local Debug Setup</div>
            <div>1. Register web app with reCAPTCHA Enterprise in Firebase Console → App Check.</div>
            <div>
              2. Set <code style={{ color: TOKENS.brass }}>VITE_RECAPTCHA_SITE_KEY</code> in environment variables.
            </div>
            <div>
              3. For local dev, register a debug token in Firebase Console and set{' '}
              <code style={{ color: TOKENS.brass }}>VITE_FIREBASE_APPCHECK_DEBUG_TOKEN</code> locally (never commit tokens).
            </div>
          </div>
        </section>

        {/* On-Device AI Readiness */}
        <section
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-base font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
            <Cpu className="w-4 h-4" style={{ color: TOKENS.brass }} />
            Firebase AI Logic Hybrid Runtime
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Browser Support</span>
              <span style={{ color: browserSupport.supported ? TOKENS.mint : TOKENS.amberWarn }}>
                {browserSupport.supported ? 'Supported' : 'Cloud / Rules Fallback'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: TOKENS.hairline }}>
              <span style={{ color: TOKENS.sage }}>Device Model Status</span>
              <span className="font-mono-tech" style={{ color: TOKENS.bone }}>{deviceAvailability}</span>
            </div>
            <p style={{ color: TOKENS.sage }}>{deviceStatusDetail}</p>
          </div>

          {deviceAvailability === 'downloading' && (
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: TOKENS.mossDeep }}>
              <div
                className="h-full transition-all"
                style={{ width: `${downloadProgress}%`, backgroundColor: TOKENS.mint }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={prepareOnDeviceAI}
            disabled={deviceAvailability === 'downloading' || deviceAvailability === 'ready'}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium disabled:opacity-50"
            style={{
              backgroundColor: TOKENS.mossRaised,
              borderColor: TOKENS.hairlineStrong,
              color: TOKENS.brass,
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {deviceAvailability === 'ready' ? 'On-device AI Ready' : 'Prepare On-device AI'}
          </button>

          {inferenceHistory.length > 0 && (
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: TOKENS.hairline }}>
              <div className="text-xs font-medium" style={{ color: TOKENS.sage }}>Recent Inference Audit Log</div>
              {inferenceHistory.slice(0, 3).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between text-[11px]">
                  <AIRuntimeIndicator source={rec.inferenceSource} compact />
                  <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.sage }}>
                    {rec.latencyMs} ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Offline IndexedDB & Sync Queue */}
        <section
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold flex items-center gap-2" style={{ color: TOKENS.bone }}>
              <Database className="w-4 h-4" style={{ color: TOKENS.brass }} />
              Offline Storage & Sync Queue
            </h2>
            <SyncStatusIndicator status={syncStatus} pendingCount={pendingCount} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleSimulatedOffline}
              className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: TOKENS.mossDeep,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.amberWarn,
              }}
            >
              <WifiOff className="w-3.5 h-3.5" />
              {effectiveOnline ? 'Simulate Offline Mode' : 'Restore Connectivity'}
            </button>
            <button
              type="button"
              disabled={!effectiveOnline || pendingCount === 0}
              onClick={processSyncQueue}
              className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium disabled:opacity-45"
              style={{
                backgroundColor: TOKENS.mossRaised,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.mint,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Now ({pendingCount})
            </button>
            {!user && (
              <button
                type="button"
                onClick={resetDemoWorkspace}
                className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossDeep,
                  borderColor: TOKENS.terracotta,
                  color: TOKENS.terracotta,
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo Scenario
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {syncQueue.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.sage }}>
                Sync queue empty. Changes made offline are stored in IndexedDB and synced automatically when online.
              </p>
            ) : (
              syncQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs"
                  style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ color: TOKENS.bone }}>{item.label}</div>
                    <div className="text-[11px] font-mono-tech" style={{ color: TOKENS.sage }}>
                      {item.entityType} · {item.status}
                      {item.lastError ? ` · ${item.lastError}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {item.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retrySyncItem(item.id)}
                        className="px-2.5 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: TOKENS.mossRaised,
                          borderColor: TOKENS.hairlineStrong,
                          color: TOKENS.mint,
                        }}
                      >
                        Retry
                      </button>
                    )}
                    {item.status === 'conflict' && (
                      <button
                        type="button"
                        onClick={() => resolveSyncConflictKeepLocal(item.id)}
                        className="px-2.5 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: TOKENS.mossRaised,
                          borderColor: TOKENS.hairlineStrong,
                          color: TOKENS.brass,
                        }}
                      >
                        Keep Local Draft
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <AccountDialog
        open={accountDialogOpen}
        initialMode="sign-in"
        onClose={() => setAccountDialogOpen(false)}
        onAuthenticated={() => {
          setAccountDialogOpen(false);
        }}
      />
    </div>
  );
};
