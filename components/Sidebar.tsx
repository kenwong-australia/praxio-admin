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
            ? 'bg-destructive/10 text-destructive border border-destructive/30'
            : 'bg-muted text-muted-foreground border border-border'
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
  const variant = process.env.NEXT_PUBLIC_APP_VARIANT === 'user' ? 'user' : 'admin';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const showTutorialButton =
    pathname.startsWith('/praxio') || pathname.startsWith('/settings');

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
        ? 'bg-primary/15 text-primary font-medium dark:bg-primary/25'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3, variants: ['admin'] },
    { href: '/users', label: 'Users', icon: Users, variants: ['admin'] },
    { href: '/chats', label: 'Chats', icon: MessageSquare, variants: ['admin'] },
    { href: '/praxio', label: 'Praxio', icon: Sparkles, variants: ['admin', 'user'] },
    { href: '/vb-processing', label: 'VB Processing', icon: Database, variants: ['admin'] },
    { href: '/settings', label: 'Settings', icon: Settings, variants: ['admin', 'user'] },
  ].filter((item) => item.variants.includes(variant));

  return (
    <aside
      className={`bg-card text-card-foreground shadow-xl border-r border-border transition-all duration-200 flex flex-col sticky top-0 h-screen overflow-y-auto ${
        isCollapsed ? 'w-[80px]' : 'w-56'
      }`}
      aria-label="Primary navigation"
    >
      <div className={`border-b border-border flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between p-3'}`}>
        <div 
          className="flex items-center gap-2 min-w-0 cursor-pointer"
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
        </div>
        {!isCollapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setIsCollapsed((v) => !v)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <nav className={`space-y-1 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClasses(item.href)}>
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>
      
      <div className={`mt-auto ${isCollapsed ? 'p-2' : 'p-3'} space-y-2`}>
        {showTutorialButton && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('praxioOpenTutorial'));
              }
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition`}
            title="Open tutorial"
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            {!isCollapsed && <span>Open tutorial</span>}
          </button>
        )}
        {/* Inactivity Timer */}
        <InactivityTimer isCollapsed={isCollapsed} />
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}