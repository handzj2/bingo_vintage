// new file — added 2026-06-21 — branch drawer-overview component
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';
import { RefreshCw, Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

type DrawerSummary = {
  drawer: {
    id: number;
    userId: number;
    branchId: number;
    openingBalance: number | string;
    currentBalance: number | string;
    drawerDate: string;
    status: string;
    user?: { id: number; username: string; fullName?: string };
    branch?: { id: number; name: string };
  };
  totalPayments: number;
  totalExpenses: number;
  expectedBalance: number;
  currentBalance: number;
  paymentCount: number;
  expenseCount: number;
  transactionCount: number;
};

export default function DrawerOverview({ branchId }: { branchId?: number }) {
  const [summaries, setSummaries] = useState<DrawerSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await api.get<DrawerSummary[]>(`/cash-drawers/summaries${qs}`);
      if (res.success) {
        const raw = Array.isArray(res.data) ? res.data : [];
        // Drop malformed rows so we never read .drawer on null
        setSummaries(raw.filter((s) => s && s.drawer && s.drawer.id != null));
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to load drawer summaries');
      }
    } catch {
      setError('Failed to load drawer summaries');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-bv-meta">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-bv-danger bg-bv-danger-bg border border-bv-danger/30 p-4 rounded-bv">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
        <button type="button" onClick={load} className="ml-auto text-sm font-medium underline">Retry</button>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12 text-bv-meta">
        <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-bv-muted">No open drawers right now</p>
        <p className="text-xs mt-1">Drawers opened by cashiers today will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-bv-meta">
          {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()} — refreshes every 30s`}
        </p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-medium text-bv-muted hover:text-bv-text"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((s) => {
          const name =
            s.drawer.user?.fullName ||
            s.drawer.user?.username ||
            `User #${s.drawer.userId}`;
          const diff = Number(s.currentBalance) - Number(s.expectedBalance);
          const isBalanced = Math.abs(diff) < 1;

          return (
            <div
              key={s.drawer.id}
              className="bg-bv-surface rounded-bv border border-bv-border p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-bv-text">{name}</p>
                  <p className="text-xs text-bv-meta">
                    Drawer #{s.drawer.id} · opened{' '}
                    {new Date(s.drawer.drawerDate).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-xs font-medium bg-bv-success-bg text-bv-success px-2 py-1 rounded-full">
                  OPEN
                </span>
              </div>

              <div className="bg-bv-hover rounded-bv p-3">
                <p className="text-xs text-bv-meta mb-0.5">Current Balance</p>
                <p className="text-2xl font-bold text-bv-text">
                  {formatUGX(s.currentBalance)}
                </p>
                <p className="text-xs text-bv-meta mt-1">
                  Opening: {formatUGX(Number(s.drawer.openingBalance))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-bv-success flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-bv-text">
                      {formatUGX(s.totalPayments)}
                    </p>
                    <p className="text-xs text-bv-meta">
                      {s.paymentCount} payment{s.paymentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-bv-danger flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-bv-text">
                      {formatUGX(s.totalExpenses)}
                    </p>
                    <p className="text-xs text-bv-meta">
                      {s.expenseCount} expense{s.expenseCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`text-xs px-2 py-1.5 rounded-bv ${
                  isBalanced
                    ? 'bg-bv-success-bg text-bv-success'
                    : 'bg-bv-warning-bg text-bv-warning'
                }`}
              >
                {isBalanced
                  ? 'Balanced vs expected'
                  : `Variance ${formatUGX(diff)}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
