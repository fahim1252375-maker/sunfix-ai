import { expect, test } from '@playwright/test';

// The browser test evaluates credentials in memory. Keep traces and media off
// so credentials cannot be captured in CI artifacts if the test fails.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('live Firestore enforces owner isolation and cleans its fixture @live-firestore', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the live Firestore test once per workflow.');

  const credentials = {
    ownerEmail: process.env.SUNFIX_LIVE_TEST_EMAIL || '',
    ownerPassword: process.env.SUNFIX_LIVE_TEST_PASSWORD || '',
    secondEmail: process.env.SUNFIX_LIVE_TEST_SECOND_EMAIL || '',
    secondPassword: process.env.SUNFIX_LIVE_TEST_SECOND_PASSWORD || '',
  };
  test.skip(
    process.env.SUNFIX_RUN_LIVE_FIRESTORE_TEST !== 'true',
    'Set SUNFIX_RUN_LIVE_FIRESTORE_TEST=true only after configuring two verified live test accounts.',
  );
  if (Object.values(credentials).some((value) => !value)) {
    throw new Error('The live Firestore gate is enabled, but one or more protected test-account secrets are missing.');
  }

  await page.goto('/');
  const result = await page.evaluate(async (testCredentials) => {
    const liveTestModulePath = '/src/testing/firebaseLive.ts';
    const { runLiveFirestoreOwnerIsolationTest } =
      await import(/* @vite-ignore */ liveTestModulePath);
    return runLiveFirestoreOwnerIsolationTest(testCredentials);
  }, credentials);

  expect(result.ownerRead).toBe(true);
  expect(result.otherAccountDenied).toBe(true);
  expect(result.cleanupVerified).toBe(true);
});
