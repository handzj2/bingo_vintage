'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import ExpenseForm from '@/components/expenses/ExpenseForm';

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (id) loadExpense();
  }, [id]);

  const loadExpense = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get(`/expenses/${id}`);
      if (res.success) {
        setExpense(res.data);
      } else {
        setExpense(null);
        setLoadError(res.message || 'Expense not found');
      }
    } catch (e: any) {
      setExpense(null);
      setLoadError(e?.message || 'Could not load expense');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-bv-form mx-auto">
        <p className="text-sm text-bv-muted">Loading expense…</p>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-4 sm:p-6 max-w-bv-form mx-auto space-y-3">
        <h1 className="text-lg font-semibold text-bv-text">Expense</h1>
        <div className="border border-bv-danger/30 bg-bv-danger-bg text-bv-danger text-sm px-3 py-2 rounded-md">
          {loadError || 'Expense not found'}
        </div>
        <Link href="/dashboard/expenses" className="text-sm text-bv-accent hover:underline">
          Back to expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-bv-form mx-auto space-y-4">
      <div className="border-b border-bv-border pb-4">
        <p className="text-xs text-bv-meta mb-1">
          <Link href="/dashboard/expenses" className="hover:underline">Expenses</Link>
          {' / '}#{id}
        </p>
        <h1 className="text-lg font-semibold text-bv-text">Expense #{id}</h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Review or update this record. Status and amounts follow existing approval rules.
        </p>
      </div>
      <ExpenseForm initialData={expense} isEdit />
    </div>
  );
}
