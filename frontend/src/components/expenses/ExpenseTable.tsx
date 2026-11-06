import React from 'react';
import Link from 'next/link';
import { formatUGX } from '@/shared/api-types';

/**
 * ExpenseTable — fixed field names
 *
 * The SnakeCaseInterceptor converts ALL response keys to snake_case.
 * Previous version used camelCase (createdAt, createdBy) — always undefined.
 * Fixed to use: created_at, created_by
 */

interface ExpenseRow {
  id:          number;
  amount:      number;
  description: string;
  status:      string;
  // SnakeCaseInterceptor converts these:
  created_at:  string;
  created_by?: { username: string } | null;
  category?:   { name: string } | null;
  category_id?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-bv-warning-bg text-bv-warning',
  approved: 'bg-bv-success-bg text-bv-success',
  rejected: 'bg-bv-danger-bg text-bv-danger',
};

export default function ExpenseTable({
  expenses,
  onRefresh,
  emptyHint,
  filterActive,
  onClearFilter,
  canCreate,
}: {
  expenses: ExpenseRow[];
  onRefresh: () => void;
  emptyHint?: string;
  filterActive?: boolean;
  onClearFilter?: () => void;
  canCreate?: boolean;
}) {
  if (expenses.length === 0) {
    return (
      <div className="py-12 px-4 text-center max-w-md mx-auto border border-bv-border rounded-md bg-bv-surface">
        <p className="text-sm font-semibold text-bv-text">No expenses to show</p>
        <p className="text-sm text-bv-muted mt-1">
          {emptyHint || 'No expenses found.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {filterActive && onClearFilter && (
            <button type="button" onClick={onClearFilter}
              className="text-sm border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover">
              Clear filter
            </button>
          )}
          {canCreate && (
            <Link href="/dashboard/expenses/new"
              className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover">
              New expense
            </Link>
          )}
          <button type="button" onClick={onRefresh}
            className="text-sm border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bv-surface rounded-xl border border-bv-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-bv-hover border-b border-bv-border">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">Category</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">Description</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-bv-muted">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bv-muted">Created By</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} className="border-b border-bv-border hover:bg-bv-hover">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/expenses/${exp.id}`}
                  className="text-bv-accent hover:underline font-medium"
                >
                  #{exp.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-bv-muted">
                {/* FIX: was exp.createdAt (undefined) — interceptor sends created_at */}
                {exp.created_at
                  ? new Date(exp.created_at).toLocaleDateString('en-UG', {
                      day:   '2-digit',
                      month: 'short',
                      year:  'numeric',
                    })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-bv-text">
                {/* FIX: category relation — guard against null, fall back to id */}
                {exp.category?.name ?? `Cat #${exp.category_id ?? '—'}`}
              </td>
              <td className="px-4 py-3 text-sm text-bv-muted max-w-xs truncate">
                {exp.description}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatUGX(Number(exp.amount))}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs capitalize font-medium ${
                    STATUS_COLORS[exp.status] ?? 'bg-bv-hover text-bv-muted'
                  }`}
                >
                  {exp.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-bv-muted">
                {/* FIX: was exp.createdBy?.username — interceptor sends created_by */}
                {exp.created_by?.username ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
