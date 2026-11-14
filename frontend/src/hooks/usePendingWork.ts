'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

export type PendingItem = {
  id: number;
  type: 'loan' | 'expense' | 'reversal' | 'correction' | 'overdue_drawer';
  reference: string;
  amount?: number;
  branchId?: number;
  submittedAt: string;
  status: string;
  submittedBy: string;
  clientName?: string;
  description?: string;
  href: string;
};

export type PendingWork = {
  loans: { count: number; items: PendingItem[] };
  expenses: { count: number; items: PendingItem[] };
  reversals: { count: number; items: PendingItem[] };
  corrections: { count: number; items: PendingItem[] };
  overdueDrawers: { count: number; items: PendingItem[] };
  total: number;
  generatedAt?: string;
};

const EMPTY: PendingWork = {
  loans: { count: 0, items: [] },
  expenses: { count: 0, items: [] },
  reversals: { count: 0, items: [] },
  corrections: { count: 0, items: [] },
  overdueDrawers: { count: 0, items: [] },
  total: 0,
};

const POLL_MS = 60_000; // 1 minute — avoid excessive polling

/**
 * Central pending-work hook for sidebar badges and notification centre.
 * Only fetches when the user has at least one approval-related permission.
 */
export function usePendingWork() {
  const { user, can, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<PendingWork>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSeeAny =
    !!user &&
    (can('loan.approve') ||
      can('expense.approve') ||
      can('payment.reverse') ||
      can('payment.reversal.approve') ||
      user.role === 'admin' ||
      user.role === 'superadmin' ||
      user.role === 'manager');

  const refresh = useCallback(async () => {
    if (!canSeeAny) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PendingWork>('/dashboard/pending-work');
      if (res.success && res.data) {
        setData({
          loans: res.data.loans ?? EMPTY.loans,
          expenses: res.data.expenses ?? EMPTY.expenses,
          reversals: res.data.reversals ?? EMPTY.reversals,
          corrections: res.data.corrections ?? EMPTY.corrections,
          overdueDrawers: res.data.overdueDrawers ?? EMPTY.overdueDrawers,
          total: res.data.total ?? 0,
          generatedAt: res.data.generatedAt,
        });
      } else {
        setError(res.message || 'Failed to load pending work');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [canSeeAny]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
    if (canSeeAny) {
      timer.current = setInterval(refresh, POLL_MS);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [authLoading, canSeeAny, refresh]);

  return { data, loading, error, refresh, canSeeAny };
}
