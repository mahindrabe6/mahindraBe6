import { FormEvent, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
} from 'firebase/auth';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  formatAccountIdentifier,
  validatePasswordChange,
} from '../lib/investmentEngine';

interface PasswordSecurityCardProps {
  isAdminMode?: boolean;
}

function mapPasswordError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Current password is incorrect. Please check and try again.';
    case 'auth/weak-password':
      return 'New password is too weak. Use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Enable it under Authentication > Sign-in method.';
    case 'auth/requires-recent-login':
      return 'For security, please log out and sign in again before changing your password.';
    case 'auth/provider-already-linked':
      return 'A login password is already linked to this account. Reload to update it.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return error instanceof Error
        ? error.message
        : 'Unable to update password right now.';
  }
}

export function PasswordSecurityCard({
  isAdminMode = false,
}: PasswordSecurityCardProps) {
  const user = auth.currentUser;
  const [hasPasswordProvider, setHasPasswordProvider] = useState<boolean>(() =>
    Boolean(user?.providerData.some((p) => p.providerId === 'password')),
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    setHasPasswordProvider(
      Boolean(
        auth.currentUser?.providerData.some((p) => p.providerId === 'password'),
      ),
    );
  }, [user?.uid]);

  const accountLabel =
    formatAccountIdentifier('', user?.email) || 'Authenticated Account';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const activeUser = auth.currentUser;
    if (!activeUser || !activeUser.email) {
      setStatus({
        ok: false,
        text: 'Session missing an email/phone credential. Please sign in again.',
      });
      return;
    }

    const validation = validatePasswordChange(
      currentPassword,
      newPassword,
      confirmPassword,
      hasPasswordProvider,
    );
    if (!validation.valid) {
      setStatus({
        ok: false,
        text: validation.error ?? 'Invalid password input.',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (hasPasswordProvider) {
        const cred = EmailAuthProvider.credential(
          activeUser.email,
          currentPassword,
        );
        await reauthenticateWithCredential(activeUser, cred);
        await updatePassword(activeUser, newPassword);
        setStatus({
          ok: true,
          text: 'Password updated. Use your new password on future logins.',
        });
      } else {
        const cred = EmailAuthProvider.credential(activeUser.email, newPassword);
        try {
          await linkWithCredential(activeUser, cred);
        } catch (linkError) {
          if (
            (linkError as { code?: string })?.code ===
            'auth/requires-recent-login'
          ) {
            await reauthenticateWithPopup(activeUser, googleProvider);
            await linkWithCredential(activeUser, cred);
          } else {
            throw linkError;
          }
        }
        setHasPasswordProvider(true);
        setStatus({
          ok: true,
          text: isAdminMode
            ? `Admin login password set for ${accountLabel}. You can now sign in via Email & Password on the Login page.`
            : `Login password set for ${accountLabel}. You can now sign in using your password on the Login page.`,
        });
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus({ ok: false, text: mapPasswordError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E8EE] dark:border-white/[0.08] p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#F1F3F6] dark:bg-[#192234] text-[#B86B28] dark:text-[#E08E45] flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              {hasPasswordProvider
                ? 'Change Login Password'
                : 'Set Login Password'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              {hasPasswordProvider
                ? `Update the password for ${accountLabel}.`
                : isAdminMode
                  ? `You signed in via Google (${accountLabel}). Set a password here so you can also sign into Admin Console directly from the Email/Password login form.`
                  : `You signed in via Google (${accountLabel}). Set a password to enable Email & Password login too.`}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-lg bg-[#F6F7FA] dark:bg-[#192234] text-[11px] font-semibold text-[#0F172A] dark:text-[#E2E8F0] inline-flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            {hasPasswordProvider ? 'Password Active' : 'Google Linked Only'}
          </span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {hasPasswordProvider && (
          <div>
            <label
              htmlFor="pwd-current-input"
              className="block text-xs font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1"
            >
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pwd-current-input"
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setStatus(null);
                }}
                placeholder="Enter current password"
                className="w-full min-h-[44px] pl-10 pr-11 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                {showPasswords ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="pwd-new-input"
              className="block text-xs font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pwd-new-input"
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setStatus(null);
                }}
                placeholder="Min 6 characters"
                className="w-full min-h-[44px] pl-10 pr-10 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
              />
              {!hasPasswordProvider && (
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                  className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  {showPasswords ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="pwd-confirm-input"
              className="block text-xs font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pwd-confirm-input"
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setStatus(null);
                }}
                placeholder="Repeat new password"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[#E6E8EE] dark:border-white/[0.1] bg-[#F8FAFC] dark:bg-[#090D16] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B86B28]"
              />
            </div>
          </div>
        </div>

        {status && (
          <div
            role={status.ok ? 'status' : 'alert'}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              status.ok
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{status.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#E08E45] dark:hover:bg-[#EA9B54] text-white dark:text-[#090D16] text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>
            {submitting
              ? 'Updating Password...'
              : hasPasswordProvider
                ? 'Update Password'
                : 'Set Login Password'}
          </span>
        </button>
      </form>
    </section>
  );
}
