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
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="rounded-2xl bg-card text-card-foreground p-6 shadow max-w-md text-center border border-border">
        <h1 className="text-lg font-semibold mb-2">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          This area is for <b>admins</b> only. You'll be signed out now.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const variant = process.env.NEXT_PUBLIC_APP_VARIANT === 'user' ? 'user' : 'admin';
  // Temporary kill-switch: gate to admins only unless explicitly disabled.
  // For the user variant, always disable the admin-only gate.
  const ADMIN_ONLY_GATE =
    variant === 'admin'
      ? process.env.NEXT_PUBLIC_ADMIN_ONLY_GATE !== 'false'
      : false;

  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [smallScreenOverride, setSmallScreenOverride] = useState(false);
  const [denyReason, setDenyReason] = useState<'not_admin' | 'admin_only'>('not_admin');

  const [phase, setPhase] = useState<
    'auth-loading' | 'role-loading' | 'trial-check' | 'in' | 'not-admin' | 'out' | 'trial-expired'
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

      // Authenticated → check role and trial status in Firestore
      setPhase('role-loading');
      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'users', user.uid));
        
        if (!snap.exists()) {
          setPhase('out');
          router.replace('/signin');
          return;
        }

        const data = snap.data() as any;
        const role = data?.role;
        const subscriptionStatus = data?.stripe_subscription_status;
        
        // Convert Firestore timestamps to Date objects
        // Handles both Firestore Timestamp objects and native Date objects
        const toDateSafe = (v: any) => {
          if (!v) return undefined;
          if (v instanceof Date) return v;
          if (typeof v?.toDate === 'function') return v.toDate();
          return undefined;
        };
        
        const trialEndDate = toDateSafe(data?.stripe_trial_end_date);
        const renewalDate = toDateSafe(data?.stripe_plan_renewal_date);
        const now = new Date();

        // Check if user is admin
        if (role === 'admin') {
          setPhase('in');
          return;
        }

        // Temporary gate: block non-admins entirely
        if (ADMIN_ONLY_GATE) {
          setDenyReason('admin_only');
          setPhase('not-admin');
          return;
        }

        // For non-admin users, check trial/subscription status
        // Redirect to pricing if subscription is not active AND:
        // - Trial has expired (trial_end_date < now), OR
        // - Renewal date has passed (renewal_date < now), OR  
        // - Both dates are missing (user needs to subscribe)
        const isNotActive = subscriptionStatus !== 'active';
        const trialExpired = trialEndDate && trialEndDate < now;
        const renewalExpired = renewalDate && renewalDate < now;
        const datesMissing = !trialEndDate && !renewalDate;
        // Redirect if subscription is inactive AND (dates expired OR dates are missing)
        const shouldRedirectToPricing = isNotActive && (trialExpired || renewalExpired || datesMissing);

        // Don't redirect if already on pricing or success page
        if (shouldRedirectToPricing && pathname !== '/pricing' && pathname !== '/success') {
          setPhase('trial-expired');
          router.replace('/pricing');
          return;
        }

        // User is not admin but trial is still active or subscription is active
        setPhase('in');
      } catch (error) {
        console.error('Error checking user status:', error);
        // If check fails, treat as not-admin for safety
        setDenyReason('not_admin');
        setPhase('not-admin');
      }
    });

    return () => unsub();
  }, [pathname, router]);

  if (phase === 'auth-loading' || phase === 'role-loading' || phase === 'trial-check') {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Loading…</div>;
  }

  if (phase === 'trial-expired') {
    // Brief placeholder while redirect occurs
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Redirecting to pricing…</div>;
  }

  if (phase === 'not-admin') {
    return (
      <NotAuthorized
        onDone={async () => {
          await signOut(getFirebaseAuth());
          router.replace(`/signin?reason=${denyReason}`);
        }}
      />
    );
  }

  if (phase === 'out') {
    // brief placeholder while redirect occurs
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Redirecting…</div>;
  }

  // phase === 'in'
  const isSmallScreen = viewportWidth !== null && viewportWidth < 1024;

  if (isSmallScreen && !smallScreenOverride) {
    // Small-screen notice with explicit primary / secondary actions.
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
        <div className="max-w-md w-full rounded-2xl bg-card text-card-foreground p-6 shadow border border-border">
          <h1 className="text-lg font-semibold mb-2">Praxio AI Admin works best on a larger screen</h1>
          <p className="text-sm text-muted-foreground mb-4">
            For readability and safety, the admin experience is designed for laptops and desktop monitors
            (1280px wide or more). You can switch devices or continue on this one if needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setSmallScreenOverride(true)}
            >
              Continue on this device
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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

  // Pricing and success pages should render full-screen without sidebar
  const isFullPage = pathname === '/pricing' || pathname === '/success';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isFullPage ? (
        // Full-page layout (no sidebar)
        <>{children}</>
      ) : (
        // Standard layout with sidebar for other pages
        <div className="app-shell">
          <div className="flex">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}