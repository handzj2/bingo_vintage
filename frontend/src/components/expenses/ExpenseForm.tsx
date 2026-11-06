'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client'; // FIX: was `import api from` (default) — client only has named export
import { formatUGX } from '@/shared/api-types';

export default function ExpenseForm({ initialData, isEdit }: any) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [drawers, setDrawers]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm] = useState({
    categoryId:    initialData?.categoryId    ? String(initialData.categoryId) : '',
    amount:        initialData?.amount        ? String(initialData.amount) : '',
    description:   initialData?.description   || '',
    paymentMethod: initialData?.paymentMethod || 'cash',
    cashDrawerId:  initialData?.cashDrawerId  ? String(initialData.cashDrawerId) : '',
  });

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/expenses/categories'),
      api.get<any[]>('/cash-drawers?status=open'),
    ]).then(([catRes, drawerRes]) => {
      if (catRes.success)    setCategories(catRes.data ?? []);
      if (drawerRes.success) setDrawers(drawerRes.data ?? []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: any = {
      categoryId:    Number(form.categoryId),   // FIX: send as number, not string
      amount:        Number(form.amount),
      description:   form.description,
      paymentMethod: form.paymentMethod,
    };
    if (form.cashDrawerId) {
      payload.cashDrawerId = Number(form.cashDrawerId); // FIX: send as number
    }

    const res = isEdit
      ? await api.patch(`/expenses/${initialData.id}`, payload)
      : await api.post('/expenses', payload);

    setLoading(false);
    if (res.success) {
      router.push('/dashboard/expenses');
    } else {
      setError(res.message || 'Failed to save expense.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-4">
      <div className="border-b border-bv-border pb-4">
        <h1 className="text-lg font-semibold text-bv-text">
          {isEdit ? 'Edit expense' : 'New expense'}
        </h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Record branch spending. Cash expenses should use an open drawer when available.
        </p>
      </div>

    <form onSubmit={handleSubmit} className="space-y-4">

      {error && (
        <div className="bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-bv-muted mb-1">Category *</label>
        <select
          value={form.categoryId}
          onChange={e => setForm({ ...form, categoryId: e.target.value })}
          required
          className="w-full border border-bv-border rounded-lg px-3 py-2"
        >
          <option value="">Select Category</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-bv-muted mb-1">Amount (UGX) *</label>
        <input
          type="number"
          min="1"
          placeholder="0"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          required
          className="w-full border border-bv-border rounded-lg px-3 py-2"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-bv-muted mb-1">Description *</label>
        <textarea
          placeholder="What was this expense for?"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          required
          rows={3}
          className="w-full border border-bv-border rounded-lg px-3 py-2"
        />
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-sm font-medium text-bv-muted mb-1">Payment Method *</label>
        <select
          value={form.paymentMethod}
          onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
          className="w-full border border-bv-border rounded-lg px-3 py-2"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank Transfer</option>
        </select>
      </div>

      {/* Cash drawer — only for cash payments */}
      {form.paymentMethod === 'cash' && (
        <div>
          <label className="block text-sm font-medium text-bv-muted mb-1">
            Cash Drawer <span className="text-bv-meta font-normal">(optional)</span>
          </label>
          <select
            value={form.cashDrawerId}
            onChange={e => setForm({ ...form, cashDrawerId: e.target.value })}
            className="w-full border border-bv-border rounded-lg px-3 py-2"
          >
            <option value="">No drawer / unassigned</option>
            {drawers.map((d: any) => (
              <option key={d.id} value={d.id}>
                Drawer #{d.id}
                {d.user?.username ? ` — ${d.user.username}` : ''}
                {' · '}
                {formatUGX(Number(d.current_balance ?? d.currentBalance ?? 0))}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard/expenses')}
          className="flex-1 border border-bv-border text-bv-muted px-4 py-2 rounded-lg hover:bg-bv-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Update Expense' : 'Create Expense'}
        </button>
      </div>
    </form>
    </div>

  );
}
