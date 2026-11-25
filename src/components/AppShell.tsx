import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  Box,
  Calculator,
  Camera,
  Cpu,
  Download,
  FileText,
  Layers,
  LayoutDashboard,
  Menu,
  Settings,
  Wrench,
  X,
} from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TOKENS } from '../theme/tokens';
import type { ScreenRoute } from '../types/sunfix';
import { AIRuntimeIndicator, SyncStatusIndicator } from './RuntimeStatusBadge';

const NAV_ITEMS: Array<{ route: ScreenRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { route: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { route: 'assets', label: 'Assets', icon: Layers },
  { route: 'digital-twin', label: 'Digital Twin', icon: Box },
  { route: 'diagnostics', label: 'AI Diagnostics', icon: Cpu },
  { route: 'knowledge', label: 'Knowledge Library', icon: BookOpen },
  { route: 'repairs', label: 'Repair Operations', icon: Wrench },
  { route: 'fieldproof', label: 'FieldProof', icon: Camera },
  { route: 'calculator', label: 'Energy Impact', icon: Calculator },
  { route: 'reports', label: 'Reports', icon: FileText },
  { route: 'settings', label: 'Settings', icon: Settings },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    route,
    navigate,
    user,
    signIn,
    signOut,
    effectiveOnline,
    toggleSimulatedOffline,
    syncStatus,
    syncQueue,
    lastInferenceRecord,
    deviceAvailability,
  } = useSunFix();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const pendingCount = syncQueue.filter((q) => q.status === 'pending' || q.status === 'failed').length;
  const activeNav = NAV_ITEMS.find((n) => n.route === route);
  const routeTitle =
    route === 'diagnostic-results'
      ? 'Diagnostic Results'
      : route === 'asset-detail'
        ? 'Asset Details'
        : activeNav?.label || 'Workspace';

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: TOKENS.ink, color: TOKENS.bone }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r"
        style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
      >
        <div
          className="px-5 py-5 border-b flex items-center justify-between"
          style={{ borderColor: TOKENS.hairline }}
        >
          <button
            type="button"
            onClick={() => navigate('welcome')}
            className="text-left rounded"
          >
            <span className="font-display text-lg tracking-tight block" style={{ color: TOKENS.bone }}>
              SunFix <em className="italic" style={{ color: TOKENS.brass }}>Field</em>
            </span>
            <span className="text-xs font-mono-tech" style={{ color: TOKENS.sage }}>
              Solar Diagnostics Ops
            </span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              route === item.route ||
              (item.route === 'assets' && route === 'asset-detail') ||
              (item.route === 'diagnostics' && route === 'diagnostic-results');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border"
                style={{
                  backgroundColor: active ? TOKENS.mossRaised : 'transparent',
                  borderColor: active ? TOKENS.hairlineStrong : 'transparent',
                  color: active ? TOKENS.brass : TOKENS.sage,
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3" style={{ borderColor: TOKENS.hairline }}>
          <div className="text-xs space-y-1.5">
            <div className="flex items-center justify-between" style={{ color: TOKENS.sage }}>
              <span>Connectivity</span>
              <SyncStatusIndicator status={syncStatus} pendingCount={pendingCount} />
            </div>
            <div className="flex items-center justify-between" style={{ color: TOKENS.sage }}>
              <span>On-device AI</span>
              <span className="font-mono-tech" style={{ color: TOKENS.bone }}>
                {deviceAvailability === 'ready'
                  ? 'Ready'
                  : deviceAvailability === 'unsupported'
                    ? 'Cloud / Rules'
                    : deviceAvailability}
              </span>
            </div>
          </div>

          {!isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={() => (isInstallable ? install() : setShowIOSModal(true))}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Install Field App
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header
          className="no-print sticky top-0 z-30 border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4"
          style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs flex items-center gap-2" style={{ color: TOKENS.sage }}>
                <button
                  type="button"
                  onClick={() => navigate('welcome')}
                  className="hidden sm:inline whitespace-nowrap hover:underline"
                >
                  SunFix Field
                </button>
                <span className="hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-medium truncate" style={{ color: TOKENS.bone }}>
                  {routeTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <AIRuntimeIndicator
                source={lastInferenceRecord?.inferenceSource || 'demo_rules'}
                compact
              />
            </div>

            <button
              type="button"
              onClick={toggleSimulatedOffline}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              style={{
                backgroundColor: effectiveOnline ? TOKENS.moss : TOKENS.brassSoft,
                borderColor: effectiveOnline ? TOKENS.hairlineStrong : TOKENS.amberWarn,
                color: effectiveOnline ? TOKENS.mint : TOKENS.amberWarn,
              }}
              title="Toggle simulated offline mode to test IndexedDB & Sync Queue"
            >
              {effectiveOnline ? 'Online' : 'Offline Mode'}
            </button>

            {user ? (
              <button
                type="button"
                onClick={signOut}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: TOKENS.moss,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                {user.displayName?.split(' ')[0] || 'Account'} · Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={signIn}
                className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                <span className="sm:hidden">Sign In</span>
                <span className="hidden sm:inline">Sign in with Google</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              className="relative w-72 max-w-[82vw] border-r flex flex-col p-4 z-10"
              style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
            >
              <div
                className="flex items-center justify-between pb-4 border-b"
                style={{ borderColor: TOKENS.hairline }}
              >
                <span className="font-display text-base">
                  SunFix <em className="italic" style={{ color: TOKENS.brass }}>Field</em>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: TOKENS.moss, color: TOKENS.sage }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => {
                        navigate(item.route);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: active ? TOKENS.mossRaised : 'transparent',
                        color: active ? TOKENS.brass : TOKENS.sage,
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-sm border rounded-xl p-6 space-y-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
          >
            <div className="flex items-center gap-2" style={{ color: TOKENS.brass }}>
              <Activity className="w-5 h-5" />
              <h3 className="font-display text-base">Install SunFix Field on iOS</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              1. Tap the Share button in Safari.<br />
              2. Choose Add to Home Screen for offline field readiness.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
