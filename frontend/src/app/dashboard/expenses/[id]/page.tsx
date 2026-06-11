'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import ExpenseForm from '@/components/expenses/ExpenseForm';

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadExpense();
  }, [id]);

  const loadExpense = async () => {
    const res = await api.get(`/expenses/${id}`);
    if (res.success) setExpense(res.data);
    setLoading(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!expense) return <div className="p-6">Expense not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Expense #{id}</h1>
      <ExpenseForm initialData={expense} isEdit />
    </div>
  );
}