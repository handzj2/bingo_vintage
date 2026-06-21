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
        <div className="flex flex-col items-center gap-3 text-gray-400">
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
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
            <p className="text-sm text-gray-500 mt-1">
              Drawer overview is available to managers and administrators only.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Cash Drawers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live balances and today&apos;s transaction counts for every cashier currently on shift.
        </p>
      </div>
      <DrawerOverview branchId={isBranchScoped ? user?.branchId : undefined} />
    </div>
  );
}
