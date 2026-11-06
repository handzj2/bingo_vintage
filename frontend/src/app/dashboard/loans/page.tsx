'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Banknote, Bike, Plus, Search, Filter, ChevronDown,
  Clock, CheckCircle, XCircle, FileText, DollarSign,
  Users, Loader2, RefreshCw, AlertCircle, ThumbsUp, ThumbsDown, X, Trash2
} from 'lucide-react';

const API_URL = (() => {
  let raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
  while (raw.endsWith('/api/api')) raw = raw.slice(0, -4);
  return raw.endsWith('/api') ? raw : `${raw}/api`;
})();

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const fmt  = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtM = (n: number) => `UGX ${(n / 1_000_000).toFixed(1)}M`;

// ── Approval Modal ────────────────────────────────────────────
function ApprovalModal({ loan, onClose, onDone }: { loan: any; onClose: () => void; onDone: () => void }) {
  const [action, setAction]         = useState<'approved'|'rejected'>('approved');
  const [comments, setComments]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/loans/${loan.id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        // Map to AdminApprovalDto: action='approve'|'reject', reason?
        // (matches the mapping already used on the loan detail page)
        body: JSON.stringify({
          action: action === 'approved' ? 'approve' : 'reject',
          ...(comments ? { reason: comments } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      toast.success(action === 'approved' ? 'Loan approved' : 'Loan rejected');
      onDone();
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-bv-border">
          <h2 className="font-bold text-bv-text text-lg">Review Loan Application</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bv-hover text-bv-meta">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Loan summary */}
          <div className="bg-bv-hover rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-bv-meta">Loan #</span><span className="font-bold font-mono">{loan.loan_number}</span></div>
            <div className="flex justify-between"><span className="text-bv-meta">Client</span><span className="font-semibold">{loan.client_name}</span></div>
            <div className="flex justify-between"><span className="text-bv-meta">Type</span><span className={`font-bold ${loan.loan_type === 'CASH' ? 'text-bv-accent' : 'text-orange-600'}`}>{loan.loan_type}</span></div>
            <div className="flex justify-between"><span className="text-bv-meta">Principal</span><span className="font-bold">{fmt(loan.principal)}</span></div>
          </div>
          {/* Decision */}
          <div>
            <label className="block text-xs font-bold text-bv-meta uppercase tracking-wider mb-2">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAction('approved')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${action === 'approved' ? 'border-green-500 bg-bv-success-bg text-bv-success' : 'border-bv-border text-bv-meta hover:border-bv-border'}`}>
                <ThumbsUp className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => setAction('rejected')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${action === 'rejected' ? 'border-red-500 bg-bv-danger-bg text-bv-danger' : 'border-bv-border text-bv-meta hover:border-bv-border'}`}>
                <ThumbsDown className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
          {/* Comments */}
          <div>
            <label className="block text-xs font-bold text-bv-meta uppercase tracking-wider mb-2">
              Comments {action === 'rejected' && <span className="text-bv-danger">*</span>}
            </label>
            <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)}
              className="w-full border border-bv-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bv-action resize-none"
              placeholder={action === 'approved' ? 'Loan meets all requirements...' : 'Reason for rejection (required)...'}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || (action === 'rejected' && !comments.trim())}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2 ${action === 'approved' ? 'bg-bv-success hover:bg-bv-success' : 'bg-bv-danger hover:bg-bv-danger'}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : action === 'approved' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
            {submitting ? 'Processing...' : action === 'approved' ? 'Approve Loan' : 'Reject Loan'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Delete Modal ─────────────────────────────────────────────
function DeleteModal({ loan, onClose, onDone }: { loan: any; onClose: () => void; onDone: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/loans/${loan.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      onDone();
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-bv-danger px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-lg">Delete Loan</h2>
          </div>
          <button onClick={onClose} className="text-bv-danger-bg hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-bv-danger-bg border border-bv-danger/30 rounded-xl p-4">
            <p className="font-bold text-bv-danger text-sm mb-3">⚠️ This cannot be undone</p>
            <p className="text-sm text-bv-danger mb-3">The following will be permanently deleted:</p>
            <div className="bg-bv-surface border border-bv-danger/20 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-bv-meta">Loan #</span>
                <span className="font-bold font-mono">{loan.loan_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bv-meta">Client</span>
                <span className="font-semibold">{loan.client_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bv-meta">Type</span>
                <span className={`font-bold ${loan.loan_type === 'CASH' ? 'text-bv-accent' : 'text-orange-600'}`}>{loan.loan_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-bv-meta">Principal</span>
                <span className="font-bold">{fmt(loan.principal)}</span>
              </div>
            </div>
            <p className="text-xs text-bv-danger mt-3">All schedules, payments, and alerts linked to this loan will also be deleted. If it is a bike loan, the bike will be released back to Available.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-bv-danger hover:bg-bv-danger disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LoansPage() {
  const { user, can } = useAuth();
  const role        = (user?.role ?? '').toLowerCase();
  const isAdmin     = role === 'admin' || role === 'superadmin';
  // Permission checks — any role can be granted these via Settings toggles
  const canCreate   = isAdmin || role === 'manager' || can('loan.create');
  const canApprove  = isAdmin || role === 'manager' || can('loan.approve');
  const canView     = canCreate || can('loan.view');
  // Legacy aliases used in JSX below
  const isAdminOnly = canApprove;
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const loanTypeFilter = searchParams.get('type') || 'all';

  const [loans, setLoans]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters]   = useState(false);
  const [approving, setApproving]       = useState<any | null>(null);
  const [deleting, setDeleting]         = useState<any | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_URL}/loans`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch loans');
      setLoans(Array.isArray(data) ? data : data.data || data.loans || []);
    } catch (e: any) {
      setError(e.message || 'Could not load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const normalise = (loan: any) => ({
    id:          loan.id,
    loan_number: loan.loan_number || loan.loanNumber || `#${loan.id}`,
    client_name: loan.client
      ? (`${loan.client.firstName ?? loan.client.first_name ?? ''} ${loan.client.lastName ?? loan.client.last_name ?? ''}`).trim() || loan.client_name || loan.clientName || '—'
      : loan.client_name || loan.clientName || '—',
    loan_type:  (loan.loanType || loan.loan_type || 'cash').toUpperCase(),
    principal:   loan.principal_amount ?? loan.principalAmount ?? loan.amount ?? 0,
    balance:     loan.balance ?? loan.outstanding_balance ?? loan.remainingBalance ?? 0,
    status:     (loan.status || 'pending').toUpperCase(),
    start_date:  loan.start_date || loan.startDate || loan.created_at || '',
  });

  const filtered = loans.map(normalise).filter(l => {
    if (loanTypeFilter !== 'all' && l.loan_type !== loanTypeFilter.toUpperCase()) return false;
    if (statusFilter !== 'all' && l.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return l.loan_number.toLowerCase().includes(q) || l.client_name.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = loans.filter(l => (l.status || '').toUpperCase().includes('PENDING')).length;
  const stats = {
    total:       loans.length,
    cash:        loans.filter(l => (l.loan_type || l.loanType || '').toUpperCase() === 'CASH').length,
    bike:        loans.filter(l => (l.loan_type || l.loanType || '').toUpperCase() === 'BIKE').length,
    active:      loans.filter(l => (l.status || '').toLowerCase() === 'active').length,
    overdue:     loans.filter(l => (l.status || '').toLowerCase() === 'overdue').length,
    // Number() wrap is defense-in-depth: decimal columns from Postgres can
    // arrive as strings if a transformer is ever missing on an entity —
    // without this, 0 + "50000.00" does string concatenation, eventually
    // producing NaN once enough loans are summed (root cause fixed at the
    // entity level via ColumnNumericTransformer, this is the backup).
    outstanding: loans.reduce((s, l) => s + Number(l.balance ?? l.outstanding_balance ?? l.remainingBalance ?? 0), 0),
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: JSX.Element; label: string }> = {
      active:           { cls: 'bg-bv-success-bg text-bv-success',   icon: <CheckCircle className="w-3 h-3" />, label: 'Active' },
      approved:         { cls: 'bg-bv-success-bg text-bv-success',   icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
      overdue:          { cls: 'bg-bv-danger-bg text-bv-danger',       icon: <XCircle className="w-3 h-3" />,     label: 'Overdue' },
      rejected:         { cls: 'bg-bv-danger-bg text-bv-danger',       icon: <XCircle className="w-3 h-3" />,     label: 'Rejected' },
      pending:          { cls: 'bg-bv-warning-bg text-bv-warning', icon: <Clock className="w-3 h-3" />,        label: 'Pending' },
      pending_approval: { cls: 'bg-bv-warning-bg text-bv-warning', icon: <Clock className="w-3 h-3" />,        label: 'Pending Approval' },
      completed:        { cls: 'bg-bv-info-bg text-bv-accent',     icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
    };
    const s = map[status] ?? { cls: 'bg-bv-hover text-bv-muted', icon: <FileText className="w-3 h-3" />, label: status };
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.icon}{s.label}</span>;
  };

  const isPending = (status: string) => ['pending', 'pending_approval'].includes(status.toLowerCase());

  return (
    <div className="space-y-6">

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="bg-bv-warning-bg border border-bv-warning/30 rounded-md px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-bv-warning flex-shrink-0" />
            <div>
              <p className="font-bold text-bv-warning text-sm">{pendingCount} loan{pendingCount !== 1 ? 's' : ''} awaiting approval</p>
              <p className="text-xs text-bv-warning">Click the <strong>Review</strong> button on any pending row to approve or reject</p>
            </div>
          </div>
          <button onClick={() => { setStatusFilter('pending_approval'); setShowFilters(true); }}
            className="text-xs font-bold text-bv-warning underline whitespace-nowrap">Show pending</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">
            {loanTypeFilter === 'cash' ? 'Cash loans' : loanTypeFilter === 'bike' ? 'Bike loans' : 'Loans'}
          </h1>
          <p className="text-sm text-bv-muted mt-0.5">
            Applications, balances and status. Outstanding is remaining principal on the loaded list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fetchLoans} disabled={loading}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href="/dashboard/loans/create"
            className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover">
            New loan
          </Link>
        </div>
      </div>

      {/* Counts — hierarchy, not four colourful KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border border-bv-border rounded-md p-4 bg-bv-surface">
        <div>
          <p className="text-xs text-bv-muted">Total in list</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : stats.total}</p>
          <p className="text-xs text-bv-meta">{stats.active} active</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Cash</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : stats.cash}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Bike</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : stats.bike}</p>
        </div>
        <div>
          <p className="text-xs text-bv-muted">Outstanding (list)</p>
          <p className="text-xl font-semibold tabular-nums text-bv-text">{loading ? '…' : fmtM(stats.outstanding)}</p>
          <p className="text-xs text-bv-meta">{stats.overdue} overdue status</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bv-surface border border-bv-border rounded-bv p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bv-meta" />
            <input type="text" placeholder="Search by loan number or client name..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-bv-border rounded-bv text-sm focus:outline-none focus:ring-2 focus:ring-bv-action"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-bv-border rounded-xl overflow-hidden text-sm">
              {['all','cash','bike'].map(t => (
                <button key={t} onClick={() => router.push(t === 'all' ? '/dashboard/loans' : `/dashboard/loans?type=${t}`)}
                  className={`px-4 py-2 font-semibold capitalize transition-colors ${loanTypeFilter === t ? 'bg-bv-action text-white' : 'bg-bv-surface text-bv-muted hover:bg-bv-hover'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
              <Filter className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-bv-border flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-bv-meta">Status:</span>
            {['all','active','pending','pending_approval','overdue','completed','rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-bv-info-bg text-bv-accent' : 'bg-bv-hover text-bv-muted hover:bg-bv-border'}`}>
                {s.replace('_',' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-bv-surface border border-bv-border rounded-bv shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-bv-border">
          <h2 className="font-bold text-bv-text text-sm">{filtered.length} loan{filtered.length !== 1 ? 's' : ''} found</h2>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            <button onClick={fetchLoans} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-bv-border border-t-bv-action" role="status" aria-label="Bingo Vintage loading" />
            <p className="text-sm font-semibold text-bv-text">Bingo Vintage <span className="text-bv-meta font-normal">· loading loans</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-bv-text">No loans to show</p>
            <p className="text-sm text-bv-muted mt-1">
              {searchTerm || statusFilter !== 'all' || loanTypeFilter !== 'all'
                ? 'Nothing matches the current filters. Clear search or reset status and type.'
                : 'No loans loaded yet. Create a loan after the client is registered.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {(searchTerm || statusFilter !== 'all' || loanTypeFilter !== 'all') && (
                <button type="button"
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); router.push('/dashboard/loans'); }}
                  className="text-sm border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover">
                  Clear filters
                </button>
              )}
              <Link href="/dashboard/loans/create"
                className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover">
                New loan
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bv-hover border-b border-bv-border">
                <tr>
                  {['Loan #','Client','Type','Principal','Balance','Status','Date','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold text-bv-meta uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bv-border">
                {filtered.map(loan => (
                  <tr key={loan.id} className={`hover:bg-bv-hover/50 transition-colors ${isPending(loan.status) ? 'bg-bv-warning-bg/20' : ''}`}>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-bv-muted">{loan.loan_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-bv-hover flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-bv-meta" />
                        </div>
                        <span className="font-semibold text-bv-text">{loan.client_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${loan.loan_type === 'CASH' ? 'bg-bv-info-bg text-bv-accent' : 'bg-orange-50 text-orange-700'}`}>
                        {loan.loan_type === 'CASH' ? <Banknote className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                        {loan.loan_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold tabular-nums text-bv-text">{fmt(loan.principal)}</td>
                    <td className="py-3.5 px-4 font-semibold tabular-nums text-bv-muted">{fmt(loan.balance)}</td>
                    <td className="py-3.5 px-4">{statusBadge(loan.status)}</td>
                    <td className="py-3.5 px-4 text-bv-meta text-xs">
                      {loan.start_date ? new Date(loan.start_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isPending(loan.status) && (
                          <button onClick={() => setApproving(loan)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors ${canCreate ? 'bg-bv-success hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}
                            title={canCreate ? 'Review loan' : 'Permission required'}
                            disabled={!canCreate}>
                            <ThumbsUp className="w-3 h-3" /> {isAdmin ? 'Review' : 'Admin Only'}
                          </button>
                        )}
                        <Link href={`/dashboard/schedules/${loan.id}`} className="text-xs font-bold text-bv-accent hover:text-bv-accent hover:underline">
                          View →
                        </Link>
                        {isAdminOnly && (
                          <button onClick={() => setDeleting(loan)}
                            className="p-1.5 text-red-300 hover:text-bv-danger hover:bg-bv-danger-bg rounded-lg transition-colors"
                            title="Delete loan permanently">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {approving && (
        <ApprovalModal
          loan={approving}
          onClose={() => setApproving(null)}
          onDone={() => { setApproving(null); fetchLoans(); }}
        />
      )}

      {/* Delete Modal */}
      {deleting && (
        <DeleteModal
          loan={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => { setDeleting(null); fetchLoans(); }}
        />
      )}
    </div>
  );
}
