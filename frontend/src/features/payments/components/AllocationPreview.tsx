'use client';

import { useEffect, useState, useCallback } from 'react';

export type AllocationLine = {
  scheduleId: number;
  installmentNumber: number;
  dueDate: string | null;
  instalmentOutstanding: number;
  penaltyOutstanding: number;
  totalOutstanding: number;
  instalmentAllocated: number;
  penaltyAllocated: number;
  allocated: number;
  instalmentRemainingAfter: number;
  penaltyRemainingAfter: number;
  resultingStatus: string;
};

export type AllocationPreviewData = {
  loanId: number;
  amountReceived: number;
  totalAllocated: number;
  unallocated: number;
  totalInstalmentAllocated: number;
  totalPenaltyAllocated: number;
  policy: string;
  lines: AllocationLine[];
};

function fmt(n: number) {
  return `UGX ${Math.round(Number(n) || 0).toLocaleString()}`;
}

/**
 * Live preview: chronological allocation, penalty first within each instalment.
 */
export default function AllocationPreview({
  loanId,
  amount,
  apiBase,
  authToken,
}: {
  loanId: number | null | undefined;
  amount: string | number;
  apiBase: string;
  authToken: string | null | undefined;
}) {
  const [preview, setPreview] = useState<AllocationPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const amt = Number(amount);
    if (!loanId || !amt || amt <= 0) {
      setPreview(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const base = (apiBase || '').replace(/\/+$/, '');
      const url = `${base}/payments/preview-allocation?loanId=${loanId}&amount=${amt}`;
      const res = await fetch(url, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Preview failed (${res.status})`);
      setPreview(data as AllocationPreviewData);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message || 'Could not load allocation preview');
    } finally {
      setLoading(false);
    }
  }, [loanId, amount, apiBase, authToken]);

  useEffect(() => {
    const t = setTimeout(load, 280);
    return () => clearTimeout(t);
  }, [load]);

  if (!loanId || !Number(amount) || Number(amount) <= 0) return null;

  return (
    <div className="border border-gray-200 rounded-md bg-white p-3 space-y-2" data-testid="allocation-preview">
      <div>
        <p className="text-xs font-semibold text-gray-900">How this payment will be applied</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Oldest instalment first. Within each week: <strong>penalty first</strong>, then instalment.
          Server recalculates on confirm.
        </p>
      </div>

      {loading && <p className="text-xs text-gray-500">Calculating…</p>}
      {error && (
        <p className="text-xs text-red-800 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>
      )}

      {preview && !loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1.5 pr-2 font-medium">Instalment</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Due+penalty</th>
                  <th className="py-1.5 pr-2 font-medium text-right">To penalty</th>
                  <th className="py-1.5 pr-2 font-medium text-right">To instalment</th>
                  <th className="py-1.5 font-medium text-right">Still owed</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.scheduleId} className="border-b border-gray-50">
                    <td className="py-1.5 pr-2">
                      #{l.installmentNumber}
                      <span className="text-gray-500"> · {l.dueDate || '—'} · {l.resultingStatus}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(l.totalOutstanding)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-amber-900">
                      {l.penaltyAllocated ? fmt(l.penaltyAllocated) : '—'}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                      {l.instalmentAllocated ? fmt(l.instalmentAllocated) : '—'}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmt((l.instalmentRemainingAfter || 0) + (l.penaltyRemainingAfter || 0))}
                    </td>
                  </tr>
                ))}
                {preview.lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-2 text-gray-600">
                      No open instalments or penalties to allocate against.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-800 space-y-0.5 pt-2 border-t border-gray-100">
            <p>Received: <span className="font-semibold tabular-nums">{fmt(preview.amountReceived)}</span></p>
            <p>
              To instalments:{' '}
              <span className="font-semibold tabular-nums">{fmt(preview.totalInstalmentAllocated || 0)}</span>
              {' · '}
              To penalties:{' '}
              <span className="font-semibold tabular-nums text-amber-900">
                {fmt(preview.totalPenaltyAllocated || 0)}
              </span>
            </p>
            {preview.unallocated > 0 && (
              <p className="text-amber-900">
                Unallocated: <span className="font-semibold tabular-nums">{fmt(preview.unallocated)}</span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
