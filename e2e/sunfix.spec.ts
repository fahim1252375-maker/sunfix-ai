import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function enterDiagnostics(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Demo Workspace' }).click();
  const diagnosticsLink = page.getByRole('button', { name: 'AI Diagnostics' });
  if (!(await diagnosticsLink.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await diagnosticsLink.click();
}

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

  // Trigger every whileInView lifecycle animation before capturing a full-page
  // screenshot. Full-page capture does not reliably scroll through each viewport.
  const lifecycleStages = page.locator('#lifecycle article');
  await expect(lifecycleStages).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    const stage = lifecycleStages.nth(index);
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveCSS('opacity', '1');
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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

test('safety stop-work hold blocks generative diagnosis and creates an escalation work order', async ({ page }) => {
  await enterDiagnostics(page);

  for (let step = 1; step < 7; step += 1) {
    await page.getByRole('button', { name: 'Next Step' }).click();
  }

  await page.getByLabel('Visible smoke').check();
  await expect(page.getByRole('alert')).toContainText('IMMEDIATE STOP-WORK SAFETY HOLD ACTIVE');
  await page.getByRole('button', { name: 'Next Step' }).click();
  await expect(page.getByText('STOP-WORK HOLD', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit Hybrid Diagnosis' }).click();

  await expect(page.getByRole('alert')).toContainText('STOP-WORK SAFETY HOLD — ESCALATION REQUIRED');
  await expect(page.getByText('DEMO RULES', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Open Safety Escalation Work Order' }).click();
  await expect(page.getByRole('heading', { name: /Safety-gated repair operations/ })).toBeVisible();
  await expect(page.getByText(/generated under an active Stop-Work Hold/)).toBeVisible();
});

test('offline diagnosis is explicitly labelled as deterministic rules and creates a repair work order', async ({ page }) => {
  // Make this test deterministic even on a runner where Chrome exposes an
  // on-device Prompt API: this case specifically verifies unavailable-local
  // behavior, not a generated response from a test double.
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'LanguageModel', {
      configurable: true,
      value: { availability: async () => 'unavailable' },
    });
  });
  await enterDiagnostics(page);

  for (let step = 1; step < 8; step += 1) {
    await page.getByRole('button', { name: 'Next Step' }).click();
  }
  await expect(page.getByText(/On-Device Model Readiness \(unsupported\)/)).toBeVisible();
  await page.context().setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.getByRole('button', { name: 'Submit Hybrid Diagnosis' }).click();

  await expect(page.getByText('DEMO RULES', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Accept & Create Safety-Reviewed Work Order' }).click();
  await expect(page.getByRole('heading', { name: /Safety-gated repair operations/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Repair Workflow/ })).toBeVisible();
  await page.context().setOffline(false);
});

test('failed Firebase AI Logic requests show deterministic fallback instead of a model success', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run provider failure smoke once per workflow.');
  await enterDiagnostics(page);

  for (let step = 1; step < 8; step += 1) {
    await page.getByRole('button', { name: 'Next Step' }).click();
  }
  await page.route('https://firebasevertexai.googleapis.com/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Force Cloud Gemini Analysis' }).click();

  await expect(page.getByText('DEMO RULES', { exact: true }).last()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Firebase AI Logic request failed|request could not complete|not yet enabled or permitted|fell back to deterministic rules/).first()).toBeVisible();
  await expect(page.getByText('CLOUD', { exact: true })).toHaveCount(0);
  await expect(page.getByText('LOCAL', { exact: true })).toHaveCount(0);
});

test('authenticated offline queue persists locally and auto-syncs after reconnect', async ({ page }) => {
  await page.goto('/e2e/sync-harness.html');

  const userId = await page.evaluate(async () => {
    const emulatorTestModulePath = '/src/testing/firebaseEmulator.ts';
    const { createVerifiedEmulatorUser } =
      await import(/* @vite-ignore */ emulatorTestModulePath);
    const authenticatedUser = await createVerifiedEmulatorUser();

    return authenticatedUser.uid;
  });

  await expect(page.getByTestId('auth-ready')).toHaveText('ready');
  await expect(page.getByTestId('sync-user-id')).toHaveText(userId);

  await page.context().setOffline(true);
  await expect(page.getByTestId('global-sync-status')).toHaveText('offline');

  await page.getByRole('button', { name: 'Queue asset while offline' }).click();
  const assetId = `playwright-offline-${userId}`;

  await expect(page.getByTestId('sync-queue-status')).toContainText(`${assetId}:pending`);
  await expect(page.getByTestId('global-sync-status')).toHaveText('offline');

  const localState = await page.evaluate(async (uid) => {
    const offlineStoreModulePath = '/src/services/offlineStore.ts';
    const { getStorageScopeId, loadSyncQueueFromIDB, loadWorkspaceFromIDB } =
      await import(/* @vite-ignore */ offlineStoreModulePath);
    const scope = getStorageScopeId(uid);
    const [queueResult, workspaceResult] = await Promise.all([
      loadSyncQueueFromIDB(scope),
      loadWorkspaceFromIDB(scope),
    ]);
    const queue = queueResult as Array<{ entityId: string; status: string }>;
    const workspace = workspaceResult as { assets: Array<{ id: string }> } | null;
    return {
      queued: queue.some((item) => item.entityId === `playwright-offline-${uid}` && item.status === 'pending'),
      workspaceHasAsset: Boolean(workspace?.assets.some((asset) => asset.id === `playwright-offline-${uid}`)),
    };
  }, userId);

  expect(localState.queued).toBe(true);
  expect(localState.workspaceHasAsset).toBe(true);

  await page.context().setOffline(false);
  await expect(page.getByTestId('sync-queue-status')).toContainText(`${assetId}:synced`, {
    timeout: 30_000,
  });
  await expect(page.getByTestId('sync-cloud-assets')).toHaveText('1', { timeout: 15_000 });

  const persistedQueue = await page.evaluate(async (uid) => {
    const offlineStoreModulePath = '/src/services/offlineStore.ts';
    const { getStorageScopeId, loadSyncQueueFromIDB } =
      await import(/* @vite-ignore */ offlineStoreModulePath);
    const queue = (await loadSyncQueueFromIDB(getStorageScopeId(uid))) as Array<{
      entityId: string;
      status: string;
    }>;
    return queue.find((item) => item.entityId === `playwright-offline-${uid}`)?.status;
  }, userId);

  expect(persistedQueue).toBe('synced');
});

test('live Firebase App Check returns a reCAPTCHA Enterprise attestation @live-app-check', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run live App Check smoke once per CI workflow.');
  test.skip(
    process.env.SUNFIX_RUN_LIVE_AI_SMOKE !== 'true',
    'Set SUNFIX_RUN_LIVE_AI_SMOKE=true and provide a real Firebase project and App Check site key.',
  );

  await page.goto('/');
  const result = await page.evaluate(async () => {
    const liveTestModulePath = '/src/testing/firebaseLive.ts';
    const { requestLiveAppCheckAttestation } =
      await import(/* @vite-ignore */ liveTestModulePath);
    return requestLiveAppCheckAttestation();
  });

  expect(result.tokenLength).toBeGreaterThan(20);
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
