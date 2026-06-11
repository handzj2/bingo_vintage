'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Search, Download, RefreshCw, Filter, ChevronDown,
  ChevronUp, Loader2, AlertCircle, Clock, User, Database,
  CreditCard, RotateCcw, LogIn, FileText, CheckCircle,
  XCircle, Activity, Calendar, Eye, X
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (path: string) => {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(JSON.parse(text)?.message || `Error ${res.status}`);
  return text ? JSON.parse(text) : [];
};

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  LOGIN:             { label: 'Login',          icon: LogIn,      color: 'text-blue-600',   bg: 'bg-blue-50' },
  LOGOUT:            { label: 'Logout',         icon: LogIn,      color: 'text-gray-500',   bg: 'bg-gray-50' },
  CREATE:            { label: 'Created',        icon: CheckCircle,color: 'text-green-600',  bg: 'bg-green-50' },
  UPDATE:            { label: 'Updated',        icon: FileText,   color: 'text-yellow-600', bg: 'bg-yellow-50' },
  DELETE:            { label: 'Deleted',        icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50' },
  PAYMENT_REVERSAL:  { label: 'Reversal',       icon: RotateCcw,  color: 'text-orange-600', bg: 'bg-orange-50' },
  LOAN_APPROVED:     { label: 'Loan Approved',  icon: CheckCircle,color: 'text-green-600',  bg: 'bg-green-50' },
  LOAN_REJECTED:     { label: 'Loan Rejected',  icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50' },
  BALANCE_ADJUSTED:  { label: 'Balance Adj.',   icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
};

function getActionCfg(action: string) {
  return ACTION_CONFIG[action] || { label: action, icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50' };
}

function parseJson(val: string | null) {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

function DetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  const old = parseJson(log.oldValues);
  const nw  = parseJson(log.newValues);
  const meta = parseJson(log.metadata);
  const cfg = getActionCfg(log.action);
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{cfg.label}</p>
              <p className="text-xs text-gray-400">Audit Entry #{log.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Core info */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Performed By', value: log.user || '—' },
              { label: 'Table', value: log.tableName || '—' },
              { label: 'Record ID', value: log.recordId || '—' },
              { label: 'IP Address', value: log.ipAddress || '—' },
              { label: 'Timestamp', value: new Date(log.createdAt).toLocaleString() },
              { label: 'Action', value: log.action },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-800">{String(value)}</p>
              </div>
            ))}
          </div>

          {log.description && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-bold uppercase mb-1">Description</p>
              <p className="text-sm text-blue-900">{log.description}</p>
            </div>
          )}

          {(old || nw) && (
            <div className="grid grid-cols-2 gap-4">
              {old && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-red-500 font-bold uppercase mb-2">Previous State</p>
                  <pre className="text-xs text-red-800 overflow-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(old, null, 2)}
                  </pre>
                </div>
              )}
              {nw && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-500 font-bold uppercase mb-2">New State</p>
                  <pre className="text-xs text-green-800 overflow-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(nw, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {meta && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs text-purple-500 font-bold uppercase mb-2">Metadata</p>
              <pre className="text-xs text-purple-800 overflow-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser]     = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/audit');
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort();
  const uniqueUsers   = Array.from(new Set(logs.map(l => l.user).filter(Boolean))).sort();

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.action, l.user, l.tableName, l.description, String(l.recordId || '')]
      .some(v => v?.toLowerCase().includes(q));
    const matchAction = !filterAction || l.action === filterAction;
    const matchUser   = !filterUser   || l.user === filterUser;
    const matchFrom   = !dateFrom     || new Date(l.createdAt) >= new Date(dateFrom);
    const matchTo     = !dateTo       || new Date(l.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchAction && matchUser && matchFrom && matchTo;
  }).sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'desc' ? -diff : diff;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Action', 'User', 'Table', 'Record ID', 'Description', 'IP', 'Timestamp'];
    const rows = filtered.map(l => [
      l.id, l.action, l.user || '', l.tableName || '',
      l.recordId || '', (l.description || '').replace(/,/g, ';'),
      l.ipAddress || '', new Date(l.createdAt).toISOString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch(''); setFilterAction(''); setFilterUser('');
    setDateFrom(''); setDateTo('');
  };
  const hasFilters = search || filterAction || filterUser || dateFrom || dateTo;

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-400">Admin access required</p>
          <p className="text-sm text-gray-300 mt-1">Audit logs are restricted to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-black text-gray-900">Audit Log</h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Complete system activity trail · Policy [2026-01-10]
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={!filtered.length}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events',   value: logs.length,                                          color: 'text-gray-900' },
          { label: 'Reversals',      value: logs.filter(l => l.action === 'PAYMENT_REVERSAL').length, color: 'text-orange-600' },
          { label: 'Showing',        value: filtered.length,                                       color: 'text-blue-600' },
          { label: 'Unique Users',   value: uniqueUsers.length,                                    color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by action, user, table, description..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {hasFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2.5 text-sm text-red-500 hover:text-red-700 font-semibold">
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-50">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Action Type</label>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All actions</option>
                {uniqueActions.map(a => (
                  <option key={a} value={a}>{getActionCfg(a).label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">User</label>
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All users</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="flex items-center gap-3 p-8 text-red-600">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading audit trail...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Database className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No audit logs found</p>
            {hasFilters && <p className="text-sm text-gray-300 mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">Table / Record</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide cursor-pointer select-none"
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Timestamp
                      {sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(log => {
                  const cfg = getActionCfg(log.action);
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <span className="text-gray-700 font-medium text-xs">{log.user || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {log.tableName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{log.tableName}</span>
                            {log.recordId && <span className="text-xs text-gray-400">#{log.recordId}</span>}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                        <p className="text-xs text-gray-500 truncate">{log.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString('en-UG', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedLog(log)}
                          className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center group">
                          <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {logs.length} events
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
