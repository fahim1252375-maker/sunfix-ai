import React from 'react';
import { createRoot } from 'react-dom/client';
import { SunFixProvider } from '../context/SunFixContext';
import { SunFixSyncHarness } from './SunFixSyncHarness';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element for SunFix sync test harness.');
}

createRoot(rootElement).render(
  <SunFixProvider>
    <SunFixSyncHarness />
  </SunFixProvider>,
);
