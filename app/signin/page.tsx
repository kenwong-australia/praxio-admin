'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

function friendlyError(code: string) {
  switch (code) {
    case 'auth/invalid-email':   return 'That email looks invalid. Please check and try again.';
    case 'auth/user-disabled':   return 'This account is disabled. Contact your administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':  return 'Email or password is incorrect. Please try again.';
    default:                     return 'Sign-in failed. Please try again.';
  }
}

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(redirectTo);
    } catch (err: any) {
      setError(friendlyError(err?.code || ''));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold mb-4">Admin sign in</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-2 text-white disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-3 text-xs text-neutral-500">
          Don't have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
}