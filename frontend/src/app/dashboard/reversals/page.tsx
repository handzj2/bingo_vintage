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
  COMPLETED:          { label: 'Completed',       color: 'text-bv-success',  bg: 'bg-bv-success-bg',  icon: CheckCircle },
  REVERSED:           { label: 'Reversed',         color: 'text-bv-meta',   bg: 'bg-bv-hover',   icon: RotateCcw },
  REVERSAL_REQUESTED: { label: 'Awaiting Reversal',color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  PENDING:            { label: 'Pending',          color: 'text-bv-warning', bg: 'bg-bv-warning-bg', icon: Clock },
  FAILED:             { label: 'Failed',           color: 'text-bv-danger',    bg: 'bg-bv-danger-bg',    icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: 'text-bv-muted', bg: 'bg-bv-hover', icon: FileText };
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
      <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-md">
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
          <div className="bg-bv-hover rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-bv-meta mb-0.5">Receipt</p>
              <p className="font-mono text-xs font-bold text-bv-text">{payment.receipt_number}</p>
            </div>
            <div>
              <p className="text-xs text-bv-meta mb-0.5">Amount</p>
              <p className="font-bold text-bv-text">{fmt(Number(payment.amount))}</p>
            </div>
            <div>
              <p className="text-xs text-bv-meta mb-0.5">Client</p>
              <p className="font-bold text-bv-text text-xs">
                {payment.loan?.client?.firstName || payment.loan?.client?.first_name} {payment.loan?.client?.lastName || payment.loan?.client?.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-bv-meta mb-0.5">Date</p>
              <p className="text-xs text-bv-muted">
                {(() => {
                  const d = payment.paymentDate || payment.payment_date || payment.createdAt || payment.created_at;
                  if (!d) return '—';
                  const parsed = new Date(d);
                  return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
                })()}
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
            <label className="block text-sm font-bold text-bv-muted mb-2">
              What went wrong? <span className="text-bv-danger">*</span>
              <span className="text-xs text-bv-meta font-normal ml-1">(min 10 characters)</span>
            </label>
            <textarea rows={3}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none ${
                reason.length > 0 && reason.length < 10
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-bv-border focus:ring-orange-400'
              }`}
              placeholder="e.g. Entered UGX 500,000 but correct amount is UGX 50,000. Wrong amount recorded."
              value={reason} onChange={e => setReason(e.target.value)}
            />
            <p className={`text-xs mt-1 ${reason.length < 10 ? 'text-red-400' : 'text-green-500'}`}>
              {reason.length}/10 minimum
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
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
      <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-lg">
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
          <div className="bg-bv-hover rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-bv-meta mb-0.5">Receipt</p>
                <p className="font-mono text-xs font-bold">{payment.receipt_number}</p>
              </div>
              <div>
                <p className="text-xs text-bv-meta mb-0.5">Amount</p>
                <p className="font-bold text-bv-text">{fmt(Number(payment.amount))}</p>
              </div>
              <div>
                <p className="text-xs text-bv-meta mb-0.5">Client</p>
                <p className="font-bold text-xs">{payment.loan?.client?.firstName || payment.loan?.client?.first_name} {payment.loan?.client?.lastName || payment.loan?.client?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-bv-meta mb-0.5">Requested By</p>
                <p className="font-bold text-xs text-orange-600">{payment.reversalRequestedBy || '—'}</p>
              </div>
            </div>
            <div className="border-t border-bv-border pt-3">
              <p className="text-xs text-bv-meta mb-1">Cashier's Reason</p>
              <p className="text-sm text-bv-text font-medium bg-bv-surface rounded-lg p-3 border border-orange-200 border-l-4 border-l-orange-400">
                {payment.reversalRequestReason || '—'}
              </p>
            </div>
          </div>

          {/* Action choice */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('approve')}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                action === 'approve' ? 'border-green-500 bg-bv-success-bg text-bv-success' : 'border-bv-border text-bv-meta hover:border-bv-border'
              }`}>
              <CheckCircle className="w-4 h-4" /> Approve & Reverse
            </button>
            <button onClick={() => setAction('reject')}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                action === 'reject' ? 'border-red-400 bg-bv-danger-bg text-bv-danger' : 'border-bv-border text-bv-meta hover:border-bv-border'
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
              <label className="block text-sm font-bold text-bv-muted mb-2">
                Reason for rejecting <span className="text-bv-danger">*</span>
              </label>
              <textarea rows={2}
                className="w-full border border-bv-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                placeholder="e.g. Payment amount matches the schedule — no error found"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                action === 'approve' ? 'bg-bv-success hover:bg-bv-success' : 'bg-bv-danger hover:bg-bv-danger'
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
    <div className="p-6 space-y-5 max-w-bv mx-auto">

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
        <div className="fixed top-4 right-4 z-50 bg-bv-action text-white px-5 py-3 rounded-bv shadow-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-orange-500" />
            <h1 className="text-lg font-semibold text-bv-text">
              {isAdmin ? 'Payments & Reversal Requests' : 'My Payments'}
            </h1>
          </div>
          <p className="text-sm text-bv-meta mt-0.5">
            {isAdmin
              ? 'Approve or reject cashier reversal requests'
              : 'Found an error? Request a reversal — admin will review it'}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-bv-border rounded-bv text-sm font-semibold text-bv-muted hover:bg-bv-hover">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Admin: pending requests banner */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-bv p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="font-black text-orange-800 text-lg">
              {pendingRequests.length} Reversal Request{pendingRequests.length > 1 ? 's' : ''} Need Your Attention
            </p>
          </div>
          <div className="space-y-2">
            {pendingRequests.map(p => (
              <div key={p.id} className="bg-bv-surface rounded-bv border border-orange-100 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-black text-orange-600">
                    {(p.loan?.client?.firstName || p.loan?.client?.first_name || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-bv-text text-sm">
                      {p.loan?.client?.firstName || p.loan?.client?.first_name} {p.loan?.client?.lastName || p.loan?.client?.last_name}
                      <span className="ml-2 font-mono text-xs text-bv-meta font-normal">{p.receipt_number}</span>
                    </p>
                    <p className="text-xs text-bv-meta truncate mt-0.5">
                      <span className="font-semibold text-orange-600">{p.reversalRequestedBy}</span>: {p.reversalRequestReason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-black text-bv-text">{fmt(Number(p.amount))}</p>
                  <button onClick={() => setReviewModal(p)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-bv text-xs font-bold transition-colors">
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
        <div className="bg-bv-info-bg border border-blue-200 rounded-bv px-4 py-3 flex items-center gap-3">
          <RotateCcw className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-bv-accent">
            Made an error? Click <strong>Request Reversal</strong> next to the payment.
            Admin will review and reverse it so you can enter the correct one.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Payments',   value: payments.length,                                       color: 'text-bv-text',   icon: Banknote },
          { label: 'Completed',        value: payments.filter(p => p.status === 'COMPLETED').length, color: 'text-bv-success',  icon: CheckCircle },
          { label: 'Reversal Pending', value: pendingRequests.length,                                color: 'text-orange-600', icon: Clock },
          { label: 'Reversed',         value: payments.filter(p => p.status === 'REVERSED').length,  color: 'text-bv-meta',   icon: RotateCcw },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-bv-surface border border-bv-border rounded-bv px-4 py-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color} opacity-50`} />
            <div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-bv-meta font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-bv-surface border border-bv-border rounded-bv p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bv-meta" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-bv-border rounded-bv text-sm focus:outline-none focus:ring-2 focus:ring-bv-action"
              placeholder="Search receipt number, client name..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-bv text-sm font-semibold transition-colors ${showFilters ? 'border-blue-500 bg-bv-info-bg text-bv-accent' : 'border-bv-border text-bv-muted hover:bg-bv-hover'}`}>
            <Filter className="w-4 h-4" />
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {(search || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="px-3 text-sm text-bv-danger font-semibold">Clear</button>
          )}
        </div>
        {showFilters && (
          <div className="pt-2 border-t border-bv-border">
            <label className="text-xs font-bold text-bv-meta uppercase mb-1 block">Filter by Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-bv-border rounded-bv px-3 py-2 text-sm focus:outline-none bg-bv-surface w-52">
              <option value="">All statuses</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Payments table */}
      <div className="bg-bv-surface border border-bv-border rounded-bv overflow-hidden shadow-sm">
        {error ? (
          <div className="flex items-center gap-3 p-8 text-bv-danger text-sm"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-bv-meta">Loading payments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-bv-text">No payments to reverse</p><p className="text-sm text-bv-muted mt-1">Search completed payments when a reversal is required.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bv-hover border-b border-bv-border">
                <tr>
                  {['Receipt', 'Client', 'Amount', 'Method', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-bv-meta uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bv-border">
                {filtered.map(p => (
                  <tr key={p.id} className={`hover:bg-bv-hover/60 transition-colors ${p.status === 'REVERSED' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-bv-hover px-2 py-1 rounded">{p.receipt_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-bv-info-bg flex items-center justify-center text-xs font-bold text-bv-accent flex-shrink-0">
                          {(p.loan?.client?.firstName || p.loan?.client?.first_name || '?').charAt(0)}
                        </div>
                        <span className="font-semibold text-bv-text text-xs">
                          {p.loan?.client?.firstName || p.loan?.client?.first_name} {p.loan?.client?.lastName || p.loan?.client?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-bv-text">{fmt(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-bv-hover text-bv-muted px-2 py-1 rounded capitalize">
                        {p.paymentMethod?.toLowerCase() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-bv-meta whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {(() => {
                          const d = p.paymentDate || p.payment_date || p.createdAt || p.created_at;
                          if (!d) return '—';
                          const parsed = new Date(d);
                          return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-UG', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          });
                        })()}
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
                        <span className="text-xs text-bv-meta">
                          Reversed by {p.reversedBy || 'admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-bv-border text-xs text-bv-meta flex justify-between">
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
