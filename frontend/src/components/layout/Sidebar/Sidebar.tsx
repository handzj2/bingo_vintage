// File: src/components/layout/Sidebar/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Loans', href: '/loans', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-2xl font-bold text-blue-600">Bing Vintage</h1>
        </div>
        <nav className="mt-8 flex-1 flex flex-col space-y-1 px-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <button
            onClick={logout}
            className="flex-shrink-0 w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}