import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim() || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim() || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() || '',
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)?.trim() || '',
  firestoreDatabaseId: (import.meta.env.VITE_FIRESTORE_DATABASE_ID as string | undefined)?.trim() || '(default)',
};

const firebaseConfigReady = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);
import type { AppCheckState } from '../types/sunfix';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  errorCode: string | null;
  operationType: OperationType;
  collection: string | null;
  authenticated: boolean;
}

export interface AppCheckStatusInfo {
  state: AppCheckState;
  detail: string;
  debugModeEnabled: boolean;
  siteKeyConfigured: boolean;
}

const existingApps = getApps();
export const firebaseApp: FirebaseApp =
  existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

let appCheckInstance: AppCheck | null = null;
let appCheckStatus: AppCheckStatusInfo = {
  state: 'unconfigured_missing_site_key',
  detail:
    'reCAPTCHA Enterprise site key is not configured. Set VITE_RECAPTCHA_SITE_KEY in your local environment.',
  debugModeEnabled: false,
  siteKeyConfigured: false,
};

function initAppCheckBeforeServices(): void {
  if (typeof window === 'undefined') return;

  if (!firebaseConfigReady) {
    appCheckStatus = {
      state: 'unconfigured_missing_site_key',
      detail: 'Firebase project configuration is incomplete. App Check will not initialize until the Firebase Web App settings are configured.',
      debugModeEnabled: false,
      siteKeyConfigured: false,
    };
    return;
  }

  // App Check debug tokens are accepted only in development builds. Vite replaces
  // import.meta.env.DEV at build time, so a production bundle cannot activate this bypass.
  const debugEnv = import.meta.env.DEV
    ? (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN as string | undefined)
    : undefined;
  const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() || '';

  const debugModeEnabled = Boolean(debugEnv && debugEnv.trim().length > 0);
  if (debugModeEnabled) {
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugEnv === 'true' ? true : debugEnv!.trim();
  }

  if (!siteKey) {
    appCheckStatus = {
      state: 'unconfigured_missing_site_key',
      detail:
        'App Check site key missing. Set VITE_RECAPTCHA_SITE_KEY (and optional VITE_FIREBASE_APPCHECK_DEBUG_TOKEN for local dev) and enforce App Check in Firebase Console.',
      debugModeEnabled,
      siteKeyConfigured: false,
    };
    return;
  }

  try {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckStatus = {
      state: debugModeEnabled ? 'active_debug' : 'active_enterprise',
      detail: debugModeEnabled
        ? 'Firebase App Check initialized with Debug Provider active for development.'
        : 'Firebase App Check initialized with reCAPTCHA Enterprise provider.',
      debugModeEnabled,
      siteKeyConfigured: true,
    };
  } catch (err) {
    const errorCode =
      err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? (/^[a-z0-9/_-]{1,80}$/i.test(err.code) ? err.code : null)
        : null;
    appCheckStatus = {
      state: 'error',
      detail: errorCode
        ? `Firebase App Check initialization failed (${errorCode}).`
        : 'Firebase App Check initialization failed. Check the Firebase project and site-key configuration.',
      debugModeEnabled,
      siteKeyConfigured: true,
    };
  }
}

// Mandatory: Initialize App Check BEFORE Firestore and Firebase AI Logic
initAppCheckBeforeServices();

export const db: Firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth: Auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Emulator wiring is available only in the Vite development server. Production
// bundles can never redirect Authentication or Firestore to local emulators.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  const authEmulatorUrl =
    (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL as string | undefined)?.trim() ||
    'http://127.0.0.1:9099';
  const firestoreHost =
    (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST as string | undefined)?.trim() ||
    '127.0.0.1';
  const firestorePort = Number(
    (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT as string | undefined)?.trim() || '8080',
  );

  if (!Number.isInteger(firestorePort) || firestorePort < 1 || firestorePort > 65535) {
    throw new Error('Invalid Firestore emulator port configuration.');
  }

  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
}

export function getAppCheckStatus(): AppCheckStatusInfo {
  return appCheckStatus;
}

export function getAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}

export function getFirebaseProjectInfo() {
  return {
    projectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    authDomain: firebaseConfig.authDomain,
  };
}

export async function testFirestoreConnection(): Promise<{ ok: boolean; detail: string }> {
  if (!firebaseConfigReady) {
    return {
      ok: false,
      detail: 'Firebase project configuration is missing. Copy .env.example to .env.local and fill in the Firebase web-app values.',
    };
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, detail: 'Connected to Cloud Firestore server.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      return {
        ok: false,
        detail: 'Firestore client appears offline or project configuration unreachable.',
      };
    }
    // Permission denied on /test/connection still proves server roundtrip succeeded
    if (message.includes('permission') || message.includes('insufficient')) {
      return { ok: true, detail: 'Firestore endpoint reachable and security rules enforced.' };
    }
    const errorCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? (/^[a-z0-9/_-]{1,80}$/i.test(error.code) ? error.code : null) : null;
    return { ok: false, detail: errorCode ? `Firestore connection failed (${errorCode}). Check network and project configuration.` : 'Firestore connection failed. Check network and project configuration.' };
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errorCode =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  const errInfo: FirestoreErrorInfo = {
    errorCode,
    operationType,
    collection: path?.split('/')[0] || null,
    authenticated: Boolean(auth.currentUser),
  };

  // Never place emails, user IDs, provider details, or raw backend messages in logs.
  console.error('[SunFix] Firestore operation failed', errInfo);
  throw new Error(
    `Cloud ${operationType.toLowerCase()} failed${errorCode ? ` (${errorCode})` : ''}.`,
  );
}

export async function signInWithGoogle(): Promise<User> {
  if (!firebaseConfigReady) {
    throw new Error('Firebase is not configured. Copy .env.example to .env.local and add your Firebase web-app settings.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
