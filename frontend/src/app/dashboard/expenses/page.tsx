'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client';
import ExpenseTable from '@/components/expenses/ExpenseTable';

export default function ExpensesPage() {
  const { user, can } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get<any>('/expenses');
      if (res.success) {
        const d = res.data;
        setExpenses(Array.isArray(d) ? d : (d?.items ?? []));
      } else {
        setExpenses([]);
        setLoadError(res.message || 'Could not load expenses.');
      }
    } catch (e: any) {
      setExpenses([]);
      setLoadError(e?.message || 'Could not load expenses. Check connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = expenses.filter(e => filter === 'all' || e.status === filter);
  const role = (user?.role ?? '').toLowerCase();
  const canCreate = ['admin', 'manager', 'cashier', 'superadmin'].includes(role) || can('expense.create');

  const pending = expenses.filter(e => e.status === 'pending').length;
  const approved = expenses.filter(e => e.status === 'approved').length;

  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">Expenses</h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Branch spending records. Pending items need manager or admin approval before they affect drawer reconciliation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadExpenses()}
            disabled={loading}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {canCreate && (
            <Link
              href="/dashboard/expenses/new"
              className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover"
            >
              New expense
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border border-bv-border rounded-md p-4 bg-bv-surface">
        <div>
          <p className="text-xs text-bv-muted">In this list</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : expenses.length}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Pending approval</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : pending}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Approved</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : approved}</p>
        </div>
      </div>

      {loadError && (
        <div className="border border-bv-danger/30 bg-bv-danger-bg text-bv-danger text-sm px-3 py-2 rounded-md flex flex-wrap items-center justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" onClick={() => loadExpenses()} className="font-medium underline">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded text-sm capitalize border ${
              filter === status
                ? 'border-bv-action bg-bv-action text-white'
                : 'border-bv-border bg-bv-surface text-bv-muted hover:bg-bv-hover'
            }`}
          >
            {status}
          </button>
        ))}
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="text-sm text-bv-muted underline px-2"
          >
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-bv-muted">Loading expenses…</p>
      ) : (
        <ExpenseTable
          expenses={filteredExpenses}
          onRefresh={loadExpenses}
          emptyHint={
            filter !== 'all'
              ? 'Nothing in this status. Clear the filter to see all expenses.'
              : 'No expenses recorded yet. Create one when the branch spends cash or mobile money.'
          }
          filterActive={filter !== 'all'}
          onClearFilter={() => setFilter('all')}
          canCreate={canCreate}
        />
      )}
    </div>
  );
}
