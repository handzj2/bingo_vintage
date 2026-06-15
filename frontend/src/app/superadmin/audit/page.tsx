// superadmin/audit/page.tsx
// RBAC patch 2026-06-15: enterprise audit log viewer
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-900/40 text-green-400',
  UPDATE: 'bg-blue-900/40 text-blue-400',
  DELETE: 'bg-red-900/40 text-red-400',
  LOGIN:  'bg-purple-900/40 text-purple-400',
  APPROVE:'bg-yellow-900/40 text-yellow-400',
};

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const PER_PAGE = 50;

  const load = (p: number) => {
    setLoading(true);
    superadminApi.getAuditLogs(p)
      .then(d => {
        const data: any = d.data ?? d;
        setLogs(Array.isArray(data) ? data : (data.rows ?? []));
        setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
        setLoading(false);
      })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load audit logs'); setLoading(false); });
  };

  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-1">Audit Logs</h1>
      <p className="text-gray-400 text-sm mb-6">{total.toLocaleString()} total entries across all tenants</p>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-700 bg-gray-900/50">
            <tr>
              {['Action', 'Actor', 'Resource', 'Description', 'Tenant', 'Time'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading
              ? [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-4"><div className="h-4 bg-gray-700 rounded animate-pulse" /></td></tr>
                ))
              : logs.map((l, i) => {
                  const action = (l.action ?? '').toUpperCase();
                  return (
                    <tr key={l.id ?? i} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${ACTION_COLORS[action] ?? 'bg-gray-700 text-gray-300'}`}>
                          {action || l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs">{l.user ?? l.username ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs font-mono">
                        {l.tableName ?? l.table_name ?? '—'}
                        {(l.recordId ?? l.record_id) ? ` #${l.recordId ?? l.record_id}` : ''}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs max-w-xs truncate">{l.description ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{l.tenantId ?? l.tenant_id ?? '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(l.createdAt ?? l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="text-center text-gray-500 py-16">No audit logs found</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex gap-3 mt-5 items-center justify-between">
        <span className="text-sm text-gray-400">
          Page {page} of {totalPages} · {total.toLocaleString()} entries
        </span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-30 transition">
            ← Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-30 transition">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
