// superadmin/layout.tsx — superadmin shell, isolated from tenant dashboard
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'superadmin')) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
    </div>
  );

  if (!user || user.role !== 'superadmin') return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-2">
        <div className="mb-4">
          <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Super Admin</div>
          <div className="text-xs text-gray-500">Platform Control</div>
        </div>
        {[
          { href: '/superadmin',         label: '⚡ Dashboard' },
          { href: '/superadmin/tenants', label: '🏢 Tenants' },
          { href: '/superadmin/users',   label: '👥 All Users' },
          { href: '/superadmin/audit',   label: '📋 Audit Logs' },
        ].map(({ href, label }) => (
          <a key={href} href={href}
             className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition">
            {label}
          </a>
        ))}
        <div className="mt-auto">
          <a href="/dashboard" className="px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 block">
            ← Back to App
          </a>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
