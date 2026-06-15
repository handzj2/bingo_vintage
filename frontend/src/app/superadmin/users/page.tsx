// superadmin/users/page.tsx
// RBAC patch 2026-06-15: enterprise cross-tenant user management with impersonation
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface User {
  id: number; username: string; email: string;
  is_active: boolean; tenant_name: string; role_name: string;
  created_at: string; tenant_id: number;
}

const ROLE_COLORS: Record<string, string> = {
  admin:        'bg-red-900/40 text-red-300',
  superadmin:   'bg-purple-900/40 text-purple-300',
  manager:      'bg-blue-900/40 text-blue-300',
  cashier:      'bg-green-900/40 text-green-300',
  loan_officer: 'bg-yellow-900/40 text-yellow-300',
  agent:        'bg-gray-700 text-gray-300',
};

export default function AllUsersPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [reason, setReason]       = useState('');
  const [tokenResult, setTokenResult] = useState<{username: string; token: string} | null>(null);

  const load = (q?: string) => {
    setLoading(true); setError(null);
    superadminApi.listUsers(q)
      .then((d: any) => {
        const data = d.data ?? d;
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load users'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleImpersonate = async (u: User) => {
    if (!reason.trim()) { alert('Please enter a reason for impersonation'); return; }
    try {
      const res  = await superadminApi.impersonate({ userId: u.id, tenantId: u.tenant_id, reason });
      const data: any = res.data ?? res;
      setTokenResult({ username: u.username, token: data.token });
      setImpersonating(null); setReason('');
    } catch (e: any) { alert(e.message ?? 'Impersonation failed'); }
  };

  const copyToken = () => {
    if (tokenResult?.token) {
      navigator.clipboard.writeText(tokenResult.token);
      alert('Token copied to clipboard');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-1">All Users</h1>
      <p className="text-gray-400 text-sm mb-6">Search across all tenants · {users.length} results</p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Search by username or email..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
        />
        <button onClick={() => load(search)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition">
          Search
        </button>
        {search && (
          <button onClick={() => { setSearch(''); load(); }}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition">
            Clear
          </button>
        )}
      </div>

      {/* Token result */}
      {tokenResult && (
        <div className="mb-6 p-5 bg-gray-800 rounded-xl border border-purple-600">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Impersonation Token</span>
              <span className="ml-2 text-xs text-gray-400">for {tokenResult.username} · expires in 15 min</span>
            </div>
            <button onClick={() => setTokenResult(null)} className="text-gray-500 hover:text-gray-300">✕</button>
          </div>
          <pre className="text-xs text-gray-300 bg-gray-900 rounded-lg p-3 whitespace-pre-wrap break-all mb-3">
            {tokenResult.token}
          </pre>
          <button onClick={copyToken}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition">
            Copy Token
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-800 h-14 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-900/50">
              <tr>
                {['User', 'Email', 'Tenant', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">{u.username}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{u.email}</td>
                  <td className="py-3 px-4 text-gray-300 text-xs">{u.tenant_name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${ROLE_COLORS[u.role_name] ?? 'bg-gray-700 text-gray-300'}`}>
                      {u.role_name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {impersonating === u.id ? (
                      <div className="flex gap-2 items-center">
                        <input value={reason} onChange={e => setReason(e.target.value)}
                          placeholder="Reason for access..."
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:border-purple-500 text-white" />
                        <button onClick={() => handleImpersonate(u)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold transition">Go</button>
                        <button onClick={() => { setImpersonating(null); setReason(''); }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setImpersonating(u.id)}
                        className="px-3 py-1 bg-gray-700 hover:bg-purple-800 rounded text-xs font-bold transition text-gray-300 hover:text-white">
                        Impersonate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center text-gray-500 py-16">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
