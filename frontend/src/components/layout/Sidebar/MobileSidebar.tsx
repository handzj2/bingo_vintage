// src/components/layout/Sidebar/MobileSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Users,
  DollarSign,
  CreditCard,
  Bike,
  Package,
  MoreHorizontal,
} from 'lucide-react';

const mobileNavigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Loans', href: '/dashboard/loans', icon: DollarSign },
  { name: 'Pay', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Bikes', href: '/dashboard/bikes', icon: Bike },
  { name: 'More', href: '/dashboard/inventory', icon: MoreHorizontal },
];

export default function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {mobileNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}