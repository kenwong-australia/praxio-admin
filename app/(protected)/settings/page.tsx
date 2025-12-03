'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  LogOut, 
  Trash2,
  ChevronRight,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
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

export default function SettingsPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Mock user data - will be replaced with real data later
  const userData = {
    name: 'Caitlin',
    email: 'caitlinwkwong@gmail.com',
    company: 'Praxio AI',
    plan: 'standard',
    frequency: 'monthly',
    nextRenewal: 'Sep 29, 2025',
    isTrial: true,
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@praxio-ai.com.au');
    setEmailCopied(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      router.replace('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteAccount = () => {
    // Placeholder - will be wired up later
    toast.info('Delete account functionality will be implemented soon');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'standard':
        return 'default';
      case 'premium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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
                {getInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{userData.name}</h2>
                <Badge variant={getPlanBadgeVariant(userData.plan)} className="text-xs">
                  {userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1)} Plan
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{userData.company}</p>
              {userData.isTrial && (
                <p className="text-xs text-orange-600 mt-1">
                  Trial ends on {userData.nextRenewal}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => toast.info('Upgrade functionality will be implemented soon')}
            >
              {userData.isTrial ? 'Upgrade' : 'Manage Subscription'}
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
            onClick={() => toast.info('Edit profile functionality will be implemented soon')}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Edit Profile</p>
                <p className="text-xs text-muted-foreground">Update your name and company</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => toast.info('Resend verification email functionality will be implemented soon')}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
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
            onClick={() => toast.info('Subscription management will be implemented soon')}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Subscription</p>
                <p className="text-xs text-muted-foreground">
                  {userData.frequency.charAt(0).toUpperCase() + userData.frequency.slice(1)} • {userData.plan}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription className="text-xs">
            Customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              onCheckedChange={(checked) => {
                setIsDarkMode(checked);
                toast.info('Theme change will be implemented soon');
              }}
            />
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

          <button
            onClick={() => toast.info('Terms and Conditions will be implemented soon')}
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
          </button>

          <button
            onClick={() => toast.info('Privacy Policy will be implemented soon')}
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
          </button>
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">Logout</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

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

