import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';

const VARIANT = process.env.NEXT_PUBLIC_APP_VARIANT === 'user' ? 'User' : 'Admin';

export const metadata: Metadata = {
  title: `Praxio AI${VARIANT === 'Admin' ? ' – Admin' : ''}`,
  description: 'Praxio AI application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}