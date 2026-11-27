import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import { TOKENS } from '../theme/tokens';
import {
  createEmailAccount,
  sendAccountPasswordReset,
  signInWithEmailAccount,
  signInWithGoogle,
} from '../services/firebase';

type AccountMode = 'sign-in' | 'sign-up' | 'reset';

interface AccountDialogProps {
  open: boolean;
  initialMode: 'sign-in' | 'sign-up';
  onClose: () => void;
  onAuthenticated: () => void;
}

function describeAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email and password accounts are not enabled yet. Enable Email/Password in Firebase Authentication settings, then try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Sign in instead or reset your password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect. Check your details and try again.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts were made. Please wait a little before trying again.';
    case 'auth/network-request-failed':
      return 'SunFix could not reach the account service. Check your internet connection and try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this website and try again.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before authentication finished.';
    case 'auth/unauthorized-domain':
      return 'This website is not authorised for Google sign-in yet. Contact the site administrator.';
    default:
      return error instanceof Error ? error.message : 'We could not complete this account request. Please try again.';
  }
}

export const AccountDialog: React.FC<AccountDialogProps> = ({
  open,
  initialMode,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setNotice(null);
    setPassword('');
  }, [open, initialMode]);

  if (!open) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'reset') {
        await sendAccountPasswordReset(email);
        setNotice('Password reset instructions have been sent when an account exists for this email.');
        setMode('sign-in');
      } else if (mode === 'sign-up') {
        await createEmailAccount(name, email, password);
        onAuthenticated();
      } else {
        await signInWithEmailAccount(email, password);
        onAuthenticated();
      }
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'sign-up'
    ? 'Create your account'
    : mode === 'reset'
      ? 'Reset your password'
      : 'Welcome back';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: 'rgba(3, 9, 7, 0.82)', backdropFilter: 'blur(12px)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sunfix-account-title"
        className="relative my-auto w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl"
        style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close account dialog"
          className="absolute right-4 top-4 rounded-lg p-2 transition-colors disabled:opacity-50"
          style={{ color: TOKENS.sage }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-7 space-y-2 pr-8">
          <div className="font-display text-xl tracking-tight">
            SunFix <em className="italic" style={{ color: TOKENS.brass }}>Field</em>
          </div>
          <h2 id="sunfix-account-title" className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
            {mode === 'sign-up'
              ? 'Create a secure account to keep your solar operations workspace associated with you.'
              : mode === 'reset'
                ? 'Enter your account email and we will send password reset instructions.'
                : 'Sign in to continue to your solar operations workspace.'}
          </p>
        </div>

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={continueWithGoogle}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#F8FAFC', borderColor: '#D8DEE8', color: '#17212B' }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-bold text-base" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest" style={{ color: TOKENS.sage }}>
              <span className="h-px flex-1" style={{ backgroundColor: TOKENS.hairlineStrong }} />
              or continue with email
              <span className="h-px flex-1" style={{ backgroundColor: TOKENS.hairlineStrong }} />
            </div>
          </>
        )}

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'sign-up' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium" style={{ color: TOKENS.sage }}>Full name</span>
              <input
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="min-h-12 w-full rounded-xl border px-3.5 text-sm outline-none"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium" style={{ color: TOKENS.sage }}>Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border px-3.5 text-sm outline-none"
              style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
            />
          </label>

          {mode !== 'reset' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium" style={{ color: TOKENS.sage }}>Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'sign-up' ? 8 : 1}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Enter your password'}
                  className="min-h-12 w-full rounded-xl border px-3.5 pr-12 text-sm outline-none"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  style={{ color: TOKENS.sage }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-lg border p-3 text-xs leading-relaxed"
              style={{ color: TOKENS.terracotta, borderColor: TOKENS.terracotta, backgroundColor: TOKENS.ink }}>
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg border p-3 text-xs leading-relaxed"
              style={{ color: TOKENS.mint, borderColor: TOKENS.hairlineStrong, backgroundColor: TOKENS.ink }}>
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-3 text-xs" style={{ color: TOKENS.sage }}>
          {mode === 'sign-in' && (
            <button type="button" onClick={() => { setMode('reset'); setError(null); setNotice(null); }}
              className="font-medium hover:underline" style={{ color: TOKENS.brass }}>
              Forgot password?
            </button>
          )}
          {mode === 'reset' ? (
            <button type="button" onClick={() => { setMode('sign-in'); setError(null); setNotice(null); }}
              className="hover:underline">Back to sign in</button>
          ) : mode === 'sign-in' ? (
            <p>
              New to SunFix?{' '}
              <button type="button" onClick={() => { setMode('sign-up'); setError(null); setNotice(null); }}
                className="font-semibold hover:underline" style={{ color: TOKENS.brass }}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button type="button" onClick={() => { setMode('sign-in'); setError(null); setNotice(null); }}
                className="font-semibold hover:underline" style={{ color: TOKENS.brass }}>
                Sign in
              </button>
            </p>
          )}
          <p className="text-center text-[11px] leading-relaxed" style={{ color: TOKENS.sage }}>
            By continuing, you agree to use SunFix responsibly. Account access does not certify solar equipment as safe.
          </p>
        </div>
      </section>
    </div>
  );
};
