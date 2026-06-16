// RBAC patch 2026-06-15: canView() superadmin/admin bypass; handles both permission formats
// patch 2026-06-16: superadmin panel link added in sidebar footer
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Users,
  DollarSign,
  CreditCard,
  Bike,
  Calendar,
  BarChart3,
  Shield,
  Settings,
  Menu,
  RotateCcw,
  Package,
  Receipt,
  Wallet,
  Clock,
} from 'lucide-react';

const ALL_NAV = [
  { name: 'Dashboard',  href: '/dashboard',           icon: Home,      permKey: 'view_dashboard', defaultRoles: ['admin','manager','cashier','agent'] },
  { name: 'Clients',    href: '/dashboard/clients',   icon: Users,     permKey: 'view_clients',   defaultRoles: ['admin','manager','agent'] },
  { name: 'Loans',      href: '/dashboard/loans',     icon: DollarSign,permKey: 'view_loans',     defaultRoles: ['admin','manager','agent'] },
  { name: 'Payments',   href: '/dashboard/payments',  icon: CreditCard,permKey: 'view_payments',  defaultRoles: ['admin','manager','cashier'] },
  { name: 'Inventory',  href: '/dashboard/inventory', icon: Package,   permKey: 'view_inventory', defaultRoles: ['admin','manager','cashier'] },
  { name: 'Expenses',   href: '/dashboard/expenses',  icon: Receipt,   permKey: 'view_expenses',  defaultRoles: ['admin','manager','cashier'] },
  { name: 'Pending Approvals', href: '/dashboard/expenses/approval', icon: Clock, permKey: 'expense.approve', defaultRoles: ['admin','manager'] },
  { name: 'Finance',    href: '/dashboard/finance/reconciliation', icon: Wallet, permKey: 'view_finance', defaultRoles: ['admin','manager'] },
  { name: 'Schedules',  href: '/dashboard/schedules', icon: Calendar,  permKey: 'view_schedules', defaultRoles: ['admin','manager','cashier'] },
  { name: 'Reports',    href: '/dashboard/reports',   icon: BarChart3, permKey: 'view_reports',   defaultRoles: ['admin','manager'] },
  { name: 'Audit Logs', href: '/dashboard/audit',     icon: Shield,    permKey: 'view_audit',     defaultRoles: ['admin'] },
  { name: 'Reversals',  href: '/dashboard/reversals', icon: RotateCcw, permKey: 'view_reversals', defaultRoles: ['admin','manager','cashier'] },
  { name: 'Settings',   href: '/dashboard/settings',  icon: Settings,  permKey: 'view_settings',  defaultRoles: ['admin'] },
];

// Map sidebar nav keys to backend permission codes
// Maps sidebar nav permKey → backend permission code
// Used when user.permissions is string[] (from /auth/me after JWT merge)
const NAV_TO_BACKEND: Record<string, string> = {
  'view_dashboard':  'view_dashboard',   // no backend code — role default only
  'view_clients':    'client.view',
  'view_loans':      'loan.view',
  'view_payments':   'payment.view',
  'view_inventory':  'view_inventory',   // no backend code — role default only
  'view_expenses':   'expense.create',
  'expense.approve': 'expense.approve',
  'view_finance':    'drawer.manage',
  'view_schedules':  'view_schedules',   // no backend code — role default only
  'view_reports':    'report.view',
  'view_audit':      'view_audit',       // no backend code — role default only
  'view_reversals':  'payment.reverse',
  'view_settings':   'settings.manage',
  'drawer.manage':   'drawer.manage',
};

function canView(user: any, permKey: string, defaultRoles: string[]): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  // superadmin and admin always see everything
  if (role === 'superadmin' || role === 'admin') return true;
  const perms = user.permissions;
  if (!perms) return defaultRoles.includes(role);
  // string[] — permissions from /auth/me (backend codes merged with JSONB overrides)
  if (Array.isArray(perms)) {
    const backendCode = NAV_TO_BACKEND[permKey];
    // If no backend code exists for this nav item, fall back to role default
    if (!backendCode || backendCode === permKey) return defaultRoles.includes(role);
    return perms.includes(backendCode);
  }
  // Record<string,boolean> — custom JSONB overrides from Settings page
  if (typeof perms === 'object') {
    const stored = (perms as Record<string,boolean>)[permKey];
    if (stored !== undefined) return stored;
  }
  // Fall back to role-based default
  return defaultRoles.includes(role);
}

function getUserInitials(user: { full_name?: string; username?: string } | null): string {
  if (!user) return '?';
  const name = user.full_name || user.username || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      const filtered = ALL_NAV.filter(item => canView(user, item.permKey, item.defaultRoles));
      console.log('Filtered sidebar items:', filtered.map(i => i.name));
    }
  }, [user]);

  const filteredNavigation = ALL_NAV.filter(item =>
    canView(user, item.permKey, item.defaultRoles)
  );

  const SidebarItem = ({ href, icon: Icon, isActive, children }: any) => (
    <Link
      href={href}
      onClick={() => setSidebarOpen(false)}
      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`mr-3 h-5 w-5 ${
        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
      }`} />
      {children}
    </Link>
  );

  const initials    = getUserInitials(user);
  const displayName = user?.full_name || user?.username || '';
  // FIX: removed user?.roleName — that property does not exist on the User interface.
  // The User interface (AuthContext.tsx) only has `role`. roleName is a backend JWT field
  // that AuthContext already maps to `role` on login.
  const userRole = user?.role || '';

  return (
    <>
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:pb-4">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link href="/dashboard" className="flex items-center">
            <Bike className="h-8 w-8 text-blue-600" />
            <span className="ml-3 text-xl font-bold text-gray-900">Bingo Vintage</span>
          </Link>
        </div>

        {user && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold uppercase">{initials}</span>
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole} Portal</p>
              </div>
            </div>
          </div>
        )}

        <nav className="mt-6 flex-1 space-y-1 px-2">
          {filteredNavigation.map((item) => (
            <SidebarItem
              key={item.name}
              href={item.href}
              icon={item.icon}
              isActive={pathname.startsWith(item.href)}
            >
              {item.name}
            </SidebarItem>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
          {/* Superadmin: quick link back to platform portal */}
          {user?.role === 'superadmin' && (
            <a href="/superadmin"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition">
              ⚡ Super Admin Panel
            </a>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Sign out
          </button>
        </div>

        <div className="px-6 py-2 text-center">
          <div className="text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} Bingo Vintage
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
          <Bike className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">Bingo Vintage</span>
        </div>
      </div>
    </>
  );
}
