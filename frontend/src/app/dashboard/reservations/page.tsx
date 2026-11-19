'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function ReservationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ clientId: '', agreedPrice: '', depositRequired: '', notes: '' });
  const [actionId, setActionId] = useState<number | null>(null);
  const [bikeId, setBikeId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/reservations`, { headers: getH() });
      if (r.ok) setRows(await r.json());
    } catch { toast.error('Failed to load reservations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/reservations`, {
        method: 'POST', headers: getH(),
        body: JSON.stringify({
          clientId: Number(form.clientId),
          agreedPrice: Number(form.agreedPrice),
          depositRequired: form.depositRequired ? Number(form.depositRequired) : 0,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success('Reservation created');
      setShowCreate(false);
      setForm({ clientId: '', agreedPrice: '', depositRequired: '', notes: '' });
      load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const postAction = async (id: number, path: string, body: any, okMsg: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/reservations/${id}/${path}`, {
        method: 'POST', headers: getH(), body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Failed');
      toast.success(okMsg);
      setActionId(null);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-bv-hover p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bv-text">Reservations</h1>
            <p className="text-sm text-bv-muted">Pre-delivery financing — pending-delivery loans do not count as active</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-xl bg-bv-surface border border-bv-border"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bv-accent text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={create} className="bg-bv-surface rounded-2xl border border-bv-border p-5 mb-6 space-y-3 max-w-md">
            <input required type="number" placeholder="Client ID" value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            <input required type="number" placeholder="Agreed price" value={form.agreedPrice}
              onChange={(e) => setForm({ ...form, agreedPrice: e.target.value })}
              className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            <input type="number" placeholder="Deposit required" value={form.depositRequired}
              onChange={(e) => setForm({ ...form, depositRequired: e.target.value })}
              className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" />
            <textarea placeholder="Notes" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-bv-border px-3 py-2 text-sm" rows={2} />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-bv-accent text-white text-sm font-bold disabled:opacity-50">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border border-bv-border text-sm">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-bv-accent" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-bv-muted py-12 text-sm">No reservations</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-bv-surface rounded-2xl border border-bv-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-bv-text">#{r.id}</span>
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-bv-hover">{r.status}</span>
                    <p className="text-sm text-bv-muted mt-1">Client {r.clientId ?? r.client_id} · Price {fmt(r.agreedPrice ?? r.agreed_price)} · Bike {r.bikeId ?? r.bike_id ?? '—'} · Loan {r.loanId ?? r.loan_id ?? '—'}</p>
                  </div>
                  {r.status !== 'HANDED_OVER' && r.status !== 'CANCELLED' && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setActionId(actionId === r.id ? null : r.id)}
                        className="px-3 py-1.5 rounded-lg border border-bv-border text-xs font-bold">Actions</button>
                      <button onClick={() => postAction(r.id, 'cancel', { reason: 'Cancelled from UI' }, 'Cancelled')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-bv-danger border border-red-200">Cancel</button>
                    </div>
                  )}
                </div>
                {actionId === r.id && (
                  <div className="mt-3 pt-3 border-t border-bv-border flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs text-bv-meta">Loan ID</label>
                      <input type="number" value={loanId} onChange={(e) => setLoanId(e.target.value)}
                        className="block w-28 rounded-lg border border-bv-border px-2 py-1 text-sm" />
                      <button disabled={saving} onClick={() => postAction(r.id, 'attach-financing', { loanId: Number(loanId) }, 'Financing attached')}
                        className="mt-1 px-2 py-1 rounded-lg bg-bv-accent text-white text-xs font-bold">Attach financing</button>
                    </div>
                    <div>
                      <label className="text-xs text-bv-meta">Bike ID</label>
                      <input type="number" value={bikeId} onChange={(e) => setBikeId(e.target.value)}
                        className="block w-28 rounded-lg border border-bv-border px-2 py-1 text-sm" />
                      <button disabled={saving} onClick={() => postAction(r.id, 'allocate-bike', { bikeId: Number(bikeId) }, 'Bike allocated')}
                        className="mt-1 px-2 py-1 rounded-lg bg-bv-accent text-white text-xs font-bold">Allocate bike</button>
                    </div>
                    <button disabled={saving} onClick={() => postAction(r.id, 'handover', {}, 'Handed over & activated')}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Handover & Activate</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
