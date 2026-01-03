'use client';

import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes';

/**
 * Centralized theme provider so we can set consistent options
 * (class strategy, system default, transitions off on change).
 */
export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="praxio-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

