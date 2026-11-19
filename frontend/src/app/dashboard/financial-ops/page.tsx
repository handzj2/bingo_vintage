'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function FinancialOpsPage() {
  const { user, can } = useAuth();
  const [txns, setTxns] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'txns' | 'deposits' | 'receive'>('txns');
  const [form, setForm] = useState({
    amount: '', type: 'MONEY_IN', reference: '', description: '', clientId: '', categoryId: '', cashDrawerId: '', postImmediately: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d, c] = await Promise.all([
        fetch(`${API_URL}/financial-operations/transactions?limit=50`, { headers: getH() }),
        fetch(`${API_URL}/financial-operations/deposits`, { headers: getH() }),
        fetch(`${API_URL}/financial-operations/categories`, { headers: getH() }),
      ]);
      if (t.ok) setTxns(await t.json());
      if (d.ok) setDeposits(await d.json());
      if (c.ok) setCategories(await c.json());
    } catch {
      toast.error('Failed to load financial operations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error('Enter a positive amount'); return; }
    if (!form.reference.trim()) { toast.error('Reference is required'); return; }
    setSaving(true);
    try {
      const idempotencyKey = `fo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const res = await fetch(`${API_URL}/financial-operations/receive`, {
        method: 'POST',
        headers: getH(),
        body: JSON.stringify({
          amount,
          type: form.type,
          reference: form.reference.trim(),
          description: form.description || undefined,
          clientId: form.clientId ? Number(form.clientId) : undefined,
          categoryId: form.categoryId ? Number(form.categoryId) : undefined,
          cashDrawerId: form.cashDrawerId ? Number(form.cashDrawerId) : undefined,
          idempotencyKey,
          postImmediately: form.postImmediately,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success('Transaction recorded');
      setForm({ amount: '', type: 'MONEY_IN', reference: '', description: '', clientId: '', categoryId: '', cashDrawerId: '', postImmediately: true });
      setTab('txns');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bv-hover p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bv-text">Financial Operations</h1>
            <p className="text-sm text-bv-muted">Money in/out, deposits, refunds — loan repayments stay under Payments</p>
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-bv-surface border border-bv-border hover:bg-bv-hover">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['txns', 'deposits', 'receive'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t ? 'bg-bv-accent text-white' : 'bg-bv-surface border border-bv-border text-bv-muted'}`}>
              {t === 'txns' ? 'Transactions' : t === 'deposits' ? 'Client Deposits' : 'Receive Money'}
            </button>
          ))}
        </div>

        {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-bv-accent" /></div>}

        {!loading && tab === 'txns' && (
          <div className="bg-bv-surface rounded-2xl border border-bv-border overflow-hidden">
            {txns.length === 0 ? (
              <p className="p-8 text-center text-bv-muted text-sm">No financial transactions yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-bv-hover text-bv-meta text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Ref</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bv-border">
                  {txns.map((t) => (
                    <tr key={t.id} className="hover:bg-bv-hover">
                      <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                      <td className="px-4 py-3">{t.type}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(t.amount)}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-bv-hover">{t.status}</span></td>
                      <td className="px-4 py-3 text-bv-meta">{t.txnDate || t.txn_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && tab === 'deposits' && (
          <div className="bg-bv-surface rounded-2xl border border-bv-border overflow-hidden">
            {deposits.length === 0 ? (
              <p className="p-8 text-center text-bv-muted text-sm">No client deposits</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-bv-hover text-bv-meta text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Allocated</th>
                    <th className="px-4 py-3 text-right">Refunded</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bv-border">
                  {deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-bv-hover">
                      <td className="px-4 py-3 font-mono text-xs">#{d.id}</td>
                      <td className="px-4 py-3">{d.clientId ?? d.client_id}</td>
                      <td className="px-4 py-3 text-right">{fmt(d.amountReceived ?? d.amount_received)}</td>
                      <td className="px-4 py-3 text-right">{fmt(d.amountAllocated ?? d.amount_allocated)}</td>
                      <td className="px-4 py-3 text-right">{fmt(d.amountRefunded ?? d.amount_refunded)}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-bv-hover">{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && tab === 'receive' && (
          <form onSubmit={submitReceive} className="bg-bv-surface rounded-2xl border border-bv-border p-6 space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm bg-bv-hover">
                <option value="MONEY_IN">Money In / Other Income</option>
                <option value="DEPOSIT">Client Deposit</option>
                <option value="FINE">Fine</option>
                <option value="MONEY_OUT">Money Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Amount (UGX)</label>
              <input type="number" min="1" step="1" required value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Reference</label>
              <input required value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" placeholder="Receipt / slip number" />
            </div>
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Client ID (for deposits)</label>
              <input type="number" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Cash Drawer ID (optional)</label>
              <input type="number" value={form.cashDrawerId} onChange={(e) => setForm({ ...form, cashDrawerId: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-bv-meta mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.postImmediately}
                onChange={(e) => setForm({ ...form, postImmediately: e.target.checked })} />
              Post immediately (admin)
            </label>
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bv-accent text-white font-bold text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Record Transaction
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
