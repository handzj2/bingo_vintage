'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Role-based route access
const ROLE_ACCESS: Record<string, string[]> = {
  admin: ['*'], // All routes
  staff: [
    '/dashboard',
    '/dashboard/loans',
    '/dashboard/clients',
    '/dashboard/payments',
    '/dashboard/schedules',
    '/dashboard/sms',
    '/dashboard/settings',
  ],
  agent: [
    '/dashboard',
    '/dashboard/loans',
    '/dashboard/clients',
    '/dashboard/payments',
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check access based on role
  const hasAccess = (role: string, path: string): boolean => {
    if (role === 'admin') return true;
    const allowed = ROLE_ACCESS[role] || [];
    return allowed.some(route => path === route || path.startsWith(route + '/'));
  };

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!hasAccess(user.role, pathname)) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Simple layout without Sidebar for now
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Bingo Vintage</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.first_name} {user.last_name}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {user.role}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                router.push('/auth/login');
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Simple Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/loans">Loans</NavLink>
          <NavLink href="/dashboard/clients">Clients</NavLink>
          <NavLink href="/dashboard/payments">Payments</NavLink>
          {user.role === 'admin' && (
            <>
              <NavLink href="/dashboard/reports">Reports</NavLink>
              <NavLink href="/dashboard/audit">Audit</NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

// Simple Nav Link Component
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  
  return (
    <a
      href={href}
      className={`text-sm font-medium whitespace-nowrap ${
        isActive 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </a>
  );
}