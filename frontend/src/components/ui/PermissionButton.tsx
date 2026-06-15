// components/ui/PermissionButton.tsx — button visible only if user has permission
'use client';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;   // hide unless user can(permission)
  roles?: string[];      // hide unless user.role in roles
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * Renders children only if the current user has the required permission/role.
 * Admins always see everything.
 *
 * Usage:
 *   <PermissionButton permission="loan.approve" onClick={handleApprove}
 *     className="btn-primary">
 *     Approve Loan
 *   </PermissionButton>
 *
 *   <PermissionButton roles={['admin','manager']} onClick={handleDelete}>
 *     Delete
 *   </PermissionButton>
 */
export default function PermissionButton({
  permission, roles, children, ...props
}: PermissionButtonProps) {
  const { user, can } = useAuth();

  if (!user) return null;
  if (user.role === 'admin' || user.role === 'superadmin') return <button {...props}>{children}</button>;
  if (permission && !can(permission)) return null;
  if (roles && !roles.includes(user.role ?? '')) return null;

  return <button {...props}>{children}</button>;
}
