'use client';

import React from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * getUserInitials — derives avatar initials from full_name.
 * "System Administrator" → "SA", "Admin" → "A"
 */
function getUserInitials(user: { full_name?: string; username?: string } | null): string {
  if (!user) return '?';
  const name = user.full_name || user.username || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export default function Topbar() {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  if (!user) return null;

  const initials = getUserInitials(user);

  return (
    <div className="sticky top-0 z-40 flex h-16 bg-white shadow">
      <div className="flex flex-1 px-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search clients, loans, payments..."
            />
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center pr-4">
        <button className="p-1 rounded-full text-gray-400 hover:text-gray-500">
          <span className="sr-only">View notifications</span>
          <Bell className="h-6 w-6" />
        </button>

        <div className="ml-3 relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center text-sm focus:outline-none"
          >
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              {/* Initials derived from full_name — no more first_name/last_name */}
              <span className="text-blue-600 font-semibold">{initials}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
