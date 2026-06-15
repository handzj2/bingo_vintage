// superadmin/audit/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const load = (p: number) => {
    setLoading(true);
    superadminApi.getAuditLogs(p)
      .then(d => {
        const data: any = d.data ?? d;
        setLogs(data.rows ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load data'); setLoading(false); });
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-black mb-2">Audit Logs</h1>
      <p className="text-gray-400 text-sm mb-6">{total} total entries</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              {['Action', 'Actor', 'Target', 'Description', 'Time'].map(h => (
                <th key={h} className="text-left py-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-3 pr-4">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-purple-300 font-mono">{l.action}</span>
                </td>
                <td className="py-3 pr-4 text-gray-400">{l.user}</td>
                <td className="py-3 pr-4 text-gray-500">{l.tableName}{l.recordId ? ` #${l.recordId}` : ''}</td>
                <td className="py-3 pr-4 text-gray-300 text-xs">{l.description}</td>
                <td className="py-3 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center text-gray-500 py-8">Loading...</div>}
      </div>

      <div className="flex gap-3 mt-4 items-center">
        <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
          className="px-3 py-1.5 bg-gray-700 rounded text-sm disabled:opacity-30">← Prev</button>
        <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total/50)}</span>
        <button disabled={page >= Math.ceil(total/50)} onClick={() => setPage(p => p+1)}
          className="px-3 py-1.5 bg-gray-700 rounded text-sm disabled:opacity-30">Next →</button>
      </div>
    </div>
  );
}
