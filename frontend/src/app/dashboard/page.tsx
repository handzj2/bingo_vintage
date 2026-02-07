'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Users, CreditCard, AlertCircle, FileText, Receipt, Shield, Eye, EyeOff, Activity, TrendingDown, BarChart, Clock, CheckCircle, TrendingUp, Package } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Admin Metrics Interface
interface AdminMetrics {
  totalOutstandingBalance: number;
  par30: number;
  adminReversals: number;
  staffCollections: number;
  totalTransactions: number;
  delinquencyRate: number;
  avgLoanSize: number;
  avgDaysDelinquent: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showAdminMetrics, setShowAdminMetrics] = useState(false);
  
  // Mock data for now
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics>({
    totalOutstandingBalance: 12500000,
    par30: 5,
    adminReversals: 2,
    staffCollections: 145,
    totalTransactions: 147,
    delinquencyRate: 3.2,
    avgLoanSize: 2500000,
    avgDaysDelinquent: 12
  });

  const [stats, setStats] = useState({
    total_portfolio: 45000000,
    active_clients: 180,
    active_loans: 156,
    today_collection: 3200000,
    overdue_loans: 12,
    pending_applications: 8,
    approval_rate: 85,
    repayment_rate: 92,
    portfolio_at_risk: 3.5,
    monthly_growth: 12.5
  });

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const statCards = [
    { title: 'Total Portfolio', value: `UGX ${stats.total_portfolio.toLocaleString()}`, icon: DollarSign, color: 'bg-blue-500', trend: `↑ ${stats.monthly_growth}% this month` },
    { title: 'Active Clients', value: stats.active_clients.toString(), icon: Users, color: 'bg-green-500', trend: '+12 new' },
    { title: 'Active Loans', value: stats.active_loans.toString(), icon: CreditCard, color: 'bg-purple-500', trend: '+5 this week' },
    { title: "Today's Collection", value: `UGX ${stats.today_collection.toLocaleString()}`, icon: Receipt, color: 'bg-orange-500', trend: 'Target: UGX 5M' },
    { title: 'Overdue Loans', value: stats.overdue_loans.toString(), icon: AlertCircle, color: 'bg-red-500', trend: `${stats.portfolio_at_risk}% of portfolio` },
    { title: 'Pending Applications', value: stats.pending_applications.toString(), icon: FileText, color: 'bg-yellow-500', trend: `${stats.approval_rate}% approval rate` },
  ];

  const quickActions = [
    { title: 'Create New Loan', description: 'Process loan application', icon: DollarSign, color: 'bg-green-50 hover:bg-green-100', iconColor: 'text-green-600', href: '/dashboard/loans/create' },
    { title: 'Add New Client', description: 'Register new borrower', icon: Users, color: 'bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600', href: '/dashboard/clients/create' },
    { title: 'Record Payment', description: 'Log client payment', icon: CreditCard, color: 'bg-purple-50 hover:bg-purple-100', iconColor: 'text-purple-600', href: '/dashboard/payments' },
    { title: 'View Reports', description: 'Check performance', icon: Shield, color: 'bg-orange-50 hover:bg-orange-100', iconColor: 'text-orange-600', href: '/dashboard/reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.first_name} {user.last_name}!
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-600">Here's what's happening with your lending business today.</p>
            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
            {user.role === 'admin' && (
              <button 
                onClick={() => setShowAdminMetrics(!showAdminMetrics)}
                className="text-sm px-2 py-1 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors flex items-center gap-1"
              >
                {showAdminMetrics ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showAdminMetrics ? 'Hide Admin' : 'Show Admin'}
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Admin Metrics */}
      {user.role === 'admin' && showAdminMetrics && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Admin Governance Pulse</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Total Outstanding" value={`UGX ${adminMetrics.totalOutstandingBalance.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
            <MetricCard title="PAR 30 (At Risk)" value={`${adminMetrics.par30} Riders`} icon={AlertCircle} color="bg-red-500" />
            <MetricCard title="Admin Reversals" value={adminMetrics.adminReversals.toString()} icon={Shield} color="bg-amber-500" />
            <MetricCard title="Staff Collections" value={adminMetrics.staffCollections.toString()} icon={TrendingUp} color="bg-emerald-500" />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link 
              key={index}
              href={action.href}
              className={`p-4 ${action.color} rounded-xl transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${action.iconColor} bg-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{action.title}</p>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}