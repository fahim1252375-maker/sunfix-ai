/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SunFixProvider, useSunFix } from './context/SunFixContext';
import { AssetsView } from './views/AssetsView';
import { CalculatorView } from './views/CalculatorView';
import { DashboardView } from './views/DashboardView';
import { DiagnosticResultsView } from './views/DiagnosticResultsView';
import { DiagnosticWizardView } from './views/DiagnosticWizardView';
import { DigitalTwinView } from './views/DigitalTwinView';
import { FieldProofView } from './views/FieldProofView';
import { KnowledgeLibraryView } from './views/KnowledgeLibraryView';
import { LifecycleStageView } from './views/LifecycleStageView';
import { RepairsView } from './views/RepairsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { WelcomeView } from './views/WelcomeView';

const SunFixRouter: React.FC = () => {
  const { route } = useSunFix();

  if (route === 'welcome') {
    return <WelcomeView />;
  }

  if (route === 'lifecycle') {
    return <LifecycleStageView />;
  }

  let screen: React.ReactNode = <DashboardView />;
  switch (route) {
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

  return <AppShell>{screen}</AppShell>;
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
