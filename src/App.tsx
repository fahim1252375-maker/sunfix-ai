/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SunFixProvider, useSunFix } from './context/SunFixContext';

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

const SunFixRouter: React.FC = () => {
  const { route } = useSunFix();

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
