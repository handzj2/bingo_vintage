'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar, RefreshCw, Loader2, Search, AlertTriangle,
  CheckCircle2, ChevronRight, Bike, Banknote, Phone,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt  = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtD = (d: any) => d
  ? new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

// Normalise field names — TypeORM may return camelCase or snake_case depending on driver
const loanType = (l: any): 'bike' | 'cash' => {
  if (l.bike?.id || l.bike?.registration_number || l.bike?.plateNumber) return 'bike';
  const t = (l.loanType || l.loan_type || '').toLowerCase();
  return t === 'bike' ? 'bike' : 'cash';
};
const clientName = (l: any) => {
  const c = l.client; if (!c) return '—';
  const fn = c.firstName || c.first_name || '';
  const ln = c.lastName  || c.last_name  || '';
  return `${fn} ${ln}`.trim() || c.name || c.full_name || '—';
};
const clientPhone = (l: any) =>
  l.client?.phone || l.client?.phoneNumber || l.client?.phone_number || '';
const bikePlate = (l: any) => {
  const b = l.bike; if (!b) return '';
  return b.plateNumber || b.plate_number || b.registrationNumber
    || b.registration_number || b.frameNumber || b.frame_number || '';
};
const loanNum = (l: any) => l.loanNumber || l.loan_number || `#${l.id}`;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-700',
  DELINQUENT: 'bg-red-100   text-red-700',
  COMPLETED:  'bg-blue-100  text-blue-700',
  PENDING:    'bg-yellow-100 text-yellow-700',
};

