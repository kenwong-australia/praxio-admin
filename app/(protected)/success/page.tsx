'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    
    // Check if auth state is already available (fast path)
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setLoading(false);
      return;
    }

    // Otherwise wait for auth state to be restored from localStorage
    const unsub = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (!user) {
        // If no user after waiting, redirect to signin
        router.replace('/signin?redirect=/success');
        return;
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // Show success notification and auto-redirect after user is loaded
  useEffect(() => {
    if (!loading && user && !redirecting) {
      // Show success toast
      toast.success('Subscription Successful!', {
        description: 'Your account has been activated. Redirecting to Praxio...',
        duration: 3000,
      });

      // Auto-redirect after 2 seconds
      setRedirecting(true);
      const redirectTimer = setTimeout(() => {
        router.push('/praxio');
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [loading, user, redirecting, router]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Subscription Successful!</h1>
            <p className="text-muted-foreground">
              Thank you for subscribing to Praxio AI. Your account has been activated.
            </p>
            {redirecting && (
              <p className="text-sm text-blue-600 font-medium">
                Redirecting to Praxio...
              </p>
            )}
          </div>

          <div className="pt-4">
            <Button
              onClick={() => router.push('/praxio')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={redirecting}
            >
              {redirecting ? 'Redirecting...' : 'Continue to Praxio'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            You can now access all features of Praxio AI Tax Assistant.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

