'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign, Users, CreditCard, AlertCircle, FileText,
  Receipt, TrendingUp, Plus, RefreshCw, Loader2, Bike,
  CheckCircle, Clock, XCircle, ArrowUpRight, Activity,
  BarChart3, Banknote, Shield, Bell, Zap, Calendar,
  Wallet, Smartphone, Building2, Sun, Sunrise, Sunset, Moon,
} from 'lucide-react';
import { startGuidedTour } from '@/components/ui/GuidedTour';
import BulletChart from '@/components/charts/BulletChart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (path: string) => {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtM = (n: any) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `UGX ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `UGX ${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
};

const METHODS: Record<string, { label: string; icon: any; color: string }> = {
  CASH:          { label: 'Cash',  icon: Wallet,     color: 'text-bv-success bg-bv-success-bg' },
  Momo:          { label: 'MoMo', icon: Smartphone, color: 'text-bv-warning bg-bv-warning-bg'  },
  BANK_TRANSFER: { label: 'Bank', icon: Building2,  color: 'text-bv-info bg-bv-info-bg'      },
  Airtelmoney:   { label: 'Airtel',icon: Smartphone,color: 'text-bv-danger bg-bv-danger-bg'  },
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const GreetIcon = h < 6 ? Moon : h < 12 ? Sunrise : h < 17 ? Sun : Sunset;
  return (
    <div className="text-xs text-bv-meta flex items-center gap-1.5 mt-0.5 flex-wrap">
      <GreetIcon className="w-3.5 h-3.5" />
      {now.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      <span className="font-mono font-bold text-bv-muted tabular-nums">
        {now.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

function SparkBars({ data }: { data: { date: string; total: number }[] }) {
  if (!data || data.length === 0) return <p className="text-xs text-bv-meta mt-2 italic">No payments in last 7 days</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div className="flex items-end gap-1 mt-2 h-14">
      {data.map((d, i) => {
        const pct = Math.max(5, Math.round((d.total / max) * 100));
        const dayLabel = days[new Date(d.date).getDay()];
        const isToday = new Date(d.date).toDateString() === new Date().toDateString();
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${dayLabel}: ${fmt(d.total)}`}>
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-bv-action' : 'bg-bv-border group-hover:bg-bv-muted'}`}
              style={{ height: `${pct}%` }}
            />
            <span className={`text-[9px] font-bold ${isToday ? 'text-bv-action' : 'text-bv-meta'}`}>{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, href, loading, highlight }: any) {
  const inner = (
    <div className={`bg-bv-surface rounded-bv border p-5 shadow-sm hover:shadow-md transition-all group ${href ? 'cursor-pointer' : ''} ${highlight ? 'border-bv-warning ring-2 ring-bv-warning-bg' : 'border-bv-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-bv flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-bv-meta group-hover:text-bv-muted transition-colors" />}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 bg-bv-hover rounded animate-pulse" />
          <div className="h-4 w-20 bg-bv-hover rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-black text-bv-text tracking-tight">{value}</p>
          <p className="text-xs text-bv-meta mt-0.5 font-medium">{title}</p>
          {sub && <p className="text-xs text-bv-muted mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusBadge({ status, count }: { status: string; count: number }) {
  const map: Record<string, any> = {
    ACTIVE:           { color: 'bg-bv-success-bg text-bv-success',   icon: CheckCircle, label: 'Active' },
    PENDING_APPROVAL: { color: 'bg-bv-warning-bg text-bv-warning',   icon: Clock,       label: 'Pending' },
    DELINQUENT:       { color: 'bg-bv-overdue-bg text-bv-overdue',   icon: AlertCircle, label: 'Overdue' },
    COMPLETED:        { color: 'bg-bv-info-bg text-bv-info',         icon: CheckCircle, label: 'Completed' },
    CANCELLED:        { color: 'bg-bv-neutral-bg text-bv-neutral',   icon: XCircle,     label: 'Cancelled' },
  };
  const cfg = map[status] || { color: 'bg-bv-neutral-bg text-bv-neutral', icon: FileText, label: status };
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-bv ${cfg.color}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-bold">{cfg.label}</span>
      </div>
      <span className="text-lg font-black">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isOwner = role === 'admin' || role === 'superadmin';
  const isManager = role === 'manager' || isOwner;
  const isCashier = role === 'cashier';
  const isAgent = role === 'agent' || role === 'loan_officer' || role === 'credit_officer';
  const [nplSummary, setNplSummary] = useState<any>(null);
  const [stats, setStats]             = useState<any>(null);
  const [loanBreakdown, setLoanBreakdown] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [last7Days, setLast7Days]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [schedSummary, setSchedSummary] = useState<any>(null);
  const [alertSummary, setAlertSummary] = useState<any>(null);
  const timerRef = useRef<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [portfolio, paymentSummary, clients, allLoans, sched, alertSum, nplRes] = await Promise.all([
        apiFetch('/reports/summary').catch(() => ({})),
        apiFetch('/payments/summary').catch(() => ({})),
        apiFetch('/clients').catch(() => []),
        apiFetch('/loans').catch(() => []),
        apiFetch('/reports/weekly-collections').catch(() => []),
        apiFetch('/schedules/alerts/summary').catch(() => ({})),
        isManager ? apiFetch('/reports/npl').catch(() => null) : Promise.resolve(null),
      ]);
      setNplSummary(nplRes?.summary ?? nplRes?.data?.summary ?? null);

      setSchedSummary(null);
      setAlertSummary(alertSum);
      setLast7Days(Array.isArray(sched) ? sched : []);

      const loans = Array.isArray(allLoans) ? allLoans : allLoans?.data || [];
      const clientList = Array.isArray(clients) ? clients : clients?.data || [];

      const statusCounts: Record<string, number> = {};
      loans.forEach((l: any) => { const s = l.status || 'UNKNOWN'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
      setLoanBreakdown(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
      setPendingLoans(loans.filter((l: any) => l.status === 'PENDING_APPROVAL').slice(0, 5));

      const todayPmts = (paymentSummary.todayPayments || []).filter((p: any) => p.status !== 'REVERSED');
      setRecentPayments(todayPmts);

      const byMethod: Record<string, number> = {};
      todayPmts.forEach((p: any) => {
        const m = p.paymentMethod || p.payment_method || 'CASH';
        byMethod[m] = (byMethod[m] || 0) + Number(p.amount);
      });

      // portfolio returns { loans:{total,active,pending,delinquent}, financials:{totalPrincipal,totalOutstanding,totalCollected}, bikes:{...} }
      setStats({
        totalLoans:          portfolio.loans?.total      ?? portfolio.totalLoans         ?? loans.length,
        activeLoans:         portfolio.loans?.active     ?? portfolio.activeLoans        ?? statusCounts['ACTIVE'] ?? 0,
        pendingLoans:        portfolio.loans?.pending    ?? portfolio.pendingLoans       ?? statusCounts['PENDING_APPROVAL'] ?? 0,
        overdueLoans:        portfolio.loans?.delinquent ?? portfolio.overdueLoans       ?? statusCounts['DELINQUENT'] ?? 0,
        totalPortfolioValue: portfolio.financials?.totalPrincipal ?? portfolio.totalPortfolioValue ?? 0,
        totalOutstanding:    portfolio.financials?.totalOutstanding ?? 0,
        totalCollected:      portfolio.financials?.totalCollected ?? 0,
        bikesAvailable:      portfolio.bikes?.available ?? 0,
        totalClients:        clientList.length,
        todayCollection:     Number(paymentSummary.todayAmount || 0),
        todayCount:          Number(paymentSummary.todayCount  || 0),
        totalPayments:       paymentSummary.totalPayments ?? 0,
        byMethod,
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => load(true), 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'superadmin';
  const methodBreakdown = Object.entries(stats?.byMethod || {}).map(([method, amount]) => ({
    method, amount: amount as number,
    cfg: METHODS[method] || { label: method, icon: Wallet, color: 'text-bv-muted bg-bv-neutral-bg' },
  }));

  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      {/* Header — calm, operational, HandzJ DNA */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-bv-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-bv-text">
            {user?.full_name || user?.username || 'User'}
            <span className="ml-2 text-xs font-medium text-bv-meta capitalize">({user?.role || 'staff'})</span>
          </h1>
          <p className="text-sm text-bv-muted mt-0.5">
            {isOwner && 'Loan book control: what is still owed, what is late, and what needs your decision today.'}
            {role === 'manager' && !isOwner && 'Branch operations: collections, arrears and work waiting on you.'}
            {isCashier && 'Record payments, check today’s collections and your drawer.'}
            {isAgent && 'Clients, applications and schedules in your scope.'}
            {!isOwner && role !== 'manager' && !isCashier && !isAgent && 'Bingo Vintage workspace.'}
          </p>
          <div className="mt-1"><LiveClock /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startGuidedTour()}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded-bv hover:bg-bv-hover"
          >
            Guided tour
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded-bv hover:bg-bv-hover disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </header>

      {/* ── OWNER / MANAGER: position first, not four equal cards ── */}
      {isManager && (
        <section aria-label="Portfolio position" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1">
              <p className="text-xs font-medium text-bv-muted">Still owed (remaining principal on active book)</p>
              <p className="text-3xl font-semibold text-bv-text tabular-nums">
                {loading ? '…' : fmt(stats?.totalOutstanding)}
              </p>
              <p className="text-sm text-bv-muted">
                Sum of original principal on book {loading ? '…' : fmt(stats?.totalPortfolioValue)}
                {' · '}
                Repayments posted (COMPLETED only) {loading ? '…' : fmt(stats?.totalCollected)}
              </p>
              <p className="text-xs text-bv-meta">
                Outstanding = SUM(loans.balance) for non-cancelled loans (tenant-scoped). This is remaining principal balance, not full contractual interest due.
              </p>
            </div>
            <div className="space-y-3 border-l-0 md:border-l md:border-bv-border md:pl-6">
              <div>
                <p className="text-xs font-medium text-bv-meta">Bad book (NPL) ratio</p>
                <p className="text-2xl font-semibold tabular-nums text-bv-text">
                  {nplSummary?.nplRatioPercent != null
                    ? `${Number(nplSummary.nplRatioPercent).toFixed(1)}%`
                    : loading ? '…' : '—'}
                </p>
                <p className="text-xs text-bv-meta">
                  {nplSummary?.nplLoans != null ? `${nplSummary.nplLoans} NPL loan(s). ` : ''}
                  NPL = DEFAULTED or days_in_arrears ≥ 90 (default). Ratio = NPL balances ÷ balances of ACTIVE+DELINQUENT+DEFAULTED. As-of today (server). Delinquent status alone is not NPL.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-bv-meta">Marked delinquent</p>
                <p className="text-xl font-semibold tabular-nums text-bv-danger">
                  {loading ? '…' : (stats?.overdueLoans ?? 0)}
                </p>
                <p className="text-xs text-bv-meta">Count of loans with status DELINQUENT (broader than NPL).</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm border-t border-bv-border pt-3">
            <Link href="/dashboard/reports" className="text-bv-accent font-medium underline-offset-2 hover:underline">
              Open full reports (NPL, aging, daily till, weekly MD)
            </Link>
            <Link href="/dashboard/loans?status=DELINQUENT" className="text-bv-muted hover:text-bv-text hover:underline">
              View delinquent loans
            </Link>
            <Link href="/dashboard/finance/reconciliation" className="text-bv-muted hover:text-bv-text hover:underline">
              Reconciliation
            </Link>
          </div>
        </section>
      )}

      {/* Needs attention — ranked exceptions, not decorative widgets */}
      {isManager && (
        <section aria-label="Needs attention" className="border border-bv-border rounded-bv bg-bv-surface">
          <div className="px-4 py-2 border-b border-bv-border bg-bv-hover">
            <h2 className="text-sm font-semibold text-bv-text">Decide or follow up</h2>
          </div>
          <ul className="divide-y divide-bv-border text-sm">
            <li className="px-4 py-3 flex justify-between gap-4 items-center hover:bg-bv-hover">
              <span className="text-bv-text">
                Loans awaiting approval
                <span className="block text-xs text-bv-meta">Requires manager/admin decision</span>
              </span>
              <span className="font-semibold tabular-nums text-bv-text">{stats?.pendingLoans ?? 0}</span>
              <Link href="/dashboard/loans?status=PENDING_APPROVAL" className="text-bv-accent text-xs font-medium whitespace-nowrap">Open</Link>
            </li>
            <li className="px-4 py-3 flex justify-between gap-4 items-center hover:bg-bv-hover">
              <span className="text-bv-text">
                Delinquent book
                <span className="block text-xs text-bv-meta">Status DELINQUENT on loans</span>
              </span>
              <span className="font-semibold tabular-nums text-bv-danger">{stats?.overdueLoans ?? 0}</span>
              <Link href="/dashboard/reports" className="text-bv-accent text-xs font-medium whitespace-nowrap">Reports</Link>
            </li>
            <li className="px-4 py-3 flex justify-between gap-4 items-center hover:bg-bv-hover">
              <span className="text-bv-text">
                Unread schedule alerts
                <span className="block text-xs text-bv-meta">From alerts summary API</span>
              </span>
              <span className="font-semibold tabular-nums text-bv-text">{alertSummary?.unread ?? 0}</span>
              <Link href="/dashboard/alerts" className="text-bv-accent text-xs font-medium whitespace-nowrap">Alerts</Link>
            </li>
          </ul>
        </section>
      )}

      {/* ── CASHIER: payment-first ── */}
      {isCashier && (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-medium text-bv-muted">Collected today</p>
            <p className="text-3xl font-semibold tabular-nums text-bv-text">
              {loading ? '…' : fmt(stats?.todayCollection)}
            </p>
            <p className="text-sm text-bv-muted">{stats?.todayCount || 0} payment(s) · Africa/Kampala day · excludes REVERSED</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/payments" className="inline-flex items-center px-4 py-2 bg-bv-action hover:bg-bv-action-hover text-white text-sm font-medium rounded-bv">
              Record payment
            </Link>
            <Link href="/dashboard/my-drawer" className="inline-flex items-center px-4 py-2 border border-bv-border text-sm font-medium rounded-bv text-bv-text hover:bg-bv-hover">
              My drawer
            </Link>
            <Link href="/dashboard/schedules" className="inline-flex items-center px-4 py-2 border border-bv-border text-sm font-medium rounded-bv text-bv-text hover:bg-bv-hover">
              Schedules due
            </Link>
          </div>
          {methodBreakdown.length > 0 && (
            <div className="text-sm text-bv-muted">
              <p className="text-xs font-medium text-bv-meta mb-1">By method today</p>
              <ul className="space-y-1">
                {methodBreakdown.map(({ method, amount, cfg }) => (
                  <li key={method} className="flex justify-between max-w-xs">
                    <span>{cfg.label}</span>
                    <span className="tabular-nums font-medium text-bv-text">{fmt(amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── AGENT: work queue ── */}
      {isAgent && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <p className="text-xs text-bv-meta">Clients</p>
              <p className="text-2xl font-semibold tabular-nums text-bv-text">{stats?.totalClients ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-bv-meta">Pending applications</p>
              <p className="text-2xl font-semibold tabular-nums text-bv-text">{stats?.pendingLoans ?? 0}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/clients" className="text-sm font-medium text-bv-accent hover:underline">Clients</Link>
            <Link href="/dashboard/loans/create" className="text-sm font-medium text-bv-accent hover:underline">New application</Link>
            <Link href="/dashboard/schedules" className="text-sm font-medium text-bv-accent hover:underline">Schedules</Link>
          </div>
        </section>
      )}

      {/* Today for managers (secondary, not competing with portfolio) */}
      {isManager && (
        <section className="text-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-bv-text mb-2">Collected today</h2>
            <p className="text-xl font-semibold tabular-nums text-bv-text">
              {loading ? '…' : fmt(stats?.todayCollection)}
              <span className="text-sm font-normal text-bv-meta ml-2">{stats?.todayCount || 0} payments</span>
            </p>
            <p className="text-xs text-bv-meta mt-1">
              Africa/Kampala business day · payment status not REVERSED · from payments summary API.
            </p>
          </div>
          {/* Operational targets — bullet charts */}
          <div className="bg-bv-surface border border-bv-border rounded-bv p-4 space-y-4 max-w-xl">
            <h3 className="text-xs font-semibold text-bv-meta uppercase tracking-wide">Performance vs target</h3>
            <BulletChart
              label="Today collections"
              actual={Number(stats?.todayCollection || 0)}
              target={Math.max(Number(stats?.todayCollection || 0) * 1.15, 1)}
              format={(n) => fmt(n)}
              ranges={[0.7, 1.0]}
            />
            <BulletChart
              label="NPL ratio (lower is better)"
              actual={Number(nplSummary?.nplRatioPercent ?? 0)}
              target={5}
              format={(n) => `${n.toFixed(1)}%`}
              ranges={[1.0, 1.5]}
              invert
            />
            <BulletChart
              label="Active loans on book"
              actual={Number(stats?.activeLoans || 0)}
              target={Math.max(Number(stats?.activeLoans || 0), 1)}
              format={(n) => n.toLocaleString()}
              ranges={[0.8, 1.0]}
            />
          </div>
        </section>
      )}

      {/* Loan book snapshot — compact table not icon badges */}
      {(isManager || isAgent) && loanBreakdown.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-bv-text mb-2">Loan book by status</h2>
          <table className="w-full max-w-lg text-sm border border-bv-border rounded-bv overflow-hidden bg-bv-surface">
            <thead className="bg-bv-hover text-left text-xs text-bv-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {loanBreakdown.map(({ status, count }) => (
                <tr key={status} className="border-t border-bv-border hover:bg-bv-hover">
                  <td className="px-3 py-2 text-bv-text">{status.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-bv-text">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pending approvals list for decision-makers */}
      {isManager && pendingLoans.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-bv-text mb-2">Pending approval (sample)</h2>
          <ul className="border border-bv-border divide-y divide-bv-border text-sm max-w-2xl rounded-bv overflow-hidden bg-bv-surface">
            {pendingLoans.map((loan: any) => (
              <li key={loan.id} className="px-3 py-2 flex justify-between gap-2 hover:bg-bv-hover">
                <span className="text-bv-text truncate">
                  {loan.loanNumber || loan.loan_number || `#${loan.id}`}
                </span>
                <span className="tabular-nums text-bv-muted flex-shrink-0">
                  {fmtM(loan.principalAmount || loan.principal_amount || 0)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/loans?status=PENDING_APPROVAL" className="text-xs text-bv-accent mt-2 inline-block hover:underline">
            Review all pending
          </Link>
        </section>
      )}

      {/* Recent payments — for cashier & manager */}
      {(isCashier || isManager) && recentPayments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-bv-text mb-2">Payments today</h2>
          <ul className="border border-bv-border divide-y divide-bv-border text-sm max-w-2xl rounded-bv overflow-hidden bg-bv-surface">
            {recentPayments.slice(0, 8).map((p: any) => (
              <li key={p.id} className="px-3 py-2 flex justify-between gap-2 hover:bg-bv-hover">
                <span className="text-bv-muted truncate">
                  {p.receiptNumber || p.receipt_number || p.id}
                </span>
                <span className="tabular-nums font-medium text-bv-text">{fmt(p.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sparse actions — role filtered, no colour rainbow */}
      <section className="border-t border-bv-border pt-4">
        <h2 className="text-sm font-semibold text-bv-text mb-2">Go to</h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            { label: 'Record payment', href: '/dashboard/payments', roles: ['admin', 'manager', 'cashier'] },
            { label: 'New loan', href: '/dashboard/loans/create', roles: ['admin', 'manager', 'agent', 'cashier'] },
            { label: 'Register client', href: '/dashboard/clients/create', roles: ['admin', 'manager', 'cashier'] },
            { label: 'Schedules', href: '/dashboard/schedules', roles: ['admin', 'manager', 'cashier', 'agent'] },
            { label: 'Reports', href: '/dashboard/reports', roles: ['admin', 'manager'] },
            { label: 'My drawer', href: '/dashboard/my-drawer', roles: ['admin', 'manager', 'cashier'] },
            { label: 'Reconciliation', href: '/dashboard/finance/reconciliation', roles: ['admin', 'manager'] },
            { label: 'Audit log', href: '/dashboard/audit', roles: ['admin'] },
          ]
            .filter((a) => a.roles.includes(role) || (isOwner && a.roles.includes('admin')))
            .map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="text-bv-accent hover:underline font-medium">
                  {a.label}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {lastUpdated && (
        <p className="text-xs text-bv-meta">Data loaded {lastUpdated.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
