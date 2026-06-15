// superadmin/page.tsx — platform dashboard
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface Stats { tenants: number; users: number; totalLoans: number; activeLoans: number; }

export default function SuperAdminDashboard() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats().then((d: any) => { setStats(d.data ?? d); setLoading(false); });
  }, []);

  const cards = stats ? [
    { label: 'Active Tenants', value: stats.tenants,     color: 'bg-purple-500' },
    { label: 'Total Users',    value: stats.users,       color: 'bg-blue-500'   },
    { label: 'Total Loans',    value: stats.totalLoans,  color: 'bg-green-500'  },
    { label: 'Active Loans',   value: stats.activeLoans, color: 'bg-orange-500' },
  ] : [];

  return (
    <div>
      <h1 className="text-2xl font-black mb-2">Platform Overview</h1>
      <p className="text-gray-400 text-sm mb-8">Super Admin Console — full cross-tenant visibility</p>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="bg-gray-800 rounded-xl p-6">
              <div className={`w-3 h-3 rounded-full ${c.color} mb-3`} />
              <div className="text-3xl font-black">{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4">
        <a href="/superadmin/tenants"
           className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition group">
          <div className="text-lg font-bold mb-1 group-hover:text-purple-400">Manage Tenants →</div>
          <div className="text-sm text-gray-400">Create, activate, or deactivate tenants</div>
        </a>
        <a href="/superadmin/users"
           className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition group">
          <div className="text-lg font-bold mb-1 group-hover:text-blue-400">All Users →</div>
          <div className="text-sm text-gray-400">Search and impersonate users across tenants</div>
        </a>
      </div>
    </div>
  );
}
