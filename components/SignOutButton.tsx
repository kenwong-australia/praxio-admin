'use client';

import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  isCollapsed?: boolean;
}

export function SignOutButton({ isCollapsed = false }: SignOutButtonProps) {
  const handleSignOut = () => {
    const auth = getFirebaseAuth();
    signOut(auth);
  };

  return (
    <button
      onClick={handleSignOut}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors w-full`}
      title={isCollapsed ? 'Sign Out' : undefined}
    >
      <LogOut className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">Sign Out</span>}
    </button>
  );
}