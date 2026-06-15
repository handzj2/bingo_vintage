'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client'; // FIX: was `import api from` (default) — client only has named export
import { Plus } from 'lucide-react';
import ExpenseTable from '@/components/expenses/ExpenseTable';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]); // FIX: typed as any[] not bare []
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    const res = await api.get<any>('/expenses');
    if (res.success) {
      const d = res.data;
      setExpenses(Array.isArray(d) ? d : (d?.items ?? []));
    } // FIX: ?? [] guards against undefined
    setLoading(false);
  };

  const filteredExpenses = expenses.filter(e => filter === 'all' || e.status === filter);
  const canCreate = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'cashier';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expenses</h1>
        {canCreate && (
          <Link href="/dashboard/expenses/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" /> New Expense
          </Link>
        )}
      </div>
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              filter === status ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      {loading ? <div>Loading...</div> : <ExpenseTable expenses={filteredExpenses} onRefresh={loadExpenses} />}
    </div>
  );
}
