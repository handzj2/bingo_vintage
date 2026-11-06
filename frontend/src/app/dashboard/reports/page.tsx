// patch 2026-06-16
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
import WaterfallChart, { type WaterfallStep } from '@/components/charts/WaterfallChart';
import CalendarHeatmap from '@/components/charts/CalendarHeatmap';
import CohortHeatmap from '@/components/charts/CohortHeatmap';

// Uses shared api client from @/lib/api/client
import { formatUGX } from '@/shared/api-types';
const fmt  = (n: number) => formatUGX(n);
const fmtM = (n: number) => formatUGX(n);

const METHODS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CASH:          { label: 'Cash',  color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Wallet },
  Momo:          { label: 'MoMo', color: 'text-bv-warning',  bg: 'bg-bv-warning-bg',  icon: Smartphone },
  BANK_TRANSFER: { label: 'Bank', color: 'text-bv-accent',    bg: 'bg-bv-info-bg',    icon: Building2 },
  Airtelmoney:   { label: 'Airtel',color: 'text-bv-danger',    bg: 'bg-bv-danger-bg',     icon: Smartphone },
};

// ── Sparkbar ──────────────────────────────────────────────────────────────────
function SparkBars({ data }: { data: { date: string; total: number; count: number }[] }) {
  if (!data?.length) return <p className="text-xs text-bv-meta italic">No data</p>;
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
              className={`w-full rounded-t transition-all ${isToday ? 'bg-bv-action' : 'bg-bv-border group-hover:bg-bv-muted'}`}
              style={{ height: `${pct}%` }}
            />
            <span className={`text-[9px] font-bold ${isToday ? 'text-bv-action' : 'text-bv-meta'}`}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Aging bar ─────────────────────────────────────────────────────────────────
function AgingBar({ bucket, loanCount, atRisk, maxRisk }: any) {
  const pct = maxRisk > 0 ? Math.max(4, Math.round((atRisk / maxRisk) * 100)) : 4;
  // HandzJ semantic progression: healthy → warning → danger
  const colors: Record<string, string> = {
    'Current':     'bg-bv-success',
    '0-30 days':   'bg-bv-success',
    '1-30 days':   'bg-bv-warning',
    '31-60 days':  'bg-bv-warning',
    '61-90 days':  'bg-orange-500',
    '91-180 days': 'bg-bv-danger',
    '90+ days':    'bg-bv-npl',
    '180+ days':   'bg-bv-npl',
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-bv-muted">{bucket}</span>
        <div className="text-right">
          <span className="font-black text-bv-text tabular-nums">{fmtM(atRisk)}</span>
          <span className="text-bv-meta text-xs ml-2">{loanCount} loan{loanCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="h-3 bg-bv-hover rounded-bv overflow-hidden">
        <div
          className={`h-full rounded-bv transition-all duration-300 ${colors[bucket] || 'bg-bv-muted'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── File download helper — never produce /api/api or // in the path ─────────
function reportsApiBase(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').trim();
  raw = raw.replace(/\/+$/, '');
  // Collapse accidental .../api/api
  while (raw.endsWith('/api/api')) raw = raw.slice(0, -4);
  if (!raw.endsWith('/api')) raw = `${raw}/api`;
  return raw;
}

/** Join base + path without double slashes or double /api */
function reportsApiUrl(path: string): string {
  const base = reportsApiBase();
  let p = (path || '').trim();
  // If caller passed a full URL, use as-is
  if (/^https?:\/\//i.test(p)) return p;
  // Strip leading /api so we never get /api/api/...
  p = p.replace(/^\/api(\/|$)/, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  // base has no trailing slash; p has leading slash → single join
  return `${base}${p}`;
}

async function downloadFile(path: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  const url = reportsApiUrl(path);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error('Export failed', res.status, url);
    alert(`Export failed (${res.status})`);
    return;
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
const downloadCsv = downloadFile; // kept for existing call sites below

// ApiClient.get() wraps every response as { success, data, message, status }.
// Fetches here previously stored that wrapper directly instead of its .data,
// which is why "Today's Collections" and the 7-day sparkline have been
// showing zeros — unwrap consistently everywhere a report is fetched.
function unwrap<T = any>(res: any, fallback: T): T {
  if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
    return (res.success ? res.data : fallback) ?? fallback;
  }
  return res ?? fallback; // already-unwrapped (e.g. a .catch() fallback value)
}

export default function ReportsPage() {
  const [portfolio, setPortfolio]   = useState<any>(null);
  const [weekly,    setWeekly]      = useState<any[]>([]);
  const [arrears,   setArrears]     = useState<any[]>([]);
  const [aging,     setAging]       = useState<any[]>([])
  const [agingDetailed, setAgingDetailed] = useState<any>(null);
  const [npl,       setNpl]         = useState<any>(null);
  const [nplThreshold, setNplThreshold] = useState(90);;
  const [daily,     setDaily]       = useState<any>(null);
  const [loading,   setLoading]     = useState(true);
  const [tab,       setTab]         = useState<'overview' | 'arrears' | 'aging' | 'npl' | 'accountability' | 'weekly'>('overview');
  const [exporting, setExporting]   = useState('');

  // ── Daily Payment Accountability / Upcoming Due / Drawer Balancing tab ──
  const [accDate, setAccDate]         = useState(new Date().toISOString().slice(0, 10));
  const [dueDays, setDueDays]         = useState(7);
  const [accData, setAccData]         = useState<any>(null);
  const [dueData, setDueData]         = useState<any>(null);
  const [drawerData, setDrawerData]   = useState<any>(null);
  const [collectionSheet, setCollectionSheet] = useState<any>(null);
  const [weeklyPack, setWeeklyPack] = useState<any>(null);
  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff); return d.toISOString().slice(0, 10);
  });
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [weeklySigning, setWeeklySigning] = useState(false);
  const [accLoading, setAccLoading]   = useState(false);

  const loadAccountability = useCallback(async () => {
    setAccLoading(true);
    try {
      const [acc, due, drw, sheet] = await Promise.all([
        api.get(`/reports/daily-accountability?date=${accDate}`).catch(() => null),
        api.get(`/reports/upcoming-due?days=${dueDays}`).catch(() => null),
        api.get(`/reports/drawer-balancing?startDate=${accDate}&endDate=${accDate}`).catch(() => null),
        api.get(`/reports/daily-collection-sheet?date=${accDate}`).catch(() => null),
      ]);
      setAccData(unwrap(acc, null));
      setDueData(unwrap(due, null));
      setDrawerData(unwrap(drw, null));
      setCollectionSheet(unwrap(sheet, null));
    } finally {
      setAccLoading(false);
    }
  }, [accDate, dueDays]);

  useEffect(() => { if (tab === 'accountability') loadAccountability(); }, [tab, loadAccountability]);

  const loadWeekly = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/weekly-signoff-pack?weekStart=${weeklyStart}`).catch(() => null);
      setWeeklyPack(unwrap(res, null));
    } finally {
      setLoading(false);
    }
  }, [weeklyStart]);

  useEffect(() => { if (tab === 'weekly') loadWeekly(); }, [tab, loadWeekly]);

  const signWeekly = async () => {
    setWeeklySigning(true);
    try {
      await api.post('/reports/weekly-signoff', { weekStart: weeklyStart, notes: weeklyNotes || undefined });
      setWeeklyNotes('');
      await loadWeekly();
      alert('Weekly pack signed');
    } catch (e: any) {
      alert(e?.message || 'Sign-off failed');
    } finally {
      setWeeklySigning(false);
    }
  };


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [port, wk, arr, ag, day, nplRes, agingDet] = await Promise.all([
        api.get('/reports/summary').catch(() => ({})),
        api.get('/reports/weekly-collections').catch(() => []),
        api.get('/reports/arrears').catch(() => []),
        api.get('/reports/portfolio-aging').catch(() => []),
        api.get('/reports/daily-summary').catch(() => ({})),
        api.get(`/reports/npl?thresholdDays=${nplThreshold}`).catch(() => null),
        api.get('/reports/portfolio-aging-detailed').catch(() => null),
      ]);
      setPortfolio(unwrap(port, {}));
      const wkData = unwrap(wk, []);
      setWeekly(Array.isArray(wkData) ? wkData : []);
      const arrData = unwrap(arr, []);
      setArrears(Array.isArray(arrData) ? arrData : []);
      const agData = unwrap(ag, []);
      setAging(Array.isArray(agData) ? agData : []);
      setDaily(unwrap(day, {}));
      setNpl(unwrap(nplRes, null));
      setAgingDetailed(unwrap(agingDet, null));
    } finally {
      setLoading(false);
    }
  }, [nplThreshold]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const map: Record<string, [string, string]> = {
        payments: ['/reports/export/payments.xlsx', `payments-${Date.now()}.xlsx`],
        loans:    ['/reports/export/loans.xlsx',    `loans-${Date.now()}.xlsx`],
        clients:  ['/reports/export/clients.xlsx',  `clients-${Date.now()}.xlsx`],
        summary:  ['/reports/export/summary.xlsx',  `portfolio-summary-${Date.now()}.xlsx`],
        arrears:  ['/reports/export/arrears.xlsx',  `arrears-${Date.now()}.xlsx`],
        aging:    ['/reports/export/portfolio-aging.xlsx', `portfolio-aging-${Date.now()}.xlsx`],
        npl:      ['/reports/export/npl.xlsx', `npl-${Date.now()}.xlsx`],
        'daily-accountability': [`/reports/export/daily-accountability?date=${accDate}`, `daily-accountability-${accDate}.xlsx`],
        'daily-collection': [`/reports/export/daily-collection-sheet?date=${accDate}`, `daily-collection-sheet-${accDate}.xlsx`],
        weekly:   [`/reports/export/weekly-signoff.xlsx?weekStart=${weeklyStart}`, `weekly-signoff-${weeklyStart}.xlsx`],
      };
      if (map[type]) await downloadFile(...map[type]);
    } finally {
      setExporting('');
    }
  };

  const maxRisk = Math.max(...aging.map(a => a.atRisk || 0), 1);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-bv-hover">
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

    <div className="min-h-screen bg-bv-hover p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-bv-text tracking-tight">Reports</h1>
          <p className="text-sm text-bv-meta mt-0.5">Portfolio performance & financial data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-bv-surface border border-bv-border text-bv-muted rounded-xl text-sm font-semibold hover:bg-bv-hover transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bv-surface border border-bv-border rounded-xl p-1 mb-6 w-fit shadow-sm">
        {([['overview', 'Overview'], ['arrears', 'Arrears'], ['aging', 'Portfolio Aging'], ['npl', 'NPL Quality'], ['accountability', 'Daily & Cash'], ['weekly', 'Weekly MD']] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-bv-action text-white shadow-sm' : 'text-bv-meta hover:text-bv-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Export for active tab */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tab === 'overview' && (
          <button type="button" onClick={() => handleExport('summary')} className="text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-bv-hover">Export Excel — Overview</button>
        )}
        {tab === 'arrears' && (
          <button type="button" onClick={() => handleExport('arrears')} className="text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-bv-hover">Export Excel — Arrears</button>
        )}
        {tab === 'aging' && (
          <button type="button" onClick={() => handleExport('aging')} className="text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-bv-hover">Export Excel — Aging</button>
        )}
        {tab === 'npl' && (
          <button type="button" onClick={() => handleExport('npl')} className="text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-bv-hover">Export Excel — NPL</button>
        )}
        {tab === 'weekly' && (
          <button type="button" onClick={() => handleExport('weekly')} className="text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-bv-hover">Export Excel — Weekly MD</button>
        )}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (

        <div className="space-y-6">

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Portfolio',   value: fmtM(fin.totalPrincipal),   icon: DollarSign, bg: 'bg-bv-action'   },
              { label: 'Outstanding',       value: fmtM(fin.totalOutstanding), icon: TrendingUp,  bg: 'bg-violet-600' },
              { label: 'Total Collected',   value: fmtM(fin.totalCollected),   icon: CheckCircle, bg: 'bg-emerald-600'},
              { label: 'Delinquent Balance',value: fmtM(fin.delinquentBalance),icon: AlertTriangle,bg: 'bg-bv-danger-bg0'   },
            ].map(({ label, value, icon: Icon, bg }) => (
              <div key={label} className="bg-bv-surface rounded-2xl border border-bv-border p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xl font-black text-bv-text">{value}</p>
                <p className="text-xs text-bv-meta mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* 7-day sparkline + today breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-bv-text">7-Day Collections</h3>
                  <p className="text-xs text-bv-meta">Total: {fmtM(weekTotal)}</p>
                </div>
                <Activity className="w-4 h-4 text-bv-meta" />
              </div>
              <SparkBars data={weekly} />
            </div>

            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-bv-text">Today's Collections</h3>
                  <p className="text-xs text-bv-meta">{daily?.transaction_count || 0} transactions</p>
                </div>
                <Calendar className="w-4 h-4 text-bv-meta" />
              </div>
              <p className="text-3xl font-black text-bv-text mb-4">{fmt(daily?.total_collected || 0)}</p>
              <div className="space-y-2">
                {Object.entries(todayMethods).map(([method, data]: any) => {
                  const cfg = METHODS[method] || { label: method, color: 'text-bv-muted', bg: 'bg-bv-hover', icon: CreditCard };
                  const Icon = cfg.icon;
                  return (
                    <div key={method} className={`flex items-center justify-between px-3 py-2 rounded-xl ${cfg.bg}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-bv-meta">{data.count}x</span>
                      </div>
                      <span className={`text-xs font-black ${cfg.color}`}>{fmt(data.amount)}</span>
                    </div>
                  );
                })}
                {Object.keys(todayMethods).length === 0 && (
                  <p className="text-xs text-bv-meta italic">No payments recorded today</p>
                )}
              </div>
            </div>
          </div>

          {/* Loan status breakdown + bikes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
              <h3 className="font-black text-bv-text mb-4">Loan Status Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: 'Active',     value: lns.active,     color: 'text-bv-success',  bg: 'bg-bv-success-bg',  icon: CheckCircle },
                  { label: 'Pending',    value: lns.pending,    color: 'text-bv-warning', bg: 'bg-bv-warning-bg', icon: Clock },
                  { label: 'Delinquent', value: lns.delinquent, color: 'text-bv-danger',    bg: 'bg-bv-danger-bg',    icon: AlertTriangle },
                  { label: 'Completed',  value: lns.completed,  color: 'text-bv-accent',   bg: 'bg-bv-info-bg',   icon: CheckCircle },
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

            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
              <h3 className="font-black text-bv-text mb-4">Bike Inventory Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'Available', value: bks.available, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'On Loan',   value: bks.loaned,    color: 'text-bv-accent',    bg: 'bg-bv-info-bg' },
                  { label: 'Sold',      value: bks.sold,      color: 'text-bv-muted',    bg: 'bg-bv-hover' },
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
              <div className="mt-4 pt-4 border-t border-bv-border">
                <p className="text-xs text-bv-meta">Total inventory: <span className="font-bold text-bv-muted">{(bks.available || 0) + (bks.loaned || 0) + (bks.sold || 0)} bikes</span></p>
              </div>
            </div>
          </div>

          {/* CSV Export */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
            <h3 className="font-black text-bv-text mb-1">Export Data</h3>
            <p className="text-xs text-bv-meta mb-4">Download CSV files for offline analysis or reporting</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'payments', label: 'Payment History',  sub: 'All transactions with methods',  icon: CreditCard  },
                { key: 'loans',    label: 'Loan Portfolio',   sub: 'All loans with balances',        icon: FileText    },
                { key: 'clients',  label: 'Client Register',  sub: 'Clients with loan summaries',    icon: Users       },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button key={key} onClick={() => handleExport(key)} disabled={!!exporting}
                  className="flex items-center gap-3 p-4 border border-bv-border rounded-xl hover:border-blue-300 hover:bg-bv-info-bg transition-all group text-left disabled:opacity-50">
                  <div className="w-10 h-10 rounded-xl bg-bv-info-bg group-hover:bg-bv-info-bg flex items-center justify-center flex-shrink-0 transition-colors">
                    {exporting === key ? <Loader2 className="w-5 h-5 text-bv-accent animate-spin" /> : <Icon className="w-5 h-5 text-bv-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-bv-text">{label}</p>
                    <p className="text-xs text-bv-meta">{sub}</p>
                  </div>
                  <Download className="w-4 h-4 text-bv-meta group-hover:text-blue-500 ml-auto transition-colors" />
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
            <p className="text-sm text-bv-meta">{arrears.length} loans with overdue installments</p>
            <button onClick={() => handleExport('payments')} disabled={!!exporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-bv-surface border border-bv-border text-bv-muted rounded-lg text-xs font-semibold hover:bg-bv-hover">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {arrears.length === 0 ? (
            <div className="bg-bv-surface rounded-2xl border border-bv-border p-12 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-bold text-bv-muted">No arrears</p>
              <p className="text-sm text-bv-meta">All loans are current</p>
            </div>
          ) : (
            <div className="bg-bv-surface rounded-2xl border border-bv-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bv-border bg-bv-hover">
                    {['Client', 'Loan #', 'Overdue Installments', 'Total Overdue', 'Days Since Oldest Due', 'Balance'].map(h => (
                      <th key={h} className="text-left text-xs font-black text-bv-meta uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {arrears.map((row: any, i: number) => (
                    <tr key={row.loanId} className={`border-b border-gray-50 hover:bg-bv-hover transition-colors ${i % 2 === 0 ? '' : 'bg-bv-hover/50'}`}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-bv-text">{row.clientName}</p>
                        <p className="text-xs text-bv-meta">{row.phone}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-bv-muted">{row.loanNumber}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-bv-danger-bg text-bv-danger text-xs font-black">
                          {row.overdueInstallments}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-bv-danger">{fmt(row.totalOverdue)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${row.daysOverdue > 30 ? 'text-bv-danger' : row.daysOverdue > 14 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {row.daysOverdue} days
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-bv-muted">{fmt(row.balance)}</td>
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
          <p className="text-sm text-bv-meta">
            Portfolio aging by days overdue
            {agingDetailed?.methodology ? ' · loan-level days_in_arrears' : ''}
            {agingDetailed?.asOf ? ` · as of ${agingDetailed.asOf}` : ''}
          </p>
          {agingDetailed?.buckets ? (
            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm space-y-4">
              <div className="flex justify-between text-sm text-bv-meta">
                <span>{agingDetailed.totalLoans} loans in book</span>
                <span className="font-bold text-bv-text">Outstanding {fmtM(agingDetailed.totalOutstanding)}</span>
              </div>
              {agingDetailed.buckets.map((row: any) => (
                <AgingBar
                  key={row.bucket}
                  bucket={row.bucket}
                  loanCount={row.loanCount}
                  atRisk={row.outstanding}
                  maxRisk={Math.max(...agingDetailed.buckets.map((b: any) => b.outstanding), 1)}
                />
              ))}
              <div className="overflow-x-auto pt-2">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-bv-meta text-left">
                    <tr>
                      <th className="py-1">Bucket</th>
                      <th className="py-1 text-right">Loans</th>
                      <th className="py-1 text-right">Outstanding</th>
                      <th className="py-1 text-right">Overdue Amt</th>
                      <th className="py-1 text-right">% Portfolio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingDetailed.buckets.map((row: any) => (
                      <tr key={row.bucket} className="border-t">
                        <td className="py-1.5 font-semibold">{row.bucket}</td>
                        <td className="py-1.5 text-right">{row.loanCount}</td>
                        <td className="py-1.5 text-right">{fmt(row.outstanding)}</td>
                        <td className="py-1.5 text-right">{fmt(row.overdueAmount)}</td>
                        <td className="py-1.5 text-right">{row.percentOfPortfolio}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : aging.length === 0 ? (
            <div className="bg-bv-surface rounded-2xl border border-bv-border p-12 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-bold text-bv-muted">Portfolio is clean</p>
              <p className="text-sm text-bv-meta">No overdue installments detected</p>
            </div>
          ) : (
            <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm space-y-5">
              <h3 className="font-black text-bv-text">At-Risk Portfolio by Aging Bucket</h3>
              {aging.map((row: any) => (
                <AgingBar key={row.bucket} {...row} maxRisk={maxRisk} />
              ))}
              <div className="pt-4 border-t border-bv-border flex items-center justify-between">
                <span className="text-sm text-bv-meta">Total at risk</span>
                <span className="text-lg font-black text-bv-danger">
                  {fmt(aging.reduce((s: number, a: any) => s + (a.atRisk || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACCOUNTABILITY TAB: Daily payments, upcoming due, drawer balancing ── */}
      
      {tab === 'npl' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-bv-text">NPL & Portfolio Quality</h2>
              <p className="text-sm text-bv-meta">
                As of {npl?.asOf || '—'} · Threshold {npl?.definitions?.nplThresholdDays ?? nplThreshold} days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-bv-meta">NPL days ≥</label>
              <input
                type="number"
                min={1}
                max={365}
                value={nplThreshold}
                onChange={(e) => setNplThreshold(Number(e.target.value) || 90)}
                className="w-20 border rounded-lg px-2 py-1.5 text-sm"
              />
              <button
                onClick={() => load()}
                className="px-3 py-1.5 rounded-lg bg-bv-action text-white text-sm font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>

          {npl?.definitions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p><span className="font-bold">Definition:</span> {npl.definitions.nplRule}</p>
              <p><span className="font-bold">Ratio:</span> {npl.definitions.ratioNumerator} ÷ {npl.definitions.ratioDenominator}</p>
              <p><span className="font-bold">Sources:</span> outstanding={npl.definitions.outstandingSource}; overdue={npl.definitions.overdueSource}</p>
              <p className="text-amber-700">{npl.definitions.note}</p>
            </div>
          )}

          {/* Portfolio aging heatmap (current book as single cohort until multi-cohort API exists) */}
          {agingDetailed?.buckets?.length > 0 && (
            <div className="bg-bv-surface border border-bv-border rounded-bv p-5 shadow-sm">
              <CohortHeatmap
                title="Book composition by aging bucket (% of outstanding)"
                cohorts={['Current book']}
                buckets={agingDetailed.buckets.map((b: any) => String(b.bucket))}
                data={agingDetailed.buckets.map((b: any) => ({
                  cohort: 'Current book',
                  bucket: String(b.bucket),
                  percent: Number(b.percentOfPortfolio ?? 0),
                }))}
              />
              <p className="text-[10px] text-bv-meta mt-2">
                Single-cohort view from portfolio-aging-detailed. Multi-disbursement-month cohorts can replace this when the API is available.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Outstanding', value: fmtM(npl?.summary?.totalOutstanding) },
              { label: 'Total Overdue Amt', value: fmtM(npl?.summary?.totalOverdueAmount) },
              { label: 'NPL Outstanding', value: fmtM(npl?.summary?.nplOutstanding) },
              { label: 'NPL Ratio', value: `${npl?.summary?.nplRatioPercent ?? 0}%` },
              { label: 'Active Book Loans', value: npl?.summary?.activeBookLoans ?? 0 },
              { label: 'Performing Loans', value: npl?.summary?.performingLoans ?? 0 },
              { label: 'NPL Loans', value: npl?.summary?.nplLoans ?? 0 },
              { label: 'Performing Outstanding', value: fmtM(npl?.summary?.performingOutstanding) },
            ].map((c) => (
              <div key={c.label} className="bg-bv-surface border border-bv-border rounded-bv p-4 shadow-sm">
                <p className="text-xs font-semibold text-bv-meta uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-black text-bv-text mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-bv-surface border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b font-bold text-bv-text">NPL loan detail</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-bv-hover text-left text-xs uppercase text-bv-meta">
                  <tr>
                    <th className="px-3 py-2">Loan</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Days OD</th>
                    <th className="px-3 py-2">Bucket</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2 text-right">Overdue</th>
                    <th className="px-3 py-2">Disbursed</th>
                    <th className="px-3 py-2">Maturity</th>
                  </tr>
                </thead>
                <tbody>
                  {(npl?.loans || []).length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-bv-meta">No NPL loans at this threshold</td></tr>
                  )}
                  {(npl?.loans || []).map((row: any) => (
                    <tr key={row.loanId} className="border-t hover:bg-bv-hover">
                      <td className="px-3 py-2 font-semibold">{row.loanNumber}</td>
                      <td className="px-3 py-2">{row.clientName}<div className="text-xs text-bv-meta">{row.phone}</div></td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2 font-bold text-bv-danger">{row.daysOverdue}</td>
                      <td className="px-3 py-2">{row.agingBucket}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(row.outstandingPrincipal)}</td>
                      <td className="px-3 py-2 text-right">{fmt(row.overdueAmount)}</td>
                      <td className="px-3 py-2 text-xs">{row.disbursementDate ? String(row.disbursementDate).slice(0,10) : '—'}</td>
                      <td className="px-3 py-2 text-xs">{row.maturityDate ? String(row.maturityDate).slice(0,10) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {tab === 'weekly' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-bv-text">Weekly MD Sign-off Pack</h2>
              <p className="text-sm text-bv-meta">System collections vs declared drawer closes · exceptions · formal sign-off</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-bv-meta">Week start (Mon)</label>
              <input type="date" value={weeklyStart} onChange={(e) => setWeeklyStart(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm" />
              <button onClick={loadWeekly} className="px-3 py-1.5 rounded-bv bg-bv-action hover:bg-bv-action-hover text-white text-sm font-semibold">Load</button>
            </div>
          </div>

          {weeklyPack && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'System payments', value: fmt(weeklyPack.totals?.systemPayments) },
                  { label: 'Drawer declared', value: fmt(weeklyPack.totals?.drawerDeclaredActual) },
                  { label: 'Drawer expected', value: fmt(weeklyPack.totals?.drawerExpected) },
                  { label: 'System vs declared', value: fmt(weeklyPack.totals?.systemVsDeclared) },
                  { label: 'Drawer variance', value: fmt(weeklyPack.totals?.drawerVariance) },
                  { label: 'Due expected (sum)', value: fmt(weeklyPack.totals?.dueExpectedAmount) },
                  { label: 'Exceptions', value: weeklyPack.totals?.exceptionCount ?? 0 },
                  { label: 'Week', value: `${weeklyPack.weekStart} → ${weeklyPack.weekEnd}` },
                ].map((c) => (
                  <div key={c.label} className="bg-bv-surface border border-bv-border rounded-bv p-4 shadow-sm">
                    <p className="text-xs font-semibold text-bv-meta uppercase">{c.label}</p>
                    <p className="text-lg font-black text-bv-text mt-1">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Cash movement waterfall — HandzJ purposeful viz */}
              <div className="bg-bv-surface border border-bv-border rounded-bv p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-bv-text mb-1">Weekly cash movement</h3>
                <p className="text-xs text-bv-meta mb-4">
                  Starting expected → system collections → drawer variance → closing position
                </p>
                <WaterfallChart
                  data={([
                    { name: 'Expected', value: Number(weeklyPack.totals?.drawerExpected || 0), isTotal: true },
                    { name: 'Collections', value: Number(weeklyPack.totals?.systemPayments || 0) },
                    { name: 'Variance', value: Number(weeklyPack.totals?.drawerVariance || 0) },
                    {
                      name: 'Declared',
                      value: Number(weeklyPack.totals?.drawerDeclaredActual || 0),
                      isTotal: true,
                    },
                  ] as WaterfallStep[])}
                  height={260}
                />
              </div>

              {(weeklyPack.exceptions || []).length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-bold text-amber-900 mb-2">Exceptions ({weeklyPack.exceptions.length})</p>
                  <ul className="text-sm text-amber-950 space-y-1 max-h-48 overflow-y-auto">
                    {weeklyPack.exceptions.map((ex: any, i: number) => (
                      <li key={i}><span className="font-semibold">{ex.type}</span> · {ex.date}: {ex.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-bv-surface border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b font-bold">Day-by-day</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-bv-hover text-xs uppercase text-bv-meta text-left">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">System pay</th>
                        <th className="px-3 py-2 text-right">Declared</th>
                        <th className="px-3 py-2 text-right">Expected</th>
                        <th className="px-3 py-2 text-right">Variance</th>
                        <th className="px-3 py-2">Drawers</th>
                        <th className="px-3 py-2 text-right">Due amt</th>
                        <th className="px-3 py-2">Late closes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(weeklyPack.days || []).map((d: any) => (
                        <tr key={d.date} className="border-t">
                          <td className="px-3 py-1.5 font-semibold">{d.date}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(d.systemPayments)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(d.drawerDeclaredActual)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(d.drawerExpected)}</td>
                          <td className={`px-3 py-1.5 text-right font-semibold ${d.drawerVariance ? 'text-bv-danger' : ''}`}>{fmt(d.drawerVariance)}</td>
                          <td className="px-3 py-1.5 text-xs">{d.closedDrawers} closed / {d.openDrawers} open</td>
                          <td className="px-3 py-1.5 text-right">{fmt(d.expectedDueAmount)}</td>
                          <td className="px-3 py-1.5">{d.lateCloses || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-bv-surface border rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="font-black text-bv-text">Sign this week (MD / Admin / Manager)</h3>
                <textarea
                  value={weeklyNotes}
                  onChange={(e) => setWeeklyNotes(e.target.value)}
                  placeholder="Notes / comments for the record"
                  className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
                />
                <button
                  onClick={signWeekly}
                  disabled={weeklySigning}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  {weeklySigning ? 'Signing…' : 'Sign weekly pack'}
                </button>
                {(weeklyPack.priorSignOffs || []).length > 0 && (
                  <div className="text-xs text-bv-meta pt-2 border-t">
                    Prior sign-offs:{' '}
                    {weeklyPack.priorSignOffs.map((s: any) => (
                      <span key={s.id} className="mr-3">#{s.id} by user {s.signedById} at {String(s.signedAt).slice(0, 19)}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {!weeklyPack && !loading && (
            <p className="text-sm text-bv-meta">Select week start and load the pack.</p>
          )}
        </div>
      )}


      {tab === 'accountability' && (
        <div className="space-y-6">

          {/* Date controls */}
          <div className="bg-bv-surface rounded-bv border border-bv-border p-4 shadow-sm flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={accDate} onChange={e => setAccDate(e.target.value)}
                className="border-2 border-bv-border rounded-bv px-3 py-2 text-sm font-semibold focus:outline-none focus:border-bv-action" />
            </div>
            <div>
              <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-1.5">Due Within (days)</label>
              <input type="number" min={1} value={dueDays} onChange={e => setDueDays(Math.max(1, Number(e.target.value)))}
                className="border-2 border-bv-border rounded-bv px-3 py-2 text-sm font-semibold w-24 focus:outline-none focus:border-bv-action" />
            </div>
            <button onClick={loadAccountability} disabled={accLoading}
              className="flex items-center gap-2 px-4 py-2 bg-bv-surface border border-bv-border text-bv-muted rounded-bv text-sm font-semibold hover:bg-bv-hover disabled:opacity-50">
              {accLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
            </button>
            <p className="text-xs text-bv-meta ml-auto">Tenant-wide — every branch, no need to be on site to see it</p>
          </div>

          {/* Collections intensity heatmap (from weekly-collections series) */}
          {weekly.length > 0 && (
            <div className="bg-bv-surface rounded-bv border border-bv-border p-5 shadow-sm">
              <CalendarHeatmap
                title="Recent collections intensity"
                data={weekly.map((d: any) => ({
                  date: String(d.date || d.day || '').slice(0, 10),
                  amount: Number(d.total || d.amount || 0),
                })).filter((d: any) => d.date)}
                weeks={8}
              />
            </div>
          )}

          {/* ── Daily Collection Sheet (due today vs paid today) ── */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-bv-text">Daily Collection Sheet — {accDate}</h3>
                <p className="text-xs text-bv-meta">Every installment due this day vs payments posted this day (Kampala)</p>
              </div>
            </div>
            {!collectionSheet ? (
              <p className="p-6 text-sm text-bv-meta">No collection sheet data (or API not available yet).</p>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Due installments', value: collectionSheet.summary?.dueInstallments ?? 0 },
                    { label: 'Expected today', value: fmt(collectionSheet.summary?.expectedAmount) },
                    { label: 'Collected on due list', value: fmt(collectionSheet.summary?.collectedAgainstDue) },
                    { label: 'Shortfall', value: fmt(collectionSheet.summary?.shortfallAgainstDue) },
                    { label: 'Collected lines', value: collectionSheet.summary?.collectedLines ?? 0 },
                    { label: 'Partial', value: collectionSheet.summary?.partialLines ?? 0 },
                    { label: 'Missed clients', value: collectionSheet.summary?.missedLines ?? 0 },
                    { label: 'Collection rate', value: `${collectionSheet.summary?.collectionRatePercent ?? 0}%` },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border bg-bv-hover p-3">
                      <p className="text-[10px] uppercase font-bold text-bv-meta">{c.label}</p>
                      <p className="text-lg font-black text-bv-text">{c.value}</p>
                    </div>
                  ))}
                </div>

                {(collectionSheet.missedClients || []).length > 0 && (
                  <div className="rounded-xl border border-bv-danger/30 bg-bv-danger-bg p-3">
                    <p className="text-sm font-bold text-bv-danger mb-2">Missed today ({collectionSheet.missedClients.length})</p>
                    <ul className="text-sm text-red-900 space-y-1">
                      {collectionSheet.missedClients.map((m: any, i: number) => (
                        <li key={i}>{m.clientName} · {m.phone} · {m.loanNumber} · due {fmt(m.expectedAmount)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-bv-hover text-xs uppercase text-bv-meta text-left">
                      <tr>
                        <th className="px-2 py-2">Client</th>
                        <th className="px-2 py-2">Loan</th>
                        <th className="px-2 py-2">Inst #</th>
                        <th className="px-2 py-2 text-right">Expected</th>
                        <th className="px-2 py-2 text-right">Collected</th>
                        <th className="px-2 py-2 text-right">Shortfall</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Receipts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(collectionSheet.lines || []).map((row: any) => (
                        <tr key={row.scheduleId} className={`border-t ${row.lineStatus === 'MISSED' ? 'bg-bv-danger-bg' : row.lineStatus === 'PARTIAL' ? 'bg-amber-50' : ''}`}>
                          <td className="px-2 py-1.5">{row.clientName}<div className="text-xs text-bv-meta">{row.phone}</div></td>
                          <td className="px-2 py-1.5 font-semibold">{row.loanNumber}</td>
                          <td className="px-2 py-1.5">{row.installmentNumber}</td>
                          <td className="px-2 py-1.5 text-right">{fmt(row.expectedAmount)}</td>
                          <td className="px-2 py-1.5 text-right">{fmt(row.collectedAmount)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">{fmt(row.shortfall)}</td>
                          <td className="px-2 py-1.5 font-bold text-xs">{row.lineStatus}</td>
                          <td className="px-2 py-1.5 text-xs text-bv-muted">
                            {(row.payments || []).map((p: any) => p.receiptNumber || p.id).join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                      {(collectionSheet.lines || []).length === 0 && (
                        <tr><td colSpan={8} className="px-2 py-6 text-center text-bv-meta">No installments due on this date</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

{/* ── Daily Payment Accountability ── */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="font-black text-bv-text">Daily Payment Accountability — {accDate}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile(`/reports/export/daily-accountability?date=${accDate}`, `daily-accountability-${accDate}.xlsx`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bv-surface border border-bv-border text-bv-muted rounded-lg text-xs font-semibold hover:bg-bv-hover"
                >
                  <Download className="w-3.5 h-3.5" /> Excel (payments)
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile(`/reports/export/daily-collection-sheet?date=${accDate}`, `daily-collection-sheet-${accDate}.xlsx`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bv-surface border border-bv-border text-bv-muted rounded-lg text-xs font-semibold hover:bg-bv-hover"
                >
                  <Download className="w-3.5 h-3.5" /> Excel (collection sheet)
                </button>
              </div>
            </div>
            <p className="text-xs text-bv-meta mb-4">Every payment recorded today, across every branch</p>
            {!accData ? (
              <p className="text-sm text-bv-meta italic">{accLoading ? 'Loading…' : 'No data'}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <p className="text-xs text-emerald-700 font-semibold">Total Collected</p>
                    <p className="text-lg font-black text-emerald-800">{fmt(accData.totalCollected || 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bv-info-bg">
                    <p className="text-xs text-bv-accent font-semibold">Transactions</p>
                    <p className="text-lg font-black text-bv-accent">{accData.transactionCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bv-danger-bg">
                    <p className="text-xs text-bv-danger font-semibold">Reversed</p>
                    <p className="text-lg font-black text-bv-danger">{accData.reversedCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bv-hover">
                    <p className="text-xs text-bv-meta font-semibold">Reversed Amount</p>
                    <p className="text-lg font-black text-bv-muted">{fmt(accData.reversedAmount || 0)}</p>
                  </div>
                </div>
                {(accData.payments || []).length === 0 ? (
                  <p className="text-sm text-bv-meta italic">No payments recorded on this date</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-bv-border bg-bv-hover">
                          {['Time', 'Receipt #', 'Client', 'Loan #', 'Branch', 'Method', 'Collected By', 'Amount'].map(h => (
                            <th key={h} className="text-left text-xs font-black text-bv-meta uppercase tracking-wider px-3 py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {accData.payments.slice(0, 25).map((p: any) => (
                          <tr key={p.id} className="border-b border-gray-50">
                            <td className="px-3 py-2 text-xs text-bv-meta">{new Date(p.time).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-3 py-2 font-mono text-xs">{p.receiptNumber}</td>
                            <td className="px-3 py-2 font-semibold text-bv-text">{p.clientName}</td>
                            <td className="px-3 py-2 font-mono text-xs text-bv-muted">{p.loanNumber}</td>
                            <td className="px-3 py-2 text-xs text-bv-meta">{p.branchName}</td>
                            <td className="px-3 py-2 text-xs text-bv-meta">{p.method}</td>
                            <td className="px-3 py-2 text-xs text-bv-meta">{p.collectedBy || '—'}</td>
                            <td className={`px-3 py-2 font-black ${p.status === 'REVERSED' ? 'text-bv-danger line-through' : 'text-bv-text'}`}>{fmt(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {accData.payments.length > 25 && (
                      <p className="text-xs text-bv-meta mt-2">Showing first 25 of {accData.payments.length} — download the Excel file for the full list.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Upcoming Due ── */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-bv-text">Upcoming Due — next {dueDays} days</h3>
              <button
                onClick={() => downloadFile(`/reports/export/upcoming-due?days=${dueDays}`, `upcoming-due-${accDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bv-surface border border-bv-border text-bv-muted rounded-lg text-xs font-semibold hover:bg-bv-hover">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
            <p className="text-xs text-bv-meta mb-4">{dueData?.count || 0} installment(s) due, {fmt(dueData?.totalDue || 0)} total</p>
            {!dueData || (dueData.installments || []).length === 0 ? (
              <p className="text-sm text-bv-meta italic">{accLoading ? 'Loading…' : 'Nothing due in this window'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bv-border bg-bv-hover">
                      {['Due Date', 'Client', 'Loan #', 'Branch', 'Status', 'Amount Due'].map(h => (
                        <th key={h} className="text-left text-xs font-black text-bv-meta uppercase tracking-wider px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dueData.installments.slice(0, 25).map((i: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="px-3 py-2 text-xs text-bv-muted">{i.dueDate}</td>
                        <td className="px-3 py-2 font-semibold text-bv-text">{i.clientName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-bv-muted">{i.loanNumber}</td>
                        <td className="px-3 py-2 text-xs text-bv-meta">{i.branchName}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${i.daysUntilDue < 0 ? 'bg-bv-danger-bg text-bv-danger' : 'bg-bv-warning-bg text-bv-warning'}`}>
                            {i.daysUntilDue < 0 ? `${Math.abs(i.daysUntilDue)}d overdue` : `in ${i.daysUntilDue}d`}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-black text-bv-text">{fmt(i.amountDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dueData.installments.length > 25 && (
                  <p className="text-xs text-bv-meta mt-2">Showing first 25 of {dueData.installments.length} — download the Excel file for the full list.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Cash Drawer Balancing ── */}
          <div className="bg-bv-surface rounded-2xl border border-bv-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-bv-text">Cash Drawer Balancing — {accDate}</h3>
              <button
                onClick={() => downloadFile(`/reports/export/drawer-balancing?startDate=${accDate}&endDate=${accDate}`, `drawer-balancing-${accDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bv-surface border border-bv-border text-bv-muted rounded-lg text-xs font-semibold hover:bg-bv-hover">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
            <p className="text-xs text-bv-meta mb-4">Expected cash vs. what was actually counted — per drawer, per branch</p>
            {!drawerData || (drawerData.drawers || []).length === 0 ? (
              <p className="text-sm text-bv-meta italic">{accLoading ? 'Loading…' : 'No drawers for this date'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bv-border bg-bv-hover">
                      {['Branch', 'Opened By', 'Status', 'Opening', 'Collected', 'Expenses', 'Expected', 'Actual', 'Variance'].map(h => (
                        <th key={h} className="text-left text-xs font-black text-bv-meta uppercase tracking-wider px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drawerData.drawers.map((d: any) => (
                      <tr key={d.drawerId} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-semibold text-bv-text">{d.branchName}</td>
                        <td className="px-3 py-2 text-xs text-bv-meta">{d.openedBy}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            d.status === 'reconciled' ? 'bg-emerald-50 text-emerald-700'
                            : d.status === 'open' ? 'bg-bv-warning-bg text-bv-warning'
                            : 'bg-bv-hover text-bv-muted'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-bv-muted">{fmt(d.openingBalance)}</td>
                        <td className="px-3 py-2 text-xs text-bv-muted">{fmt(d.cashCollected)}</td>
                        <td className="px-3 py-2 text-xs text-bv-muted">{fmt(d.expensesPaid)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-bv-muted">{fmt(d.expectedBalance)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-bv-muted">{d.actualBalance === null ? '(not closed)' : fmt(d.actualBalance)}</td>
                        <td className={`px-3 py-2 font-black ${d.variance == null ? 'text-bv-meta' : d.variance === 0 ? 'text-emerald-700' : 'text-bv-danger'}`}>
                          {d.variance == null ? '—' : fmt(d.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
