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
        if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      } else {
        setSummary(null); // no open drawer — show the "open" form
      }
    } catch {
      setSummary(null);
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
        await loadCurrent();
      } else {
        setError(res.message || 'Failed to open drawer');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to open drawer');
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
        await loadCurrent();
      } else {
        setError(res.message || 'Failed to close drawer');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to close drawer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Business rule: only cashiers open/use a drawer. Admin and manager
  // monitor drawers via the branch overview page (/dashboard/finance/drawers)
  // but do not open one themselves.
  const role = (user?.role ?? '').toLowerCase();
  if (role !== 'cashier') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm mx-auto py-16">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cashiers Only</h2>
            <p className="text-sm text-gray-500 mt-1">
              Only cashiers open and use the branch drawer. As {role || 'a non-cashier'}, you can
              monitor every open drawer at the branch level instead.
            </p>
          </div>
          <a
            href="/dashboard/finance/drawers"
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            Go to Drawer Overview
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Branch Drawer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Shared with every cashier at your branch. Open it at the start of the day —
          any of you can use it until someone closes it at end of day.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!summary ? (
        // ── No open drawer — show the open form ──────────────────────────
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">No open drawer at this branch</p>
              <p className="text-sm text-gray-500">Open one now to start recording cash transactions.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
            <input
              type="number" min="0" step="0.01"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">Count the physical cash you're starting your shift with.</p>
          </div>

          <button
            onClick={handleOpen}
            disabled={submitting || !openingBalance}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            {submitting ? 'Opening...' : 'Open Drawer'}
          </button>
        </div>
      ) : (
        // ── Open drawer exists — show live summary + close option ────────
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Drawer #{summary.drawer.id}</p>
                  <p className="text-xs text-gray-400">
                    Opened {new Date(summary.drawer.drawerDate).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">OPEN</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-0.5">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">{formatUGX(summary.currentBalance)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Opening: {formatUGX(Number(summary.drawer.openingBalance))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{formatUGX(summary.totalPayments)}</p>
                  <p className="text-xs text-gray-400">{summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''} today</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{formatUGX(summary.totalExpenses)}</p>
                  <p className="text-xs text-gray-400">{summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''} today</p>
                </div>
              </div>
            </div>
          </div>

          {!showClose ? (
            <button
              onClick={() => setShowClose(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800"
            >
              <Lock className="w-4 h-4" /> Close Drawer
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="font-semibold text-gray-900">Close Drawer #{summary.drawer.id}</p>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                Expected cash: <strong>{formatUGX(summary.expectedBalance)}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Counted</label>
                <input
                  type="number" min="0" step="0.01"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  placeholder="Count your physical cash now"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              {actualCash && (
                <div className={`text-sm p-3 rounded-lg ${
                  Math.abs(Number(actualCash) - summary.expectedBalance) < 1
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  Difference: {formatUGX(Number(actualCash) - summary.expectedBalance)}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClose(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  disabled={submitting || !actualCash}
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
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
