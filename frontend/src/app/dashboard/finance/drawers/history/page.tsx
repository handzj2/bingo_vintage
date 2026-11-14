'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatUGX } from '@/shared/api-types';

/** /dashboard/finance/drawers/history — GET /cash-drawers/history (permission: drawer.view). */
export default function DrawerHistoryPage() {
  const { user, isLoading, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const res = await api.get<any[]>('/cash-drawers/history');
    if (res.success) setRows(Array.isArray(res.data) ? res.data : []);
    else setErr(res.message || 'Failed to load drawer history');
    setLoading(false);
  }, []);

  useEffect(() => { if (!isLoading && !user) router.replace('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => { if (user && can('drawer.view')) load(); }, [user, can, load]);

  const filtered = useMemo(() => rows.filter((d) => {
    const day = String(d.drawerDate ?? d.drawer_date ?? '').slice(0, 10);
    return (status === 'all' || d.status === status) && (!from || day >= from) && (!to || day <= to);
  }), [rows, status, from, to]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!can('drawer.view')) return <p className="p-6 text-sm text-bv-muted">You do not have permission to view drawer history.</p>;

  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">Drawer history</h1>
          <p className="text-sm text-bv-muted">Every drawer opened for your tenant, with counted cash, differences and force-close reasons.</p>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-1.5 text-sm text-bv-muted hover:text-bv-text">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-bv-border rounded-bv px-3 py-2 bg-bv-surface" aria-label="Status">
          <option value="all">All statuses</option><option value="open">Open</option>
          <option value="closed">Closed</option><option value="reconciled">Reconciled</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-bv-border rounded-bv px-3 py-2 bg-bv-surface" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-bv-border rounded-bv px-3 py-2 bg-bv-surface" aria-label="To date" />
      </div>
      {err && <p className="text-sm text-bv-danger">{err} <button className="underline" onClick={load}>Retry</button></p>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <div className="overflow-x-auto border border-bv-border rounded-bv">
          <table className="min-w-full text-sm">
            <thead className="bg-bv-hover text-left text-xs text-bv-meta uppercase">
              <tr>{['Date', 'Branch', 'Opened by', 'Status', 'Opening', 'Expected', 'Counted', 'Difference', 'Closed by / notes'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-bv-meta">No drawers match these filters.</td></tr>}
              {filtered.map((d) => {
                const diff = d.difference == null ? null : Number(d.difference);
                return (
                  <tr key={d.id} className="border-t border-bv-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{String(d.drawerDate ?? '').slice(0, 10)}</td>
                    <td className="px-3 py-2">{d.branch?.name ?? `#${d.branchId}`}</td>
                    <td className="px-3 py-2">{d.user?.fullName || d.user?.username || `#${d.userId}`}</td>
                    <td className="px-3 py-2 capitalize">{d.status}</td>
                    <td className="px-3 py-2">{formatUGX(Number(d.openingBalance))}</td>
                    <td className="px-3 py-2">{d.expectedBalance != null ? formatUGX(Number(d.expectedBalance)) : '—'}</td>
                    <td className="px-3 py-2">{d.closingBalance != null ? formatUGX(Number(d.closingBalance)) : '—'}</td>
                    <td className={`px-3 py-2 ${diff && Math.abs(diff) > 0.009 ? 'text-bv-danger font-medium' : ''}`}>{diff == null ? '—' : formatUGX(diff)}</td>
                    <td className="px-3 py-2 max-w-[260px]">
                      {d.forceCloseReason && <p className="text-bv-warning text-xs">Force-closed: {d.forceCloseReason}</p>}
                      {d.notes && <p className="text-xs text-bv-muted">{d.notes}</p>}
                      {d.closedAt && <p className="text-xs text-bv-meta">{new Date(d.closedAt).toLocaleString()}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
