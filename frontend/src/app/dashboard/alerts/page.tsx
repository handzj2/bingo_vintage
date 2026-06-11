'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, AlertTriangle, XCircle, Clock, CheckCircle2,
  RefreshCw, Loader2, Phone, DollarSign, Eye,
  Check, BellOff, ChevronRight, Bike, Banknote, Zap,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

const SEV: Record<string, { bar: string; badge: string; icon: any; text: string }> = {
  critical: { bar: 'border-l-red-600',    badge: 'bg-red-600 text-white',    icon: XCircle,       text: 'text-red-700'    },
  high:     { bar: 'border-l-orange-500', badge: 'bg-orange-500 text-white', icon: AlertTriangle, text: 'text-orange-700' },
  medium:   { bar: 'border-l-amber-400',  badge: 'bg-amber-500 text-white',  icon: Clock,         text: 'text-amber-700'  },
  low:      { bar: 'border-l-blue-400',   badge: 'bg-blue-500 text-white',   icon: Bell,          text: 'text-blue-700'   },
};

const TYPE_LABEL: Record<string, string> = {
  OVERDUE:       'Overdue',
  DUE_TODAY:     'Due Today',
  DUE_THIS_WEEK: 'Due This Week',
  MISSED_PAYMENT:'Missed',
  DELINQUENT:    'Delinquent',
};

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoad]    = useState(true);
  const [filter, setFilter]   = useState('all');
  const [sev, setSev]         = useState('all');
  const [busy, setBusy]       = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const [a, s] = await Promise.all([
        fetch(`${API_URL}/schedules/alerts`, { headers: getH() }).then(r => r.json()),
        fetch(`${API_URL}/schedules/alerts/summary`, { headers: getH() }).then(r => r.json()),
      ]);
      setAlerts(Array.isArray(a) ? a : []);
      setSummary(s);
    } catch (e) { console.error(e); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await fetch(`${API_URL}/schedules/alerts/mark-all-read`, { method: 'PATCH', headers: getH() });
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const resolve = async (id: number) => {
    setBusy(id);
    try {
      await fetch(`${API_URL}/schedules/alerts/${id}/resolve`, { method: 'PATCH', headers: getH() });
      setAlerts(prev => prev.filter(a => a.id !== id));
      setSummary((prev: any) => prev ? { ...prev, total: Math.max(0, (prev.total || 1) - 1) } : prev);
    } finally { setBusy(null); }
  };

  const markRead = async (id: number) => {
    await fetch(`${API_URL}/schedules/alerts/${id}/read`, { method: 'PATCH', headers: getH() });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const filtered = alerts.filter(a => {
    const t = filter === 'all' || a.alertType === filter;
    const s = sev === 'all' || a.severity === sev;
    return t && s;
  });

  const unread = alerts.filter(a => !a.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">Alert Inbox</h1>
                {unread > 0 && (
                  <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">
                    {unread} new
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Overdue payments, missed instalments & due today</p>
            </div>
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600">
                <Eye className="w-4 h-4" /> Mark all read
              </button>
            )}
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',    value: summary.total,    color: 'bg-gray-700', icon: Bell,          sub: `${summary.unread} unread` },
              { label: 'Due Today',value: summary.dueToday, color: 'bg-blue-600', icon: Zap,           sub: 'Collect today' },
              { label: 'Overdue',  value: summary.overdue,  color: 'bg-red-600',  icon: AlertTriangle, sub: 'Need attention' },
              { label: 'Critical', value: summary.critical, color: 'bg-red-900',  icon: XCircle,       sub: '>30 days late' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${c.value > 0 && c.label !== 'Total' ? 'ring-1 ring-red-100' : ''}`}>
                <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
                  <c.icon className="w-4 h-4 text-white" />
                </div>
                <p className={`text-2xl font-black ${c.value > 0 && c.label !== 'Total' ? 'text-red-600' : 'text-gray-900'}`}>{c.value}</p>
                <p className="text-xs text-gray-400 font-medium">{c.label}</p>
                <p className="text-xs text-gray-500">{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && alerts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <BellOff className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600 mb-1">All Clear</h3>
            <p className="text-sm text-gray-400">No active alerts. All loans are on schedule.</p>
          </div>
        )}

        {/* Filters */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'OVERDUE', 'DUE_TODAY', 'MISSED_PAYMENT', 'DELINQUENT'] as string[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All Types' : TYPE_LABEL[f] || f}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto flex-wrap">
              {(['all', 'critical', 'high', 'medium', 'low'] as string[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    sev === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All Severity' : s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alert list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => {
              const cfg = SEV[alert.severity] || SEV.medium;
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  onClick={() => !alert.isRead && markRead(alert.id)}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${cfg.bar} ${!alert.isRead ? 'ring-1 ring-blue-100' : ''} cursor-pointer`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.badge}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${cfg.text}`}>{alert.title}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cfg.badge}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                              {TYPE_LABEL[alert.alertType] || alert.alertType}
                            </span>
                            {!alert.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>

                          {alert.loan && (
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                {alert.loan.loanType === 'bike'
                                  ? <Bike className="w-3.5 h-3.5 text-blue-500" />
                                  : <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                                {alert.loan.clientName}
                              </span>
                              {alert.loan.clientPhone && (
                                <a
                                  href={`tel:${alert.loan.clientPhone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <Phone className="w-3 h-3" />{alert.loan.clientPhone}
                                </a>
                              )}
                              <span className="text-xs text-gray-400">{alert.loan.loanNumber}</span>
                              {alert.amountDue > 0 && (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                  <DollarSign className="w-3 h-3" />{fmt(alert.amountDue)} due
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex gap-1.5">
                          {alert.loan && (
                            <Link
                              href={`/dashboard/schedules/${alert.loan.id}`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
                              title="View schedule"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); resolve(alert.id); }}
                            disabled={busy === alert.id}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg disabled:opacity-50"
                            title="Resolve"
                          >
                            {busy === alert.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && alerts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <p className="text-gray-400">No alerts match this filter</p>
          </div>
        )}

      </div>
    </div>
  );
}
