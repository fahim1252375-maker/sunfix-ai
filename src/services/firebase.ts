import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
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
    'reCAPTCHA Enterprise site key is not configured in firebase-applet-config.json or VITE_RECAPTCHA_SITE_KEY.',
  debugModeEnabled: false,
  siteKeyConfigured: false,
};

function initAppCheckBeforeServices(): void {
  if (typeof window === 'undefined') return;

  const debugEnv = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN as string | undefined;
  const siteKey =
    (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ||
    (firebaseConfig.recaptchaSiteKey || '').trim();

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
    appCheckStatus = {
      state: 'error',
      detail: err instanceof Error ? err.message : 'Failed to initialize Firebase App Check.',
      debugModeEnabled,
      siteKeyConfigured: true,
    };
  }
}

// Mandatory: Initialize App Check BEFORE Firestore and Firebase AI Logic
initAppCheckBeforeServices();

export const db: Firestore = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId,
);
export const auth: Auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

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
    return { ok: false, detail: message };
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
