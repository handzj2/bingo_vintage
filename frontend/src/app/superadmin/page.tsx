// superadmin/page.tsx — platform dashboard
// RBAC patch 2026-06-15: enterprise stats dashboard
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';
import { api } from '@/lib/api/client';

interface Stats { tenants: number; users: number; totalLoans: number; activeLoans: number; }

export default function SuperAdminDashboard() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    // Hydrate token in case page loaded before AuthContext set it
    api.hydrateToken();
    superadminApi.getStats()
      .then((d: any) => { setStats(d.data ?? d); setLoading(false); })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load stats'); setLoading(false); });
  }, []);

  const cards = stats ? [
    { label: 'Active Tenants', value: stats.tenants,     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Total Users',    value: stats.users,       color: 'text-blue-400',   bg: 'bg-blue-500/10   border-blue-500/20'   },
    { label: 'Total Loans',    value: stats.totalLoans,  color: 'text-green-400',  bg: 'bg-green-500/10  border-green-500/20'  },
    { label: 'Active Loans',   value: stats.activeLoans, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  ] : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Platform Overview</h1>
        <p className="text-gray-400 text-sm mt-1">Super Admin Console — full cross-tenant visibility</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map(c => (
            <div key={c.label} className={`rounded-xl p-6 border ${c.bg}`}>
              <div className={`text-3xl font-black ${c.color}`}>{c.value ?? 0}</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/superadmin/tenants', title: 'Manage Tenants', desc: 'Create, activate, or deactivate tenants', color: 'hover:border-purple-500/50', accent: 'text-purple-400' },
          { href: '/superadmin/users',   title: 'All Users',      desc: 'Search and impersonate users across tenants', color: 'hover:border-blue-500/50', accent: 'text-blue-400' },
          { href: '/superadmin/audit',   title: 'Audit Logs',     desc: 'Full cross-tenant audit trail', color: 'hover:border-green-500/50', accent: 'text-green-400' },
        ].map(({ href, title, desc, color, accent }) => (
          <a key={href} href={href}
            className={`bg-gray-800 border border-gray-700 ${color} rounded-xl p-6 transition-colors group block`}>
            <div className={`text-base font-bold mb-1 ${accent}`}>{title} →</div>
            <div className="text-sm text-gray-400">{desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
