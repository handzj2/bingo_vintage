'use client';

/**
 * My Drawer — permission-driven daily lifecycle
 * Open / close / force-close / discrepancy / overdue states
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';
import {
  Wallet, Lock, Unlock, AlertCircle, Loader2, ShieldAlert, Clock, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Drawer = {
  id: number;
  openingBalance: number | string;
  currentBalance: number | string;
  closingBalance?: number | string;
  expectedBalance?: number | string;
  difference?: number | string;
  drawerDate: string;
  status: string;
  forceCloseReason?: string | null;
  isOverrideOpen?: boolean;
  notes?: string | null;
};

type DrawerSummary = {
  drawer: Drawer;
  totalPayments: number;
  totalExpenses: number;
  expectedBalance: number;
  currentBalance: number;
  paymentCount: number;
  expenseCount: number;
  transactionCount?: number;
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isOverdue(drawerDate: string): boolean {
  try {
    const dd = startOfLocalDay(new Date(drawerDate));
    const today = startOfLocalDay(new Date());
    return dd < today;
  } catch {
    return false;
  }
}

export default function MyDrawerPage() {
  const { user, can } = useAuth();
  const [summary, setSummary] = useState<DrawerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [openingBalance, setOpeningBalance] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [showClose, setShowClose] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [forceReason, setForceReason] = useState('');

  const canOpen = can('drawer.open') || can('drawer.manage');
  const canClose = can('drawer.close') || can('drawer.manage');
  const canForce = can('drawer.force_close') || can('drawer.manage');
  const canView = can('drawer.view') || canOpen || canClose || canForce;

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ id: number }>('/cash-drawers/current');
      if (res.success && res.data?.id) {
        const sumRes = await api.get<DrawerSummary>(`/cash-drawers/${res.data.id}/summary`);
        const payload = sumRes.data as DrawerSummary | null;
        if (sumRes.success && payload?.drawer?.id != null) {
          setSummary(payload);
        } else {
          setSummary(null);
          setError(sumRes.message || 'Could not load drawer summary.');
        }
      } else {
        setSummary(null);
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (/no open drawer|not found|404/i.test(msg)) {
        setSummary(null);
      } else {
        setSummary(null);
        setError(msg || 'Could not load drawer.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  const handleOpen = async () => {
    if (!canOpen) {
      toast.error('You do not have permission to open a drawer');
      return;
    }
    if (openingBalance === '' || Number(openingBalance) < 0) {
      setError('Enter a valid opening balance (0 or more)');
      return;
    }
    if (overrideOpen && overrideReason.trim().length < 5) {
      setError('Override reason is required (min 5 characters)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body: any = { openingBalance: Number(openingBalance) };
      if (overrideOpen) {
        body.isOverride = true;
        body.overrideReason = overrideReason.trim();
      }
      const res = await api.post('/cash-drawers/open', body);
      if (res.success) {
        setOpeningBalance('');
        setOverrideOpen(false);
        setOverrideReason('');
        toast.success('Drawer opened');
        await loadCurrent();
      } else {
        const msg = res.message || 'Failed to open drawer';
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = e.message || 'Failed to open drawer';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (force: boolean) => {
    if (!summary) return;
    if (force && !canForce) {
      toast.error('You do not have permission to force-close');
      return;
    }
    if (!force && !canClose) {
      toast.error('You do not have permission to close a drawer');
      return;
    }
    if (actualCash === '' || Number(actualCash) < 0) {
      setError('Enter the actual cash counted (0 or more)');
      return;
    }
    const expected = Number(summary.expectedBalance ?? summary.drawer.expectedBalance ?? 0);
    const diff = Number(actualCash) - expected;
    if (Math.abs(diff) > 0.009 && discrepancyReason.trim().length < 3) {
      setError('A non-zero cash difference requires an explanation');
      return;
    }
    if (force && forceReason.trim().length < 5) {
      setError('Force-close reason is required (min 5 characters)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const path = force
        ? `/cash-drawers/force-close/${summary.drawer.id}`
        : `/cash-drawers/close/${summary.drawer.id}`;
      const body: any = {
        actualCash: Number(actualCash),
        discrepancyReason: discrepancyReason.trim() || undefined,
      };
      if (force) {
        body.forceClose = true;
        body.forceReason = forceReason.trim();
      }
      const res = await api.post(path, body);
      if (res.success) {
        setShowClose(false);
        setActualCash('');
        setDiscrepancyReason('');
        setForceReason('');
        toast.success(force ? 'Drawer force-closed' : 'Drawer closed');
        await loadCurrent();
      } else {
        const msg = res.message || 'Failed to close drawer';
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = e.message || 'Failed to close drawer';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView && !loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold text-bv-text mb-2">My drawer</h1>
        <p className="text-sm text-bv-muted">
          You do not have permission to view cash drawers. Contact your administrator.
        </p>
        <Link href="/dashboard" className="inline-block mt-4 text-sm text-bv-action underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const overdue = summary ? isOverdue(summary.drawer.drawerDate) : false;
  const statusLabel = !summary
    ? 'No drawer opened today'
    : overdue
      ? 'Drawer overdue for closing'
      : summary.drawer.status === 'open'
        ? 'Drawer currently open'
        : summary.drawer.status === 'closed'
          ? 'Drawer closed'
          : summary.drawer.status;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-bv-border pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">My drawer</h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Branch-shared drawer. Open with float, close with counted cash. Permissions control who can open, close or force-close.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/finance/drawers"
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover"
          >
            Overview
          </Link>
          <button
            type="button"
            onClick={() => loadCurrent()}
            disabled={loading}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${
          overdue
            ? 'bg-red-50 border-red-200 text-red-800'
            : summary
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        {overdue ? <ShieldAlert className="w-4 h-4 shrink-0" /> : summary ? <Unlock className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
        <span className="font-medium">{statusLabel}</span>
        {summary && (
          <span className="text-xs opacity-80">
            · {summary.drawer.drawerDate?.toString().slice(0, 10)} · #{summary.drawer.id}
          </span>
        )}
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-bv-danger bg-bv-danger-bg border border-bv-danger/30 px-3 py-2 rounded-md text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => loadCurrent()} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {loading && !summary && (
        <div className="flex flex-col items-center gap-3 text-sm py-12 justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-bv-muted" />
          <p className="text-bv-meta">Loading drawer…</p>
        </div>
      )}

      {/* No open drawer */}
      {!loading && !summary && canOpen && (
        <div className="bg-bv-surface rounded-bv border border-bv-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bv-warning-bg flex items-center justify-center">
              <Lock className="w-5 h-5 text-bv-warning" />
            </div>
            <div>
              <p className="font-semibold text-bv-text">No open drawer at this branch</p>
              <p className="text-sm text-bv-meta">Open one to start recording cash transactions for today.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-bv-text mb-1">Opening float (UGX)</label>
            <input
              type="number"
              min={0}
              step="1"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full border border-bv-border rounded-md px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-bv-text">
            <input
              type="checkbox"
              checked={overrideOpen}
              onChange={(e) => setOverrideOpen(e.target.checked)}
            />
            Manager override open (same-day re-open after close)
          </label>
          {overrideOpen && (
            <div>
              <label className="block text-sm font-medium text-bv-text mb-1">Override reason</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full border border-bv-border rounded-md px-3 py-2 text-sm"
                rows={2}
                placeholder="Why is an override open required?"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleOpen}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 bg-bv-action text-white text-sm font-medium rounded-md hover:bg-bv-action-hover disabled:opacity-50"
          >
            {submitting ? 'Opening…' : 'Open drawer'}
          </button>
        </div>
      )}

      {!loading && !summary && !canOpen && (
        <div className="bg-bv-surface rounded-bv border border-bv-border p-5">
          <p className="text-sm text-bv-text font-medium">No open drawer</p>
          <p className="text-sm text-bv-muted mt-1">
            You can view drawers but do not have permission to open one. Ask a cashier or manager with drawer.open.
          </p>
        </div>
      )}

      {/* Open drawer summary + close */}
      {summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-bv-surface border border-bv-border rounded-md p-3">
              <p className="text-xs text-bv-meta">Opening float</p>
              <p className="text-sm font-semibold text-bv-text">{formatUGX(Number(summary.drawer.openingBalance))}</p>
            </div>
            <div className="bg-bv-surface border border-bv-border rounded-md p-3">
              <p className="text-xs text-bv-meta">Collections</p>
              <p className="text-sm font-semibold text-bv-text">{formatUGX(summary.totalPayments)} <span className="text-xs font-normal text-bv-meta">({summary.paymentCount})</span></p>
            </div>
            <div className="bg-bv-surface border border-bv-border rounded-md p-3">
              <p className="text-xs text-bv-meta">Cash expenses</p>
              <p className="text-sm font-semibold text-bv-text">{formatUGX(summary.totalExpenses)} <span className="text-xs font-normal text-bv-meta">({summary.expenseCount})</span></p>
            </div>
            <div className="bg-bv-surface border border-bv-border rounded-md p-3">
              <p className="text-xs text-bv-meta">Expected balance</p>
              <p className="text-sm font-semibold text-bv-text">{formatUGX(summary.expectedBalance)}</p>
            </div>
          </div>

          {!showClose && (canClose || (overdue && canForce)) && (
            <button
              type="button"
              onClick={() => setShowClose(true)}
              className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md text-white ${
                overdue ? 'bg-red-600 hover:bg-red-700' : 'bg-bv-action hover:bg-bv-action-hover'
              }`}
            >
              {overdue ? 'Force-close overdue drawer' : 'Close drawer'}
            </button>
          )}

          {showClose && (
            <div className="bg-bv-surface border border-bv-border rounded-md p-4 space-y-3">
              <p className="text-sm font-semibold text-bv-text flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {overdue ? 'Force-close with counted cash' : 'Close with counted cash'}
              </p>
              <p className="text-xs text-bv-meta">
                Expected: {formatUGX(summary.expectedBalance)}. Enter the physical count. Never invent a count.
              </p>
              <div>
                <label className="block text-sm font-medium text-bv-text mb-1">Actual cash counted (UGX)</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full border border-bv-border rounded-md px-3 py-2 text-sm"
                />
              </div>
              {actualCash !== '' && Math.abs(Number(actualCash) - Number(summary.expectedBalance)) > 0.009 && (
                <div>
                  <label className="block text-sm font-medium text-bv-text mb-1">Explanation for difference</label>
                  <textarea
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    className="w-full border border-bv-border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Required when counted cash ≠ expected"
                  />
                </div>
              )}
              {overdue && (
                <div>
                  <label className="block text-sm font-medium text-bv-text mb-1">Force-close reason</label>
                  <textarea
                    value={forceReason}
                    onChange={(e) => setForceReason(e.target.value)}
                    className="w-full border border-bv-border rounded-md px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Why is this drawer being force-closed after its business day?"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleClose(overdue)}
                  className={`px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 ${
                    overdue ? 'bg-red-600 hover:bg-red-700' : 'bg-bv-action hover:bg-bv-action-hover'
                  }`}
                >
                  {submitting ? 'Saving…' : overdue ? 'Confirm force-close' : 'Confirm close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClose(false);
                    setActualCash('');
                    setDiscrepancyReason('');
                    setForceReason('');
                  }}
                  className="px-4 py-2 text-sm border border-bv-border rounded-md text-bv-text hover:bg-bv-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
