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
        setSummaries(Array.isArray(res.data) ? res.data : []);
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
    // Auto-refresh every 30s so balances stay current through the day
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No open drawers right now</p>
        <p className="text-xs mt-1">Drawers opened by cashiers today will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()} — refreshes every 30s`}
        </p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map(s => {
          const name = s.drawer.user?.fullName || s.drawer.user?.username || `User #${s.drawer.userId}`;
          const diff = s.currentBalance - s.expectedBalance;
          const isBalanced = Math.abs(diff) < 1;

          return (
            <div key={s.drawer.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              {/* Cashier header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">
                    Drawer #{s.drawer.id} · opened {new Date(s.drawer.drawerDate).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">
                  OPEN
                </span>
              </div>

              {/* Balance */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatUGX(s.currentBalance)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Opening: {formatUGX(Number(s.drawer.openingBalance))}
                </p>
              </div>

              {/* Today's activity */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{formatUGX(s.totalPayments)}</p>
                    <p className="text-xs text-gray-400">{s.paymentCount} payment{s.paymentCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{formatUGX(s.totalExpenses)}</p>
                    <p className="text-xs text-gray-400">{s.expenseCount} expense{s.expenseCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Expected vs actual — flags mismatches before end-of-day reconciliation */}
              <div className={`text-xs px-3 py-2 rounded-lg ${isBalanced ? 'bg-gray-50 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>
                Expected: {formatUGX(s.expectedBalance)}
                {!isBalanced && ` · Off by ${formatUGX(Math.abs(diff))}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
