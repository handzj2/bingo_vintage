'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote, Bike, Plus, Search, Filter, ChevronDown,
  Clock, CheckCircle, XCircle, FileText, DollarSign,
  Users, Loader2, RefreshCw, AlertCircle, ThumbsUp, ThumbsDown, X, Trash2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
        body: JSON.stringify({ status: action, comments: comments || undefined, policyReference: '2026-01-10' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Review Loan Application</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Loan summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Loan #</span><span className="font-bold font-mono">{loan.loan_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-semibold">{loan.client_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className={`font-bold ${loan.loan_type === 'CASH' ? 'text-blue-600' : 'text-orange-600'}`}>{loan.loan_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Principal</span><span className="font-bold">{fmt(loan.principal)}</span></div>
          </div>
          {/* Decision */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAction('approved')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${action === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                <ThumbsUp className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => setAction('rejected')} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${action === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                <ThumbsDown className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
          {/* Comments */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Comments {action === 'rejected' && <span className="text-red-500">*</span>}
            </label>
            <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={action === 'approved' ? 'Loan meets all requirements...' : 'Reason for rejection (required)...'}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || (action === 'rejected' && !comments.trim())}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2 ${action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-lg">Delete Loan</h2>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-bold text-red-800 text-sm mb-3">⚠️ This cannot be undone</p>
            <p className="text-sm text-red-700 mb-3">The following will be permanently deleted:</p>
            <div className="bg-white border border-red-100 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Loan #</span>
                <span className="font-bold font-mono">{loan.loan_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Client</span>
                <span className="font-semibold">{loan.client_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className={`font-bold ${loan.loan_type === 'CASH' ? 'text-blue-600' : 'text-orange-600'}`}>{loan.loan_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Principal</span>
                <span className="font-bold">{fmt(loan.principal)}</span>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3">All schedules, payments, and alerts linked to this loan will also be deleted. If it is a bike loan, the bike will be released back to Available.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
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
  const { user } = useAuth();
  const isAdmin     = user?.role === 'admin' || user?.role === 'manager';
  const isAdminOnly = user?.role === 'admin' || user?.role === 'superadmin';
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
    outstanding: loans.reduce((s, l) => s + (l.balance ?? l.outstanding_balance ?? l.remainingBalance ?? 0), 0),
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: JSX.Element; label: string }> = {
      active:           { cls: 'bg-green-100 text-green-700',   icon: <CheckCircle className="w-3 h-3" />, label: 'Active' },
      approved:         { cls: 'bg-green-100 text-green-700',   icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
      overdue:          { cls: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3 h-3" />,     label: 'Overdue' },
      rejected:         { cls: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3 h-3" />,     label: 'Rejected' },
      pending:          { cls: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" />,        label: 'Pending' },
      pending_approval: { cls: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" />,        label: 'Pending Approval' },
      completed:        { cls: 'bg-blue-100 text-blue-700',     icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
    };
    const s = map[status] ?? { cls: 'bg-gray-100 text-gray-600', icon: <FileText className="w-3 h-3" />, label: status };
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.icon}{s.label}</span>;
  };

  const isPending = (status: string) => ['pending', 'pending_approval'].includes(status.toLowerCase());

  return (
    <div className="space-y-6">

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">{pendingCount} loan{pendingCount !== 1 ? 's' : ''} awaiting approval</p>
              <p className="text-xs text-yellow-600">Click the <strong>Review</strong> button on any pending row to approve or reject</p>
            </div>
          </div>
          <button onClick={() => { setStatusFilter('pending_approval'); setShowFilters(true); }}
            className="text-xs font-bold text-yellow-700 underline whitespace-nowrap">Show pending</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loanTypeFilter === 'cash' ? 'Cash Loans' : loanTypeFilter === 'bike' ? 'Bike Loans' : 'All Loans'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{loading ? 'Loading...' : `${loans.length} total loans in system`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLoans} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/dashboard/loans/create" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> New Loan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total Loans', value: stats.total,             sub: `${stats.active} active`,  Icon: FileText,   color: 'blue'   },
          { label: 'Cash Loans',  value: stats.cash,              sub: 'cash disbursements',       Icon: Banknote,   color: 'blue'   },
          { label: 'Bike Loans',  value: stats.bike,              sub: 'bike-backed loans',        Icon: Bike,       color: 'orange' },
          { label: 'Outstanding', value: fmtM(stats.outstanding), sub: `${stats.overdue} overdue`, Icon: DollarSign, color: 'red'    },
        ] as const).map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-black mt-1 ${color === 'orange' ? 'text-orange-600' : color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color === 'orange' ? 'bg-orange-50' : color === 'red' ? 'bg-red-50' : 'bg-blue-50'}`}>
                <Icon className={`w-5 h-5 ${color === 'orange' ? 'text-orange-500' : color === 'red' ? 'text-red-500' : 'text-blue-600'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by loan number or client name..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-xl overflow-hidden text-sm">
              {['all','cash','bike'].map(t => (
                <button key={t} onClick={() => router.push(t === 'all' ? '/dashboard/loans' : `/dashboard/loans?type=${t}`)}
                  className={`px-4 py-2 font-semibold capitalize transition-colors ${loanTypeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-gray-500">Status:</span>
            {['all','active','pending','pending_approval','overdue','completed','rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.replace('_',' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-900 text-sm">{filtered.length} loan{filtered.length !== 1 ? 's' : ''} found</h2>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            <button onClick={fetchLoans} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading loans from database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No loans found</p>
            <p className="text-xs text-gray-300 mt-1">
              {searchTerm || statusFilter !== 'all' || loanTypeFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first loan'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Loan #','Client','Type','Principal','Balance','Status','Date','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(loan => (
                  <tr key={loan.id} className={`hover:bg-gray-50/50 transition-colors ${isPending(loan.status) ? 'bg-yellow-50/20' : ''}`}>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-700">{loan.loan_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <span className="font-semibold text-gray-900">{loan.client_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${loan.loan_type === 'CASH' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {loan.loan_type === 'CASH' ? <Banknote className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                        {loan.loan_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{fmt(loan.principal)}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{fmt(loan.balance)}</td>
                    <td className="py-3.5 px-4">{statusBadge(loan.status)}</td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">
                      {loan.start_date ? new Date(loan.start_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isPending(loan.status) && (
                          <button onClick={() => setApproving(loan)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors ${isAdmin ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                            title={isAdmin ? 'Review loan' : 'Admin access required'}
                            disabled={!isAdmin}>
                            <ThumbsUp className="w-3 h-3" /> {isAdmin ? 'Review' : 'Admin Only'}
                          </button>
                        )}
                        <Link href={`/dashboard/schedules/${loan.id}`} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
                          View →
                        </Link>
                        {isAdminOnly && (
                          <button onClick={() => setDeleting(loan)}
                            className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
