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

/** A queue whose query failed. Its count/items are NOT zero — they are unknown. */
export type QueueError = {
  code: 'QUEUE_SCHEMA_MISMATCH' | 'QUEUE_QUERY_FAILED' | 'QUEUE_DB_UNAVAILABLE';
  message: string;
  /** Quote this to support: it is in the server log next to the full diagnostic. */
  reference: string;
  /** Present for administrators only. */
  diagnostic?: { category: string; pgCode?: string; detail?: string; table?: string; column?: string; remedy: string };
};

export type QueueKey = 'loans' | 'expenses' | 'reversals' | 'corrections' | 'overdueDrawers';
export type Queue = { count: number; items: PendingItem[]; error?: QueueError };

export type PendingWork = {
  loans: Queue;
  expenses: Queue;
  reversals: Queue;
  corrections: Queue;
  overdueDrawers: Queue;
  /** Sum of the queues that loaded. A lower bound whenever `status === 'degraded'`. */
  total: number;
  status?: 'ok' | 'degraded';
  failedQueues?: QueueKey[];
  generatedAt?: string;
};

/** Event used to make every usePendingWork() instance (sidebar, bell, work queue) refetch now. */
export const PENDING_WORK_REFRESH_EVENT = 'pending-work:refresh';
export function requestPendingWorkRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PENDING_WORK_REFRESH_EVENT));
}

/** Queues that failed to load (never treat these as empty). */
export function failedQueueKeys(data: PendingWork): QueueKey[] {
  return (['loans', 'expenses', 'reversals', 'corrections', 'overdueDrawers'] as QueueKey[]).filter((k) => !!data[k]?.error);
}

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
      can('loan.approve_correction') ||
      can('drawer.force_close') ||
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
          status: res.data.status,
          failedQueues: res.data.failedQueues,
          generatedAt: res.data.generatedAt,
        });
      } else {
        // Keep the last good data, but surface the failure: callers must not show "all clear".
        setError(res.message || 'Failed to load pending work');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [canSeeAny]);

  // Refetch immediately when any action page reports a decision (approve/reject/force-close ...).
  useEffect(() => {
    const onRefresh = () => { refresh(); };
    window.addEventListener(PENDING_WORK_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PENDING_WORK_REFRESH_EVENT, onRefresh);
  }, [refresh]);

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
