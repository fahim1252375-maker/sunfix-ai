import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initializeDeviceModelWithProgress,
  runHybridWithCloudFallback,
  withInferenceTimeout,
} from './hybridInference';

test('on-device initialization failure is surfaced to the caller', async () => {
  const progress: number[] = [];
  await assert.rejects(
    initializeDeviceModelWithProgress(async () => {
      throw Object.assign(new Error('device model unavailable'), { code: 'model/unavailable' });
    }, (percent) => progress.push(percent)),
    /device model unavailable/,
  );
  assert.deepEqual(progress, [5]);
});

test('unavailable local inference retries cloud and returns only the cloud result', async () => {
  let cloudAttempts = 0;
  let capturedFailure: unknown;
  const result = await runHybridWithCloudFallback(
    async () => {
      throw Object.assign(new Error('local runtime unavailable'), { code: 'model/unavailable' });
    },
    async () => {
      cloudAttempts += 1;
      return { inferenceSource: 'in_cloud' };
    },
    (error) => { capturedFailure = error; },
  );

  assert.equal(cloudAttempts, 1);
  assert.equal((result as { inferenceSource: string }).inferenceSource, 'in_cloud');
  assert.equal((capturedFailure as Error).message, 'local runtime unavailable');
});

test('cloud network failure after local failure remains a rejected inference', async () => {
  await assert.rejects(
    runHybridWithCloudFallback(
      async () => { throw new Error('local prompt failed'); },
      async () => { throw Object.assign(new Error('network offline'), { code: 'fetch-error' }); },
    ),
    /network offline/,
  );
});

test('request timeout rejects instead of returning a model result', async () => {
  await assert.rejects(
    withInferenceTimeout(new Promise<never>(() => undefined), 5),
    (error: Error & { code?: string }) => error.code === 'inference/timeout',
  );
});
