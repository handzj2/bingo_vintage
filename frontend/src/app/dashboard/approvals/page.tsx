'use client';

import Link from 'next/link';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePendingWork, failedQueueKeys, type PendingItem } from '@/hooks/usePendingWork';
import { formatUGX } from '@/shared/api-types';

const SECTIONS: { key: 'loans' | 'expenses' | 'reversals' | 'corrections' | 'overdueDrawers'; title: string }[] = [
  { key: 'loans', title: 'Loans awaiting approval' },
  { key: 'expenses', title: 'Expenses awaiting approval' },
  { key: 'reversals', title: 'Payment reversals awaiting decision' },
  { key: 'corrections', title: 'Loan corrections awaiting approval' },
  { key: 'overdueDrawers', title: 'Overdue drawers to close' },
];

/** /dashboard/approvals — one place for everything that needs the signed-in user's attention. */
export default function WorkQueuePage() {
  const { data, loading, error, refresh, canSeeAny } = usePendingWork();
  const failed = failedQueueKeys(data);
  const degraded = failed.length > 0;
  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">Work queue</h1>
          <p className="text-sm text-bv-muted">
            {degraded ? 'At least ' : ''}{data.total} item{data.total === 1 ? '' : 's'} need attention in your tenant.
            {degraded && ' Some queues could not be loaded — see below.'}
          </p>
        </div>
        <button type="button" onClick={refresh} className="flex items-center gap-1.5 text-sm text-bv-muted hover:text-bv-text">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {!canSeeAny && <p className="text-sm text-bv-muted">You have no approval permissions, so there is nothing queued for you.</p>}
      {error && (
        <p role="alert" className="text-sm text-bv-danger" data-testid="queue-load-error">
          The work queue could not be refreshed: {error}. {failed.length === 0 && 'Counts shown below may be out of date — this is not an all-clear.'}
        </p>
      )}
      {loading && data.total === 0 && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {canSeeAny && !loading && data.total === 0 && !error && !degraded && (
        <div className="flex items-center gap-2 text-bv-success text-sm"><CheckCircle2 className="w-5 h-5" /> Nothing is waiting on you.</div>
      )}
      {SECTIONS.map(({ key, title }) => {
        const sec = data[key];
        if (sec?.error) {
          // A failed queue is NOT an empty queue: say so, with the reference support needs.
          return (
            <section key={key} className="space-y-2" data-testid={`queue-error-${key}`}>
              <h2 className="text-sm font-semibold text-bv-text">{title} <span className="text-bv-danger">(unavailable)</span></h2>
              <div role="alert" className="border border-bv-danger rounded-bv px-4 py-3 text-sm space-y-1">
                <p className="flex items-start gap-2 text-bv-danger"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{sec.error.message}</span></p>
                {sec.error.diagnostic && (
                  <p className="text-xs text-bv-meta break-words">
                    <b>Admin diagnostic:</b> {sec.error.diagnostic.category}{sec.error.diagnostic.pgCode ? ` (${sec.error.diagnostic.pgCode})` : ''}
                    {sec.error.diagnostic.detail ? ` — ${sec.error.diagnostic.detail}` : ''}. {sec.error.diagnostic.remedy}
                  </p>
                )}
              </div>
            </section>
          );
        }
        if (!sec || sec.count === 0) return null;
        return (
          <section key={key} className="space-y-2">
            <h2 className="text-sm font-semibold text-bv-text">{title} <span className="text-bv-meta">({sec.count})</span></h2>
            <ul className="border border-bv-border rounded-bv divide-y divide-bv-border">
              {sec.items.map((it: PendingItem) => (
                <li key={`${it.type}-${it.id}`}>
                  <Link href={it.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bv-hover">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-bv-text truncate">{it.reference}{it.clientName ? ` · ${it.clientName}` : ''}</p>
                      <p className="text-xs text-bv-meta truncate">{it.description || it.status} · {it.submittedBy}</p>
                    </div>
                    {it.amount != null && <span className="text-sm font-semibold text-bv-text whitespace-nowrap">{formatUGX(Number(it.amount))}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
