import React, { createContext, useContext } from 'react';
import { useSupabaseRlsToken } from '@/hooks/useSupabaseRlsToken';

type SupabaseRlsContextValue = ReturnType<typeof useSupabaseRlsToken>;

const SupabaseRlsContext = createContext<SupabaseRlsContextValue | null>(null);

export function SupabaseRlsProvider({ children }: { children: React.ReactNode }) {
  const value = useSupabaseRlsToken();
  return <SupabaseRlsContext.Provider value={value}>{children}</SupabaseRlsContext.Provider>;
}

export function useSupabaseRls() {
  const ctx = useContext(SupabaseRlsContext);
  if (!ctx) {
    throw new Error('useSupabaseRls must be used within SupabaseRlsProvider');
  }
  return ctx;
}

