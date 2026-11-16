'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api/client';

export interface ReversiblePayment {
  id: number;
  amount: number | string;
  receiptNumber?: string | null;
  loanNumber?: string | null;
}

interface Failure { paymentId: number; error: string }

const fmt = (n: number) => `UGX ${n.toLocaleString()}`;

/**
 * The one confirmation dialog for reversing payments, used by the Payments page and the client
 * profile → Payments tab.
 *
 *   direct = true   (payment.reverse / admin)  → POST /payments/bulk-reverse. The server undoes the
 *                   payments newest first, each in its own transaction, and reports which failed.
 *   direct = false  (cashier / manager)        → POST /payments/:id/request-reversal for each payment;
 *                   an administrator approves them under Reversals.
 *
 * Nothing is deleted. Reversed payments stay on record, marked reversed, with the reason and who did it.
 * If some payments fail, the dialog stays open on exactly those, so "Retry" never re-sends the ones
 * that already went through.
 */
export default function ReversePaymentsDialog({
  payments, direct, onClose, onDone,
}: {
  payments: ReversiblePayment[];
  direct: boolean;
  onClose: () => void;
  /** Called after any attempt that changed something, so the caller can reload its list. */
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState<ReversiblePayment[]>(payments);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<Failure[]>([]);

  const total = remaining.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const n = remaining.length;
  const noun = `payment${n === 1 ? '' : 's'}`;
  const verb = direct ? 'Reverse' : 'Request reversal of';

  const submit = async () => {
    setBusy(true);
    const trimmed = reason.trim();
    let failed: Failure[] = [];
    let attempted = 0;

    if (direct) {
      const res = await api.post<any>('/payments/bulk-reverse', { paymentIds: remaining.map((p) => p.id), reason: trimmed });
      if (!res.success) {
        setBusy(false);
        toast.error(res.message || 'Reversal failed');
        return;
      }
      failed = res.data?.failed ?? [];
      attempted = res.data?.totalRequested ?? remaining.length;
    } else {
      for (const p of remaining) {
        const res = await api.post<any>(`/payments/${p.id}/request-reversal`, { reason: trimmed });
        if (!res.success) failed.push({ paymentId: p.id, error: res.message || 'Request failed' });
      }
      attempted = remaining.length;
    }
    setBusy(false);

    const ok = attempted - failed.length;
    if (ok > 0) onDone();

    if (failed.length === 0) {
      toast.success(direct ? `Reversed ${ok} payment${ok === 1 ? '' : 's'}` : `Sent ${ok} reversal request${ok === 1 ? '' : 's'} to an administrator`);
      onClose();
      return;
    }
    toast.error(`${ok} done, ${failed.length} failed`);
    setFailures(failed);
    setRemaining(remaining.filter((p) => failed.some((f) => f.paymentId === p.id)));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 text-orange-600 mb-3">
          <RotateCcw className="w-5 h-5" />
          <h2 className="text-lg font-bold">{direct ? 'Reverse' : 'Request reversal of'} {n} {noun}</h2>
        </div>

        <p className="text-sm text-bv-muted mb-3">
          {direct
            ? 'The payment records are kept and marked reversed. Instalments go back to their previous status and the loan balance rises by the amount reversed. Payments are undone newest first.'
            : 'An administrator will review each request. Nothing changes on the loan until it is approved.'}
        </p>

        <div className="border border-bv-border rounded-lg mb-3 max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-bv-border">
              {remaining.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-1.5 font-mono text-xs">{p.receiptNumber || `#${p.id}`}</td>
                  <td className="px-3 py-1.5 text-bv-meta">{p.loanNumber || ''}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmt(Number(p.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-bv-border bg-bv-hover font-semibold">
                <td className="px-3 py-1.5" colSpan={2}>Total</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <label className="block text-sm font-medium mb-1" htmlFor="reverse-reason">Reason (required for audit)</label>
        <textarea
          id="reverse-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full border border-bv-border rounded-lg p-2.5 text-sm mb-1"
          placeholder="e.g. Duplicate entries from the old system import"
        />
        <p className="text-xs text-bv-meta mb-3">At least 10 characters. The same reason is recorded against every payment.</p>

        {failures.length > 0 && (
          <div className="mb-3 text-sm border border-bv-danger rounded-lg p-3">
            <p className="font-semibold text-bv-danger mb-1">These could not be {direct ? 'reversed' : 'requested'}:</p>
            <ul className="list-disc pl-5">
              {failures.map((f) => <li key={f.paymentId}>Payment #{f.paymentId}: {f.error}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="px-4 py-2 text-sm border border-bv-border rounded-lg">
            {failures.length ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={busy || reason.trim().length < 10 || n === 0}
            onClick={submit}
            className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg disabled:opacity-50"
          >
            {busy ? 'Working…' : failures.length ? `Retry ${n} failed` : `${verb} ${n} ${noun}`}
          </button>
        </div>
      </div>
    </div>
  );
}
