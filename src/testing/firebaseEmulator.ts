import {
  applyActionCode,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

/**
 * Create a disposable, email-verified Firebase Auth Emulator user for browser E2E tests.
 * This helper is disabled unless Vite development mode and the Auth/Firestore emulator
 * switch are both active. It never performs requests against a production project.
 */
export async function createVerifiedEmulatorUser(): Promise<User> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
    throw new Error('Test user creation is available only with the local Firebase Emulator Suite.');
  }

  const email = `playwright-${crypto.randomUUID()}@example.test`;
  const password = 'Emulator-Test-Password-123!';
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Use the Auth Emulator's real email-verification flow so the browser SDK
  // updates its User state exactly as a verified account would in production.
  await sendEmailVerification(credential.user);

  const projectId =
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() || 'demo-sunfix-field';
  const codesResponse = await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${encodeURIComponent(projectId)}/oobCodes`,
  );
  if (!codesResponse.ok) {
    throw new Error(`Auth Emulator did not expose verification codes (HTTP ${codesResponse.status}).`);
  }

  const codesPayload = (await codesResponse.json()) as {
    oobCodes?: Array<{ email?: string; requestType?: string; oobCode?: string }>;
  };
  const verificationCode = codesPayload.oobCodes?.find(
    (code) => code.email === email && code.requestType === 'VERIFY_EMAIL' && code.oobCode,
  )?.oobCode;

  if (!verificationCode) {
    throw new Error('Auth Emulator did not return the test user verification code.');
  }

  await applyActionCode(auth, verificationCode);
  await credential.user.reload();

  const verifiedUser = auth.currentUser;
  if (!verifiedUser?.emailVerified || verifiedUser.uid !== credential.user.uid) {
    throw new Error('Firebase Auth Emulator did not return the expected verified test user.');
  }

  return verifiedUser;
}