async function fetchSummary(loanId: number) {
  try {
    const r = await fetch(`${API_URL}/schedules/loan/${loanId}`, { headers: getH() });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

function LoanCard({ loan, sched }: { loan: any; sched: any }) {
  const type  = loanType(loan);
  const name  = clientName(loan);
  const phone = clientPhone(loan);
  const plate = bikePlate(loan);
  const num   = loanNum(loan);
  const rawSum = sched?.summary;
  // Normalise summary field names — backend may use paidCount/totalInstallments/overdueCount
  const sum = rawSum ? {
    paid:        rawSum.paidCount        ?? rawSum.paid        ?? 0,
    total:       rawSum.totalInstallments ?? rawSum.total       ?? 0,
    overdue:     rawSum.overdueCount     ?? rawSum.overdue      ?? 0,
    progressPct: rawSum.progressPct      ?? 0,
    nextDueDate: rawSum.nextDueDate      ?? null,
    nextDueAmount: rawSum.nextDueAmount  ?? 0,
    totalOverdue: rawSum.totalOverdue    ?? 0,
  } : null;

  return (
    <Link
      href={`/dashboard/loans/${loan.id}`}
      className={`block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group
        ${sum?.overdue > 0 || loan.status === 'DELINQUENT'
          ? 'border-red-200 ring-1 ring-red-100'
          : 'border-gray-100'}`}
    >
      <div className="p-5">

        {/* Top row: type icon + name + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              ${type === 'bike' ? 'bg-orange-50' : 'bg-emerald-50'}`}>
              {type === 'bike'
                ? <Bike    className="w-5 h-5 text-orange-500" />
                : <Banknote className="w-5 h-5 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm leading-tight">{name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {num} · {type === 'bike' ? 'Bike Loan' : 'Cash Loan'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold flex-shrink-0 ml-2
            ${STATUS_STYLE[loan.status] || 'bg-gray-100 text-gray-400'}`}>
            {loan.status}
          </span>
        </div>

        {/* Client contact + bike plate */}
        {(phone || plate) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {phone && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Phone className="w-3 h-3" />{phone}
              </span>
            )}
            {plate && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50
                text-orange-700 rounded-lg text-xs font-bold">
                <Bike className="w-3 h-3" />{plate}
              </span>
            )}
          </div>
        )}

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          {[
            { label: 'Total',   val: fmt(loan.totalAmount || loan.total_amount || 0) },
            { label: 'Balance', val: fmt(loan.balance || 0), red: Number(loan.balance) > 0 },
            {
              label: 'Term',
              val: type === 'bike'
                ? `${loan.termWeeks || loan.term_weeks || Math.round((loan.termMonths || loan.term_months || 12) * 4.33)}wk`
                : `${loan.termMonths || loan.term_months || '—'}mo`
            },
          ].map(c => (
            <div key={c.label} className="bg-gray-50 rounded-xl p-2">
              <p className={`text-xs font-black ${(c as any).red ? 'text-red-600' : 'text-gray-900'}`}>{c.val}</p>
              <p className="text-xs text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {sum ? (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{sum.paid}/{sum.total} paid</span>
              <span className="font-bold text-gray-900">{sum.progressPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${sum.progressPct}%`,
                  background: sum.overdue > 0 ? '#ef4444'
                    : sum.progressPct >= 80 ? '#10b981' : '#3b82f6',
                }} />
            </div>
            {sum.overdue > 0
              ? <p className="text-xs font-bold text-red-600">⚠️ {sum.overdue} overdue · {fmt(sum.totalOverdue)}</p>
              : sum.nextDueDate
                ? <p className="text-xs text-gray-400">Next: {fmtD(sum.nextDueDate)} · {fmt(sum.nextDueAmount)}</p>
                : sum.paid === sum.total
                  ? <p className="text-xs text-emerald-600 font-semibold">✓ Fully paid</p>
                  : null}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-2 w-1/2 bg-gray-100 rounded-full animate-pulse" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            {fmtD(loan.startDate || loan.start_date)}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-800">
            View <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SchedulesIndexPage() {
  const [loans, setLoans]         = useState<any[]>([]);
  const [schedData, setSchedData] = useState<Record<number, any>>({});
  const [loading, setLoad]        = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');

  const load = useCallback(async () => {
    setLoad(true);
    setSchedData({});
    try {
      const r    = await fetch(`${API_URL}/loans`, { headers: getH() });
      const json = await r.json();
      const all: any[] = Array.isArray(json) ? json : json?.data || [];
      const active = all.filter(l =>
        ['ACTIVE', 'DELINQUENT', 'COMPLETED'].includes(l.status)
      );
      setLoans(active);

      // Load schedule summaries in background — batches of 15
      for (let i = 0; i < active.length; i += 15) {
        const batch = active.slice(i, i + 15);
        const results = await Promise.all(batch.map(l => fetchSummary(l.id)));
        setSchedData(prev => {
          const next = { ...prev };
          batch.forEach((l, idx) => { if (results[idx]) next[l.id] = results[idx]; });
          return next;
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    bike:     loans.filter(l => loanType(l) === 'bike').length,
    cash:     loans.filter(l => loanType(l) === 'cash').length,
    overdue:  loans.filter(l => l.status === 'DELINQUENT' || schedData[l.id]?.summary?.overdue > 0).length,
    active:   loans.filter(l => l.status === 'ACTIVE').length,
    done:     loans.filter(l => l.status === 'COMPLETED').length,
  };

  const filtered = loans.filter(l => {
    const t = loanType(l);
    const ok = filter === 'all'       ? true
      : filter === 'bike'             ? t === 'bike'
      : filter === 'cash'             ? t === 'cash'
      : filter === 'overdue'          ? l.status === 'DELINQUENT' || schedData[l.id]?.summary?.overdue > 0
      : filter === 'active'           ? l.status === 'ACTIVE'
      : l.status === 'COMPLETED';

    const q = search.toLowerCase();
    const match = !search || [
      clientName(l), clientPhone(l), bikePlate(l), loanNum(l),
    ].some(v => v.toLowerCase().includes(q));

    return ok && match;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Repayment Schedules</h1>
            <p className="text-sm text-gray-400">
              {loans.length} loans · {counts.bike} bike · {counts.cash} cash
            </p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active',   val: counts.active,  cls: 'bg-green-500',              Icon: CheckCircle2 },
          { label: 'Overdue',  val: counts.overdue, cls: counts.overdue ? 'bg-red-500' : 'bg-gray-300', Icon: AlertTriangle },
          { label: 'Bike',     val: counts.bike,    cls: 'bg-orange-500',              Icon: Bike         },
          { label: 'Cash',     val: counts.cash,    cls: 'bg-emerald-500',             Icon: Banknote     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 ${s.cls} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, loan #, phone or plate…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all',      `All (${loans.length})`],
            ['active',   `Active (${counts.active})`],
            ['bike',     `🏍 Bike (${counts.bike})`],
            ['cash',     `💵 Cash (${counts.cash})`],
            ['overdue',  `⚠️ Overdue (${counts.overdue})`],
            ['completed',`Done (${counts.done})`],
          ] as [string, string][]).map(([f, lbl]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading && loans.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {loans.length === 0 ? 'No active loans found' : 'No loans match this filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loan => (
            <LoanCard key={loan.id} loan={loan} sched={schedData[loan.id]} />
          ))}
        </div>
      )}

      <p className="text-xs text-center text-gray-400">
        Showing {filtered.length} of {loans.length} loans
      </p>
    </div>
  );
}
