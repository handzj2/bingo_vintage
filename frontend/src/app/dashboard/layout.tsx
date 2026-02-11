'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  Bike, 
  Package, 
  Settings, 
  Home, 
  FileText, 
  Banknote, 
  Users, 
  CreditCard, 
  ClipboardList, 
  RotateCcw,
  Search,
  Menu,
  X,
  Plus
} from 'lucide-react';
import Link from 'next/link';

// Navigation items with proper icons
const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ]
  },
  {
    label: 'Lending',
    items: [
      { name: 'All Loans', href: '/dashboard/loans', icon: FileText },
      { name: 'Cash Loans', href: '/dashboard/loans?type=cash', icon: Banknote },
      { name: 'Bike Loans', href: '/dashboard/loans?type=bike', icon: Bike },
      { name: 'Create Loan', href: '/dashboard/loans/create', icon: Plus },
    ]
  },
  {
    label: 'Operations',
    items: [
      { name: 'Clients', href: '/dashboard/clients', icon: Users },
      { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
    ]
  },
  {
    label: 'Governance',
    items: [
      { name: 'Audit Logs', href: '/dashboard/audit', icon: ClipboardList },
      { name: 'Reversals', href: '/dashboard/reversals', icon: RotateCcw },
    ]
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]
  },
];

// Mobile navigation (simplified)
const mobileNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Loans', href: '/dashboard/loans', icon: FileText },
  { name: 'Create', href: '/dashboard/loans/create', icon: Plus },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Pay', href: '/dashboard/payments', icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Escape to close mobile menu
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  // Memoize navigation groups
  const memoizedNavigationGroups = useMemo(() => navigationGroups, []);
  const memoizedMobileNavItems = useMemo(() => mobileNavItems, []);

  // Helper function for active state
  const getIsActive = (href: string) => {
    if (href === '/dashboard/loans') {
      return pathname.startsWith('/dashboard/loans') && 
             !pathname.includes('/create');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Mobile menu toggle with haptic feedback
  const handleMobileMenuToggle = () => {
    if ('vibrate' in navigator && window.innerWidth <= 1024) {
      navigator.vibrate(10);
    }
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    if ('vibrate' in navigator && window.innerWidth <= 1024) {
      navigator.vibrate([50, 30, 50]);
    }
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar - Blue Theme */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-gradient-to-b from-blue-600 to-blue-800 shadow-xl">
        {/* Logo - White text on blue */}
        <div className="h-16 flex items-center px-6 border-b border-blue-500/30">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bike className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-white text-xl">Bingo Vintage</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {memoizedNavigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-semibold text-blue-200/80 uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = getIsActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-white/20 text-white backdrop-blur-sm shadow-sm'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-blue-500/30">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-blue-200 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-center px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between px-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <button
          onClick={handleMobileMenuToggle}
          className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white">Bingo Vintage</span>
        </Link>
        
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-gradient-to-b from-blue-600 to-blue-800 pt-16">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-blue-500/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <nav className="p-4 space-y-1">
              {memoizedNavigationGroups.map((group) => (
                <div key={group.label} className="mb-6">
                  <p className="px-3 text-xs font-semibold text-blue-200/80 uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = getIsActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-all ${
                            isActive
                              ? 'bg-white/20 text-white backdrop-blur-sm'
                              : 'text-blue-100 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-6 w-6" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* User Info in Mobile Menu */}
              <div className="mt-8 p-4 border-t border-blue-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-blue-200 capitalize">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 text-center text-white bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Topbar - Clean with blue accent */}
        <header className="hidden lg:flex h-16 bg-white/80 backdrop-blur-sm border-b border-blue-200/50 items-center justify-between px-6 shadow-sm">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search clients, loans... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-72 pl-10 pr-10 py-2.5 bg-white/50 border border-blue-200/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-700">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-blue-600 font-medium capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-200">
              <span className="text-blue-600 font-bold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100/50 p-6 min-h-[calc(100vh-8rem)]">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-700 border-t border-blue-500/30 z-50 backdrop-blur-sm">
        <div className="flex justify-around items-center h-16">
          {memoizedMobileNavItems.map((item) => {
            const isActive = getIsActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 flex-1 transition-all ${
                  isActive 
                    ? 'text-white scale-105' 
                    : 'text-blue-200 hover:text-white hover:scale-105'
                }`}
                onClick={() => {
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                  }
                }}
              >
                <item.icon className={`h-5 w-5 mb-1 transition-transform ${isActive ? 'text-white' : 'text-blue-200'}`} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}