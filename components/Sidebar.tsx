'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Settings, Users, MessageSquare, Database, Sparkles, PanelLeftClose, PanelLeftOpen, Clock } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

function InactivityTimer({ isCollapsed }: { isCollapsed: boolean }) {
  const { timeRemaining, isWarning, formatTimeRemaining } = useInactivityTimeout();

  if (timeRemaining === null) {
    return null;
  }

  return (
    <div
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
        isWarning
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-slate-50 text-slate-600 border border-slate-200'
      }`}
      title={isCollapsed ? formatTimeRemaining(timeRemaining) : undefined}
    >
      <Clock className={`h-3 w-3 flex-shrink-0 ${isWarning ? 'text-red-600' : 'text-slate-500'}`} />
      {!isCollapsed && <span className="truncate">{formatTimeRemaining(timeRemaining)}</span>}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  // Simple responsive rule of thumb:
  // - ≥1440px: expanded by default
  // - 1280–1439px: collapsed by default (icon-only)
  // - <1024px: still render, but layout gating in ProtectedLayout will generally prevent use
  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== 'undefined') {
        const w = window.innerWidth;
        setViewportWidth(w);
        if (w >= 1440) {
          setIsCollapsed(false);
        } else if (w >= 1280 && w < 1440) {
          setIsCollapsed(true);
        }
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const navClasses = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
    }`;
  };

  return (
    <aside
      className={`min-h-screen bg-white shadow-xl border-r border-slate-200 transition-all duration-200 flex flex-col ${
        isCollapsed ? 'w-[80px]' : 'w-64'
      }`}
    >
      <div className={`border-b border-slate-200 flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between p-4'}`}>
        <div 
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={isCollapsed ? () => setIsCollapsed(false) : undefined}
        >
          <div className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? 'w-10 h-10' : 'w-9 h-9'}`}>
            <Image 
              src="/Praxio Logo clean-12 (logo only).png" 
              alt="Praxio AI Logo" 
              width={isCollapsed ? 40 : 36} 
              height={isCollapsed ? 40 : 36}
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                Praxio AI
              </h1>
              <p className="text-xs text-muted-foreground truncate">Admin Dashboard</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsCollapsed((v) => !v)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <nav className={`space-y-1 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <Link href="/admin" className={navClasses('/admin')}>
          <BarChart3 className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Dashboard</span>}
        </Link>
        <Link href="/users" className={navClasses('/users')}>
          <Users className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Users</span>}
        </Link>
        <Link href="/chats" className={navClasses('/chats')}>
          <MessageSquare className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Chats</span>}
        </Link>
        <Link href="/praxio" className={navClasses('/praxio')}>
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Praxio</span>}
        </Link>
        <Link href="/vb-processing" className={navClasses('/vb-processing')}>
          <Database className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">VB Processing</span>}
        </Link>
        <Link href="/settings" className={navClasses('/settings')}>
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Settings</span>}
        </Link>
      </nav>
      
      <div className={`mt-auto ${isCollapsed ? 'p-2' : 'p-3'} space-y-2`}>
        {/* Inactivity Timer */}
        <InactivityTimer isCollapsed={isCollapsed} />
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}