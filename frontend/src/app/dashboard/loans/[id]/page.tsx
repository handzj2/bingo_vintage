// fix: edit modal pre-fill — openEditModal reads current loan data so all fields are populated instantly
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { calculateCashLoan, calculateBikeLoan } from '@/features/loans/loan.utils';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Clock,
  User, Phone, Mail, Calendar, DollarSign, Bike, Banknote,
  FileText, CreditCard, RefreshCw, ArrowRight, MinusCircle,
  XCircle, TrendingUp, Shield, ThumbsUp, ThumbsDown, X,
  Edit3,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt  = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:     'bg-bv-success-bg text-bv-success',
  PENDING:    'bg-bv-warning-bg text-bv-warning',
  COMPLETED:  'bg-bv-info-bg text-bv-accent',
  CANCELLED:  'bg-bv-hover text-bv-meta',
  DELINQUENT: 'bg-bv-danger-bg text-bv-danger',
  REJECTED:   'bg-bv-danger-bg text-bv-danger',
};

const SCHED_STATUS: Record<string, { cls: string; dot: string }> = {
  PAID:      { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  PARTIAL:   { cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400'   },
  OVERDUE:   { cls: 'bg-bv-danger-bg text-bv-danger',        dot: 'bg-bv-danger-bg0'     },
  PENDING:   { cls: 'bg-bv-hover text-bv-meta',      dot: 'bg-gray-300'    },
  CANCELLED: { cls: 'bg-bv-hover text-bv-meta',      dot: 'bg-bv-border'    },
  WAIVED:    { cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-400'  },
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user, can } = useAuth();
  const role       = (user?.role ?? '').toLowerCase();
  const isAdmin    = role === 'admin' || role === 'superadmin';
  const canApprove = isAdmin || role === 'manager' || can('loan.approve');
  // Edit Loan Details is admin-only on the backend (editLoanDetails asserts assertAdmin),
  // so the button is restricted the same way — a manager could otherwise fill out the
  // whole form and only find out it's rejected when they hit Save.
  const canEdit    = isAdmin;
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

  // ── Edit Loan state ────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing]           = useState(false);
  const [editErr, setEditErr]           = useState('');
  const [editForm, setEditForm] = useState({
    principalAmount: 0,
    termWeeks: 0,
    termMonths: 0,
    weeklyAmount: 0,
    interestRate: 0,
    startDate: '',
    newBalance: undefined as number | undefined,
  });

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [loanRes, schedRes] = await Promise.all([
        fetch(`${API_URL}/loans/${id}`, { headers: getH() }),
        fetch(`${API_URL}/schedules/loan/${id}`, { headers: getH() }).catch(() => null),
      ]);

      if (!loanRes.ok) throw new Error('Loan not found');
      const loanData = await loanRes.json();
      const currentLoan = loanData?.data || loanData;
      setLoan(currentLoan);

      if (schedRes?.ok) {
        setSched(await schedRes.json());
      }

      // Fetch approver username
      const approvedById = currentLoan?.approvedBy ?? currentLoan?.approved_by;
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

  // ── Open the Edit modal and pre‑fill with CURRENT loan values ──────
  const openEditModal = () => {
    if (!loan) return;
    setEditForm({
      principalAmount: Number(loan.principal_amount) || 0,
      termWeeks: Number(loan.term_weeks) || 0,
      termMonths: Number(loan.term_months) || 0,
      weeklyAmount: Number(loan.weekly_amount || loan.weeklyAmount) || 0,
      // Stored as a decimal fraction (e.g. 0.15) — shown here as a percentage (15),
      // matching how the Create Loan screen collects and displays the rate.
      interestRate: (Number(loan.interest_rate || loan.interestRate) || 0) * 100,
      startDate: loan.start_date
        ? new Date(loan.start_date).toISOString().slice(0, 10)
        : '',
      newBalance: undefined,
    });
    setEditErr('');
    setShowEditModal(true);
  };

  // ── Calculation preview: what the loan looked like before this edit,
  //    and what it will look like with the values currently in the form —
  //    same engine (loan.utils) and card style the Create Loan screen uses. ──
  const originalCalc = useMemo(() => {
    if (!loan) return null;
    const weekly = loan.loan_type === 'bike';
    return weekly
      ? calculateBikeLoan(
          (Number(loan.principal_amount) || 0) + (Number(loan.deposit) || 0),
          Number(loan.deposit) || 0,
          (Number(loan.interest_rate || loan.interestRate) || 0) * 100,
          Number(loan.term_weeks) || 0,
        )
      : calculateCashLoan(
          Number(loan.principal_amount) || 0,
          (Number(loan.interest_rate || loan.interestRate) || 0) * 100,
          Number(loan.term_months) || 0,
        );
  }, [loan]);

  const previewCalc = useMemo(() => {
    const weekly = loan?.loan_type === 'bike';
    return weekly
      ? calculateBikeLoan(
          editForm.principalAmount + (Number(loan?.deposit) || 0),
          Number(loan?.deposit) || 0,
          editForm.interestRate,
          editForm.termWeeks,
        )
      : calculateCashLoan(
          editForm.principalAmount,
          editForm.interestRate,
          editForm.termMonths,
        );
  }, [editForm, loan]);

  const handleApprove = async () => {
    setApproveErr(''); setApproving(true);
    try {
      const res = await fetch(`${API_URL}/loans/${id}/approve`, {
        method: 'POST', headers: getH(),
        body: JSON.stringify({
          action: approveAction === 'approved' ? 'approve' : 'reject',
          ...(approveComment ? { reason: approveComment } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      toast.success(approveAction === 'approved' ? 'Loan approved' : 'Loan rejected');
      setShowApproveModal(false);
      setApproveComment('');
      load();
    } catch (e: any) {
      setApproveErr(e.message);
      toast.error(e.message || 'Approval failed');
    }
    finally { setApproving(false); }
  };

  // ── Handle loan edit submission ────────────────────────────────────
  const handleEditSubmit = async () => {
    setEditErr(''); setEditing(true);
    try {
      const payload: any = {};
      if (editForm.principalAmount) payload.principalAmount = Number(editForm.principalAmount);
      if (isWeekly && editForm.termWeeks)   payload.termWeeks  = Number(editForm.termWeeks);
      if (!isWeekly && editForm.termMonths) payload.termMonths = Number(editForm.termMonths);
      if (editForm.weeklyAmount)    payload.weeklyAmount    = Number(editForm.weeklyAmount);
      // Form shows a percentage (e.g. 15); backend stores a decimal fraction (e.g. 0.15).
      if (editForm.interestRate)    payload.interestRate    = Number(editForm.interestRate) / 100;
      if (editForm.startDate)       payload.startDate       = editForm.startDate;
      if (editForm.newBalance !== undefined && editForm.newBalance !== null) {
        payload.newBalance = Number(editForm.newBalance);
      }

      const res = await fetch(`${API_URL}/loans/${id}/edit-details`, {
        method: 'PATCH',
        headers: getH(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Edit failed');
      setShowEditModal(false);
      load(); // reload everything
    } catch (e: any) { setEditErr(e.message); }
    finally { setEditing(false); }
  };

  if (loading) return (
    <div className="p-6 max-w-bv mx-auto">
      <p className="text-sm text-bv-muted">Loading loan…</p>
    </div>
  );

  if (err || !loan) return (
    <div className="p-6 max-w-bv mx-auto space-y-3">
      <h1 className="text-lg font-semibold text-bv-text">Loan</h1>
      <div className="border border-bv-danger/30 bg-bv-danger-bg text-bv-danger text-sm px-3 py-2 rounded-md">
        {err || 'Loan not found'}
      </div>
      <button type="button" onClick={() => router.back()}
        className="text-sm border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover">Go back</button>
    </div>
  );

  const isWeekly   = loan.loan_type === 'bike';
  const client     = loan.client || {};
  const bike       = loan.bike   || {};
  const clientName = client.first_name
    ? `${client.first_name} ${client.last_name || ''}`.trim()
    : client.full_name || '—';

  const schedSummary = sched?.summary;
  const schedules    = (sched?.schedules || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-bv-hover">

      {/* Sticky header */}
      <div className="bg-bv-surface border-b border-bv-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-bv-hover text-bv-meta">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                {isWeekly
                  ? <Bike className="w-5 h-5 text-bv-accent" />
                  : <Banknote className="w-5 h-5 text-emerald-600" />}
                <h1 className="text-lg font-semibold text-bv-text">
                  {loan.loan_number || `Loan #${id}`}
                </h1>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_STYLES[loan.status] || 'bg-bv-hover text-bv-muted'}`}>
                  {loan.status}
                </span>
              </div>
              <p className="text-sm text-bv-muted">{clientName} · {isWeekly ? 'Bike loan' : 'Cash loan'} · Remaining principal and schedule below</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-bv-hover hover:bg-bv-border rounded-xl text-sm font-medium text-bv-muted">
              <RefreshCw className="w-4 h-4" />
            </button>
            {canApprove && (loan.status === 'PENDING_APPROVAL' || loan.status === 'PENDING') && (
              <button onClick={() => { setApproveAction('approved'); setShowApproveModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-bv-warning-bg0 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold">
                <ThumbsUp className="w-4 h-4" /> Review
              </button>
            )}
            {/* ── Edit Loan Button ────────────────────────────────── */}
            {canEdit && (
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            )}
            <Link
              href={`/dashboard/schedules/${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-bv-action hover:bg-bv-action-hover text-white rounded-xl text-sm font-bold"
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
            { label: 'Principal',    value: fmt(loan.principal_amount), icon: DollarSign,  color: 'bg-bv-info-bg0'    },
            { label: 'Total Amount', value: fmt(loan.totalAmount     || loan.total_amount),     icon: TrendingUp,  color: 'bg-violet-500'  },
            { label: 'Balance',      value: fmt(loan.balance),                                  icon: CreditCard,  color: loan.balance > 0 ? 'bg-bv-danger-bg0' : 'bg-emerald-500' },
            { label: 'Interest Rate',value: `${loan.interest_rate || 0}%`, icon: Shield,      color: 'bg-amber-500'   },
          ].map(c => (
            <div key={c.label} className="bg-bv-surface rounded-2xl border border-bv-border p-4 shadow-sm">
              <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-black text-bv-text">{c.value}</p>
              <p className="text-xs text-bv-meta font-medium">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Loan info */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-bv-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-bv-meta" /> Loan Details
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
                <span className="text-bv-meta">{label}</span>
                <span className="font-semibold text-bv-text text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          {/* Client + Bike info */}
          <div className="space-y-4">
            <div className="bg-bv-surface rounded-2xl border border-bv-border p-5 shadow-sm">
              <h2 className="font-bold text-bv-text flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-bv-meta" /> Client
              </h2>
              {clientName !== '—' ? (
                <div className="space-y-2">
                  <p className="font-bold text-bv-text">{clientName}</p>
                  {(client.phone) && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-bv-accent hover:text-bv-accent">
                      <Phone className="w-4 h-4" />{client.phone}
                    </a>
                  )}
                  {(client.email) && (
                    <div className="flex items-center gap-2 text-sm text-bv-meta">
                      <Mail className="w-4 h-4" />{client.email}
                    </div>
                  )}
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-bv-accent hover:underline mt-1"
                  >
                    View client profile <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : <p className="text-sm text-bv-meta">No client data</p>}
            </div>

            {isWeekly && bike?.id && (
              <div className="bg-bv-surface rounded-2xl border border-bv-border p-5 shadow-sm">
                <h2 className="font-bold text-bv-text flex items-center gap-2 mb-3">
                  <Bike className="w-4 h-4 text-bv-meta" /> Bike
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
                      <span className="text-bv-meta">{label}</span>
                      <span className="font-semibold text-bv-text">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule preview */}
        {schedSummary && (
          <div className="bg-bv-surface rounded-2xl border border-bv-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-bv-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-bv-text">Repayment Schedule</h2>
                <p className="text-xs text-bv-meta mt-0.5">
                  {schedSummary.paid}/{schedSummary.total} paid · {schedSummary.progressPct}% complete
                </p>
              </div>
              <Link
                href={`/dashboard/schedules/${id}`}
                className="flex items-center gap-1.5 text-sm font-bold text-bv-accent hover:text-bv-accent"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="px-5 py-3 bg-bv-hover border-b border-bv-border">
              <div className="h-2.5 bg-bv-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-bv-info-bg0 transition-all"
                  style={{ width: `${schedSummary.progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-bv-meta mt-1.5">
                <span>{fmt(schedSummary.totalPaid)} paid</span>
                <span>{fmt(schedSummary.totalDue - schedSummary.totalPaid)} remaining</span>
              </div>
            </div>

            {schedSummary.overdue > 0 && (
              <div className="px-5 py-3 bg-bv-danger-bg border-b border-red-100 flex items-center gap-2 text-sm text-bv-danger">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <strong>{schedSummary.overdue} overdue instalment{schedSummary.overdue !== 1 ? 's' : ''}</strong>
                &nbsp;·&nbsp;{fmt(schedSummary.totalOverdue)} outstanding
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bv-hover text-xs font-bold text-bv-meta uppercase tracking-wide">
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
                      <tr key={s.id} className="hover:bg-bv-hover">
                        <td className="px-4 py-3 text-bv-meta font-mono text-xs">{s.installmentNumber}</td>
                        <td className="px-4 py-3 font-medium text-bv-text">{fmtD(s.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-bv-text">{fmt(s.amountDue)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {s.amountPaid > 0 ? fmt(s.amountPaid) : <span className="text-bv-meta">—</span>}
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
              <div className="px-5 py-3 bg-bv-hover border-t border-bv-border text-center">
                <Link
                  href={`/dashboard/schedules/${id}`}
                  className="text-sm font-bold text-bv-accent hover:text-bv-accent"
                >
                  View all {sched.schedules.length} instalments →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {loan.notes && (
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-5 shadow-sm">
            <h2 className="font-bold text-bv-text mb-3">Notes & Audit Trail</h2>
            <pre className="text-xs text-bv-muted whitespace-pre-wrap font-mono bg-bv-hover rounded-xl p-4 max-h-64 overflow-y-auto">
              {loan.notes}
            </pre>
          </div>
        )}

      </div>

      {/* Approve / Reject Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-bv-border">
              <h2 className="font-bold text-bv-text text-lg">Review Loan Application</h2>
              <button onClick={() => setShowApproveModal(false)} className="p-1 rounded-lg hover:bg-bv-hover text-bv-meta"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bv-hover rounded-xl p-4 text-sm space-y-1">
                <p><span className="text-bv-meta">Client:</span> <span className="font-semibold">{clientName}</span></p>
                <p><span className="text-bv-meta">Amount:</span> <span className="font-semibold">{fmt(loan.principal_amount)}</span></p>
                <p><span className="text-bv-meta">Loan #:</span> <span className="font-semibold">{loan.loan_number}</span></p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setApproveAction('approved')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${approveAction === 'approved' ? 'border-green-500 bg-bv-success-bg text-bv-success' : 'border-bv-border text-bv-meta hover:border-green-300'}`}>
                  <ThumbsUp className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => setApproveAction('rejected')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all ${approveAction === 'rejected' ? 'border-red-500 bg-bv-danger-bg text-bv-danger' : 'border-bv-border text-bv-meta hover:border-red-300'}`}>
                  <ThumbsDown className="w-4 h-4" /> Reject
                </button>
              </div>
              <textarea
                className="w-full border border-bv-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-bv-action resize-none"
                rows={3} placeholder="Comments (optional)..."
                value={approveComment} onChange={e => setApproveComment(e.target.value)} />
              {approveErr && <p className="text-bv-danger text-sm">{approveErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowApproveModal(false)}
                  className="flex-1 px-4 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
                  Cancel
                </button>
                <button onClick={handleApprove} disabled={approving}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 ${approveAction === 'approved' ? 'bg-bv-success hover:bg-bv-success' : 'bg-bv-danger hover:bg-bv-danger'} disabled:opacity-50`}>
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : (approveAction === 'approved' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />)}
                  {approving ? 'Submitting...' : (approveAction === 'approved' ? 'Approve Loan' : 'Reject Loan')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Loan Details Modal (PRE‑FILLED CORRECTLY) ────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bv-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-bv-border">
              <h2 className="font-bold text-bv-text text-lg">Edit Loan Details</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-bv-hover text-bv-meta"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bv-hover rounded-xl p-4 text-sm space-y-1">
                <p><span className="text-bv-meta">Loan #:</span> <span className="font-semibold">{loan.loan_number}</span></p>
                <p><span className="text-bv-meta">Client:</span> <span className="font-semibold">{clientName}</span></p>
                <p><span className="text-bv-meta">Type:</span> <span className="font-semibold">{isWeekly ? 'Bike (Weekly)' : 'Cash (Monthly)'}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bv-muted mb-1">Principal Amount</label>
                  <input
                    type="number"
                    className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editForm.principalAmount}
                    onChange={e => setEditForm({...editForm, principalAmount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bv-muted mb-1">
                    Term ({isWeekly ? 'weeks' : 'months'})
                  </label>
                  <input
                    type="number"
                    className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={isWeekly ? editForm.termWeeks : editForm.termMonths}
                    onChange={e => setEditForm(
                      isWeekly
                        ? {...editForm, termWeeks: Number(e.target.value)}
                        : {...editForm, termMonths: Number(e.target.value)}
                    )}
                  />
                </div>
                {isWeekly && (
                  <div>
                    <label className="block text-xs font-medium text-bv-muted mb-1">Weekly Amount (override)</label>
                    <input
                      type="number"
                      className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editForm.weeklyAmount}
                      onChange={e => setEditForm({...editForm, weeklyAmount: Number(e.target.value)})}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-bv-muted mb-1">
                    {isWeekly ? 'Weekly' : 'Monthly'} Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editForm.interestRate}
                    onChange={e => setEditForm({...editForm, interestRate: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bv-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editForm.startDate}
                    onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bv-muted mb-1">New Balance (optional)</label>
                  <input
                    type="number"
                    className="w-full border border-bv-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Calculated if empty"
                    value={editForm.newBalance !== undefined ? editForm.newBalance : ''}
                    onChange={e => setEditForm({...editForm, newBalance: e.target.value ? Number(e.target.value) : undefined})}
                  />
                </div>
              </div>

              {/* ── Calculation preview: current terms vs. what these edits produce ── */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl p-4 bg-bv-hover text-bv-muted">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">Current (before edit)</p>
                  <p className="text-xl font-black">
                    {Math.round(originalCalc?.installment || 0).toLocaleString()}
                    <span className="text-xs font-medium opacity-60 ml-1">UGX / {isWeekly ? 'wk' : 'mo'}</span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-bv-border/70 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="opacity-60">Total Interest</span><span className="font-semibold">{Math.round(originalCalc?.totalInterest || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between font-bold"><span>Total Payable</span><span>{Math.round(originalCalc?.totalPayable || 0).toLocaleString()}</span></div>
                  </div>
                </div>
                <div className={`rounded-2xl p-4 text-white ${isWeekly ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">New (with these edits)</p>
                  <p className="text-xl font-black">
                    {Math.round(previewCalc?.installment || 0).toLocaleString()}
                    <span className="text-xs font-medium opacity-60 ml-1">UGX / {isWeekly ? 'wk' : 'mo'}</span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="opacity-70">Total Interest</span><span className="font-semibold">{Math.round(previewCalc?.totalInterest || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between font-bold"><span>Total Payable</span><span>{Math.round(previewCalc?.totalPayable || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-bv-meta -mt-1">
                Preview only — the schedule is recalculated and existing payments replayed against it when you save.
              </p>

              {editErr && <p className="text-bv-danger text-sm">{editErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">
                  Cancel
                </button>
                <button onClick={handleEditSubmit} disabled={editing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}