'use client';

import { BarChart3, Settings, Users, MessageSquare, Database, Sparkles } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';

export function Sidebar() {
  const pathname = usePathname();

  const navClasses = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
    }`;
  };

  return (
    <aside className="w-64 min-h-screen bg-white shadow-xl border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image 
              src="/Praxio Logo clean-12 (logo only).png" 
              alt="Praxio AI Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Praxio AI
            </h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        <Link href="/admin" className={navClasses('/admin')}>
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </Link>
        <Link href="/users" className={navClasses('/users')}>
          <Users className="h-4 w-4" />
          Users
        </Link>
        <Link href="/chats" className={navClasses('/chats')}>
          <MessageSquare className="h-4 w-4" />
          Chats
        </Link>
        <Link href="/praxio" className={navClasses('/praxio')}>
          <Sparkles className="h-4 w-4" />
          Praxio
        </Link>
        <Link href="/vb-processing" className={navClasses('/vb-processing')}>
          <Database className="h-4 w-4" />
          VB Processing
        </Link>
        <Link href="#" className={navClasses('#')}>
          <Settings className="h-4 w-4" />
          Settings
          <span className="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded-full">Soon</span>
        </Link>
      </nav>
      
      <div className="mt-auto p-4">
        <SignOutButton />
      </div>
    </aside>
  );
}