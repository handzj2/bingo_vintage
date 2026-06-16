'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Clock,
  User, Phone, Mail, Calendar, DollarSign, Bike, Banknote,
  FileText, CreditCard, RefreshCw, ArrowRight, MinusCircle,
  XCircle, TrendingUp, Shield, ThumbsUp, ThumbsDown, X,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt  = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-700',
  PENDING:    'bg-yellow-100 text-yellow-700',
  COMPLETED:  'bg-blue-100 text-blue-700',
  CANCELLED:  'bg-gray-100 text-gray-500',
  DELINQUENT: 'bg-red-100 text-red-700',
  REJECTED:   'bg-red-100 text-red-600',
};

const SCHED_STATUS: Record<string, { cls: string; dot: string }> = {
  PAID:      { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  PARTIAL:   { cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400'   },
  OVERDUE:   { cls: 'bg-red-100 text-red-700',        dot: 'bg-red-500'     },
  PENDING:   { cls: 'bg-gray-100 text-gray-500',      dot: 'bg-gray-300'    },
  CANCELLED: { cls: 'bg-gray-100 text-gray-400',      dot: 'bg-gray-200'    },
  WAIVED:    { cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-400'  },
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user, can } = useAuth();
  const role       = (user?.role ?? '').toLowerCase();
  const isAdmin    = role === 'admin' || role === 'superadmin';
  // Permission-based access — respects Settings toggles for any role
  const canApprove = isAdmin || role === 'manager' || can('loan.approve');
  const canEdit    = isAdmin || role === 'manager' || can('loan.create');
  const canReverse = isAdmin || can('payment.reverse');

  const [loan, setLoan]               = useState<any>(null);
  const [sched, setSched]             = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState('');
  const [approverName, setApproverName] = useState<string>('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approving, setApproving]     = useState(false);
  const [approveAction, setApproveAction] = useState<'approved'|'rejected'>('approved');
  const [approveComment, setApproveComment] = useState('');
  const [approveErr, setApproveErr]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      // Load loan detail and schedule in parallel
      const [loanRes, schedRes] = await Promise.all([
        fetch(`${API_URL}/loans/${id}`, { headers: getH() }),
        fetch(`${API_URL}/schedules/loan/${id}`, { headers: getH() }).catch(() => null),
      ]);

      if (!loanRes.ok) throw new Error('Loan not found');
      const loanData = await loanRes.json();
      setLoan(loanData?.data || loanData);

      if (schedRes?.ok) {
        setSched(await schedRes.json());
      }

      // Fetch approver username if we have an approvedBy ID
      const approvedById = (loanData?.data || loanData)?.approvedBy ?? (loanData?.data || loanData)?.approved_by;
      if (approvedById) {
        try {
          const uRes = await fetch(`${API_URL}/users/${approvedById}`, { headers: getH() });
          if (uRes.ok) {
            const u = await uRes.json();
            setApproverName(u.username || u.full_name || u.email || `User #${approvedById}`);
          }
        } catch { /* non-critical */ }
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setApproveErr(''); setApproving(true);
    try {
      const res = await fetch(`${API_URL}/loans/${id}/approve`, {
        method: 'POST', headers: getH(),
        body: JSON.stringify({ status: approveAction, comments: approveComment || undefined, policyReference: '2026-01-10' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      setShowApproveModal(false);
      setApproveComment('');
      load();
    } catch (e: any) { setApproveErr(e.message); }
    finally { setApproving(false); }
  };

    if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (err || !loan) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50 p-8">
      <AlertTriangle className="w-12 h-12 text-red-300" />
      <p className="text-gray-600 font-medium">{err || 'Loan not found'}</p>
      <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">Go Back</button>
    </div>
  );

  const isWeekly   = loan.loan_type === 'bike';
  const client     = loan.client || {};
  const bike       = loan.bike   || {};
  const clientName = client.first_name
    ? `${client.first_name} ${client.last_name || ''}`.trim()
    : client.full_name || '—';

  const schedSummary = sched?.summary;
  const schedules    = (sched?.schedules || []).slice(0, 6); // show first 6 rows preview

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                {isWeekly
                  ? <Bike className="w-5 h-5 text-blue-600" />
                  : <Banknote className="w-5 h-5 text-emerald-600" />}
                <h1 className="text-lg font-black text-gray-900">
                  {loan.loan_number || `Loan #${id}`}
                </h1>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_STYLES[loan.status] || 'bg-gray-100 text-gray-600'}`}>
                  {loan.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">{clientName} · {isWeekly ? 'Bike Loan' : 'Cash Loan'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
            {canApprove && (loan.status === 'PENDING_APPROVAL' || loan.status === 'PENDING') && (
              <button onClick={() => { setApproveAction('approved'); setShowApproveModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold">
                <ThumbsUp className="w-4 h-4" /> Review
              </button>
            )}
            <Link
              href={`/dashboard/schedules/${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold"
            >
              Full Schedule <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Loan financials */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Principal',    value: fmt(loan.principal_amount), icon: DollarSign,  color: 'bg-blue-500'    },
            { label: 'Total Amount', value: fmt(loan.totalAmount     || loan.total_amount),     icon: TrendingUp,  color: 'bg-violet-500'  },
            { label: 'Balance',      value: fmt(loan.balance),                                  icon: CreditCard,  color: loan.balance > 0 ? 'bg-red-500' : 'bg-emerald-500' },
            { label: 'Interest Rate',value: `${loan.interest_rate || 0}%`, icon: Shield,      color: 'bg-amber-500'   },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-black text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-400 font-medium">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Loan info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Loan Details
            </h2>
            {[
              ['Loan Number',   loan.loan_number || '—'],
              ['Type',          isWeekly ? 'Bike (Weekly)' : 'Cash (Monthly)'],
              ['Term',          isWeekly ? `${(loan.term_weeks || Math.round((loan.term_months||12)*4.33))} weeks` : `${loan.term_months || '—'} months`],
              ['Start Date',    fmtD(loan.start_date)],
              ['End Date',      fmtD(loan.endDate    || loan.end_date)],
              ['Approved By',   loan.approvedBy || loan.approved_by ? (approverName || `User #${loan.approvedBy || loan.approved_by}`) : '—'],
              ['Approved At',   fmtD(loan.approvedAt  || loan.approved_at)],
              ['Processing Fee',fmt(loan.processingFee|| loan.processing_fee || 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          {/* Client + Bike info */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Client
              </h2>
              {clientName !== '—' ? (
                <div className="space-y-2">
                  <p className="font-bold text-gray-900">{clientName}</p>
                  {(client.phone) && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                      <Phone className="w-4 h-4" />{client.phone}
                    </a>
                  )}
                  {(client.email) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />{client.email}
                    </div>
                  )}
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mt-1"
                  >
                    View client profile <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : <p className="text-sm text-gray-400">No client data</p>}
            </div>

            {isWeekly && bike?.id && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Bike className="w-4 h-4 text-gray-400" /> Bike
                </h2>
                <div className="space-y-2 text-sm">
                  {[
                    ['Plate',  bike.plateNumber   || bike.plate_number   || '—'],
                    ['Make',   bike.make           || '—'],
                    ['Model',  bike.model          || '—'],
                    ['Year',   bike.year           || '—'],
                    ['Colour', bike.color || bike.colour || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-1 last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule preview */}
        {schedSummary && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Repayment Schedule</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {schedSummary.paid}/{schedSummary.total} paid · {schedSummary.progressPct}% complete
                </p>
              </div>
              <Link
                href={`/dashboard/schedules/${id}`}
                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Progress bar */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${schedSummary.progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                <span>{fmt(schedSummary.totalPaid)} paid</span>
                <span>{fmt(schedSummary.totalDue - schedSummary.totalPaid)} remaining</span>
              </div>
            </div>

            {schedSummary.overdue > 0 && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <strong>{schedSummary.overdue} overdue instalment{schedSummary.overdue !== 1 ? 's' : ''}</strong>
                &nbsp;·&nbsp;{fmt(schedSummary.totalOverdue)} outstanding
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedules.map((s: any) => {
                    const cfg = SCHED_STATUS[s.status] || SCHED_STATUS.PENDING;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.installmentNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{fmtD(s.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(s.amountDue)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {s.amountPaid > 0 ? fmt(s.amountPaid) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(sched?.schedules?.length || 0) > 6 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                <Link
                  href={`/dashboard/schedules/${id}`}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800"
                >
                  View all {sched.schedules.length} instalments →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {loan.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Notes & Audit Trail</h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
              {loan.notes}
            </pre>
          </div>
        )}

      </div>

      {/* Approve / Reject Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">Review Loan Application</h2>
              <button onClick={() => setShowApproveModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                <p><span className="text-gray-500">Client:</span> <span className="font-semibold">{clientName}</span></p>
                <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">{fmt(loan.principal_amount)}</span></p>
                <p><span className="text-gray-500">Loan #:</span> <span className="font-semibold">{loan.loan_number}</span></p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setApproveAction('approved')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${approveAction === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}>
                  <ThumbsUp className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => setApproveAction('rejected')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${approveAction === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-300'}`}>
                  <ThumbsDown className="w-4 h-4" /> Reject
                </button>
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3} placeholder="Comments (optional)..."
                value={approveComment} onChange={e => setApproveComment(e.target.value)} />
              {approveErr && <p className="text-red-600 text-sm">{approveErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowApproveModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleApprove} disabled={approving}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 ${approveAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : (approveAction === 'approved' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />)}
                  {approving ? 'Submitting...' : (approveAction === 'approved' ? 'Approve Loan' : 'Reject Loan')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
