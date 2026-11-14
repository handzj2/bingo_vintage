'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, X, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingWork, PendingItem } from '@/hooks/usePendingWork';
import { useRouter } from 'next/navigation';

function getUserInitials(user: { full_name?: string; username?: string } | null): string {
  if (!user) return '?';
  const name = user.full_name || user.username || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function formatAmount(n?: number) {
  if (n == null) return '';
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function NotificationRow({ item, onNavigate }: { item: PendingItem; onNavigate: (href: string) => void }) {
  const typeLabel =
    item.type === 'loan' ? 'Loan approval' :
    item.type === 'expense' ? 'Expense approval' :
    item.type === 'reversal' ? 'Reversal approval' :
    item.type === 'correction' ? 'Correction approval' :
    item.type === 'overdue_drawer' ? 'Overdue drawer' : 'Task';
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{typeLabel}</p>
          <p className="text-sm font-semibold text-slate-900 truncate">
            {item.reference}
            {item.clientName ? ` · ${item.clientName}` : ''}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.submittedBy} · {formatWhen(item.submittedAt)}
          </p>
        </div>
        <div className="text-right shrink-0">
          {item.amount != null && (
            <p className="text-sm font-semibold text-slate-800">{formatAmount(item.amount)}</p>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto mt-1" />
        </div>
      </div>
    </button>
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, refresh, canSeeAny } = usePendingWork();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isNotifOpen]);

  if (!user) return null;

  const initials = getUserInitials(user);
  const total = data.total;
  const items: PendingItem[] = [
    ...data.loans.items,
    ...data.expenses.items,
    ...data.reversals.items,
    ...(data.corrections?.items ?? []),
    ...(data.overdueDrawers?.items ?? []),
  ].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const openNotif = () => {
    setIsNotifOpen((v) => !v);
    if (!isNotifOpen) refresh();
  };

  const go = (href: string) => {
    setIsNotifOpen(false);
    router.push(href);
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 bg-white border-b border-slate-200">
      <div className="flex flex-1 px-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
              placeholder="Search clients, loans, payments..."
            />
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center pr-4 gap-1">
        {/* Notification centre */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={openNotif}
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {canSeeAny && total > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Requires your attention</p>
                  <p className="text-xs text-slate-500">
                    {loading ? 'Refreshing…' : total === 0 ? 'Nothing pending' : `${total} item${total === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button type="button" onClick={() => setIsNotifOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {!canSeeAny && (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">
                    You do not have approval permissions.
                  </p>
                )}
                {canSeeAny && total === 0 && !loading && (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">
                    No pending approvals. You are up to date.
                  </p>
                )}
                {items.map((item) => (
                  <NotificationRow key={`${item.type}-${item.id}`} item={item} onNavigate={go} />
                ))}
              </div>

              {total > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex gap-3 text-xs">
                  {data.loans.count > 0 && (
                    <button type="button" className="text-slate-700 hover:underline" onClick={() => go('/dashboard/loans?status=pending_approval')}>
                      Loans ({data.loans.count})
                    </button>
                  )}
                  {data.expenses.count > 0 && (
                    <button type="button" className="text-slate-700 hover:underline" onClick={() => go('/dashboard/expenses/approval')}>
                      Expenses ({data.expenses.count})
                    </button>
                  )}
                  {data.reversals.count > 0 && (
                    <button type="button" className="text-slate-700 hover:underline" onClick={() => go('/dashboard/reversals')}>
                      Reversals ({data.reversals.count})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="ml-1 relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center text-sm focus:outline-none rounded-full hover:bg-slate-100 p-1"
          >
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-slate-700 font-semibold text-sm">{initials}</span>
            </div>
            <ChevronDown className="ml-1 h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
