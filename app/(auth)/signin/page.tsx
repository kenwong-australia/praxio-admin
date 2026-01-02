'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function friendlyError(code: string) {
  switch (code) {
    case 'auth/invalid-email':   return 'That email looks invalid. Please check and try again.';
    case 'auth/user-disabled':   return 'This account is disabled. Contact your administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':  return 'Email or password is incorrect. Please try again.';
    default:                     return 'Sign-in failed. Please try again.';
  }
}

function friendlyResetError(code: string) {
  switch (code) {
    case 'auth/invalid-email':  return 'That email looks invalid. Please double-check.';
    case 'auth/user-not-found': return 'No account found for that email.';
    default:                    return 'Could not send reset email. Please try again.';
  }
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/admin';
  const reason = params.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // 🟢 Always clear fields when arriving on /signin
  useEffect(() => {
    setEmail('');
    setPassword('');
    setResetMessage(null);
  }, [reason]); 
  // reason in deps ensures it also clears after redirects like ?reason=not_admin

  // Keep reset dialog email in sync when opening
  useEffect(() => {
    if (resetDialogOpen) {
      setResetEmail(email.trim());
      setResetMessage(null);
    }
  }, [resetDialogOpen, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Exchange the ID token for a session cookie (server-side auth)
      const idToken = await auth.currentUser?.getIdToken(true);
      if (idToken) {
        const resp = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!resp.ok) {
          throw new Error('Session setup failed');
        }
      }

      router.replace(redirectTo);
    } catch (err: any) {
      setError(friendlyError(err?.code || ''));
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (resetLoading) return;
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      setResetMessage({ type: 'error', text: 'Enter your email to receive a reset link.' });
      return;
    }

    setResetMessage(null);
    setResetLoading(true);
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetMessage({ type: 'success', text: 'If this account exists, a reset link is on its way.' });
    } catch (err: any) {
      setResetMessage({ type: 'error', text: friendlyResetError(err?.code || '') });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="/Praxio Logo clean-12 (logo only).png"
            alt="Praxio AI"
            width={24}
            height={24}
            priority
          />
          <span className="text-sm font-medium text-neutral-700">Praxio AI</span>
        </div>
        {reason === 'admin_only' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              We&apos;re temporarily limiting access to admin accounts only. Please sign in with an admin email or
              contact your Praxio admin.
            </p>
          </div>
        )}

        {reason === 'not_admin' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Your account isn't authorized for admin access. Try another account or contact your administrator.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#2563EB]"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#2563EB]"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-[#2563EB] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2 text-white disabled:opacity-60 hover:bg-[#1D4ED8] transition-colors"
            style={{ backgroundColor: '#2563EB' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Enter the email for your account. If it exists, we&apos;ll send a password reset link.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm">Email</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#2563EB]"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              {resetMessage && (
                <p
                  className={`text-xs ${resetMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
                  aria-live="polite"
                >
                  {resetMessage.text}
                </p>
              )}
            </div>

            <DialogFooter className="sm:justify-between sm:space-x-2">
              <button
                type="button"
                onClick={() => setResetDialogOpen(false)}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onResetPassword}
                disabled={resetLoading}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="mt-3 text-xs text-center text-neutral-500">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}