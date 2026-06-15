// superadmin/users/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface User {
  id: number; username: string; email: string;
  is_active: boolean; tenant_name: string; role_name: string; created_at: string;
}

export default function AllUsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [reason, setReason]   = useState('');
  const [result, setResult]   = useState('');

  const load = (q?: string) => {
    setLoading(true);
    superadminApi.listUsers(q)
      .then((d: any) => { const data = d.data ?? d; setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load users'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleImpersonate = async (u: User) => {
    if (!reason.trim()) return alert('Please enter a reason for impersonation');
    try {
      const res  = await superadminApi.impersonate({
        userId: u.id, tenantId: 0, reason,
      });
      const data: any = res.data ?? res;
      setResult(`Impersonation token for ${u.username} (expires 15min):\n${data.token}`);
      setImpersonating(null);
      setReason('');
    } catch (e: any) {
      alert(e.message ?? 'Impersonation failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black mb-2">All Users</h1>
      <p className="text-gray-400 text-sm mb-6">Search across all tenants</p>

      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Search by username or email..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <button onClick={() => load(search)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition">
          Search
        </button>
      </div>

      {result && (
        <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-purple-700">
          <div className="text-xs text-purple-400 font-bold mb-2">IMPERSONATION RESULT</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">{result}</pre>
          <button onClick={() => setResult('')}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-800 h-14 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                {['User', 'Email', 'Tenant', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 pr-4 font-medium">{u.username}</td>
                  <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-3 pr-4 text-gray-400">{u.tenant_name}</td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{u.role_name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3">
                    {impersonating === u.id ? (
                      <div className="flex gap-2 items-center">
                        <input value={reason} onChange={e => setReason(e.target.value)}
                          placeholder="Reason..."
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:border-purple-500" />
                        <button onClick={() => handleImpersonate(u)}
                          className="px-2 py-1 bg-purple-600 rounded text-xs font-bold">Go</button>
                        <button onClick={() => setImpersonating(null)}
                          className="px-2 py-1 bg-gray-700 rounded text-xs">✕</button>
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
            <div className="text-center text-gray-500 py-12">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
