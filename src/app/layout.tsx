/**
 * ★★★ MAINTENANCE MODE ADDED 2026-09-19 ★★★
 * File: frontend/src/app/layout.tsx
 * Change: SITE_STATUS switch + MaintenanceScreen
 * Search this file for: [MAINTENANCE] or SITE_STATUS
 */
import type { Metadata } from 'next';
// Inter loaded via CSS in globals.css — avoids Google Fonts network call at build time
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import MaintenanceScreen from '@/components/MaintenanceScreen'; // [MAINTENANCE] NEW IMPORT

export const metadata: Metadata = {
  title: 'Bingo Vintage - Lending System',
  description: 'Hybrid Lending System for Cash & Bike Loans',
};

/**
 * ─────────────────────────────────────────────────────────────
 * [MAINTENANCE] SITE_STATUS controlled suspension
 * ─────────────────────────────────────────────────────────────
 * Vercel env: SITE_STATUS=OFF → offline page | SITE_STATUS=ON → normal
 * Hosting admin: Handzj Tech · 0781909507 · handzj2@gmail.com
 * ─────────────────────────────────────────────────────────────
 */
export default function RootLayout({
  children,
}: {
  children: any;
}) {
  // [MAINTENANCE] ★ THIS BLOCK IS NEW — do not remove ★
  const siteOff =
    (process.env.SITE_STATUS || 'ON').toUpperCase().trim() === 'OFF';

  if (siteOff) {
    return (
      <html lang="en">
        <body>
          <MaintenanceScreen />
          <div style={{ display: 'none' }}>{children}</div>
        </body>
      </html>
    );
  }
  // [MAINTENANCE] ★ END NEW BLOCK ★

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
