'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Search, 
  Mail, 
  Shield,
  Zap,
  ArrowRight,
  X
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PricingPageProps {
  trialEndDate?: Date;
  onSubscribe?: (plan: 'monthly' | 'yearly') => void;
  onMaybeLater?: () => void;
}

export function PricingPage({ 
  trialEndDate, 
  onSubscribe, 
  onMaybeLater 
}: PricingPageProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const monthlyPrice = 79;
  const yearlyPrice = 869;
  const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2);
  const savingsPercent = (((monthlyPrice * 12) - yearlyPrice) / (monthlyPrice * 12) * 100).toFixed(1);

  const features = [
    { icon: Sparkles, text: 'Unlimited tax scenarios' },
    { icon: FileText, text: 'Legislative and ATO citations' },
    { icon: Search, text: 'Full search history' },
    { icon: Zap, text: 'AI powered client summary advice drafts' },
    { icon: Mail, text: 'Email support' },
  ];

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      if (onSubscribe) {
        await onSubscribe(selectedPlan);
      } else {
        // Default behavior - redirect to checkout
        toast.info(`Redirecting to checkout for ${selectedPlan} plan...`);
        // In real implementation, redirect to Stripe checkout
      }
    } catch (error) {
      toast.error('Failed to start subscription process');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      toast.info('Logging you out now. You can log back in anytime to subscribe.', {
        duration: 3500,
      });
      // Small delay so the toast renders before redirecting
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const auth = getFirebaseAuth();
      await signOut(auth);
      router.replace('/signin');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getTrialMessage = () => {
    if (!trialEndDate) {
      return "Your 7-day trial has ended";
    }
    const now = new Date();
    const end = new Date(trialEndDate);
    const diffMs = end.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMs <= 0) {
      return "Your 7-day trial has ended";
    } else if (diffHours < 24) {
      return `Your trial ends in ${diffHours} hours`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Your trial ends in ${diffDays} days`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-4">
          {/* Trial Expiration Banner */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <Shield className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">
              {getTrialMessage()}
            </p>
          </div>
          
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Select a plan to continue using Praxio AI Tax Assistant
          </p>
        </div>

        {/* Plan Selection Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Monthly Plan */}
          <Card 
            className={`cursor-pointer transition-all ${
              selectedPlan === 'monthly' 
                ? 'ring-2 ring-blue-600 shadow-lg scale-105' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Monthly</h3>
                  {selectedPlan === 'monthly' && (
                    <Badge className="bg-blue-600">Selected</Badge>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Billed monthly
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card 
            className={`cursor-pointer transition-all relative ${
              selectedPlan === 'yearly' 
                ? 'ring-2 ring-green-600 shadow-lg scale-105' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <div className="absolute -top-3 right-4">
              <Badge className="bg-green-600 text-white">
                Save {savingsPercent}%
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Yearly</h3>
                    <Badge variant="outline" className="text-xs">
                      Most Popular
                    </Badge>
                  </div>
                  {selectedPlan === 'yearly' && (
                    <Badge className="bg-green-600">Selected</Badge>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${yearlyPrice}</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${yearlyMonthlyEquivalent}/month billed annually
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Save ${(monthlyPrice * 12) - yearlyPrice} per year
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">What's Included</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trust Elements */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Secure payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Email support</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isLoading ? (
              'Processing...'
            ) : (
              <>
                Subscribe to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          
          <div className="flex justify-center">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full max-w-xs"
            >
              Maybe Later
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          <br />
          Your subscription will automatically renew unless cancelled.
        </p>
      </div>
    </div>
  );
}

