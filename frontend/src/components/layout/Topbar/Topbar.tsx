// File: src/components/layout/Topbar/Topbar.tsx
'use client';

import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Topbar() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-2 mr-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user?.name || 'User'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {user?.email || 'admin@example.com'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}