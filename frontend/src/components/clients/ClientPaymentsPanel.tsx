'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import ReversePaymentsDialog from '@/components/payments/ReversePaymentsDialog';

/**
 * Client profile → Payments tab.
 * Every payment for the client across all their loans. Users who may reverse payments reverse
 * them directly (one via the row button, many via the checkboxes); cashiers and managers send
 * reversal requests for an administrator to approve. Both go through ReversePaymentsDialog.
 * Nothing is deleted: reversed payments stay listed, struck through.
 */

const REVERSIBLE = ['COMPLETED', 'REVERSAL_REQUESTED'];
const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ClientPaymentsPanel({ clientId, onChanged }: { clientId: number | string; onChanged?: () => void }) {
  const { user, can } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const canReverse = role === 'admin' || role === 'superadmin' || can('payment.reverse');
  // Same population the backend lets request a reversal (payments.controller → request-reversal).
  const canRequest = canReverse || can('payment.create') || ['manager', 'cashier'].includes(role);

  const [payments, setPayments] = useState<any[]>([]);
  // Spinner only for the very first load. Later reloads (after a reversal) must not unmount the
  // list, or an open dialog showing partial failures would be torn down mid-use.
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [loanFilter, setLoanFilter] = useState('ALL');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialogIds, setDialogIds] = useState<number[] | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<any>(`/payments/client/${clientId}`);
    if (res.success) {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPayments(rows);
      setError('');
    } else {
      setError(res.message || 'Could not load payments');
    }
    setLoaded(true);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  const loans = useMemo(() => {
    const m = new Map<number, string>();
    payments.forEach((p) => m.set(p.loanId ?? p.loan?.id, p.loan?.loanNumber ?? `Loan #${p.loanId}`));
    return Array.from(m.entries());
  }, [payments]);

  const visible = useMemo(
    () => payments.filter((p) => loanFilter === 'ALL' || String(p.loanId ?? p.loan?.id) === loanFilter),
    [payments, loanFilter],
  );
  const reversibleVisible = visible.filter((p) => REVERSIBLE.includes(p.status));
  const allTicked = reversibleVisible.length > 0 && reversibleVisible.every((p) => selected.has(p.id));
  const selectedTotal = payments.filter((p) => selected.has(p.id)).reduce((s, p) => s + Number(p.amount || 0), 0);

  const toggle = (id: number, on: boolean) => {
    const next = new Set(selected);
    on ? next.add(id) : next.delete(id);
    setSelected(next);
  };
  const toggleAll = (on: boolean) => {
    const next = new Set(selected);
    reversibleVisible.forEach((p) => (on ? next.add(p.id) : next.delete(p.id)));
    setSelected(next);
  };

  const dialogPayments = payments
    .filter((p) => dialogIds?.includes(p.id))
    .map((p) => ({ id: p.id, amount: p.amount, receiptNumber: p.receiptNumber, loanNumber: p.loan?.loanNumber }));

  if (!loaded) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-bv-danger flex flex-wrap items-center gap-2">
          {error} <button type="button" onClick={load} className="underline font-semibold">Retry</button>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-bv-text text-sm">Payment history ({payments.length})</h3>
        {loans.length > 1 && (
          <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} className="border border-bv-border rounded-lg px-3 py-1.5 text-sm bg-bv-surface">
            <option value="ALL">All loans</option>
            {loans.map(([id, num]) => <option key={id} value={String(id)}>{num}</option>)}
          </select>
        )}
      </div>

      {canRequest && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm font-semibold text-orange-800">{selected.size} selected · {fmt(selectedTotal)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="text-sm px-3 py-1.5 border border-orange-300 rounded hover:bg-orange-100 text-orange-800">Clear</button>
            <button type="button" onClick={() => setDialogIds(Array.from(selected))} className="text-sm font-medium px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />{canReverse ? 'Reverse selected' : 'Request reversal'}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-bv-meta py-6 text-center">No payments recorded for this client.</p>
      ) : (
        <div className="overflow-x-auto border border-bv-border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bv-border bg-bv-hover text-left text-xs uppercase text-bv-meta">
                {canRequest && (
                  <th className="px-3 py-2.5 w-10">
                    <input type="checkbox" checked={allTicked} onChange={(e) => toggleAll(e.target.checked)} title="Select all reversible" />
                  </th>
                )}
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Receipt #</th>
                <th className="px-3 py-2.5">Loan</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Status</th>
                {canRequest && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-bv-border">
              {visible.map((p) => {
                const reversible = REVERSIBLE.includes(p.status);
                const reversed = p.status === 'REVERSED';
                return (
                  <tr key={p.id} className={`${reversed ? 'opacity-50' : ''} ${selected.has(p.id) ? 'bg-orange-50/60' : ''}`}>
                    {canRequest && (
                      <td className="px-3 py-2.5">
                        {reversible ? <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} /> : null}
                      </td>
                    )}
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(p.paymentDate ?? p.createdAt)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{p.receiptNumber ?? '—'}</td>
                    <td className="px-3 py-2.5">{p.loan?.loanNumber ?? `#${p.loanId}`}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${reversed ? 'line-through' : ''}`}>{fmt(p.amount)}</td>
                    <td className="px-3 py-2.5">{String(p.paymentMethod ?? p.method ?? '—').replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{String(p.status).replace(/_/g, ' ')}</td>
                    {canRequest && (
                      <td className="px-3 py-2.5 text-right">
                        {reversible && (
                          <button type="button" onClick={() => setDialogIds([p.id])} className="text-xs font-semibold px-2.5 py-1 border border-orange-300 text-orange-700 rounded hover:bg-orange-50">{canReverse ? 'Reverse' : 'Request'}</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!canRequest && <p className="text-xs text-bv-meta">You do not have permission to reverse payments or request reversals.</p>}

      {dialogIds && (
        <ReversePaymentsDialog
          payments={dialogPayments}
          direct={canReverse}
          onClose={() => setDialogIds(null)}
          onDone={() => { setSelected(new Set()); load(); onChanged?.(); }}
        />
      )}
    </div>
  );
}
