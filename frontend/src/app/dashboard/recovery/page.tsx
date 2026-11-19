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

export default function RecoveryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanId, setLoanId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/recovery`, { headers: getH() });
      if (r.ok) setRows(await r.json());
    } catch { toast.error('Failed to load recovery cases'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCase = async () => {
    if (!loanId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/recovery`, {
        method: 'POST', headers: getH(),
        body: JSON.stringify({ loanId: Number(loanId) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success('Recovery case opened');
      setLoanId('');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const act = async (id: number, path: string, body: any = {}, msg = 'Done') => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/recovery/${id}/${path}`, {
        method: 'POST', headers: getH(), body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success(msg);
      load();
      if (detail?.case?.id === id) {
        const d = await fetch(`${API_URL}/recovery/${id}`, { headers: getH() });
        if (d.ok) setDetail(await d.json());
      }
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id: number) => {
    const r = await fetch(`${API_URL}/recovery/${id}`, { headers: getH() });
    if (r.ok) setDetail(await r.json());
  };

  return (
    <div className="min-h-screen bg-bv-hover p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bv-text">Motorcycle Recovery</h1>
            <p className="text-sm text-bv-muted">No automatic write-off or valuation offset — settlement is report only</p>
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-bv-surface border border-bv-border">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-bv-surface rounded-2xl border border-bv-border p-4 mb-6 flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-bv-meta">Loan ID</label>
            <input type="number" value={loanId} onChange={(e) => setLoanId(e.target.value)}
              className="block w-32 rounded-xl border border-bv-border px-3 py-2 text-sm" />
          </div>
          <button disabled={saving || !loanId} onClick={openCase}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bv-accent text-white text-sm font-bold disabled:opacity-50">
            <Plus className="w-4 h-4" /> Open case
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-bv-accent" /></div>
        ) : (
          <div className="grid gap-3">
            {rows.map((c) => (
              <div key={c.id} className="bg-bv-surface rounded-2xl border border-bv-border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="font-bold">Case #{c.id}</span>
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-bv-hover">{c.status}</span>
                    <p className="text-sm text-bv-muted mt-1">Loan {c.loanId ?? c.loan_id} · Client {c.clientId ?? c.client_id} · Bike {c.bikeId ?? c.bike_id ?? '—'}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => openDetail(c.id)} className="px-2 py-1 text-xs font-bold border border-bv-border rounded-lg">Detail</button>
                    {c.status === 'OPEN' && <button disabled={saving} onClick={() => act(c.id, 'authorise', { notes: 'Authorised' }, 'Authorised')} className="px-2 py-1 text-xs font-bold bg-bv-warning-bg rounded-lg">Authorise</button>}
                    {['AUTHORISED', 'OPEN'].includes(c.status) && <button disabled={saving} onClick={() => act(c.id, 'custody', {}, 'In custody')} className="px-2 py-1 text-xs font-bold bg-bv-hover rounded-lg">Custody</button>}
                    <button disabled={saving} onClick={() => act(c.id, 'inspect', { conditionNotes: 'Inspected' }, 'Inspected')} className="px-2 py-1 text-xs font-bold bg-bv-hover rounded-lg">Inspect</button>
                    <button disabled={saving} onClick={() => act(c.id, 'settlement', {}, 'Settlement prepared')} className="px-2 py-1 text-xs font-bold bg-bv-accent text-white rounded-lg">Settlement</button>
                    {c.status !== 'CLOSED' && <button disabled={saving} onClick={() => act(c.id, 'close', { reason: 'Closed' }, 'Closed')} className="px-2 py-1 text-xs font-bold border border-red-200 text-bv-danger rounded-lg">Close</button>}
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="text-center text-bv-muted py-8 text-sm">No recovery cases</p>}
          </div>
        )}

        {detail && (
          <div className="mt-6 bg-bv-surface rounded-2xl border border-bv-border p-5">
            <div className="flex justify-between mb-3">
              <h2 className="font-bold">Case #{detail.case?.id} detail</h2>
              <button onClick={() => setDetail(null)} className="text-sm text-bv-muted">Close</button>
            </div>
            <p className="text-sm text-bv-muted mb-3">Status {detail.case?.status}</p>
            {detail.settlements?.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="font-bold">Settlement (report only — no write-off)</p>
                {detail.settlements.map((s: any) => (
                  <div key={s.id} className="bg-bv-hover rounded-xl p-3 font-mono text-xs">
                    Principal {fmt(s.principalOutstanding ?? s.principal_outstanding)} ·
                    Accrued int {fmt(s.accruedInterest ?? s.accrued_interest)} ·
                    Frozen total {fmt(s.frozenTotal ?? s.frozen_total)} ·
                    Offset {fmt(s.offsetApplied ?? s.offset_applied)} ·
                    Write-off {fmt(s.writeOffAmount ?? s.write_off_amount)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
