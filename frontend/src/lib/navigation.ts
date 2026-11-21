// Single source of truth for dashboard navigation (desktop sidebar, mobile menu, mobile bottom bar).
//
// Visibility rule (see canSeeNavItem):
//   1. admin / superadmin always see everything (matches backend hasPermission()).
//   2. If the item declares `anyOf`, the user needs at least one of those permission codes.
//   3. `backendRoles` is ONLY for modules whose backend endpoints are still guarded by @Roles()
//      and have no permission code yet (bikes, audit, reports, settings...). It mirrors the
//      backend guard exactly so the menu never shows a page the API will reject. These items are
//      flagged "permission model gap" in docs/FRONTEND_COVERAGE_MATRIX.md.
import {
  Home, FileText, Banknote, Bike, Plus, Calendar, Upload, Wallet, Users, CreditCard, Bell,
  Package, Receipt, Clock, ClipboardList, RotateCcw, BarChart3, Settings, Scale, History,
  SlidersHorizontal, Inbox, Building2, Tags, ArrowLeftRight, Bookmark, AlertTriangle, BellRing,
} from 'lucide-react';

export type BadgeKey = 'total' | 'loans' | 'expenses' | 'reversals' | 'corrections' | 'overdueDrawers';

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  anyOf?: string[];
  backendRoles?: string[];
  badge?: BadgeKey;
  mobileBar?: boolean;
  /** Commercial module key (module_registry). Hidden/disabled by Platform Admin Module Control. */
  moduleKey?: string;
  /** Set by visibleNavigation when the module is DISABLED but still VISIBLE. */
  moduleDisabled?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

