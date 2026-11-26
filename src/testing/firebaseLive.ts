import { getToken } from 'firebase/app-check';
import { getAppCheckInstance, getAppCheckStatus } from '../services/firebase';

/**
 * Obtain an App Check token using the registered CI debug token.
 *
 * The GitHub Actions Playwright server runs on 127.0.0.1, which must not be
 * added to the production reCAPTCHA Enterprise key. This helper therefore
 * requires the development-only debug-token path. It is not a production
 * reCAPTCHA Enterprise attestation test.
 */
export async function requestLiveAppCheckAttestation(): Promise<{
  tokenLength: number;
  appCheckState: string;
}> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    throw new Error('The CI App Check smoke test is available only in the non-emulator Vite development server.');
  }

  const status = getAppCheckStatus();
  if (status.state !== 'active_debug' || !status.debugModeEnabled) {
    throw new Error(
      'The CI browser runs on 127.0.0.1 and requires a registered VITE_FIREBASE_APPCHECK_DEBUG_TOKEN. Do not use the production reCAPTCHA key as a localhost attestation.',
    );
  }

  const appCheck = getAppCheckInstance();
  if (!appCheck) {
    throw new Error('Firebase App Check is not initialized. Check the Firebase Web App, App Check provider configuration, and registered debug token.');
  }

  const result = await getToken(appCheck, true);
  if (!result.token || result.token.trim().length < 20) {
    throw new Error('Firebase App Check did not return a usable debug attestation token.');
  }

  return {
    tokenLength: result.token.length,
    appCheckState: status.state,
  };
}
