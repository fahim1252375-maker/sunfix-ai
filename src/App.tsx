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

const WORKSPACE_MODULES = [
  {
    route: 'assets',
    title: 'Site Registry',
    description: 'Register real solar sites, equipment, inverter models, and component records.',
    status: 'Start here',
  },
  {
    route: 'diagnostics',
    title: 'AI Diagnostics',
    description: 'Run an evidence-first, safety-gated inspection for a registered installation.',
    status: 'Site required',
  },
  {
    route: 'digital-twin',
    title: 'Digital Twin',
    description: 'Review the topology and condition of your own registered installation.',
    status: 'Site required',
  },
  {
    route: 'knowledge',
    title: 'Knowledge Library',
    description: 'Browse the reference library or import a manufacturer manual.',
    status: 'Available now',
  },
  {
    route: 'repairs',
    title: 'Repair Operations',
    description: 'Review work orders, task progress, and verification records.',
    status: 'After diagnosis',
  },
  {
    route: 'fieldproof',
    title: 'FieldProof Evidence',
    description: 'Capture installation-linked photos, readings, and technician notes.',
    status: 'Site required',
  },
  {
    route: 'calculator',
    title: 'Energy Impact',
    description: 'Explore transparent energy-impact estimates with labelled assumptions.',
    status: 'Available now',
  },
  {
    route: 'reports',
    title: 'Service Reports',
    description: 'Build and export provenance-aware reports from saved diagnostic cases.',
    status: 'After diagnosis',
  },
] as const;

const WorkspaceSetupView: React.FC = () => {
  const { user, navigate } = useSunFix();
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-7">
        <section
          className="grid grid-cols-1 gap-6 rounded-2xl border p-6 sm:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
        >
          <div className="flex flex-col items-start justify-center gap-4">
            <span className="font-mono-tech text-xs uppercase tracking-[0.18em]" style={{ color: TOKENS.brass }}>
              Account workspace · Initial setup
            </span>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl" style={{ color: TOKENS.bone }}>
              Your workspace starts here.
            </h1>
            <p className="text-sm leading-relaxed sm:text-base" style={{ color: TOKENS.sage }}>
              {firstName ? `Welcome back, ${firstName}. ` : 'Welcome to SunFix Field. '}
              Your account is signed in and ready. Register an existing solar installation to activate its site-specific
              equipment, diagnostics, service workflows, and reports.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              This account has no registered installations yet. SunFix keeps customer workspaces separate and does not
              insert sample sites or simulated customer records into your account.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('assets')}
                className="min-h-12 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                Add your first installation
              </button>
              <button
                type="button"
                onClick={() => navigate('knowledge')}
                className="min-h-12 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              >
                Browse knowledge library
              </button>
            </div>
          </div>

          <aside className="flex flex-col justify-center gap-4 rounded-xl border p-5" style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}>
            <div className="font-mono-tech text-xs uppercase tracking-wider" style={{ color: TOKENS.brass }}>
              Workspace readiness
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: TOKENS.bone }}>Registered installations</p>
                <p className="mt-1 text-xs" style={{ color: TOKENS.sage }}>Your private site registry</p>
              </div>
              <span className="font-mono-tech text-2xl font-semibold tabular-nums" style={{ color: TOKENS.bone }}>0 / 1</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Installation setup progress"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={0}
              style={{ backgroundColor: TOKENS.hairlineStrong }}
            >
              <div className="h-full w-0 rounded-full" style={{ backgroundColor: TOKENS.brass }} />
            </div>
            <div className="border-t pt-4 text-xs leading-relaxed" style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}>
              <strong className="font-semibold" style={{ color: TOKENS.bone }}>Next step:</strong> Add a site name, location,
              installed capacity, and the equipment details currently available to you. Unknown serial numbers can remain
              unrecorded until verified.
            </div>
          </aside>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono-tech text-xs uppercase tracking-[0.16em]" style={{ color: TOKENS.brass }}>
                Operations workspace
              </span>
              <h2 className="mt-1 font-display text-2xl" style={{ color: TOKENS.bone }}>Explore your modules</h2>
              <p className="mt-1 text-sm" style={{ color: TOKENS.sage }}>
                Your navigation stays available. Site-dependent workflows will guide you when a real installation is needed.
              </p>
            </div>
            <span className="rounded-lg border px-3 py-2 text-xs font-mono-tech" style={{ borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}>
              0 registered sites
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {WORKSPACE_MODULES.map((module) => (
              <button
                key={module.route}
                type="button"
                onClick={() => navigate(module.route)}
                className="flex min-h-40 flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[#B99B63]"
                style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline, color: TOKENS.bone }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                    {module.status}
                  </span>
                  <span aria-hidden="true" style={{ color: TOKENS.sage }}>↗</span>
                </div>
                <span className="font-display text-lg">{module.title}</span>
                <span className="text-xs leading-relaxed" style={{ color: TOKENS.sage }}>{module.description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

const AssetRequiredView: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  const { navigate } = useSunFix();

  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-start justify-center gap-4 rounded-2xl border p-7 sm:p-9"
      style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}>
      <span className="font-mono-tech text-xs uppercase tracking-[0.18em]" style={{ color: TOKENS.brass }}>
        Site setup required
      </span>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl" style={{ color: TOKENS.bone }}>{title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.sage }}>{description}</p>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="button" onClick={() => navigate('assets')} className="min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}>
          Open site registry
        </button>
        <button type="button" onClick={() => navigate('dashboard')} className="min-h-11 rounded-lg border px-4 py-2.5 text-sm font-semibold"
          style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}>
          Return to workspace
        </button>
      </div>
    </section>
  );
};

const SunFixRouter: React.FC = () => {
  const { route, user, assets } = useSunFix();

  // Keep the authenticated workspace navigable before the first site is registered.
  // Only workflows that require a real site are gated; no demo customer data is injected.
  if (user && assets.length === 0) {
    switch (route) {
      case 'dashboard':
      case 'welcome':
        return <WorkspaceSetupView />;
      case 'digital-twin':
        return <AppShell><AssetRequiredView title="Register an installation to open the Digital Twin"
          description="The Digital Twin is tied to a real site and its components. Add your installation first; then its registered equipment can be selected here." /></AppShell>;
      case 'diagnostics':
        return <AppShell><AssetRequiredView title="Register an installation to start diagnostics"
          description="Every diagnostic intake must be linked to an installation and a component. Add a site first so the inspection starts with the correct equipment context." /></AppShell>;
      case 'diagnostic-results':
        return <AppShell><AssetRequiredView title="No diagnostic results are available yet"
          description="Diagnostic results appear after a site has been registered and an inspection has been submitted. Your account has no site-specific diagnostic records yet." /></AppShell>;
      case 'fieldproof':
        return <AppShell><AssetRequiredView title="Register an installation to capture FieldProof evidence"
          description="FieldProof records must be linked to a real installation. Add a site first, then record original photographs, observed readings, and technician notes." /></AppShell>;
    }
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
