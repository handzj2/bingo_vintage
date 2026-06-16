'use client';
import { api } from '@/lib/api/client';

import RouteGuard from '@/components/ui/RouteGuard';
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, AlertTriangle, Users, DollarSign,
  Download, RefreshCw, Loader2, Calendar, Bike,
  ArrowUpRight, ArrowDownRight, ChevronRight, FileText,
  CreditCard, Wallet, Smartphone, Building2, Clock,
  CheckCircle, XCircle, Activity,
} from 'lucide-react';

// Uses shared api client from @/lib/api/client
import { formatUGX } from '@/shared/api-types';
const fmt  = (n: number) => formatUGX(n);
const fmtM = (n: number) => formatUGX(n);

const METHODS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CASH:          { label: 'Cash',  color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Wallet },
  Momo:          { label: 'MoMo', color: 'text-yellow-700',  bg: 'bg-yellow-50',  icon: Smartphone },
  BANK_TRANSFER: { label: 'Bank', color: 'text-blue-700',    bg: 'bg-blue-50',    icon: Building2 },
  Airtelmoney:   { label: 'Airtel',color: 'text-red-700',    bg: 'bg-red-50',     icon: Smartphone },
};

// ── Sparkbar ──────────────────────────────────────────────────────────────────
function SparkBars({ data }: { data: { date: string; total: number; count: number }[] }) {
  if (!data?.length) return <p className="text-xs text-gray-400 italic">No data</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const pct = Math.max(6, Math.round((d.total / max) * 100));
        const day = days[new Date(d.date).getDay()];
        const isToday = new Date(d.date).toDateString() === new Date().toDateString();
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group"
            title={`${day}: ${fmt(d.total)} (${d.count} payments)`}>
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-blue-500' : 'bg-blue-200 group-hover:bg-blue-400'}`}
              style={{ height: `${pct}%` }}
            />
            <span className={`text-[9px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Aging bar ─────────────────────────────────────────────────────────────────
function AgingBar({ bucket, loanCount, atRisk, maxRisk }: any) {
  const pct = maxRisk > 0 ? Math.max(4, Math.round((atRisk / maxRisk) * 100)) : 4;
  const colors: Record<string, string> = {
    '1-30 days': 'bg-yellow-400', '31-60 days': 'bg-orange-400',
    '61-90 days': 'bg-red-400',   '90+ days':   'bg-red-700',
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-700">{bucket}</span>
        <div className="text-right">
          <span className="font-black text-gray-900">{fmtM(atRisk)}</span>
          <span className="text-gray-400 text-xs ml-2">{loanCount} loan{loanCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors[bucket] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── CSV download helper ───────────────────────────────────────────────────────
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
async function downloadCsv(path: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { alert('Export failed'); return; }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [portfolio, setPortfolio]   = useState<any>(null);
  const [weekly,    setWeekly]      = useState<any[]>([]);
  const [arrears,   setArrears]     = useState<any[]>([]);
  const [aging,     setAging]       = useState<any[]>([]);
  const [daily,     setDaily]       = useState<any>(null);
  const [loading,   setLoading]     = useState(true);
  const [tab,       setTab]         = useState<'overview' | 'arrears' | 'aging'>('overview');
  const [exporting, setExporting]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [port, wk, arr, ag, day] = await Promise.all([
        api.get('/reports/summary').catch(() => ({})),
        api.get('/reports/weekly-collections').catch(() => []),
        api.get('/reports/arrears').catch(() => []),
        api.get('/reports/portfolio-aging').catch(() => []),
        api.get('/reports/daily-summary').catch(() => ({})),
      ]);
      setPortfolio(port);
      setWeekly(Array.isArray(wk) ? wk : []);
      setArrears(Array.isArray(arr) ? arr : []);
      setAging(Array.isArray(ag) ? ag : []);
      setDaily(day);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const map: Record<string, [string, string]> = {
        payments: ['/reports/export/payments', `payments-${Date.now()}.csv`],
        loans:    ['/reports/export/loans',    `loans-${Date.now()}.csv`],
        clients:  ['/reports/export/clients',  `clients-${Date.now()}.csv`],
      };
      if (map[type]) await downloadCsv(...map[type]);
    } finally {
      setExporting('');
    }
  };

  const maxRisk = Math.max(...aging.map(a => a.atRisk || 0), 1);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  const fin  = portfolio?.financials || {};
  const lns  = portfolio?.loans      || {};
  const bks  = portfolio?.bikes      || {};
  const todayMethods = daily?.method_breakdown || {};
  const weekTotal = weekly.reduce((s: number, d: any) => s + Number(d.total || 0), 0);

  return (
    <RouteGuard permission="report.view" roles={['admin','manager']}>

    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Portfolio performance & financial data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
        {([['overview', 'Overview'], ['arrears', 'Arrears'], ['aging', 'Portfolio Aging']] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Portfolio',   value: fmtM(fin.totalPrincipal),   icon: DollarSign, bg: 'bg-blue-600'   },
              { label: 'Outstanding',       value: fmtM(fin.totalOutstanding), icon: TrendingUp,  bg: 'bg-violet-600' },
              { label: 'Total Collected',   value: fmtM(fin.totalCollected),   icon: CheckCircle, bg: 'bg-emerald-600'},
              { label: 'Delinquent Balance',value: fmtM(fin.delinquentBalance),icon: AlertTriangle,bg: 'bg-red-500'   },
            ].map(({ label, value, icon: Icon, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* 7-day sparkline + today breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-gray-900">7-Day Collections</h3>
                  <p className="text-xs text-gray-400">Total: {fmtM(weekTotal)}</p>
                </div>
                <Activity className="w-4 h-4 text-gray-300" />
              </div>
              <SparkBars data={weekly} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-gray-900">Today's Collections</h3>
                  <p className="text-xs text-gray-400">{daily?.transaction_count || 0} transactions</p>
                </div>
                <Calendar className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-3xl font-black text-gray-900 mb-4">{fmt(daily?.total_collected || 0)}</p>
              <div className="space-y-2">
                {Object.entries(todayMethods).map(([method, data]: any) => {
                  const cfg = METHODS[method] || { label: method, color: 'text-gray-600', bg: 'bg-gray-50', icon: CreditCard };
                  const Icon = cfg.icon;
                  return (
                    <div key={method} className={`flex items-center justify-between px-3 py-2 rounded-xl ${cfg.bg}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-gray-400">{data.count}x</span>
                      </div>
                      <span className={`text-xs font-black ${cfg.color}`}>{fmt(data.amount)}</span>
                    </div>
                  );
                })}
                {Object.keys(todayMethods).length === 0 && (
                  <p className="text-xs text-gray-400 italic">No payments recorded today</p>
                )}
              </div>
            </div>
          </div>

          {/* Loan status breakdown + bikes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-black text-gray-900 mb-4">Loan Status Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: 'Active',     value: lns.active,     color: 'text-green-700',  bg: 'bg-green-50',  icon: CheckCircle },
                  { label: 'Pending',    value: lns.pending,    color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Clock },
                  { label: 'Delinquent', value: lns.delinquent, color: 'text-red-700',    bg: 'bg-red-50',    icon: AlertTriangle },
                  { label: 'Completed',  value: lns.completed,  color: 'text-blue-700',   bg: 'bg-blue-50',   icon: CheckCircle },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${bg}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    </div>
                    <span className={`text-lg font-black ${color}`}>{value || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-black text-gray-900 mb-4">Bike Inventory Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'Available', value: bks.available, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'On Loan',   value: bks.loaned,    color: 'text-blue-700',    bg: 'bg-blue-50' },
                  { label: 'Sold',      value: bks.sold,      color: 'text-gray-600',    bg: 'bg-gray-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${bg}`}>
                    <div className="flex items-center gap-2">
                      <Bike className={`w-4 h-4 ${color}`} />
                      <span className={`text-sm font-semibold ${color}`}>{label}</span>
                    </div>
                    <span className={`text-lg font-black ${color}`}>{value || 0}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Total inventory: <span className="font-bold text-gray-700">{(bks.available || 0) + (bks.loaned || 0) + (bks.sold || 0)} bikes</span></p>
              </div>
            </div>
          </div>

          {/* CSV Export */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-black text-gray-900 mb-1">Export Data</h3>
            <p className="text-xs text-gray-400 mb-4">Download CSV files for offline analysis or reporting</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'payments', label: 'Payment History',  sub: 'All transactions with methods',  icon: CreditCard  },
                { key: 'loans',    label: 'Loan Portfolio',   sub: 'All loans with balances',        icon: FileText    },
                { key: 'clients',  label: 'Client Register',  sub: 'Clients with loan summaries',    icon: Users       },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button key={key} onClick={() => handleExport(key)} disabled={!!exporting}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group text-left disabled:opacity-50">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    {exporting === key ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <Icon className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ARREARS TAB ──────────────────────────────────────────────────── */}
      {tab === 'arrears' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{arrears.length} loans with overdue installments</p>
            <button onClick={() => handleExport('payments')} disabled={!!exporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {arrears.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-bold text-gray-700">No arrears</p>
              <p className="text-sm text-gray-400">All loans are current</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Client', 'Loan #', 'Overdue Installments', 'Total Overdue', 'Days Since Oldest Due', 'Balance'].map(h => (
                      <th key={h} className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {arrears.map((row: any, i: number) => (
                    <tr key={row.loanId} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{row.clientName}</p>
                        <p className="text-xs text-gray-400">{row.phone}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.loanNumber}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-50 text-red-700 text-xs font-black">
                          {row.overdueInstallments}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-red-700">{fmt(row.totalOverdue)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${row.daysOverdue > 30 ? 'text-red-700' : row.daysOverdue > 14 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {row.daysOverdue} days
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{fmt(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── AGING TAB ────────────────────────────────────────────────────── */}
      {tab === 'aging' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Portfolio at risk by days overdue</p>
          {aging.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-bold text-gray-700">Portfolio is clean</p>
              <p className="text-sm text-gray-400">No overdue installments detected</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <h3 className="font-black text-gray-900">At-Risk Portfolio by Aging Bucket</h3>
              {aging.map((row: any) => (
                <AgingBar key={row.bucket} {...row} maxRisk={maxRisk} />
              ))}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Total at risk</span>
                <span className="text-lg font-black text-red-700">
                  {fmt(aging.reduce((s: number, a: any) => s + (a.atRisk || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
