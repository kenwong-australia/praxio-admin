'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth, getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';

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

  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [smallScreenOverride, setSmallScreenOverride] = useState(false);

  const [phase, setPhase] = useState<
    'auth-loading' | 'role-loading' | 'in' | 'not-admin' | 'out'
  >('auth-loading');

  useEffect(() => {
    // Track viewport width on client to adjust layout / gating UX
    const updateWidth = () => {
      if (typeof window !== 'undefined') {
        setViewportWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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
  const isSmallScreen = viewportWidth !== null && viewportWidth < 1024;

  if (isSmallScreen && !smallScreenOverride) {
    // Small-screen notice with explicit primary / secondary actions.
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-100 px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold mb-2">Praxio AI Admin works best on a larger screen</h1>
          <p className="text-sm text-neutral-600 mb-4">
            For readability and safety, the admin experience is designed for laptops and desktop monitors
            (1280px wide or more). You can switch devices or continue on this one if needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
              onClick={() => setSmallScreenOverride(true)}
            >
              Continue on this device
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
              onClick={async () => {
                await signOut(getFirebaseAuth());
                const q = new URLSearchParams({ reason: 'small_screen' });
                router.replace(`/signin?${q.toString()}`);
              }}
            >
              Sign out &amp; switch device
            </button>
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="app-shell">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}