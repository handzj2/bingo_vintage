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
  CASH:          { label: 'Cash',  icon: Wallet,     color: 'text-emerald-700 bg-emerald-50' },
  Momo:          { label: 'MoMo', icon: Smartphone, color: 'text-yellow-700 bg-yellow-50'  },
  BANK_TRANSFER: { label: 'Bank', icon: Building2,  color: 'text-blue-700 bg-blue-50'      },
  Airtelmoney:   { label: 'Airtel',icon: Smartphone,color: 'text-red-700 bg-red-50'        },
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
    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
      <GreetIcon className="w-3.5 h-3.5" />
      {now.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      <span className="font-mono font-bold text-gray-500 tabular-nums">
        {now.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

function SparkBars({ data }: { data: { date: string; total: number }[] }) {
  if (!data || data.length === 0) return <p className="text-xs text-gray-300 mt-2 italic">No payments in last 7 days</p>;
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
              className={`w-full rounded-t transition-all ${isToday ? 'bg-blue-500' : 'bg-blue-200 group-hover:bg-blue-400'}`}
              style={{ height: `${pct}%` }}
            />
            <span className={`text-[9px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, href, loading, highlight }: any) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all group ${href ? 'cursor-pointer' : ''} ${highlight ? 'border-orange-200 ring-2 ring-orange-100' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-50 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{title}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusBadge({ status, count }: { status: string; count: number }) {
  const map: Record<string, any> = {
    ACTIVE:           { color: 'bg-green-100 text-green-700',   icon: CheckCircle, label: 'Active' },
    PENDING_APPROVAL: { color: 'bg-yellow-100 text-yellow-700', icon: Clock,       label: 'Pending' },
    DELINQUENT:       { color: 'bg-red-100 text-red-700',       icon: AlertCircle, label: 'Overdue' },
    COMPLETED:        { color: 'bg-blue-100 text-blue-700',     icon: CheckCircle, label: 'Completed' },
    CANCELLED:        { color: 'bg-gray-100 text-gray-600',     icon: XCircle,     label: 'Cancelled' },
  };
  const cfg = map[status] || { color: 'bg-gray-100 text-gray-600', icon: FileText, label: status };
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${cfg.color}`}>
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
      const [portfolio, paymentSummary, clients, allLoans, sched, alertSum] = await Promise.all([
        apiFetch('/reports/summary').catch(() => ({})),
        apiFetch('/payments/summary').catch(() => ({})),
        apiFetch('/clients').catch(() => []),
        apiFetch('/loans').catch(() => []),
        apiFetch('/reports/weekly-collections').catch(() => []),
        apiFetch('/schedules/alerts/summary').catch(() => ({})),
      ]);

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
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => load(true), 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const methodBreakdown = Object.entries(stats?.byMethod || {}).map(([method, amount]) => ({
    method, amount: amount as number,
    cfg: METHODS[method] || { label: method, icon: Wallet, color: 'text-gray-600 bg-gray-50' },
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
           Welcome back, {user?.full_name || user?.username}
            <span className="text-sm font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg capitalize">{user?.role}</span>
          </h1>
          <LiveClock />
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40 flex-shrink-0">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Portfolio"    value={fmtM(stats?.totalPortfolioValue)} icon={DollarSign} color="bg-blue-600"   href="/dashboard/loans"    loading={loading} />
        <StatCard title="Total Clients"      value={String(stats?.totalClients || 0)} icon={Users}      color="bg-green-600"  href="/dashboard/clients"  loading={loading} />
        <StatCard title="Active Loans"       value={String(stats?.activeLoans || 0)}  icon={CreditCard} color="bg-violet-600" href="/dashboard/loans"    loading={loading} sub={`of ${stats?.totalLoans || 0} total`} />
        <StatCard
          title="Today's Collection"
          value={fmtM(stats?.todayCollection)}
          icon={Receipt}
          color="bg-orange-500"
          href="/dashboard/payments"
          loading={loading}
          highlight
          sub={stats?.todayCount ? `${stats.todayCount} payment${stats.todayCount !== 1 ? 's' : ''} today` : 'Resets at midnight'}
        />
      </div>

      {/* Today collection panel + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Collection panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-black text-gray-900 leading-tight">Today's Collection</h2>
                <p className="text-xs text-gray-400">
                  {new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })} · resets at midnight
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-300 hidden sm:block">Updated {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>

          {loading ? (
            <div className="h-28 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <>
              <p className="text-4xl font-black text-gray-900 tracking-tight mt-2">{fmt(stats?.todayCollection)}</p>
              <p className="text-sm text-gray-400 mt-0.5 mb-3">
                {stats?.todayCount || 0} payment{stats?.todayCount !== 1 ? 's' : ''} recorded today
              </p>

              {methodBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {methodBreakdown.map(({ method, amount, cfg }) => {
                    const Icon = cfg.icon;
                    return (
                      <span key={method} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}: {fmt(amount)}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <p className="text-sm text-orange-700 font-medium">No payments yet today — record your first collection</p>
                </div>
              )}

              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Last 7 Days</p>
                <SparkBars data={last7Days} />
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-800">Quick Actions</h2>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'New Loan Application', icon: Banknote,  href: '/dashboard/loans/create',  color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',     roles: ['admin','manager','cashier','agent'] },
              { label: 'Register Client',       icon: Users,    href: '/dashboard/clients/create', color: 'bg-green-50 hover:bg-green-100 text-green-700',  roles: ['admin','manager','cashier'] },
              { label: 'Record Payment',        icon: Receipt,  href: '/dashboard/payments',       color: 'bg-orange-50 hover:bg-orange-100 text-orange-700', roles: ['admin','manager','cashier'] },
              { label: 'View Schedules',        icon: Calendar, href: '/dashboard/schedules',      color: 'bg-violet-50 hover:bg-violet-100 text-violet-700', roles: ['admin','manager','cashier','agent'] },
              { label: 'Add Bike to Inventory', icon: Bike,     href: '/dashboard/inventory/add',  color: 'bg-amber-50 hover:bg-amber-100 text-amber-700',  roles: ['admin','manager'] },
              { label: 'View Alerts',           icon: Bell,     href: '/dashboard/alerts',         color: 'bg-red-50 hover:bg-red-100 text-red-700',        roles: ['admin','manager','cashier'] },
              // NEW: Expenses and Reconciliation
              { label: 'Record Expense',        icon: FileText, href: '/dashboard/expenses/new',   color: 'bg-purple-50 hover:bg-purple-100 text-purple-700', roles: ['admin','manager','cashier'] },
              { label: 'Reconciliation',        icon: Wallet,   href: '/dashboard/finance/reconciliation', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700', roles: ['admin','manager'] },
              ...(isAdmin ? [{ label: 'Audit Logs', icon: Shield, href: '/dashboard/audit', color: 'bg-gray-50 hover:bg-gray-100 text-gray-700', roles: ['admin','manager'] }] : []),
            ].filter(a => !a.roles || a.roles.includes(user?.role || ''))
             .map(({ label, icon: Icon, href, color }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-semibold text-sm ${color}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />{label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {(alertSummary?.unread > 0 || schedSummary?.dueToday > 0 || schedSummary?.overdue > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {schedSummary?.dueToday > 0 && (
            <Link href="/dashboard/alerts" className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 hover:bg-blue-100 transition-colors">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0"><Zap className="w-5 h-5 text-white" /></div>
              <div><p className="font-bold text-blue-900">{schedSummary.dueToday} due today</p><p className="text-xs text-blue-600">Collect now →</p></div>
            </Link>
          )}
          {schedSummary?.overdue > 0 && (
            <Link href="/dashboard/alerts" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 hover:bg-red-100 transition-colors">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0"><AlertCircle className="w-5 h-5 text-white" /></div>
              <div><p className="font-bold text-red-900">{schedSummary.overdue} overdue</p><p className="text-xs text-red-600">{fmt(schedSummary.overdueAmount)} outstanding</p></div>
            </Link>
          )}
          {alertSummary?.unread > 0 && (
            <Link href="/dashboard/alerts" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0"><Bell className="w-5 h-5 text-white" /></div>
              <div><p className="font-bold text-amber-900">{alertSummary.unread} unread alert{alertSummary.unread !== 1 ? 's' : ''}</p><p className="text-xs text-amber-700">View inbox →</p></div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Loan status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-gray-400" /><h2 className="font-bold text-gray-800">Loan Status</h2></div>
            <Link href="/dashboard/loans" className="text-xs text-blue-500 hover:underline font-semibold">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : loanBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No loans yet</p>
          ) : (
            <div className="space-y-2">{loanBreakdown.map(({ status, count }) => <StatusBadge key={status} status={status} count={count} />)}</div>
          )}
        </div>

        {/* Pending approvals */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <h2 className="font-bold text-gray-800">Pending Approvals</h2>
              {(stats?.pendingLoans || 0) > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 font-black px-2 py-0.5 rounded-full">{stats?.pendingLoans}</span>}
            </div>
            <Link href="/dashboard/loans" className="text-xs text-blue-500 hover:underline font-semibold">Review</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : pendingLoans.length === 0 ? (
            <div className="text-center py-8"><CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No pending approvals</p></div>
          ) : (
            <div className="space-y-2">
              {pendingLoans.map((loan: any) => {
                const fn = loan.client?.firstName || loan.client?.first_name || '';
                const ln = loan.client?.lastName  || loan.client?.last_name  || '';
                const clientNameStr = `${fn} ${ln}`.trim() || `Client #${loan.clientId || loan.client_id || '?'}`;
                return (
                  <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition-colors border border-yellow-100">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{clientNameStr}</p>
                      <p className="text-xs text-gray-400">{loan.loanNumber || loan.loan_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-700">{fmtM(Number(loan.principalAmount || loan.principal_amount || 0))}</p>
                      <p className="text-xs text-gray-400 capitalize">{loan.loanType || loan.loan_type || 'cash'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's payments list */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-gray-800">Today's Payments</h2>
              {recentPayments.length > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full">{recentPayments.length}</span>}
            </div>
            <Link href="/dashboard/payments" className="text-xs text-blue-500 hover:underline font-semibold">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : recentPayments.length === 0 ? (
            <div className="text-center py-6">
              <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-semibold">No payments today</p>
              <p className="text-xs text-gray-300 mt-0.5">Counter resets at midnight</p>
              <Link href="/dashboard/payments"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Record Payment
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {recentPayments.map((p: any, i: number) => {
                const pm = p.paymentMethod || p.payment_method || 'CASH';
                const mcfg = METHODS[pm] || { label: pm, icon: Wallet, color: 'text-gray-600 bg-gray-50' };
                const Icon = mcfg.icon;
                const cn = p.loan?.client
                  ? `${p.loan.client.firstName || p.loan.client.first_name || ''} ${p.loan.client.lastName || p.loan.client.last_name || ''}`.trim()
                  : `Loan #${p.loanId || p.loan_id}`;
                const time = (p.paymentDate || p.payment_date)
                  ? new Date(p.paymentDate || p.payment_date).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <div key={p.id || i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${mcfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{cn}</p>
                        <p className="text-xs text-gray-400">{time}{time && ' · '}{p.receiptNumber || p.receipt_number || '—'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-700 flex-shrink-0 ml-2">{fmt(p.amount)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {isAdmin && (stats?.overdueLoans || 0) > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-800 text-sm">{stats?.overdueLoans} overdue loan{(stats?.overdueLoans || 0) > 1 ? 's' : ''} need attention</p>
              <p className="text-xs text-red-500 mt-0.5">Review and take action to prevent further defaults</p>
            </div>
          </div>
          <Link href="/dashboard/loans?status=DELINQUENT"
            className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors flex-shrink-0">
            Review <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

    </div>
  );
}