/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SunFixProvider, useSunFix } from './context/SunFixContext';
import { TOKENS } from './theme/tokens';

const AssetsView = lazy(() => import('./views/AssetsView').then((m) => ({ default: m.AssetsView })));
const CalculatorView = lazy(() => import('./views/CalculatorView').then((m) => ({ default: m.CalculatorView })));
const DashboardView = lazy(() => import('./views/DashboardView').then((m) => ({ default: m.DashboardView })));
const DiagnosticResultsView = lazy(() => import('./views/DiagnosticResultsView').then((m) => ({ default: m.DiagnosticResultsView })));
const DiagnosticWizardView = lazy(() => import('./views/DiagnosticWizardView').then((m) => ({ default: m.DiagnosticWizardView })));
const DigitalTwinView = lazy(() => import('./views/DigitalTwinView').then((m) => ({ default: m.DigitalTwinView })));
const FieldProofView = lazy(() => import('./views/FieldProofView').then((m) => ({ default: m.FieldProofView })));
const KnowledgeLibraryView = lazy(() => import('./views/KnowledgeLibraryView').then((m) => ({ default: m.KnowledgeLibraryView })));
const LifecycleStageView = lazy(() => import('./views/LifecycleStageView').then((m) => ({ default: m.LifecycleStageView })));
const RepairsView = lazy(() => import('./views/RepairsView').then((m) => ({ default: m.RepairsView })));
const ReportsView = lazy(() => import('./views/ReportsView').then((m) => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })));
const WelcomeView = lazy(() => import('./views/WelcomeView').then((m) => ({ default: m.WelcomeView })));

const WorkspaceSetupView: React.FC = () => {
  const { user, navigate } = useSunFix();
  const firstName = user?.displayName?.trim().split(/\\s+/)[0];

  return (
    <AppShell>
      <section
        className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col items-start justify-center gap-5 rounded-2xl border p-7 sm:p-10"
        style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
      >
        <span className="font-mono-tech text-xs uppercase tracking-[0.18em]" style={{ color: TOKENS.brass }}>
          Account workspace · Initial setup
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold" style={{ color: TOKENS.bone }}>
          Welcome{firstName ? `, ${firstName}` : ' to SunFix'}.
        </h1>
        <p className="max-w-2xl text-sm sm:text-base leading-relaxed" style={{ color: TOKENS.sage }}>
          Your account is ready. Add your first solar installation to create a workspace for your own sites,
          equipment, diagnostics, and service records. No example customer records are copied into your account.
        </p>
        <button
          type="button"
          onClick={() => navigate('assets')}
          className="min-h-12 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
        >
          Add your first solar installation
        </button>
        <p className="text-xs" style={{ color: TOKENS.sage }}>
          You can edit site details and equipment after creation. Cloud sync is available only after the account and security checks are complete.
        </p>
      </section>
    </AppShell>
  );
};

const SunFixRouter: React.FC = () => {
  const { route, user, assets } = useSunFix();

  // A new authenticated account starts with an empty, owner-scoped workspace.
  // Do not inject preview data into that account: guide the user through setup.
  if (user && assets.length === 0 && route !== 'assets' && route !== 'settings' && route !== 'welcome') {
    return <WorkspaceSetupView />;
  }

  let screen: React.ReactNode = <DashboardView />;
  switch (route) {
    case 'welcome':
      screen = <WelcomeView />;
      break;
    case 'lifecycle':
      screen = <LifecycleStageView />;
      break;
    case 'dashboard':
      screen = <DashboardView />;
      break;
    case 'assets':
    case 'asset-detail':
      screen = <AssetsView />;
      break;
    case 'digital-twin':
      screen = <DigitalTwinView />;
      break;
    case 'diagnostics':
      screen = <DiagnosticWizardView />;
      break;
    case 'diagnostic-results':
      screen = <DiagnosticResultsView />;
      break;
    case 'knowledge':
      screen = <KnowledgeLibraryView />;
      break;
    case 'repairs':
      screen = <RepairsView />;
      break;
    case 'fieldproof':
      screen = <FieldProofView />;
      break;
    case 'calculator':
      screen = <CalculatorView />;
      break;
    case 'reports':
      screen = <ReportsView />;
      break;
    case 'settings':
      screen = <SettingsView />;
      break;
    default:
      screen = <DashboardView />;
  }

  if (route === 'welcome' || route === 'lifecycle') {
    return <Suspense fallback={<div role="status" className="min-h-screen bg-[#0E1A17]" aria-label="Loading SunFix" />}>
      {screen}
    </Suspense>;
  }

  return <AppShell>
    <Suspense fallback={<div role="status" className="min-h-[50vh]" aria-label="Loading workspace" />}>
      {screen}
    </Suspense>
  </AppShell>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <SunFixProvider>
        <SunFixRouter />
      </SunFixProvider>
    </ErrorBoundary>
  );
}
