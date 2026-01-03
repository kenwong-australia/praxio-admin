'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  CreditCard, 
  Moon, 
  Sun, 
  HelpCircle, 
  FileText, 
  Shield, 
  Trash2,
  ChevronRight,
  Copy,
  CheckCircle2,
  Clock,
  Building2,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification, reload } from 'firebase/auth';
import { getFirebaseAuth, getDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';

const INACTIVITY_TIMEOUT_STORAGE_KEY = 'inactivity_timeout_hours';
const BUTTON_TEXT_PREF_KEY = 'praxio_show_button_text';
const DEFAULT_TIMEOUT_HOURS = 2;

const parseThemeLight = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

interface UserData {
  display_name: string;
  email: string;
  business_name?: string;
  stripe_cust_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status?: string;
  stripe_plan_renewal_date?: Date;
  selected_plan?: string;
  selected_frequency?: string;
  stripe_trial_end_date?: Date;
  email_verified?: boolean;
  show_icons?: boolean;
  theme_light?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState<number>(DEFAULT_TIMEOUT_HOURS);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionCancelOpen, setSubscriptionCancelOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showButtonTextPref, setShowButtonTextPref] = useState(true);
  const [buttonPrefSaving, setButtonPrefSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  // Fetch user data from Firebase
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (!user) {
        router.replace('/signin');
        return;
      }

      try {
        await reload(user);
        setAuthUser(user);
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

        const showIconsField =
          typeof data?.show_icons === 'boolean' ? Boolean(data.show_icons) : null;
        const themeLight = parseThemeLight(data?.theme_light);
        if (typeof window !== 'undefined') {
          const storedPref = localStorage.getItem(BUTTON_TEXT_PREF_KEY);
          if (storedPref !== null) {
            setShowButtonTextPref(storedPref === 'true');
          } else if (showIconsField !== null) {
            const showTextFromIcons = !showIconsField;
            setShowButtonTextPref(showTextFromIcons);
            localStorage.setItem(BUTTON_TEXT_PREF_KEY, String(showTextFromIcons));
          } else {
            setShowButtonTextPref(true);
            localStorage.setItem(BUTTON_TEXT_PREF_KEY, 'true');
          }
        }

        const userData: UserData = {
          display_name: data?.display_name || '',
          email: data?.email || user.email || '',
          business_name: data?.business_name,
          stripe_cust_id: data?.stripe_cust_id,
          stripe_subscription_id: data?.stripe_subscription_id,
          stripe_subscription_status: data?.stripe_subscription_status,
          stripe_plan_renewal_date: toDateSafe(data?.stripe_plan_renewal_date),
          selected_plan: data?.selected_plan,
          selected_frequency: data?.selected_frequency,
          stripe_trial_end_date: toDateSafe(data?.stripe_trial_end_date),
          email_verified: Boolean(data?.email_verified),
          show_icons: showIconsField ?? undefined,
          theme_light: themeLight,
        };

        if (themeLight !== undefined) {
          setTheme(themeLight ? 'light' : 'dark');
          setIsDarkMode(!themeLight);
        }

        setUserData(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, setTheme]);

  useEffect(() => {
    if (!resolvedTheme) return;
    setIsDarkMode(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  // Sync Firestore when Auth email becomes verified
  useEffect(() => {
    const syncEmailVerified = async () => {
      if (!authUser || !userData) return;
      if (!authUser.emailVerified || userData.email_verified) return;
      try {
        const idToken = await authUser.getIdToken(true);
        const res = await fetch('/api/users/mark-email-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          console.error('mark-email-verified failed', json);
          return;
        }
        setUserData(prev => (prev ? { ...prev, email_verified: true } : prev));
      } catch (error) {
        console.error('mark-email-verified error', error);
      }
    };
    syncEmailVerified();
  }, [authUser, userData]);

  const handleResendVerification = async () => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      toast.error('No signed-in user found.');
      return;
    }
    try {
      setResendLoading(true);
      await reload(user);
      if (user.emailVerified) {
        toast.success('Email already verified', {
          description: 'Thanks for confirming your email.',
        });
        setUserData(prev => (prev ? { ...prev, email_verified: true } : prev));
        return;
      }
      await sendEmailVerification(user);
      toast.success('Verification email sent', {
        description: 'Check your inbox to verify your email.',
      });
    } catch (error) {
      console.error('Resend verification error', error);
      toast.error('Unable to send verification email');
    } finally {
      setResendLoading(false);
    }
  };

  // Load timeout preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const buttonPref = localStorage.getItem(BUTTON_TEXT_PREF_KEY);
      if (buttonPref !== null) {
        setShowButtonTextPref(buttonPref === 'true');
      }

      const stored = localStorage.getItem(INACTIVITY_TIMEOUT_STORAGE_KEY);
      if (stored) {
        const hours = parseFloat(stored);
        if (!isNaN(hours) && hours > 0) {
          setTimeoutHours(hours);
        }
      }
    }
  }, []);

  const handleTimeoutChange = (value: string) => {
    const hours = parseFloat(value);
    if (!isNaN(hours) && hours > 0 && hours <= 24) {
      setTimeoutHours(hours);
      localStorage.setItem(INACTIVITY_TIMEOUT_STORAGE_KEY, hours.toString());
      // Dispatch custom event to notify other tabs/components
      window.dispatchEvent(new Event('timeoutPreferenceChanged'));
      toast.success('Inactivity timeout updated', {
        description: `Session will expire after ${hours} hour${hours !== 1 ? 's' : ''} of inactivity`,
        duration: 3000,
      });
    } else if (value === '') {
      // Allow empty input while typing
      setTimeoutHours(0);
    } else {
      toast.error('Invalid timeout', {
        description: 'Please enter a number between 0.5 and 24 hours',
        duration: 3000,
      });
    }
  };

  const handleButtonTextPrefChange = async (iconOnly: boolean) => {
    if (!authUser) {
      toast.error('No signed-in user found.');
      return;
    }
    const prevShowText = showButtonTextPref;
    const nextShowText = !iconOnly;
    setShowButtonTextPref(nextShowText);
    localStorage.setItem(BUTTON_TEXT_PREF_KEY, String(nextShowText));
    window.dispatchEvent(new Event('praxioButtonTextPreferenceChanged'));

    try {
      setButtonPrefSaving(true);
      const db = getDb();
      await updateDoc(doc(db, 'users', authUser.uid), { show_icons: iconOnly });
      setUserData(prev => (prev ? { ...prev, show_icons: iconOnly } : prev));
      toast.success(iconOnly ? 'Icons enabled for action buttons.' : 'Text labels enabled for action buttons.', {
        description: iconOnly
          ? 'Action buttons will use icons only.'
          : 'Action buttons will display text.',
        duration: 2500,
      });
    } catch (error) {
      console.error('Error updating button preference:', error);
      setShowButtonTextPref(prevShowText);
      localStorage.setItem(BUTTON_TEXT_PREF_KEY, String(prevShowText));
      window.dispatchEvent(new Event('praxioButtonTextPreferenceChanged'));
      toast.error('Could not update preference. Please try again.');
    } finally {
      setButtonPrefSaving(false);
    }
  };

  const handleThemeToggle = async (checked: boolean) => {
    if (!authUser) {
      toast.error('No signed-in user found.');
      return;
    }

    const nextTheme = checked ? 'dark' : 'light';
    setIsDarkMode(checked);
    setTheme(nextTheme);
    setThemeSaving(true);

    try {
      const db = getDb();
      await updateDoc(doc(db, 'users', authUser.uid), {
        theme_light: nextTheme === 'light',
      });
      setUserData(prev => (prev ? { ...prev, theme_light: nextTheme === 'light' } : prev));
      toast.success(`Switched to ${nextTheme} mode`);
    } catch (error) {
      console.error('Theme update failed', error);
      const revertTheme = checked ? 'light' : 'dark';
      setTheme(revertTheme);
      setIsDarkMode(!checked);
      toast.error('Unable to update theme preference');
    } finally {
      setThemeSaving(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@praxio-ai.com.au');
    setEmailCopied(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleDeleteAccount = () => {
    // Placeholder - will be wired up later
    toast.info('Delete account functionality will be implemented soon');
  };

  const handleSaveDisplayName = async () => {
    if (!authUser) {
      toast.error('No signed-in user found.');
      return;
    }

    const trimmed = editDisplayName.trim();
    if (!trimmed) {
      toast.error('Display name cannot be empty');
      return;
    }

    try {
      setSavingProfile(true);
      const db = getDb();
      await updateDoc(doc(db, 'users', authUser.uid), { display_name: trimmed });
      setUserData(prev => (prev ? { ...prev, display_name: trimmed } : prev));
      toast.success('Display name updated');
      setEditProfileOpen(false);
    } catch (error) {
      console.error('Error updating display name:', error);
      toast.error('Failed to update display name');
    } finally {
      setSavingProfile(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return 'outline';
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') {
      return 'default'; // green
    }
    if (statusLower === 'trialing') {
      return 'secondary'; // blue
    }
    if (statusLower === 'canceled' || statusLower === 'past_due') {
      return 'destructive'; // red
    }
    return 'outline';
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return 'N/A';
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'Active';
    if (statusLower === 'trialing') return 'Trial';
    if (statusLower === 'canceled') return 'Canceled';
    if (statusLower === 'past_due') return 'Past Due';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatSubscriptionLabel = () => {
    if (!userData) return 'N/A';
    const parts: string[] = [];
    if (userData.selected_plan) {
      parts.push(userData.selected_plan);
    }
    if (userData.selected_frequency) {
      parts.push(userData.selected_frequency);
    }
    if (userData.stripe_subscription_status) {
      parts.push(userData.stripe_subscription_status);
    }
    return parts.length > 0 ? parts.join(' • ') : 'N/A';
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    try {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const openSubscriptionModal = () => {
    if (userData?.stripe_subscription_status?.toLowerCase() === 'trialing') {
      toast.info('Subscription management is disabled during trial');
      return;
    }
    setSubscriptionDialogOpen(true);
  };

  const handleOpenBillingPortal = async () => {
    if (!userData?.stripe_cust_id) {
      toast.error('Stripe customer not found');
      return;
    }
    try {
      setPortalLoading(true);
      const baseUrl = window.location.origin;
      const response = await fetch('/api/stripe/create-billing-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userData.stripe_cust_id,
          returnUrl: `${baseUrl}/settings`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg = errorData?.error || 'Unable to open billing portal';
        toast.error(msg);
        return;
      }

      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error('Portal URL not received');
    } catch (error) {
      console.error('Billing portal error', error);
      toast.error('Unable to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!userData?.stripe_subscription_id) {
      toast.error('No active subscription found');
      return;
    }
    try {
      setCancelLoading(true);
      const response = await fetch('/api/stripe/delete-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: userData.stripe_subscription_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg = errorData?.error || 'Failed to cancel subscription';
        toast.error(msg);
        return;
      }

      const data = await response.json();
      if (!data?.success) {
        toast.error(data?.error || 'Failed to cancel subscription');
        return;
      }

      toast.success('Subscription canceled', {
        description: 'Your subscription has been canceled in Stripe.',
      });
      setSubscriptionDialogOpen(false);
      setSubscriptionCancelOpen(false);
      setUserData(prev => (prev ? { ...prev, stripe_subscription_status: 'canceled' } : prev));
    } catch (error) {
      console.error('Cancel subscription error', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-lg font-semibold">
                {getInitials(userData.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{userData.display_name || 'User'}</h2>
                <Badge variant={getStatusBadgeVariant(userData.stripe_subscription_status)} className="text-xs">
                  {getStatusLabel(userData.stripe_subscription_status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{userData.business_name || 'Company not set'}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`text-[11px] ${
                    userData.email_verified
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {userData.email_verified ? 'Email verified' : 'Email not verified'}
                </Badge>
                {!userData.email_verified && (
                  <span className="text-[11px] text-muted-foreground">
                    Check your inbox or resend below
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3"
              onClick={openSubscriptionModal}
            >
              {userData.stripe_subscription_status?.toLowerCase() === 'trialing' ? 'Upgrade' : 'Manage Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription className="text-xs">
            Manage your account information and subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => {
              setEditDisplayName(userData.display_name || '');
              setEditProfileOpen(true);
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Edit Profile</p>
                <p className="text-xs text-muted-foreground">Update your display name</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
              resendLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                <Mail className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Resend Verify Email</p>
                <p className="text-xs text-muted-foreground">Send verification email again</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={openSubscriptionModal}
            disabled={userData.stripe_subscription_status?.toLowerCase() === 'trialing'}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
              userData.stripe_subscription_status?.toLowerCase() === 'trialing'
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Subscription</p>
                <p className="text-xs text-muted-foreground">
                  {formatSubscriptionLabel()}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Subscription Modal */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Your Subscription</DialogTitle>
            <DialogDescription>
              Manage billing details or cancel your plan. You will return here after visiting Stripe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">{formatSubscriptionLabel()}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(userData.stripe_subscription_status)} className="text-xs">
                  {getStatusLabel(userData.stripe_subscription_status)}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Renews</p>
                  <p className="text-slate-900">{formatDate(userData.stripe_plan_renewal_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Trial Ends</p>
                  <p className="text-slate-900">{formatDate(userData.stripe_trial_end_date)}</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Use the buttons below to open the Stripe billing portal or cancel your subscription. Your return URL is set to this settings page.
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <AlertDialog open={subscriptionCancelOpen} onOpenChange={setSubscriptionCancelOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="text-xs h-9 px-3"
                  disabled={!userData.stripe_subscription_id || cancelLoading}
                >
                  {cancelLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your current subscription in Stripe. You will retain access through the end of the current billing period if applicable.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs h-8 px-3">Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSubscription}
                    className="bg-red-600 hover:bg-red-700 text-xs h-8 px-3"
                    disabled={cancelLoading}
                  >
                    {cancelLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-1 justify-end gap-2">
              <Button
                variant="outline"
                className="text-xs h-9 px-3"
                onClick={() => setSubscriptionDialogOpen(false)}
              >
                Back
              </Button>
              <Button
                onClick={handleOpenBillingPortal}
                disabled={portalLoading}
                className="text-xs h-9 px-3"
              >
                {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage in Stripe
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editProfileOpen}
        onOpenChange={(open) => {
          setEditProfileOpen(open);
          if (open) {
            setEditDisplayName(userData.display_name || '');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your display name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Display name</p>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter your display name"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                variant="outline"
                className="text-xs h-8 px-3"
                onClick={() => setEditProfileOpen(false)}
              >
                Back
              </Button>
              <Button
                className="text-xs h-8 px-3"
                onClick={handleSaveDisplayName}
                disabled={savingProfile || !editDisplayName.trim()}
              >
                {savingProfile ? 'Saving...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription className="text-xs">
            Customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                {isDarkMode ? (
                  <Moon className="h-4 w-4 text-slate-600" />
                ) : (
                  <Sun className="h-4 w-4 text-slate-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  {isDarkMode ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={handleThemeToggle}
              disabled={themeSaving}
              className="data-[state=checked]:!bg-blue-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                <ArrowUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Action Button Labels</p>
                <p className="text-xs text-muted-foreground">Toggle Text vs Icons</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {showButtonTextPref ? 'Text' : 'Icon'}
              </span>
              <Switch
                checked={!showButtonTextPref}
                onCheckedChange={(checked) => handleButtonTextPrefChange(checked)}
                disabled={buttonPrefSaving}
                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Inactivity Timeout</p>
                <p className="text-xs text-muted-foreground">
                  Auto-logout after inactivity (hours)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={timeoutHours || ''}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                onBlur={(e) => {
                  if (!e.target.value || parseFloat(e.target.value) <= 0) {
                    setTimeoutHours(DEFAULT_TIMEOUT_HOURS);
                    localStorage.setItem(INACTIVITY_TIMEOUT_STORAGE_KEY, DEFAULT_TIMEOUT_HOURS.toString());
                    e.target.value = DEFAULT_TIMEOUT_HOURS.toString();
                  }
                }}
                className="w-20 h-8 text-xs text-right"
                placeholder="2"
              />
              <span className="text-xs text-muted-foreground">hrs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support & Legal Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Support & Legal</CardTitle>
          <CardDescription className="text-xs">
            Get help and review legal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={handleCopyEmail}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <HelpCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Contact Support</p>
                <p className="text-xs text-muted-foreground">
                  support@praxio-ai.com.au
                </p>
              </div>
            </div>
            {emailCopied ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <a
            href="https://www.praxio-ai.com.au/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Terms and Conditions</p>
                <p className="text-xs text-muted-foreground">Review our terms of service</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>

          <a
            href="https://www.praxio-ai.com.au/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">Review our privacy practices</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
          <CardDescription className="text-xs">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete Account</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete your account? This action cannot be reversed and will permanently delete all your data, including research, chats, and settings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs h-8 px-3">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-xs h-8 px-3"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => toast.info('Tutorial will be implemented soon')}
            className="text-blue-600 hover:underline"
          >
            Tutorial
          </button>
        </div>
        <p>Version 1.3.1</p>
      </div>
    </div>
  );
}

