'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  RotateCcw, Search, RefreshCw, Loader2, AlertCircle,
  CheckCircle, XCircle, Clock, Shield, AlertTriangle,
  Filter, ChevronDown, ChevronUp, X, Calendar,
  Banknote, CreditCard, FileText
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(), ...opts });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
  return json;
};
const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  COMPLETED:          { label: 'Completed',       color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  REVERSED:           { label: 'Reversed',         color: 'text-gray-500',   bg: 'bg-gray-100',   icon: RotateCcw },
  REVERSAL_REQUESTED: { label: 'Awaiting Reversal',color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  PENDING:            { label: 'Pending',          color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  FAILED:             { label: 'Failed',           color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${c.bg} ${c.color}`}>
      <Icon className="w-3 h-3" />{c.label}
    </span>
  );
}

// ── Cashier: Request Reversal Modal ──────────────────────────
function RequestReversalModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setSubmitting(true);
    try {
      await apiFetch(`/payments/${payment.id}/request-reversal`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-orange-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-white" />
            <div>
              <p className="font-black text-white">Request Reversal</p>
              <p className="text-orange-100 text-xs">Admin will review and action</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-orange-600 hover:bg-orange-700 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Payment summary */}
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Receipt</p>
              <p className="font-mono text-xs font-bold text-gray-800">{payment.receipt_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Amount</p>
              <p className="font-bold text-gray-800">{fmt(Number(payment.amount))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Client</p>
              <p className="font-bold text-gray-800 text-xs">
                {payment.loan?.client?.firstName || payment.loan?.client?.first_name} {payment.loan?.client?.lastName || payment.loan?.client?.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-xs text-gray-600">
                {new Date(payment.paymentDate || payment.payment_date || payment.createdAt || payment.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Your request goes to the admin for approval. The payment stays active until they approve it.
              Once reversed, you can enter the correct payment with the right amount.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              What went wrong? <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 font-normal ml-1">(min 10 characters)</span>
            </label>
            <textarea rows={3}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none ${
                reason.length > 0 && reason.length < 10
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-gray-200 focus:ring-orange-400'
              }`}
              placeholder="e.g. Entered UGX 500,000 but correct amount is UGX 50,000. Wrong amount recorded."
              value={reason} onChange={e => setReason(e.target.value)}
            />
            <p className={`text-xs mt-1 ${reason.length < 10 ? 'text-red-400' : 'text-green-500'}`}>
              {reason.length}/10 minimum
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={reason.trim().length < 10 || submitting}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {submitting ? 'Submitting...' : 'Send to Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin: Review Modal ──────────────────────────────────────
function AdminReviewModal({ payment, onClose, onSuccess }: { payment: any; onClose: () => void; onSuccess: () => void }) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setSubmitting(true);
    try {
      if (action === 'approve') {
        await apiFetch(`/payments/${payment.id}/approve-reversal`, { method: 'POST' });
      } else {
        if (rejectReason.trim().length < 5) { setError('Please provide a rejection reason'); setSubmitting(false); return; }
        await apiFetch(`/payments/${payment.id}/reject-reversal`, {
          method: 'POST',
          body: JSON.stringify({ reason: rejectReason }),
        });
      }
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="bg-slate-800 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white" />
            <div>
              <p className="font-black text-white">Review Reversal Request</p>
              <p className="text-slate-400 text-xs">Policy [2026-01-10] · Admin action</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Receipt</p>
                <p className="font-mono text-xs font-bold">{payment.receipt_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                <p className="font-bold text-gray-900">{fmt(Number(payment.amount))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Client</p>
                <p className="font-bold text-xs">{payment.loan?.client?.firstName || payment.loan?.client?.first_name} {payment.loan?.client?.lastName || payment.loan?.client?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Requested By</p>
                <p className="font-bold text-xs text-orange-600">{payment.reversalRequestedBy || '—'}</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-400 mb-1">Cashier's Reason</p>
              <p className="text-sm text-gray-800 font-medium bg-white rounded-lg p-3 border border-orange-200 border-l-4 border-l-orange-400">
                {payment.reversalRequestReason || '—'}
              </p>
            </div>
          </div>

          {/* Action choice */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('approve')}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                action === 'approve' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'
              }`}>
              <CheckCircle className="w-4 h-4" /> Approve & Reverse
            </button>
            <button onClick={() => setAction('reject')}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                action === 'reject' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'
              }`}>
              <XCircle className="w-4 h-4" /> Reject Request
            </button>
          </div>

          {action === 'approve' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This will immediately reverse the payment, restore the loan balance by {fmt(Number(payment.amount))}, create a full audit trail,
                and allow the cashier to re-enter the correct amount.
              </p>
            </div>
          )}

          {action === 'reject' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Reason for rejecting <span className="text-red-500">*</span>
              </label>
              <textarea rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                placeholder="e.g. Payment amount matches the schedule — no error found"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : action === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {submitting ? 'Processing...' : action === 'approve' ? 'Approve Reversal' : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ReversalsPage() {
  const { user, can } = useAuth();
  const role    = (user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'manager' || role === 'superadmin' || can('payment.reverse');

  const [payments,   setPayments]   = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [requestModal, setRequestModal] = useState<any>(null);
  const [reviewModal, setReviewModal]   = useState<any>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // GitHub / Stripe list pattern: always read the typed paginated envelope
      const data = await apiFetch('/payments');
      const { items = [], nextCursor: nc = null, count = 0 } =
        (data && typeof data === 'object' && 'items' in data)
          ? data
          : { items: Array.isArray(data) ? data : (data?.data ?? []), nextCursor: null, count: 0 };
      setPayments(items);
      setNextCursor(nc);
      setTotalCount(count);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingRequests = payments.filter(p => p.status === 'REVERSAL_REQUESTED');

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const client = `${p.loan?.client?.firstName || p.loan?.client?.first_name || ''} ${p.loan?.client?.lastName || p.loan?.client?.last_name || ''}`.toLowerCase();
    const matchSearch = !q || [p.receipt_number, client, String(p.id)].some(v => v?.toLowerCase().includes(q));
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Modals */}
      {requestModal && (
        <RequestReversalModal
          payment={requestModal}
          onClose={() => setRequestModal(null)}
          onSuccess={() => {
            setRequestModal(null);
            showToast('Reversal request sent to admin for review');
            load();
          }}
        />
      )}
      {reviewModal && (
        <AdminReviewModal
          payment={reviewModal}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {
            setReviewModal(null);
            showToast('Done — cashier can now re-enter the correct payment');
            load();
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-black text-gray-900">
              {isAdmin ? 'Payments & Reversal Requests' : 'My Payments'}
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin
              ? 'Approve or reject cashier reversal requests'
              : 'Found an error? Request a reversal — admin will review it'}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Admin: pending requests banner */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="font-black text-orange-800 text-lg">
              {pendingRequests.length} Reversal Request{pendingRequests.length > 1 ? 's' : ''} Need Your Attention
            </p>
          </div>
          <div className="space-y-2">
            {pendingRequests.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-black text-orange-600">
                    {(p.loan?.client?.firstName || p.loan?.client?.first_name || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm">
                      {p.loan?.client?.firstName || p.loan?.client?.first_name} {p.loan?.client?.lastName || p.loan?.client?.last_name}
                      <span className="ml-2 font-mono text-xs text-gray-400 font-normal">{p.receipt_number}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      <span className="font-semibold text-orange-600">{p.reversalRequestedBy}</span>: {p.reversalRequestReason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-black text-gray-900">{fmt(Number(p.amount))}</p>
                  <button onClick={() => setReviewModal(p)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors">
                    <Shield className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashier: how-to hint */}
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <RotateCcw className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Made an error? Click <strong>Request Reversal</strong> next to the payment.
            Admin will review and reverse it so you can enter the correct one.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Payments',   value: payments.length,                                       color: 'text-gray-800',   icon: Banknote },
          { label: 'Completed',        value: payments.filter(p => p.status === 'COMPLETED').length, color: 'text-green-600',  icon: CheckCircle },
          { label: 'Reversal Pending', value: pendingRequests.length,                                color: 'text-orange-600', icon: Clock },
          { label: 'Reversed',         value: payments.filter(p => p.status === 'REVERSED').length,  color: 'text-gray-400',   icon: RotateCcw },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color} opacity-50`} />
            <div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search receipt number, client name..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" />
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {(search || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="px-3 text-sm text-red-500 font-semibold">Clear</button>
          )}
        </div>
        {showFilters && (
          <div className="pt-2 border-t border-gray-50">
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Filter by Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white w-52">
              <option value="">All statuses</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Payments table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="flex items-center gap-3 p-8 text-red-600 text-sm"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading payments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Receipt', 'Client', 'Amount', 'Method', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50/60 transition-colors ${p.status === 'REVERSED' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{p.receipt_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {(p.loan?.client?.firstName || p.loan?.client?.first_name || '?').charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800 text-xs">
                          {p.loan?.client?.firstName || p.loan?.client?.first_name} {p.loan?.client?.lastName || p.loan?.client?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmt(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                        {p.paymentMethod?.toLowerCase() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.paymentDate || p.payment_date || p.createdAt || p.created_at).toLocaleDateString('en-UG', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* Cashier: request reversal on completed payments */}
                      {!isAdmin && p.status === 'COMPLETED' && (
                        <button onClick={() => setRequestModal(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition-colors border border-orange-200">
                          <RotateCcw className="w-3 h-3" /> Request Reversal
                        </button>
                      )}
                      {/* Cashier: waiting indicator */}
                      {!isAdmin && p.status === 'REVERSAL_REQUESTED' && (
                        <span className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Waiting for admin
                        </span>
                      )}
                      {/* Admin: review button */}
                      {isAdmin && p.status === 'REVERSAL_REQUESTED' && (
                        <button onClick={() => setReviewModal(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors">
                          <Shield className="w-3 h-3" /> Review
                        </button>
                      )}
                      {/* Reversed: show who reversed */}
                      {p.status === 'REVERSED' && (
                        <span className="text-xs text-gray-400">
                          Reversed by {p.reversedBy || 'admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between">
              <span>Showing {filtered.length} of {payments.length} payments</span>
              {pendingRequests.length > 0 && (
                <span className="text-orange-500 font-bold">{pendingRequests.length} awaiting review</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
