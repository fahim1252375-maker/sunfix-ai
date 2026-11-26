import { getToken } from 'firebase/app-check';
import { getAppCheckInstance } from '../services/firebase';

/**
 * Request a real reCAPTCHA Enterprise App Check attestation token.
 * This helper is allowed only in the local Vite browser test server when the
 * app is configured with a real Firebase project and not connected to emulators.
 */
export async function requestLiveAppCheckAttestation(): Promise<{
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
    tokenLength: result.token.length,
  };
}
