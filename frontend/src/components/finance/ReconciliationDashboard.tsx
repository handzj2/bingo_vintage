'use client';

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
    const res = await api.get<any[]>('/cash-drawers');
    if (res.success) setDrawers(res.data ?? []);
  };

  const loadHistory = async () => {
    const res = await api.get<any[]>('/reconciliation');
    if (res.success) setHistory(res.data ?? []);
  };

  const handleDrawerChange = async (drawerId: number) => {
    setSelectedDrawerId(drawerId);
    const res = await api.get<{ expected: number }>(`/reconciliation/expected?drawerId=${drawerId}`);
    if (res.success && res.data != null) setExpected(res.data.expected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerId) return;
    setLoading(true);
    setMessage('');
    const res = await api.post('/reconciliation', {
      drawerId:   selectedDrawerId,
      actualCash: Number(actual),
    });
    setLoading(false);
    if (res.success) {
      setMessage('Reconciliation saved successfully');
      setActual('');
      loadHistory();
      handleDrawerChange(selectedDrawerId);
    } else {
      setMessage(res.message || 'Error saving reconciliation');
    }
  };

  return (
    <div className="space-y-6">
      {/* New Reconciliation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">New Reconciliation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cash Drawer</label>
            <select
              required
              value={selectedDrawerId || ''}
              onChange={e => handleDrawerChange(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select drawer</option>
              {drawers.map((d: any) => (
                <option key={d.id} value={d.id}>
                  Drawer #{d.id}{d.user?.username ? ` — ${d.user.username}` : ''}
                </option>
              ))}
            </select>
          </div>

          {expected !== null && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Expected Cash</p>
              <p className="text-2xl font-bold text-blue-700">{formatUGX(expected)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Counted</label>
            <input
              type="number" min="0" step="0.01" required
              value={actual}
              onChange={e => setActual(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {expected !== null && actual && (
            <div className={`p-3 rounded-lg ${
              Number(actual) === expected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              Difference: {formatUGX(expected - Number(actual))}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Submit Reconciliation'}
          </button>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Reconciliation History</h2>
        {history.length === 0 ? (
          <p className="text-gray-400">No reconciliations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">Drawer</th>
                <th className="px-4 py-2 text-right font-semibold">Expected</th>
                <th className="px-4 py-2 text-right font-semibold">Actual</th>
                <th className="px-4 py-2 text-right font-semibold">Difference</th>
                <th className="px-4 py-2 text-left font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rec: any) => (
                <tr key={rec.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">
                    {new Date(rec.reconciled_at ?? rec.reconciledAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">Drawer #{rec.drawer_id ?? rec.drawerId}</td>
                  <td className="px-4 py-2 text-right">{formatUGX(Number(rec.expected_cash ?? rec.expectedCash))}</td>
                  <td className="px-4 py-2 text-right">{formatUGX(Number(rec.actual_cash ?? rec.actualCash))}</td>
                  <td className={`px-4 py-2 text-right font-medium ${Number(rec.difference) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatUGX(Number(rec.difference))}
                  </td>
                  <td className="px-4 py-2">{rec.created_by?.username ?? rec.createdBy?.username ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
