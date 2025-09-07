'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth, getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Sidebar } from '@/components/Sidebar';

// Optional: small screen shown to non-admins
function NotAuthorized({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200); // auto sign-out after ~2s
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-100">
      <div className="rounded-2xl bg-white p-6 shadow max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Access restricted</h1>
        <p className="text-sm text-neutral-600">
          This area is for <b>admins</b> only. You'll be signed out now.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<
    'auth-loading' | 'role-loading' | 'in' | 'not-admin' | 'out'
  >('auth-loading');

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setPhase('out');
        const q = new URLSearchParams({ redirect: pathname ?? '/admin' });
        router.replace(`/signin?${q.toString()}`);
        return;
      }

      // Authenticated → check role in Firestore
      setPhase('role-loading');
      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? (snap.data() as any).role : undefined;

        if (role === 'admin') {
          setPhase('in');
        } else {
          setPhase('not-admin');
        }
      } catch {
        // If role check fails, treat as not-admin for safety
        setPhase('not-admin');
      }
    });

    return () => unsub();
  }, [pathname, router]);

  if (phase === 'auth-loading' || phase === 'role-loading') {
    return <div className="min-h-screen grid place-items-center bg-neutral-100">Loading…</div>;
  }

  if (phase === 'not-admin') {
    return (
      <NotAuthorized
        onDone={async () => {
          await signOut(getFirebaseAuth());
          router.replace('/signin?reason=not_admin');
        }}
      />
    );
  }

  if (phase === 'out') {
    // brief placeholder while redirect occurs
    return <div className="min-h-screen grid place-items-center bg-neutral-100">Redirecting…</div>;
  }

  // phase === 'in'
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}