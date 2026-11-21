// superadmin/layout.tsx — platform shell (Module Control + Brand DNA nav)
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'superadmin')) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--hj-deep-ink,#101820)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--bv-accent,#16836A)]" />
      </div>
    );
  }

  if (!user || user.role !== 'superadmin') return null;

  const nav = [
    { href: '/superadmin', label: 'Dashboard', icon: '⚡' },
    { href: '/superadmin/tenants', label: 'Tenants', icon: '🏢' },
    { href: '/superadmin/users', label: 'All Users', icon: '👥' },
    { href: '/superadmin/modules', label: 'Modules', icon: '🧩' },
    { href: '/superadmin/brand', label: 'Brand DNA', icon: '🎨' },
    { href: '/superadmin/audit', label: 'Audit Logs', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-[var(--hj-deep-ink,#101820)] text-white flex">
      <aside className="w-60 bg-[var(--bv-sidebar,#101820)] border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[var(--bv-action,#0D5C4A)] flex items-center justify-center text-xs font-black">
              SA
            </div>
            <span className="text-sm font-black text-white">Super Admin</span>
          </div>
          <div className="text-xs text-bv-meta ml-9">HandzJ Platform Control</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon }) => {
            const active =
              pathname === href || (href !== '/superadmin' && pathname.startsWith(href));
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--bv-action,#0D5C4A)] text-white'
                    : 'text-bv-meta hover:bg-bv-action-hover hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </a>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <div className="px-3 py-2 text-xs text-bv-meta">
            Logged in as{' '}
            <span className="text-[var(--bv-accent,#16836A)] font-bold">{user.username}</span>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-xs text-bv-meta hover:text-white rounded-lg hover:bg-bv-action-hover transition"
          >
            ← Back to App
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:text-red-400 rounded-lg hover:bg-bv-action-hover transition text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
