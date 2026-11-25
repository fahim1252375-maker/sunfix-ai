import { createUserWithEmailAndPassword, type User } from 'firebase/auth';
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
  const idToken = await credential.user.getIdToken();
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() || 'demo-api-key';

  const response = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, emailVerified: true, returnSecureToken: true }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firebase Auth Emulator could not verify the test user (HTTP ${response.status}).`);
  }

  await credential.user.reload();
  const verifiedUser = auth.currentUser;
  if (!verifiedUser?.emailVerified || verifiedUser.uid !== credential.user.uid) {
    throw new Error('Firebase Auth Emulator did not return the expected verified test user.');
  }

  return verifiedUser;
}
