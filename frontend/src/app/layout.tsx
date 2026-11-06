import type { Metadata } from 'next';
// Inter loaded via CSS in globals.css — avoids Google Fonts network call at build time
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';


export const metadata: Metadata = {
  title: 'Bingo Vintage - Lending System',
  description: 'Hybrid Lending System for Cash & Bike Loans',
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
          <SonnerToaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}