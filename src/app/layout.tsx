import type { Metadata } from 'next';
// Inter loaded via CSS in globals.css — avoids Google Fonts network call at build time
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import MaintenanceScreen from '@/components/MaintenanceScreen';

export const metadata: Metadata = {
  title: 'Bingo Vintage - Lending System',
  description: 'Hybrid Lending System for Cash & Bike Loans',
};

/**
 * ─────────────────────────────────────────────────────────────
 * MAINTENANCE MODE (SITE_STATUS)
 * ─────────────────────────────────────────────────────────────
 * Added: 2026-09-19 — controlled site suspension.
 * Does NOT delete the project, domain, GitHub code, or deployments.
 *
 * Vercel → Settings → Environment Variables:
 *   SITE_STATUS = OFF  → offline page (Handzj Tech contacts)
 *   SITE_STATUS = ON   → normal site (default if unset)
 * Then Redeploy production.
 * ─────────────────────────────────────────────────────────────
 */
export default function RootLayout({
  children,
}: {
  children: any;
}) {
  // [MAINTENANCE] Default ON so missing env never takes the site offline
  const siteOff =
    (process.env.SITE_STATUS || 'ON').toUpperCase().trim() === 'OFF';

  if (siteOff) {
    return (
      <html lang="en">
        <body>
          <MaintenanceScreen />
          {/* Keep children in tree so Next.js can collect page data on Vercel */}
          <div style={{ display: 'none' }}>{children}</div>
        </body>
      </html>
    );
  }

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
