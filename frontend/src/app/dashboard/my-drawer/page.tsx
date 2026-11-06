// new file — added 2026-06-21 — self-service drawer open/view/close page.
// Previously there was no frontend UI to actually OPEN a drawer at all —
// the backend endpoints (POST /cash-drawers/open, /close/:id, GET /current)
// existed but nothing called them. This is why the cash-drawer dropdown on
// the Payments/Expenses forms always showed empty: nobody could open one.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';
import { Wallet, Lock, Unlock, TrendingUp, TrendingDown, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

type DrawerSummary = {
  drawer: {
    id: number;
    openingBalance: number | string;
    currentBalance: number | string;
    drawerDate: string;
    status: string;
  };
  totalPayments: number;
  totalExpenses: number;
  expectedBalance: number;
  currentBalance: number;
  paymentCount: number;
  expenseCount: number;
};

export default function MyDrawerPage() {
  const { user } = useAuth();
  const [summary, setSummary]   = useState<DrawerSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open-drawer form
  const [openingBalance, setOpeningBalance] = useState('');

  // Close-drawer form
  const [showClose, setShowClose] = useState(false);
  const [actualCash, setActualCash] = useState('');

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ id: number }>('/cash-drawers/current');
      if (res.success && res.data) {
        const sumRes = await api.get<DrawerSummary>(`/cash-drawers/${res.data.id}/summary`);
        const payload = sumRes.data as DrawerSummary | null;
        // Guard: summary must include a drawer object
        if (sumRes.success && payload && payload.drawer && payload.drawer.id != null) {
          setSummary(payload);
        } else {
          setSummary(null);
          setError(sumRes.message || 'Could not load drawer summary.');
        }
      } else {
        // 404 / no open drawer is normal — show open form, not an error
        setSummary(null);
      }
    } catch (e: any) {
      const msg = e?.message || '';
      // Treat "No open drawer" style messages as empty state
      if (/no open drawer|not found|404/i.test(msg)) {
        setSummary(null);
      } else {
        setSummary(null);
        setError(msg || 'Could not load drawer. Check connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  const handleOpen = async () => {
    if (!openingBalance || Number(openingBalance) < 0) {
      setError('Enter a valid opening balance (0 or more)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/cash-drawers/open', { openingBalance: Number(openingBalance) });
      if (res.success) {
        setOpeningBalance('');
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

  const handleClose = async () => {
    if (!summary) return;
    if (!actualCash || Number(actualCash) < 0) {
      setError('Enter the actual cash counted (0 or more)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/cash-drawers/close/${summary.drawer.id}`, { actualCash: Number(actualCash) });
      if (res.success) {
        setShowClose(false);
        setActualCash('');
        toast.success('Drawer closed');
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

  // Business rule: only cashiers open/use a drawer. Admin and manager
  // monitor drawers via the branch overview page (/dashboard/finance/drawers)
  // but do not open one themselves.
  const role = (user?.role ?? '').toLowerCase();
  if (!loading && role !== 'cashier') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="border-b border-bv-border pb-4 mb-6">
          <h1 className="text-lg font-semibold text-bv-text">My drawer</h1>
        </div>
        <div className="max-w-md">
          <p className="text-sm font-semibold text-bv-text">Cashiers only</p>
          <p className="text-sm text-bv-muted mt-1">
            Only cashiers open and close the branch drawer. As {role || 'staff'}, use the branch overview to monitor open drawers.
          </p>
          <a
            href="/dashboard/finance/drawers"
            className="inline-block mt-4 text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover"
          >
            Drawer overview
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-bv-border pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">My drawer</h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Open at start of day with the float. Close at end of day with counted cash. Payments and expenses attach to the open drawer.
          </p>
        </div>
        <button type="button" onClick={() => loadCurrent()} disabled={loading}
          className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover disabled:opacity-50">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-bv-danger bg-bv-danger-bg border border-bv-danger/30 px-3 py-2 rounded-md text-sm">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</span>
          <button type="button" onClick={() => loadCurrent()} className="font-medium underline">Retry</button>
        </div>
      )}

      {loading && !summary && (
        <div className="flex flex-col items-center gap-3 text-sm py-12 justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-bv-border border-t-bv-action" role="status" aria-label="Bingo Vintage loading" />
          <p className="font-semibold text-bv-text">
            Bingo Vintage
            <span className="text-bv-meta font-normal"> · loading</span>
          </p>
        </div>
      )}

      {!loading && !summary && (
        // ── No open drawer — show the open form ──────────────────────────
        <div className="bg-bv-surface rounded-bv border border-bv-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bv-warning-bg flex items-center justify-center">
              <Lock className="w-5 h-5 text-bv-warning" />
            </div>
            <div>
              <p className="font-semibold text-bv-text">No open drawer at this branch</p>
              <p className="text-sm text-bv-meta">Open one now to start recording cash transactions.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bv-muted mb-1">Opening Balance</label>
            <input
              type="number" min="0" step="0.01"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-bv-border rounded-bv px-3 py-2"
            />
            <p className="text-xs text-bv-meta mt-1">Count the physical cash you're starting your shift with.</p>
          </div>

          <button
            onClick={handleOpen}
            disabled={submitting || !openingBalance}
            className="w-full flex items-center justify-center gap-2 bg-bv-success text-white px-4 py-2.5 rounded-bv font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            {submitting ? 'Opening...' : 'Open Drawer'}
          </button>
        </div>
      )}

      {!loading && summary && summary.drawer && (
        // ── Open drawer exists — show live summary + close option ────────
        <div className="space-y-4">
          <div className="bg-bv-surface rounded-bv border border-bv-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bv-success-bg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-bv-success" />
                </div>
                <div>
                  <p className="font-semibold text-bv-text">Drawer #{summary.drawer.id}</p>
                  <p className="text-xs text-bv-meta">
                    Opened {new Date(summary.drawer.drawerDate).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium bg-bv-success-bg text-bv-success px-2 py-1 rounded-full">OPEN</span>
            </div>

            <div className="bg-bv-hover rounded-bv p-4">
              <p className="text-xs text-bv-meta mb-0.5">Current Balance</p>
              <p className="text-3xl font-bold text-bv-text">{formatUGX(summary.currentBalance)}</p>
              <p className="text-xs text-bv-meta mt-1">
                Opening: {formatUGX(Number(summary.drawer.openingBalance))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-bv-success flex-shrink-0" />
                <div>
                  <p className="font-semibold text-bv-text">{formatUGX(summary.totalPayments)}</p>
                  <p className="text-xs text-bv-meta">{summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''} today</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-bv-danger flex-shrink-0" />
                <div>
                  <p className="font-semibold text-bv-text">{formatUGX(summary.totalExpenses)}</p>
                  <p className="text-xs text-bv-meta">{summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''} today</p>
                </div>
              </div>
            </div>
          </div>

          {!showClose ? (
            <button
              onClick={() => setShowClose(true)}
              className="w-full flex items-center justify-center gap-2 bg-bv-action text-white px-4 py-2.5 rounded-lg font-medium hover:bg-bv-action-hover"
            >
              <Lock className="w-4 h-4" /> Close Drawer
            </button>
          ) : (
            <div className="bg-bv-surface rounded-xl border border-bv-border p-6 space-y-4">
              <p className="font-semibold text-bv-text">Close Drawer #{summary.drawer.id}</p>
              <div className="bg-bv-info-bg p-3 rounded-lg text-sm text-bv-accent">
                Expected cash: <strong>{formatUGX(summary.expectedBalance)}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-bv-muted mb-1">Actual Cash Counted</label>
                <input
                  type="number" min="0" step="0.01"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  placeholder="Count your physical cash now"
                  className="w-full border border-bv-border rounded-lg px-3 py-2"
                />
              </div>
              {actualCash && (
                <div className={`text-sm p-3 rounded-lg ${
                  Math.abs(Number(actualCash) - summary.expectedBalance) < 1
                    ? 'bg-bv-success-bg text-bv-success'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  Difference: {formatUGX(Number(actualCash) - summary.expectedBalance)}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClose(false)}
                  className="flex-1 px-4 py-2 border border-bv-border rounded-lg text-sm font-medium hover:bg-bv-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  disabled={submitting || !actualCash}
                  className="flex-1 bg-bv-action text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-bv-action-hover disabled:opacity-50"
                >
                  {submitting ? 'Closing...' : 'Confirm Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
