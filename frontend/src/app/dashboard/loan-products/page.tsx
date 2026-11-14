'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatUGX } from '@/shared/api-types';

type Product = {
  id: number; code?: string; name: string; interestRate: number; minTermMonths: number; maxTermMonths: number;
  minAmount: number; maxAmount?: number | null; processingFee: number; lateFeeDaily: number;
  isActive: boolean; requiresApproval: boolean; description?: string;
};
const BLANK = { name: '', code: '', interestRate: '0.15', minTermMonths: '1', maxTermMonths: '12', minAmount: '0', maxAmount: '',
  processingFee: '0', lateFeeDaily: '1000', isActive: true, requiresApproval: true, description: '' };

/** /dashboard/loan-products — CRUD over /admin/loan-products. Create/edit/delete are admin-only on the backend. */
export default function LoanProductsPage() {
  const { isLoading, user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes((user?.role ?? '').toLowerCase());
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const res = await api.get<Product[]>('/admin/loan-products');
    if (res.success) setRows(Array.isArray(res.data) ? res.data : []); else setErr(res.message || 'Failed to load loan products');
    setLoading(false);
  }, []);
  useEffect(() => { if (!isLoading && user) load(); }, [isLoading, user, load]);

  const open = (p: Product | 'new') => {
    setFormErr(''); setEditing(p);
    setForm(p === 'new' ? BLANK : { ...p, maxAmount: p.maxAmount ?? '', code: p.code ?? '', description: p.description ?? '' });
  };

  const save = async () => {
    setFormErr('');
    const rate = Number(form.interestRate), minT = Number(form.minTermMonths), maxT = Number(form.maxTermMonths);
    if (!form.name.trim()) return setFormErr('Name is required.');
    if (!(rate >= 0 && rate <= 1)) return setFormErr('Interest rate is a fraction between 0 and 1 (e.g. 0.15 for 15%).');
    if (!(minT >= 1 && maxT >= minT)) return setFormErr('Term range is invalid (min ≥ 1 and max ≥ min).');
    const body = {
      name: form.name.trim(), code: form.code?.trim() || undefined, description: form.description || undefined,
      interestRate: rate, minTermMonths: minT, maxTermMonths: maxT,
      minAmount: Number(form.minAmount) || 0, maxAmount: form.maxAmount === '' ? null : Number(form.maxAmount),
      processingFee: Number(form.processingFee) || 0, lateFeeDaily: Number(form.lateFeeDaily) || 0,
      isActive: !!form.isActive, requiresApproval: !!form.requiresApproval,
    };
    setBusy(true);
    const res = editing === 'new' ? await api.post('/admin/loan-products', body) : await api.patch(`/admin/loan-products/${(editing as Product).id}`, body);
    setBusy(false);
    if (!res.success) return setFormErr(res.message || 'Could not save the loan product');
    toast.success(editing === 'new' ? 'Loan product created' : 'Loan product updated');
    setEditing(null); load();
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete loan product “${p.name}”? Loans already using it are not changed, but deletion cannot be undone. Consider deactivating instead.`)) return;
    const res = await api.delete(`/admin/loan-products/${p.id}`);
    if (res.success) { toast.success('Loan product deleted'); load(); } else toast.error(res.message || 'Could not delete (it may be in use)');
  };

  if (isLoading || loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const field = 'mt-1 w-full border border-bv-border rounded-bv px-3 py-2 bg-bv-surface text-sm';
  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">Loan products</h1>
          <p className="text-sm text-bv-muted">Rates, terms and fees offered when creating loans.</p>
        </div>
        {isAdmin && <button type="button" onClick={() => open('new')} className="px-4 py-2 text-sm font-semibold bg-bv-action text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" />New product</button>}
      </div>
      {err && <p className="text-sm text-bv-danger">{err} <button className="underline" onClick={load}>Retry</button></p>}
      <div className="overflow-x-auto border border-bv-border rounded-bv">
        <table className="min-w-full text-sm">
          <thead className="bg-bv-hover text-left text-xs uppercase text-bv-meta"><tr>
            {['Name', 'Rate', 'Term (months)', 'Amount range', 'Fees', 'Status', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-bv-meta">No loan products yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-bv-border">
                <td className="px-3 py-2 font-medium">{p.name}{p.code && <span className="text-bv-meta"> · {p.code}</span>}</td>
                <td className="px-3 py-2">{(Number(p.interestRate) * 100).toFixed(2)}%</td>
                <td className="px-3 py-2">{p.minTermMonths}–{p.maxTermMonths}</td>
                <td className="px-3 py-2">{formatUGX(Number(p.minAmount))} – {p.maxAmount != null ? formatUGX(Number(p.maxAmount)) : 'no cap'}</td>
                <td className="px-3 py-2">Processing {formatUGX(Number(p.processingFee))}<br /><span className="text-xs text-bv-meta">Late {formatUGX(Number(p.lateFeeDaily))}/day</span></td>
                <td className="px-3 py-2">{p.isActive ? 'Active' : 'Inactive'}{p.requiresApproval ? ' · needs approval' : ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {isAdmin && <>
                    <button type="button" aria-label={`Edit ${p.name}`} onClick={() => open(p)} className="p-1.5 hover:bg-bv-hover rounded"><Pencil className="w-4 h-4" /></button>
                    <button type="button" aria-label={`Delete ${p.name}`} onClick={() => remove(p)} className="p-1.5 hover:bg-bv-hover rounded text-bv-danger"><Trash2 className="w-4 h-4" /></button>
                  </>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-bv-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">{editing === 'new' ? 'New loan product' : `Edit ${(editing as Product).name}`}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">Name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="text-sm">Code<input className={field} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
              <label className="text-sm">Interest rate (0.15 = 15%)<input type="number" step="0.01" className={field} value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} /></label>
              <label className="text-sm">Min term (months)<input type="number" min={1} className={field} value={form.minTermMonths} onChange={(e) => setForm({ ...form, minTermMonths: e.target.value })} /></label>
              <label className="text-sm">Max term (months)<input type="number" min={1} className={field} value={form.maxTermMonths} onChange={(e) => setForm({ ...form, maxTermMonths: e.target.value })} /></label>
              <label className="text-sm">Min amount<input type="number" min={0} className={field} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} /></label>
              <label className="text-sm">Max amount (blank = no cap)<input type="number" min={0} className={field} value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} /></label>
              <label className="text-sm">Processing fee<input type="number" min={0} className={field} value={form.processingFee} onChange={(e) => setForm({ ...form, processingFee: e.target.value })} /></label>
              <label className="text-sm">Late fee per day<input type="number" min={0} className={field} value={form.lateFeeDaily} onChange={(e) => setForm({ ...form, lateFeeDaily: e.target.value })} /></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} />Requires approval</label>
              <label className="col-span-2 text-sm">Description<textarea rows={2} className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            </div>
            {formErr && <p className="text-sm text-bv-danger">{formErr}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)} disabled={busy} className="flex-1 px-4 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted">Cancel</button>
              <button type="button" onClick={save} disabled={busy} className="flex-1 px-4 py-2.5 bg-bv-action text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
