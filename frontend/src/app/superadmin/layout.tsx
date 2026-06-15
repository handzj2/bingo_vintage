// superadmin/layout.tsx — superadmin shell, isolated from tenant dashboard
// RBAC patch 2026-06-15: enterprise tenant portal layout
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

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

  const nav = [
    { href: '/superadmin',         label: 'Dashboard',   icon: '⚡' },
    { href: '/superadmin/tenants', label: 'Tenants',     icon: '🏢' },
    { href: '/superadmin/users',   label: 'All Users',   icon: '👥' },
    { href: '/superadmin/audit',   label: 'Audit Logs',  icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-black">SA</div>
            <span className="text-sm font-black text-white">Super Admin</span>
          </div>
          <div className="text-xs text-gray-500 ml-9">Platform Control</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/superadmin' && pathname.startsWith(href));
            return (
              <a key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <span>{icon}</span>
                {label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <div className="px-3 py-2 text-xs text-gray-500">
            Logged in as <span className="text-purple-400 font-bold">{user.username}</span>
          </div>
          <a href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition">
            ← Back to App
          </a>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition text-left">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
