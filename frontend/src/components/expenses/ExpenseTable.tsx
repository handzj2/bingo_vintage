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
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ExpenseTable({
  expenses,
  onRefresh,
}: {
  expenses: ExpenseRow[];
  onRefresh: () => void;
}) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No expenses found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Created By</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/expenses/${exp.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  #{exp.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {/* FIX: was exp.createdAt (undefined) — interceptor sends created_at */}
                {exp.created_at
                  ? new Date(exp.created_at).toLocaleDateString('en-UG', {
                      day:   '2-digit',
                      month: 'short',
                      year:  'numeric',
                    })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {/* FIX: category relation — guard against null, fall back to id */}
                {exp.category?.name ?? `Cat #${exp.category_id ?? '—'}`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                {exp.description}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatUGX(Number(exp.amount))}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs capitalize font-medium ${
                    STATUS_COLORS[exp.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {exp.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
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
