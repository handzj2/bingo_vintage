// new file — added 2026-06-21 — page wrapper for the branch drawer-overview
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DrawerOverview from '@/components/finance/DrawerOverview';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * /dashboard/finance/drawers
 *
 * Live view of every open cash drawer at the manager's branch — one card
 * per cashier, showing today's transaction count and running balance.
 * Lets a manager see at a glance how much physical cash each cashier
 * should be holding right now, without waiting for end-of-day reconciliation.
 */
export default function DrawerOverviewPage() {
  const { user, isLoading, can } = useAuth();
  const router = useRouter();

  const role      = (user?.role ?? '').toLowerCase();
  const canAccess = role === 'admin' || role === 'manager' || role === 'superadmin' || can('drawer.view');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isLoading, user, router]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-bv-meta">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div>
            <h2 className="text-base font-semibold text-bv-text">Access restricted</h2>
            <p className="text-sm text-bv-muted mt-1">
              Drawer overview is for managers and administrators. Cashiers use My drawer.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-bv-muted bg-bv-surface border border-bv-border rounded-lg hover:bg-bv-hover"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Admin/superadmin see all branches by omitting branchId; managers/cashiers
  // are scoped to their own branch automatically (backend defaults to req.user.branchId).
  const isBranchScoped = role === 'manager';

  // ── Main content ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      <div className="border-b border-bv-border pb-4">
        <h1 className="text-lg font-semibold text-bv-text">Cash drawers</h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Branch view of open drawers, floats and today&apos;s activity. Cashiers open their own drawer under My drawer.
        </p>
      </div>
      <DrawerOverview branchId={isBranchScoped ? user?.branchId : undefined} />
    </div>
  );
}