export const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home, mobileBar: true },
      {
        name: 'Work Queue', href: '/dashboard/approvals', icon: Inbox, badge: 'total',
        anyOf: ['loan.approve', 'expense.approve', 'payment.reverse', 'payment.reversal.approve',
                'loan.approve_correction', 'drawer.force_close'],
      },
    ],
  },
  {
    label: 'Lending',
    items: [
      { name: 'All Loans',   href: '/dashboard/loans',           icon: FileText, anyOf: ['loan.view'], badge: 'loans', mobileBar: true },
      { name: 'Cash Loans',  href: '/dashboard/loans?type=cash', icon: Banknote, anyOf: ['loan.view'] },
      { name: 'Bike Loans',  href: '/dashboard/loans?type=bike', icon: Bike,     anyOf: ['loan.view'] },
      { name: 'Create Loan', href: '/dashboard/loans/create',    icon: Plus,     anyOf: ['loan.create'], mobileBar: true },
      { name: 'Schedules',   href: '/dashboard/schedules',       icon: Calendar, anyOf: ['loan.view'] },
      { name: 'Loan Products', href: '/dashboard/loan-products', icon: Tags,     anyOf: ['loan.approve'] },
      { name: 'Historical Import', href: '/dashboard/import',    icon: Upload,   anyOf: ['loan.approve'] },
    ],
  },
  {
    label: 'Cash & Drawers',
    items: [
      { name: 'My Drawer',       href: '/dashboard/my-drawer',               icon: Wallet,
        anyOf: ['drawer.view', 'drawer.open', 'drawer.close'] },
      { name: 'Branch Drawers',  href: '/dashboard/finance/drawers',         icon: Building2,
        anyOf: ['drawer.close', 'drawer.force_close', 'drawer.reconcile', 'finance.reconcile'], badge: 'overdueDrawers' },
      { name: 'Drawer History',  href: '/dashboard/finance/drawers/history', icon: History,  anyOf: ['drawer.view'] },
      { moduleKey: 'reconciliation', name: 'Reconciliation',  href: '/dashboard/finance/reconciliation',  icon: Scale,    anyOf: ['finance.reconcile', 'drawer.reconcile'] },
      { name: 'Drawer Settings', href: '/dashboard/finance/drawers/settings',icon: SlidersHorizontal, anyOf: ['settings.manage'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Clients',   href: '/dashboard/clients',   icon: Users,      anyOf: ['client.view'], mobileBar: true },
      { name: 'Payments',  href: '/dashboard/payments',  icon: CreditCard, anyOf: ['payment.view', 'payment.create'], mobileBar: true },
      { name: 'Alerts',    href: '/dashboard/alerts',    icon: Bell,       anyOf: ['loan.view', 'payment.view'] },
      { moduleKey: 'inventory', name: 'Inventory', href: '/dashboard/inventory', icon: Package,    backendRoles: ['manager', 'cashier'] },
      { moduleKey: 'expenses', name: 'Expenses',  href: '/dashboard/expenses',  icon: Receipt,    anyOf: ['expense.create', 'expense.approve'] },
      { moduleKey: 'expenses', name: 'Expense Approvals', href: '/dashboard/expenses/approval', icon: Clock, anyOf: ['expense.approve'], badge: 'expenses' },
      { moduleKey: 'financial_operations', name: 'Fin Ops',       href: '/dashboard/financial-ops', icon: ArrowLeftRight, anyOf: ['financial_operations.view'] },
      { moduleKey: 'reservations', name: 'Reservations',  href: '/dashboard/reservations',  icon: Bookmark,       anyOf: ['reservations.view'] },
      { moduleKey: 'recovery', name: 'Recovery',      href: '/dashboard/recovery',      icon: AlertTriangle,  anyOf: ['motorcycle_recovery.view'] },
      { moduleKey: 'notifications', name: 'Notifications', href: '/dashboard/notifications', icon: BellRing,       anyOf: ['notification.view'] },
    ],
  },
  {
    label: 'Governance',
    items: [
      { name: 'Reversals', href: '/dashboard/reversals', icon: RotateCcw, anyOf: ['payment.reverse', 'payment.reversal.approve', 'payment.view'], badge: 'reversals' },
      { name: 'Audit Logs', href: '/dashboard/audit',    icon: ClipboardList },            // admin only (backend)
      { moduleKey: 'reports', name: 'Reports',    href: '/dashboard/reports',  icon: BarChart3, anyOf: ['report.view'] },
    ],
  },
  {
    label: 'System',
    items: [{ name: 'Settings', href: '/dashboard/settings', icon: Settings, anyOf: ['settings.manage'] }],
  },
];

type Ctx = { role: string; can: (code: string) => boolean };

export function canSeeNavItem({ role, can }: Ctx, item: NavItem): boolean {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'superadmin') return true;
  if (item.anyOf && item.anyOf.length > 0) return item.anyOf.some((p) => can(p));
  if (item.backendRoles) return item.backendRoles.includes(r);
  return false; // item with no rule is admin-only
}

import type { ModuleMap } from '@/hooks/useModuleEntitlements';

/**
 * Applies RBAC (canSeeNavItem) and then commercial module state:
 *  - module HIDDEN   -> item removed
 *  - module DISABLED -> item kept (if VISIBLE) but flagged moduleDisabled and routed to the notice page
 * Superadmin is never gated (provider operates every module). No module data -> nothing gated.
 */
export function visibleNavigation(ctx: Ctx, modules?: ModuleMap): NavGroup[] {
  const isSuper = (ctx.role || '').toLowerCase() === 'superadmin';
  return navigationGroups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => canSeeNavItem(ctx, i))
        .flatMap((i): NavItem[] => {
          const m = !isSuper && i.moduleKey && modules ? modules[i.moduleKey] : undefined;
          if (!m || !m.isIndependentlyControllable) return [i];
          if (m.visibilityState === 'HIDDEN') return [];
          if (m.accessState === 'DISABLED') {
            return [{ ...i, moduleDisabled: true, href: `/dashboard/module-unavailable?key=${encodeURIComponent(m.moduleKey)}` }];
          }
          return [i];
        }),
    }))
    .filter((g) => g.items.length > 0);
}
