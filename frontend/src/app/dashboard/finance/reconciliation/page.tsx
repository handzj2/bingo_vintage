'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ReconciliationDashboard from '@/components/finance/ReconciliationDashboard';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * /dashboard/finance/reconciliation
 *
 * Enterprise page wrapper:
 * - Enforces role-based access (admin / manager only)
 * - Shows proper loading state while auth resolves
 * - Renders the ReconciliationDashboard component
 */
export default function ReconciliationPage() {
  const { user, isLoading, can } = useAuth();
  const router              = useRouter();

  const role      = (user?.role ?? '').toLowerCase();
  const canAccess = role === 'admin' || role === 'manager' || role === 'superadmin' || can('drawer.manage');

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
          <div className="w-16 h-16 rounded-full bg-bv-danger-bg flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-bv-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-bv-text">Access Restricted</h2>
            <p className="text-sm text-bv-meta mt-1">
              Cash reconciliation is available to managers and administrators only.
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

  // ── Main content ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-bv mx-auto space-y-6">
      <div className="border-b border-bv-border pb-4">
        <h1 className="text-lg font-semibold text-bv-text">Cash reconciliation</h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Expected vs counted cash per drawer. Differences are operational exceptions and stay on the audit trail.
        </p>
      </div>
      <ReconciliationDashboard />
    </div>
  );
}
