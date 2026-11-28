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

const EmptyAccountDashboard: React.FC = () => {
  const { user, assets, cases, workOrders, reports, navigate } = useSunFix();

  const metrics = [
    { label: 'Registered sites', value: assets.length, detail: 'Site registry' },
    { label: 'Diagnostic records', value: cases.length, detail: 'Inspection history' },
    { label: 'Open work orders', value: workOrders.filter((item) => item.status !== 'completed').length, detail: 'Repair operations' },
    { label: 'Service reports', value: reports.length, detail: 'FieldProof records' },
  ];

  const shortcuts = [
    {
      route: 'assets',
      title: 'Site Registry',
      description: 'Manage solar installations, equipment, and component records.',
      action: 'Open registry',
    },
    {
      route: 'knowledge',
      title: 'Knowledge Library',
      description: 'Search references and import manufacturer technical documents.',
      action: 'Browse references',
    },
    {
      route: 'calculator',
      title: 'Energy Impact',
      description: 'Calculate transparent energy estimates using your own inputs.',
      action: 'Open calculator',
    },
    {
      route: 'reports',
      title: 'Service Reports',
      description: 'Review report history and create reports from completed inspections.',
      action: 'View reports',
    },
  ] as const;

  const firstName = user?.displayName?.trim().split(/\\s+/)[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: TOKENS.hairline }}>
          <div>
            <span className="font-mono-tech text-xs uppercase tracking-[0.18em]" style={{ color: TOKENS.brass }}>
              Field Operations · Workspace Overview
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl" style={{ color: TOKENS.bone }}>
              Operations <em className="italic" style={{ color: TOKENS.brass }}>Command Center</em>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              {firstName ? `Welcome back, ${firstName}. ` : ''}
              Your workspace is ready. Operational records and site activity will appear here as they are added.
            </p>
          </div>
          <span className="rounded-lg border px-3 py-2 text-xs font-mono-tech" style={{ color: TOKENS.mint, borderColor: TOKENS.hairlineStrong }}>
            WORKSPACE ACTIVE
          </span>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Workspace metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
              <p className="text-xs" style={{ color: TOKENS.sage }}>{metric.label}</p>
              <p className="mt-2 font-mono-tech text-3xl font-semibold tabular-nums" style={{ color: TOKENS.bone }}>{metric.value}</p>
              <p className="mt-1 text-[11px]" style={{ color: TOKENS.sage }}>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <span className="font-mono-tech text-xs uppercase tracking-[0.16em]" style={{ color: TOKENS.brass }}>
              Workspace tools
            </span>
            <h2 className="mt-1 font-display text-2xl" style={{ color: TOKENS.bone }}>Quick access</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.route}
                type="button"
                onClick={() => navigate(shortcut.route)}
                className="flex min-h-44 flex-col items-start justify-between gap-4 rounded-xl border p-5 text-left transition-colors hover:border-[#B99B63]"
                style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline, color: TOKENS.bone }}
              >
                <span>
                  <span className="block font-display text-lg">{shortcut.title}</span>
                  <span className="mt-2 block text-xs leading-relaxed" style={{ color: TOKENS.sage }}>{shortcut.description}</span>
                </span>
                <span className="text-xs font-semibold" style={{ color: TOKENS.brass }}>{shortcut.action} ↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded-xl border p-5" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <span className="font-mono-tech text-xs uppercase tracking-wider" style={{ color: TOKENS.brass }}>Recent activity</span>
            <h2 className="mt-2 font-display text-lg" style={{ color: TOKENS.bone }}>Workspace activity</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              No activity has been recorded yet. New site registrations, inspections, and service updates will be listed here.
            </p>
          </article>
          <article className="rounded-xl border p-5" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <span className="font-mono-tech text-xs uppercase tracking-wider" style={{ color: TOKENS.brass }}>Operational availability</span>
            <h2 className="mt-2 font-display text-lg" style={{ color: TOKENS.bone }}>All workspace modules</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              Use the navigation to open Diagnostics, Digital Twin, Repair Operations, FieldProof, Reports, Settings, and the other tools. Modules that depend on a registered site will explain what information they need.
            </p>
          </article>
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
        return <EmptyAccountDashboard />;
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
