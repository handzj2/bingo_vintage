'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface PendingExpense {
  id:          number;
  amount:      number | string;
  description: string;
  status:      string;
  payment_method?: string;
  created_at:  string;
  category?:   { name: string } | null;
  category_id?: number;
  created_by?: { username: string; full_name?: string } | null;
}

export default function ExpenseApprovalPage() {
  const { user, can } = useAuth();
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage]   = useState('');

  const canApprove = can('expense.approve') || user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.get<PendingExpense[]>('/expenses?status=pending');
      if (res.success) setExpenses(res.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessing(id);
    setMessage('');
    try {
      const res = await api.patch(`/expenses/${id}/approve`);
      if (res.success) {
        setMessage(`Expense #${id} approved successfully`);
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        setMessage(res.message ?? 'Approval failed');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessing(id);
    setMessage('');
    try {
      const res = await api.patch(`/expenses/${id}/reject`);
      if (res.success) {
        setMessage(`Expense #${id} rejected`);
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        setMessage(res.message ?? 'Rejection failed');
      }
    } finally {
      setProcessing(null);
    }
  };

  if (!canApprove) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500 mt-1">
          Expense approval requires manager or admin role.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Approval</h1>
            <p className="text-sm text-gray-500">
              {expenses.length} pending {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
        </div>
        <button
          onClick={loadPending}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading pending expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No expenses pending approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-gray-400">#{exp.id}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                      Pending
                    </span>
                    {exp.payment_method && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                        {exp.payment_method}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 mb-1">{exp.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>Category: {exp.category?.name ?? `#${exp.category_id ?? '—'}`}</span>
                    <span>By: {exp.created_by?.full_name ?? exp.created_by?.username ?? '—'}</span>
                    <span>{exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-UG') : '—'}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatUGX(Number(exp.amount))}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleReject(exp.id)}
                  disabled={processing === exp.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {processing === exp.id ? 'Processing…' : 'Reject'}
                </button>
                <button
                  onClick={() => handleApprove(exp.id)}
                  disabled={processing === exp.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {processing === exp.id ? 'Processing…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
