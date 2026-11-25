import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing page renders at desktop and mobile widths without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Powering smarter');

  const documentMetrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.viewportWidth + 1);

  await page.screenshot({
    path: testInfo.outputPath('sunfix-landing-viewport.png'),
    fullPage: true,
    animations: 'disabled',
  });

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousViolations = axe.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(
    seriousViolations,
    seriousViolations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
  ).toEqual([]);
});

test('demo workspace navigation and simulated offline mode remain usable', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Demo Workspace' }).click();

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('button', { name: 'Repair Operations' })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation menu' }).click();
  } else {
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Online' })).toBeVisible();

  await page.getByRole('button', { name: 'Online' }).click();
  await expect(page.getByRole('button', { name: 'Offline Mode' })).toBeVisible();

  const onlineState = await page.evaluate(() => navigator.onLine);
  expect(onlineState).toBe(true);

  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const request = indexedDB.open('sunfix-field-db');
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains('workspace_state')) {
            database.close();
            resolve(false);
            return;
          }
          const transaction = database.transaction('workspace_state', 'readonly');
          const lookup = transaction.objectStore('workspace_state').get('workspace:anonymous');
          lookup.onsuccess = () => {
            const data = lookup.result?.data;
            database.close();
            resolve(Boolean(data && Array.isArray(data.assets) && data.assets.length > 0));
          };
          lookup.onerror = () => {
            database.close();
            resolve(false);
          };
        };
      }),
    null,
    { timeout: 15_000 },
  );

  await page.context().setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  const workspaceSurvivesOffline = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const request = indexedDB.open('sunfix-field-db');
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('workspace_state', 'readonly');
          const lookup = transaction.objectStore('workspace_state').get('workspace:anonymous');
          lookup.onsuccess = () => {
            const data = lookup.result?.data;
            database.close();
            resolve(Boolean(data && Array.isArray(data.assets) && data.assets.length > 0));
          };
          lookup.onerror = () => {
            database.close();
            resolve(false);
          };
        };
      }),
  );
  expect(workspaceSurvivesOffline).toBe(true);
  await page.context().setOffline(false);
});

test('mobile navigation opens, changes route and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Demo Workspace' }).click();

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Repair Operations' }).click();

  await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();

  const documentMetrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.viewportWidth + 1);
});

test('authenticated Firebase emulator sync writes an owner-scoped asset', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const emulatorTestModulePath = '/src/testing/firebaseEmulator.ts';
    const { createVerifiedEmulatorUser } =
      await import(/* @vite-ignore */ emulatorTestModulePath);
    const authenticatedUser = await createVerifiedEmulatorUser();

    const firestoreSyncModulePath = '/src/services/firestoreSync.ts';
    const { syncQueueItemToFirestore, fetchUserCloudRecordCounts } =
      await import(/* @vite-ignore */ firestoreSyncModulePath);
    const timestamp = new Date().toISOString();
    const item = {
      id: `queue-${crypto.randomUUID()}`,
      entityType: 'asset' as const,
      entityId: `asset-${crypto.randomUUID()}`,
      operation: 'upsert' as const,
      label: 'Playwright emulator asset',
      payload: {
        name: 'Playwright emulator asset',
        siteType: 'commercial',
        locationLabel: 'Automated test environment',
        capacityKw: 12,
        status: 'nominal',
        inverterModel: 'Test inverter',
        inverterSerial: 'PW-INV-001',
        panelCount: 30,
        isDemo: false,
      },
      status: 'pending' as const,
      attempts: 0,
      updatedAt: timestamp,
    };

    const sync = await syncQueueItemToFirestore(item, authenticatedUser.uid);
    const counts = await fetchUserCloudRecordCounts(authenticatedUser.uid);
    return {
      emailVerified: authenticatedUser.emailVerified,
      uid: authenticatedUser.uid,
      sync,
      counts,
    };
  });

  expect(result.emailVerified).toBe(true);
  expect(result.sync.status).toBe('synced');
  expect(result.counts.assets).toBe(1);
});

test('live Firebase AI Logic returns a validated cloud result when explicitly enabled @live-ai', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the live provider smoke once per CI workflow.');
  test.skip(
    process.env.SUNFIX_RUN_LIVE_AI_SMOKE !== 'true',
    'Set SUNFIX_RUN_LIVE_AI_SMOKE=true and provide a real Firebase project and App Check site key to run the live provider check.',
  );

  await page.goto('/');
  const result = await page.evaluate(async () => {
    const hybridAiModulePath = '/src/services/hybridAI.ts';
    const { runHybridDiagnosis } = await import(/* @vite-ignore */ hybridAiModulePath);
    return runHybridDiagnosis({
      caseId: 'live-ai-smoke',
      assetName: 'Live AI integration test site',
      componentType: 'inverter',
      componentName: 'Test inverter',
      symptoms: ['No power production'],
      symptomNotes: 'Automated integration smoke test using a fictional, non-operational test asset.',
      faultCode: '',
      readings: [],
      safetyFlags: [],
      knowledgeLibrary: [],
      forceCloudOnly: true,
      onDeviceReady: false,
    });
  });

  expect(result.usedFallbackRules).toBe(false);
  expect(result.inferenceRecord.inferenceSource).toBe('in_cloud');
  expect(result.inferenceRecord.validationPassed).toBe(true);
});
