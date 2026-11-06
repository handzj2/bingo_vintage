'use client';

import toast from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';

export default function ReconciliationDashboard() {
  const [drawers, setDrawers]                   = useState<any[]>([]);
  const [selectedDrawerId, setSelectedDrawerId] = useState<number | null>(null);
  const [expected, setExpected]                 = useState<number | null>(null);
  const [actual, setActual]                     = useState('');
  const [history, setHistory]                   = useState<any[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [message, setMessage]                   = useState('');

  useEffect(() => {
    loadDrawers();
    loadHistory();
  }, []);

  const loadDrawers = async () => {
    try {
      const res = await api.get<any[]>('/cash-drawers');
      const list = res.success ? (res.data ?? []) : [];
      setDrawers(Array.isArray(list) ? list.filter((d: any) => d && d.id != null) : []);
    } catch {
      setDrawers([]);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get<any[]>('/reconciliation');
      const list = res.success ? (res.data ?? []) : [];
      setHistory(Array.isArray(list) ? list.filter((r: any) => r != null) : []);
    } catch {
      setHistory([]);
    }
  };

  const handleDrawerChange = async (drawerId: number) => {
    if (!drawerId) {
      setSelectedDrawerId(null);
      setExpected(null);
      return;
    }
    setSelectedDrawerId(drawerId);
    try {
      const res = await api.get<{ expected: number }>(`/reconciliation/expected?drawerId=${drawerId}`);
      if (res.success && res.data != null && typeof (res.data as any).expected === 'number') {
        setExpected((res.data as any).expected);
      } else if (res.success && typeof res.data === 'number') {
        setExpected(res.data as unknown as number);
      } else {
        setExpected(null);
      }
    } catch {
      setExpected(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerId) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/reconciliation', {
        drawerId:   selectedDrawerId,
        actualCash: Number(actual),
      });
      if (res.success) {
        setMessage('Reconciliation saved successfully');
        toast.success('Reconciliation saved');
        setActual('');
        loadHistory();
        handleDrawerChange(selectedDrawerId);
      } else {
        const msg = res.message || 'Error saving reconciliation';
        setMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error saving reconciliation';
      setMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-bv-surface rounded-bv border border-bv-border p-6">
        <h2 className="text-lg font-semibold text-bv-text mb-4">New Reconciliation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bv-muted mb-1">Cash Drawer</label>
            <select
              required
              value={selectedDrawerId || ''}
              onChange={e => handleDrawerChange(Number(e.target.value))}
              className="w-full border border-bv-border rounded-bv px-3 py-2 text-bv-text"
            >
              <option value="">Select drawer</option>
              {drawers.map((d: any) => (
                <option key={d.id} value={d.id}>
                  Drawer #{d.id}{d.user?.username ? ` — ${d.user.username}` : d.user?.fullName ? ` — ${d.user.fullName}` : ''}
                </option>
              ))}
            </select>
            {drawers.length === 0 && (
              <p className="text-xs text-bv-meta mt-1">No drawers available.</p>
            )}
          </div>

          {expected !== null && (
            <div className="bg-bv-info-bg p-4 rounded-bv">
              <p className="text-sm text-bv-muted">Expected Cash</p>
              <p className="text-2xl font-bold text-bv-accent">{formatUGX(expected)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-bv-muted mb-1">Actual Cash Counted</label>
            <input
              type="number" min="0" step="0.01" required
              value={actual}
              onChange={e => setActual(e.target.value)}
              className="w-full border border-bv-border rounded-bv px-3 py-2"
            />
          </div>

          {expected !== null && actual !== '' && (
            <div className={`p-3 rounded-bv text-sm ${
              Number(actual) === expected
                ? 'bg-bv-success-bg text-bv-success'
                : 'bg-bv-warning-bg text-bv-warning'
            }`}>
              Difference: {formatUGX(expected - Number(actual))}
            </div>
          )}

          <button
            type="submit" disabled={loading || !selectedDrawerId}
            className="bg-bv-action text-white px-6 py-2 rounded-bv hover:bg-bv-action-hover disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Submit Reconciliation'}
          </button>
          {message && <p className="text-sm text-bv-muted">{message}</p>}
        </form>
      </div>

      <div className="bg-bv-surface rounded-bv border border-bv-border p-6">
        <h2 className="text-lg font-semibold text-bv-text mb-4">Reconciliation History</h2>
        {history.length === 0 ? (
          <p className="text-bv-meta text-sm">No reconciliations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bv-hover border-b border-bv-border">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-bv-muted">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-bv-muted">Drawer</th>
                  <th className="px-4 py-2 text-right font-semibold text-bv-muted">Expected</th>
                  <th className="px-4 py-2 text-right font-semibold text-bv-muted">Actual</th>
                  <th className="px-4 py-2 text-right font-semibold text-bv-muted">Diff</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rec: any, i: number) => {
                  if (!rec) return null;
                  const expectedAmt = Number(rec.expectedCash ?? rec.expected ?? 0);
                  const actualAmt = Number(rec.actualCash ?? rec.actual ?? 0);
                  const diff = actualAmt - expectedAmt;
                  return (
                    <tr key={rec.id ?? i} className="border-t border-bv-border hover:bg-bv-hover">
                      <td className="px-4 py-2 text-bv-text">
                        {rec.createdAt || rec.date
                          ? new Date(rec.createdAt || rec.date).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-bv-muted">
                        #{rec.drawerId ?? rec.drawer?.id ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatUGX(expectedAmt)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatUGX(actualAmt)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                        Math.abs(diff) < 1 ? 'text-bv-success' : 'text-bv-warning'
                      }`}>
                        {formatUGX(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
