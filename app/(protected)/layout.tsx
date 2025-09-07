'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setStatus('in');
      } else {
        setStatus('out');
        const q = new URLSearchParams({ redirect: pathname ?? '/admin' });
        router.replace(`/signin?${q.toString()}`);
      }
    });
    return () => unsub();
  }, [pathname, router]);

  if (status === 'loading' || status === 'out') {
    return (
      <div className="min-h-screen grid place-items-center">
        <div>Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}