'use client';

import { BarChart3, Settings, Users } from "lucide-react";
import Image from 'next/image';
import { SignOutButton } from '@/components/SignOutButton';

export function Sidebar() {
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
        <a
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
        >
          <Users className="h-4 w-4" />
          Users
          <span className="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded-full">Soon</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
          <span className="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded-full">Soon</span>
        </a>
      </nav>
      
      <div className="mt-auto p-4">
        <SignOutButton />
      </div>
    </aside>
  );
}