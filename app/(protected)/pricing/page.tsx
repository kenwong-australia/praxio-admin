'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebaseAuth, getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PricingPage } from '@/components/PricingPage';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserData {
  uid: string;
  email: string;
  business_name?: string;
  role?: string;
  stripe_subscription_status?: string;
  stripe_trial_end_date?: Date;
  stripe_plan_renewal_date?: Date;
  stripe_cust_id?: string;
}

export default function PricingPageRoute() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle cancel query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === 'true') {
      toast.error('Checkout was canceled. Please try again when you\'re ready.');
      // Clean up URL
      router.replace('/pricing');
    }
  }, [router]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (!user) {
        router.replace('/signin');
        return;
      }

      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'users', user.uid));
        
        if (!snap.exists()) {
          toast.error('User data not found');
          router.replace('/signin');
          return;
        }

        const data = snap.data();
        const toDateSafe = (v: any) => {
          if (!v) return undefined;
          if (v instanceof Date) return v;
          if (typeof v?.toDate === 'function') return v.toDate();
          return undefined;
        };

        const userData: UserData = {
          uid: user.uid,
          email: data?.email || user.email || '',
          business_name: data?.business_name,
          role: data?.role,
          stripe_subscription_status: data?.stripe_subscription_status,
          stripe_trial_end_date: toDateSafe(data?.stripe_trial_end_date),
          stripe_plan_renewal_date: toDateSafe(data?.stripe_plan_renewal_date),
          stripe_cust_id: data?.stripe_cust_id,
        };

        setUserData(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!userData) {
      toast.error('User data not loaded');
      return;
    }

    try {
      // Step 1: Ensure Stripe customer exists
      let customerId = userData.stripe_cust_id;

      if (!customerId) {
        toast.loading('Setting up your account...', { id: 'creating-customer' });
        
        const response = await fetch('/api/stripe/create-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: userData.uid,
            email: userData.email,
          }),
        });

        const result = await response.json();
        toast.dismiss('creating-customer');

        if (!result.success) {
          toast.error(result.error || 'Failed to create customer');
          return;
        }

        customerId = result.customerId;
        toast.success('Account setup complete');
      }

      // Step 2: Map plan to Stripe price ID
      const priceIds = {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || 'price_1RsO7VEVF5RQT3bLHRrXnlaX',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || 'price_1RsO7MEVF5RQT3bLWZJYtZye',
      };

      const priceId = priceIds[plan];

      // Step 3: Create checkout session
      toast.loading('Redirecting to checkout...', { id: 'checkout' });

      const baseUrl = window.location.origin;
      const checkoutResponse = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          price: priceId,
          successUrl: `${baseUrl}/success`,
          cancelUrl: `${baseUrl}/pricing?canceled=true`,
        }),
      });

      const checkoutResult = await checkoutResponse.json();
      toast.dismiss('checkout');

      if (!checkoutResult.success) {
        toast.error(checkoutResult.error || 'Failed to create checkout session');
        return;
      }

      // Step 4: Redirect to Stripe checkout
      if (checkoutResult.url) {
        window.location.href = checkoutResult.url;
      } else {
        toast.error('Checkout URL not received');
      }

    } catch (error) {
      console.error('Error in subscription flow:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleMaybeLater = () => {
    // Allow user to go back, but they'll be redirected again on next page load
    // if trial is still expired
    router.push('/praxio');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine which date to show (trial end or renewal date)
  const relevantDate = userData?.stripe_trial_end_date || userData?.stripe_plan_renewal_date;

  return (
    <PricingPage
      trialEndDate={relevantDate}
      onSubscribe={handleSubscribe}
      onMaybeLater={handleMaybeLater}
    />
  );
}

