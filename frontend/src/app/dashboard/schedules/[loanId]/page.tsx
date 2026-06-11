'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, Clock, MinusCircle, XCircle,
  ChevronLeft, RefreshCw, Loader2, Calendar, DollarSign,
  TrendingUp, Search, Bike, Banknote, Phone, User,
  ArrowRight, BadgeCheck, BarChart3, CreditCard,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDShort = (d: any) => d ? new Date(d).toLocaleDateString('en-UG', { day: '2-digit', month: 'short' }) : '—';

const STATUS: Record<string, { label: string; cls: string; dot: string; row: string; icon: any }> = {
  PAID:      { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', row: 'bg-emerald-50/40', icon: CheckCircle2 },
  PARTIAL:   { label: 'Partial',  cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400',   row: 'bg-amber-50/40',   icon: MinusCircle  },
  OVERDUE:   { label: 'Overdue',  cls: 'bg-red-100 text-red-700',        dot: 'bg-red-500',     row: 'bg-red-50/30',     icon: AlertTriangle },
  PENDING:   { label: 'Upcoming', cls: 'bg-gray-100 text-gray-500',      dot: 'bg-gray-300',    row: '',                 icon: Clock        },
  CANCELLED: { label: 'Cancelled',cls: 'bg-gray-100 text-gray-400',      dot: 'bg-gray-200',    row: 'opacity-50',       icon: XCircle      },
  WAIVED:    { label: 'Waived',   cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-400',  row: 'bg-purple-50/30',  icon: BadgeCheck   },
};

function Badge({ status, days }: { status: string; days?: number }) {
  const cfg = STATUS[status] || STATUS['PENDING'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {status === 'OVERDUE' && days && days > 0 && <span className="opacity-75">({days}d)</span>}
    </span>
  );
}

// Mini progress bar for individual row
function RowProgress({ paid, due }: { paid: number; due: number }) {
  if (!due) return null;
  const pct = Math.min(100, Math.round((paid / due) * 100));
  return (
    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SchedulePage() {
  const { loanId } = useParams<{ loanId: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoad] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoad(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/schedules/loan/${loanId}`, { headers: getH() });
      if (!r.ok) throw new Error('Failed to load schedule');
      setData(await r.json());
    } catch (e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }, [loanId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading schedule...</p>
      </div>
    </div>
  );

  if (err || !data) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50 p-8">
      <AlertTriangle className="w-12 h-12 text-red-300" />
      <p className="text-gray-600 font-bold">{err || 'Schedule not found'}</p>
      <button onClick={load} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold">Retry</button>
    </div>
  );

  const { loan, summary, schedules } = data;
  const isWeekly = loan.loanType === 'bike' || loan.loan_type === 'bike';

  // Normalise each schedule row to be safe against both snake_case (raw SQL) and camelCase (entity)
  const rows = (schedules || []).map((s: any) => ({
    id:                s.id,
    installmentNumber: s.installmentNumber ?? s.installment_number,
    dueDate:           s.dueDate ?? s.due_date,
    amountDue:         Number(s.amountDue ?? s.amount_due ?? 0),
    amountPaid:        Number(s.amountPaid ?? s.amount_paid ?? 0),
    remainingAmount:   Number(s.remainingAmount ?? s.remaining_amount ?? Math.max(0, (s.amountDue ?? s.amount_due ?? 0) - (s.amountPaid ?? s.amount_paid ?? 0))),
    lateFeeAmount:     Number(s.lateFeeAmount ?? s.late_fee_amount ?? 0),
    overdueDays:       Number(s.overdueDays ?? s.overdue_days ?? s.days_overdue ?? 0),
    status:            String(s.status || 'PENDING').toUpperCase(),
    paidDate:          s.paidDate ?? s.paid_date ?? null,
    receiptNumber:     s.receiptNumber ?? s.receipt_number ?? null,
    paymentMethod:     s.paymentMethod ?? s.payment_method ?? null,
    isToday:           s.isToday ?? s.is_today ?? false,
  }));

  const filtered = rows.filter((s: any) => {
    const byF =
      filter === 'all'     ? true :
      filter === 'paid'    ? s.status === 'PAID' :
      filter === 'overdue' ? s.status === 'OVERDUE' :
      filter === 'partial' ? s.status === 'PARTIAL' :
      s.status === 'PENDING';
    const byS = !search ||
      String(s.installmentNumber).includes(search) ||
      (s.receiptNumber || '').toLowerCase().includes(search.toLowerCase());
    return byF && byS;
  });

  // ── Use backend summary where available (more accurate) ───────────────────
  // summary.totalPaid comes from raw SQL sum of all COMPLETED payments
  // Row-level amountPaid may be 0 if payment not yet linked to schedule row
  const totalDue     = rows.reduce((n: number, s: any) => n + s.amountDue, 0);
  const totalPaid    = Math.max(
    Number(summary?.totalPaid ?? 0),
    rows.reduce((n: number, s: any) => n + s.amountPaid, 0),
  );
  const paidCount    = rows.filter((s: any) => s.status === 'PAID').length;
  const overdueCount = rows.filter((s: any) => s.status === 'OVERDUE').length;
  const partialCount = rows.filter((s: any) => s.status === 'PARTIAL').length;
  const pendingCount = rows.filter((s: any) => s.status === 'PENDING').length;
  const totalOverdue = rows.filter((s: any) => s.status === 'OVERDUE').reduce((n: number, s: any) => n + s.remainingAmount, 0);
  const totalFines   = rows.reduce((n: number, s: any) => n + s.lateFeeAmount, 0);
  const progressPct  = summary?.progressPct ?? (rows.length > 0 ? Math.round((paidCount / rows.length) * 100) : 0);
  const outstanding  = Math.max(0, Number(summary?.outstanding ?? loan.balance ?? Math.max(0, totalDue - totalPaid)));

  const nextDue = rows.find((s: any) => s.status === 'PENDING' || s.status === 'PARTIAL');

  const FILTERS = [
    ['all',      `All (${rows.length})`],
    ['paid',     `Paid (${paidCount})`],
    ['partial',  `Partial (${partialCount})`],
    ['overdue',  `Overdue (${overdueCount})`],
    ['upcoming', `Upcoming (${pendingCount})`],
  ] as [string, string][];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isWeekly ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                {isWeekly ? <Bike className="w-5 h-5 text-orange-600" /> : <Banknote className="w-5 h-5 text-emerald-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-black text-gray-900">{loan.clientName || 'Client'}</h1>
                  {loan.bikePlate && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-black border border-orange-100">{loan.bikePlate}</span>
                  )}
                  {loan.clientPhone && (
                    <a href={`tel:${loan.clientPhone}`} className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
                      <Phone className="w-3 h-3" />{loan.clientPhone}
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400">{loan.loanNumber} · {isWeekly ? 'Weekly' : 'Monthly'} Schedule</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loan.status === 'ACTIVE' || loan.status === 'DELINQUENT' ? (
              <button
                onClick={() => router.push(`/dashboard/payments?loanId=${loanId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                <CreditCard className="w-4 h-4" /> Record Payment
              </button>
            ) : null}
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Loan',    value: fmt(totalDue || loan.totalAmount),  icon: DollarSign,    color: 'bg-blue-500',    sub: `${rows.length} instalments` },
            { label: 'Total Paid',    value: fmt(totalPaid),                     icon: CheckCircle2,  color: 'bg-emerald-500', sub: `${paidCount} paid` },
            { label: 'Outstanding',   value: fmt(outstanding),                   icon: TrendingUp,    color: 'bg-violet-500',  sub: `Loan balance` },
            { label: 'Overdue',       value: fmt(totalOverdue),                  icon: AlertTriangle, color: overdueCount > 0 ? 'bg-red-500' : 'bg-gray-300', sub: `${overdueCount} overdue` },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-black text-gray-900 leading-tight">{c.value}</p>
              <p className="text-xs font-bold text-gray-400 mt-0.5">{c.label}</p>
              <p className="text-xs text-gray-400">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h2 className="font-black text-gray-900">Repayment Progress</h2>
            </div>
            {nextDue && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-700">
                <Calendar className="w-4 h-4" />
                Next: {fmtD(nextDue.dueDate)} · {fmt(nextDue.remainingAmount)}
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 font-medium">{paidCount} of {rows.length} paid</span>
            <span className="font-black text-gray-900">{progressPct}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 relative"
              style={{
                width: `${progressPct}%`,
                background: overdueCount > 0 ? '#ef4444' : progressPct >= 80 ? '#10b981' : progressPct >= 40 ? '#3b82f6' : '#f59e0b'
              }}>
              {progressPct > 10 && (
                <span className="absolute right-2 top-0 bottom-0 flex items-center text-white text-xs font-black">{progressPct}%</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: `${paidCount} Paid`,          cls: 'bg-emerald-100 text-emerald-700' },
              { label: `${partialCount} Partial`,    cls: partialCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400' },
              { label: `${overdueCount} Overdue`,    cls: overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400' },
              { label: `${pendingCount} Upcoming`,   cls: 'bg-gray-100 text-gray-500' },
            ].map(p => (
              <span key={p.label} className={`px-3 py-1 rounded-full text-xs font-bold ${p.cls}`}>{p.label}</span>
            ))}
            {totalFines > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{fmt(totalFines)} in fines</span>
            )}
          </div>
        </div>

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-800">{overdueCount} overdue instalment{overdueCount !== 1 ? 's' : ''}</p>
              <p className="text-sm text-red-600 mt-0.5">
                Total overdue: <strong>{fmt(totalOverdue)}</strong>
                {totalFines > 0 && <> · Fines: <strong>{fmt(totalFines)}</strong></>}
              </p>
            </div>
          </div>
        )}

        {/* Instalments table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search # or receipt..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wide">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wide">Amount Due</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wide">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wide">Remaining</th>
                  <th className="px-4 py-3 text-left  text-xs font-black text-gray-400 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-gray-400 uppercase tracking-wide">Fine</th>
                  <th className="px-4 py-3 text-left  text-xs font-black text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left  text-xs font-black text-gray-400 uppercase tracking-wide">Paid On</th>
                  <th className="px-4 py-3 text-left  text-xs font-black text-gray-400 uppercase tracking-wide">Receipt</th>
                  <th className="px-4 py-3 text-left  text-xs font-black text-gray-400 uppercase tracking-wide">Method</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 font-semibold">No records match</p>
                    </td>
                  </tr>
                ) : filtered.map((s: any) => {
                  const cfg = STATUS[s.status] || STATUS['PENDING'];
                  const isPaid = s.status === 'PAID';
                  const isOverdue = s.status === 'OVERDUE';
                  const isPartial = s.status === 'PARTIAL';
                  const isToday = s.isToday;

                  return (
                    <tr key={s.id}
                      className={`transition-colors hover:bg-gray-50 ${cfg.row} ${isToday ? 'border-l-4 border-l-blue-500' : ''}`}>
                      {/* # */}
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${isPaid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-red-100 text-red-700' : isPartial ? 'bg-amber-100 text-amber-700' : isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.installmentNumber || '—'}
                        </span>
                      </td>
                      {/* Due date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isToday ? 'text-blue-700' : isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                            {fmtDShort(s.dueDate)}
                          </span>
                          {isToday && <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs font-black animate-pulse">TODAY</span>}
                        </div>
                      </td>
                      {/* Amount due */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-gray-900">{s.amountDue > 0 ? fmt(s.amountDue) : <span className="text-gray-300">—</span>}</span>
                      </td>
                      {/* Paid */}
                      <td className="px-4 py-3 text-right">
                        {s.amountPaid > 0
                          ? <span className="font-black text-emerald-700">{fmt(s.amountPaid)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Remaining */}
                      <td className="px-4 py-3 text-right">
                        {isPaid
                          ? <span className="text-emerald-500 font-black">✓</span>
                          : s.remainingAmount > 0
                            ? <span className={`font-black ${isOverdue ? 'text-red-600' : isPartial ? 'text-amber-600' : 'text-gray-500'}`}>{fmt(s.remainingAmount)}</span>
                            : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Mini progress */}
                      <td className="px-4 py-3">
                        {s.amountDue > 0 && <RowProgress paid={s.amountPaid} due={s.amountDue} />}
                      </td>
                      {/* Fine */}
                      <td className="px-4 py-3 text-right">
                        {s.lateFeeAmount > 0
                          ? <span className="font-bold text-orange-600 text-xs">{fmt(s.lateFeeAmount)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3"><Badge status={s.status} days={s.overdueDays} /></td>
                      {/* Paid on */}
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{fmtD(s.paidDate)}</td>
                      {/* Receipt */}
                      <td className="px-4 py-3">
                        {s.receiptNumber
                          ? <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{s.receiptNumber}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Method */}
                      <td className="px-4 py-3 text-xs text-gray-500">{s.paymentMethod || '—'}</td>
                      {/* Quick pay */}
                      <td className="px-4 py-3">
                        {(s.status === 'PENDING' || s.status === 'OVERDUE' || s.status === 'PARTIAL') && (
                          <button
                            onClick={() => router.push(`/dashboard/payments?loanId=${loanId}`)}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-black text-xs">
                    <td colSpan={2} className="px-4 py-3 text-gray-500 uppercase tracking-wide">Totals ({filtered.length})</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(filtered.reduce((n: number, s: any) => n + s.amountDue, 0))}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{fmt(filtered.reduce((n: number, s: any) => n + s.amountPaid, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(filtered.reduce((n: number, s: any) => n + s.remainingAmount, 0))}</td>
                    <td colSpan={7} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filtered.length} of {rows.length} instalments</span>
            <span>{isWeekly ? '📅 Weekly' : '📆 Monthly'} · {loan.loanNumber}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
