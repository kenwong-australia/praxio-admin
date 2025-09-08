import "./globals.css";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Praxio AI – Admin',
  description: 'Admin dashboard for Praxio AI analytics and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">

      <body>
        {children}
      </body>
    </html>
  );
}