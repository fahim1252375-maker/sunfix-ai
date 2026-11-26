export async function withInferenceTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  // Firebase AI Logic's cloud transport also receives its own aborting timeout.
  // The current Chrome Prompt API adapter does not expose request cancellation,
  // so this bounds app wait time but cannot stop a local prompt already running.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error(`Inference timed out after ${timeoutMs} ms.`), { code: 'inference/timeout' }));
    }, timeoutMs);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function runHybridWithCloudFallback<T>(
  preferredRequest: () => Promise<T>,
  cloudRequest: () => Promise<T>,
  onPreferredFailure?: (error: unknown) => void,
): Promise<T> {
  try {
    return await preferredRequest();
  } catch (error) {
    onPreferredFailure?.(error);
    return cloudRequest();
  }
}

export async function initializeDeviceModelWithProgress(
  initialize: (onProgress: (progressValue: number) => void) => Promise<void>,
  onProgress: (percent: number) => void,
): Promise<void> {
  onProgress(5);
  await initialize((progressValue) => {
    onProgress(Math.min(100, Math.max(0, Math.round(progressValue * 100))));
  });
  onProgress(100);
}
