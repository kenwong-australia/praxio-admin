'use client';

import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const handleSignOut = () => {
    const auth = getFirebaseAuth();
    signOut(auth);
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors w-full"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}