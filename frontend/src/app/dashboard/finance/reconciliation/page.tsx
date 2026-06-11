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
  const { user, isLoading } = useAuth();
  const router              = useRouter();

  const canAccess = user?.role === 'admin' || user?.role === 'manager';

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
              Cash reconciliation is available to managers and administrators only.
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

  // ── Main content ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Cash Reconciliation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare expected vs actual cash for each drawer. All entries are logged to the audit trail.
        </p>
      </div>
      <ReconciliationDashboard />
    </div>
  );
}
