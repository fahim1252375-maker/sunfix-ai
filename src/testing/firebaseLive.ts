import { getToken } from 'firebase/app-check';
import { getAppCheckInstance, getAppCheckStatus } from '../services/firebase';

/**
 * Request a real Firebase App Check token in the non-emulator browser smoke test.
 * On localhost CI this must be a registered App Check debug token; it is not
 * evidence of production reCAPTCHA Enterprise attestation.
 */
export async function requestLiveAppCheckAttestation(): Promise<{
  appCheckState: ReturnType<typeof getAppCheckStatus>['state'];
  tokenLength: number;
}> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    throw new Error('Live App Check verification is available only in the non-emulator browser smoke test.');
  }

  const appCheck = getAppCheckInstance();
  if (!appCheck) {
    throw new Error('Firebase App Check is not initialized. Check the Firebase Web App and reCAPTCHA Enterprise site key.');
  }

  const result = await getToken(appCheck, true);
  if (!result.token || result.token.trim().length < 20) {
    throw new Error('Firebase App Check did not return a usable attestation token.');
  }

  return {
    appCheckState: getAppCheckStatus().state,
    tokenLength: result.token.length,
  };
}
