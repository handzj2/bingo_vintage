// components/ui/RouteGuard.tsx — route-level permission enforcement
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  permission?: string;         // e.g. 'report.view'
  roles?: string[];            // e.g. ['admin','manager']
  children: React.ReactNode;
  fallback?: React.ReactNode;  // custom unauthorised UI
}

/**
 * Wraps a page and enforces permission/role access.
 *
 * Rules (permission-first):
 * - Admin / superadmin always pass.
 * - If `permission` is provided → grant when can(permission) is true.
 *   The optional `roles` list is then ignored (permission is the source of truth).
 * - If only `roles` is provided → grant when user.role is in the list.
 * - This prevents the previous bug where permission="expense.approve" AND
 *   roles={['admin','manager']} blocked authorised non-managers.
 *
 * Usage:
 *   <RouteGuard permission="expense.approve">
 *     <ExpenseApprovalPage />
 *   </RouteGuard>
 */
export default function RouteGuard({
  permission, roles, children, fallback,
}: RouteGuardProps) {
  const { user, isLoading, can } = useAuth();
  const router = useRouter();

  const hasAccess = (): boolean => {
    if (!user) return false;
    const role = (user.role ?? '').toLowerCase();
    if (role === 'admin' || role === 'superadmin' || role === 'super_admin') return true;

    // Permission is authoritative when supplied
    if (permission) {
      return can(permission);
    }
    // Fallback to role list only when no permission is specified
    if (roles && roles.length > 0) {
      return roles.map(r => r.toLowerCase()).includes(role);
    }
    return true;
  };

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [isLoading, user, router]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!hasAccess()) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-13a9 9 0 100 18A9 9 0 0012 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-500 mt-1">
            You do not have permission to view this section.
          </p>
        </div>
        <button onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Go back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
