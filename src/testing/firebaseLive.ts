import { getToken } from 'firebase/app-check';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  getAppCheckInstance,
  getAppCheckStatus,
  getFirebaseProjectInfo,
} from '../services/firebase';

const LIVE_PROJECT_ID = 'avid-grin-p01dl';
const LIVE_DATABASE_ID = 'ai-studio-dcfb1e98-5786-4f95-9e81-c11da4cfcc33';

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

export interface LiveFirestoreTestCredentials {
  ownerEmail: string;
  ownerPassword: string;
  secondEmail: string;
  secondPassword: string;
}

/**
 * Exercise the actual client SDK, named production database, and deployed rules
 * with two pre-created verified test accounts. Only this run's unique asset ID
 * is deleted; no existing document is read, changed, or removed.
 */
export async function runLiveFirestoreOwnerIsolationTest(
  credentials: LiveFirestoreTestCredentials,
): Promise<{ ownerRead: boolean; otherAccountDenied: boolean; cleanupVerified: boolean }> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    throw new Error('Live Firestore verification is available only in a non-emulator browser test.');
  }

  const project = getFirebaseProjectInfo();
  if (project.projectId !== LIVE_PROJECT_ID || project.firestoreDatabaseId !== LIVE_DATABASE_ID) {
    throw new Error('Live Firestore test stopped because the configured project or database did not match the approved target.');
  }

  const docId = `live-test-${crypto.randomUUID()}`;
  const ref = doc(db, 'assets', docId);
  let testDocumentMayExist = false;

  const signIn = async (email: string, password: string, account: 'owner' | 'second') => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        await signOut(auth);
        throw new Error(`${account} test account must be email verified.`);
      }
      return result.user.uid;
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('test account must be email verified.')) {
        throw error;
      }
      throw new Error(`${account} test account sign-in failed.`);
    }
  };

  const cleanup = async (): Promise<boolean> => {
    if (!testDocumentMayExist) return true;
    try {
      if (auth.currentUser) await signOut(auth);
      await signIn(credentials.ownerEmail, credentials.ownerPassword, 'owner');
      await deleteDoc(ref);
      testDocumentMayExist = false;
      const afterCleanup = await getDocFromServer(ref);
      return !afterCleanup.exists();
    } catch {
      return false;
    } finally {
      if (auth.currentUser) await signOut(auth).catch(() => undefined);
    }
  };

  try {
    const ownerUid = await signIn(credentials.ownerEmail, credentials.ownerPassword, 'owner');
    testDocumentMayExist = true;
    await setDoc(ref, {
      id: docId,
      ownerId: ownerUid,
      name: 'Disposable live Firestore integration fixture',
      siteType: 'residential',
      locationLabel: 'Automated test fixture',
      capacityKw: 1,
      status: 'nominal',
      inverterModel: 'Test fixture model',
      inverterSerial: 'LIVE-TEST-ONLY',
      panelCount: 1,
      isDemo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const ownerReadback = await getDocFromServer(ref);
    if (!ownerReadback.exists() || ownerReadback.data().ownerId !== ownerUid) {
      throw new Error('The owner account could not read back its own live test asset.');
    }

    await signOut(auth);
    const secondUid = await signIn(credentials.secondEmail, credentials.secondPassword, 'second');
    if (secondUid === ownerUid) {
      throw new Error('Owner-isolation test accounts must be two distinct Firebase users.');
    }

    let otherAccountDenied = false;
    try {
      await getDocFromServer(ref);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const code = String(error.code);
        otherAccountDenied = code === 'permission-denied' || code.endsWith('/permission-denied');
      }
    }
    if (!otherAccountDenied) {
      throw new Error('A second verified account was not denied access to the owner-only test asset.');
    }

    await signOut(auth);
    const cleanupVerified = await cleanup();
    if (!cleanupVerified) {
      throw new Error('The live Firestore test asset cleanup could not be verified.');
    }

    return { ownerRead: true, otherAccountDenied, cleanupVerified };
  } finally {
    if (testDocumentMayExist) await cleanup();
    if (auth.currentUser) await signOut(auth).catch(() => undefined);
  }
}
