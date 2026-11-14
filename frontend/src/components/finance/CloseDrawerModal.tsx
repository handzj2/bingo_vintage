'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';

export type CloseTarget = {
  id: number;
  branchName?: string;
  expectedBalance: number;
  overdue: boolean;
};

/**
 * Close / force-close dialog shared by My Drawer and Branch Drawers.
 * Calls POST /cash-drawers/close/:id, or /cash-drawers/force-close/:id when `force` is true.
 * The parent decides (via permissions) whether to render the trigger at all.
 */
export default function CloseDrawerModal({
  target, force, onClose, onDone,
}: { target: CloseTarget; force: boolean; onClose: () => void; onDone: () => void }) {
  const [actualCash, setActualCash] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const counted = Number(actualCash);
  const hasCount = actualCash.trim() !== '' && Number.isFinite(counted) && counted >= 0;
  const diff = hasCount ? counted - target.expectedBalance : 0;
  const needsReason = force || Math.abs(diff) > 0.009;

  const submit = async () => {
    setErr('');
    if (!hasCount) return setErr('Enter the counted cash (0 or more).');
    if (needsReason && reason.trim().length < 5) {
      return setErr(force ? 'A reason of at least 5 characters is required to force-close.'
                          : 'Explain the cash difference (at least 5 characters).');
    }
    setBusy(true);
    const body: any = { actualCash: counted };
    if (force) { body.forceClose = true; body.forceReason = reason.trim(); }
    if (Math.abs(diff) > 0.009) body.discrepancyReason = reason.trim();
    const res = await api.post(force ? `/cash-drawers/force-close/${target.id}` : `/cash-drawers/close/${target.id}`, body);
    setBusy(false);
    if (!res.success) { setErr(res.message || 'Could not close the drawer'); toast.error(res.message || 'Close failed'); return; }
    toast.success(force ? 'Drawer force-closed' : 'Drawer closed');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-bv-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold text-bv-text">{force ? 'Force-close drawer' : 'Close drawer'} #{target.id}</h2>
          {target.branchName && <p className="text-xs text-bv-meta">{target.branchName}</p>}
        </div>
        {force && (
          <div className="flex gap-2 text-sm bg-bv-warning-bg text-bv-warning p-3 rounded-bv">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{target.overdue ? 'This drawer is past its business day.' : 'This closes the drawer on someone else’s behalf.'} Count the cash and record why. This is audited.</span>
          </div>
        )}
        <p className="text-sm text-bv-muted">Expected cash: <strong>{formatUGX(target.expectedBalance)}</strong></p>
        <label className="block text-sm font-medium text-bv-text">Counted cash (UGX)
          <input type="number" min={0} inputMode="decimal" value={actualCash} onChange={(e) => setActualCash(e.target.value)}
            className="mt-1 w-full border border-bv-border rounded-bv px-3 py-2 bg-bv-surface" />
        </label>
        {hasCount && Math.abs(diff) > 0.009 && (
          <p className={`text-sm ${diff < 0 ? 'text-bv-danger' : 'text-bv-warning'}`}>
            {diff < 0 ? 'Shortage' : 'Surplus'} of {formatUGX(Math.abs(diff))}
          </p>
        )}
        {needsReason && (
          <label className="block text-sm font-medium text-bv-text">{force ? 'Reason for force-close' : 'Reason for the difference'}
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full border border-bv-border rounded-bv px-3 py-2 bg-bv-surface" />
          </label>
        )}
        {err && <p className="text-sm text-bv-danger">{err}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">Cancel</button>
          <button type="button" onClick={submit} disabled={busy}
            className="flex-1 px-4 py-2.5 bg-bv-action text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? 'Saving…' : force ? 'Confirm force-close' : 'Confirm close'}
          </button>
        </div>
      </div>
    </div>
  );
}
