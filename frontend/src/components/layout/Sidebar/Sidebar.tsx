'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'cashier', 'agent'] },
  { name: 'Clients', href: '/dashboard/clients', icon: Users, roles: ['admin', 'agent'] },
  { name: 'Loans', href: '/dashboard/loans', icon: DollarSign, roles: ['admin', 'agent'] },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'cashier'] },
  { name: 'Bikes', href: '/dashboard/bikes', icon: Bike, roles: ['admin', 'cashier', 'agent'] },
  { name: 'Schedules', href: '/dashboard/schedules', icon: Calendar, roles: ['admin', 'cashier'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: Shield, roles: ['admin'] },
  { name: 'Reversals & Edits', href: '/dashboard/reversals', icon: RotateCcw, roles: ['admin'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    user?.role && item.roles.includes(user.role.toLowerCase())
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
                <span className="text-blue-600 font-semibold uppercase">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role} Portal
                </p>
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

        <div className="mt-auto p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="px-6 py-2 text-center">
          <div className="text-[10px] text-gray-400">
            © {new Date().getFullYear()} Bingo Vintage
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