// src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { DollarSign, Users, CreditCard, AlertCircle, FileText, Receipt, Shield, Eye, EyeOff, Activity, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

// Mock data - replace with API in Phase 6
const MOCK_STATS = {
  total_portfolio: 45000000,
  active_clients: 180,
  active_loans: 156,
  today_collection: 3200000,
  overdue_loans: 12,
  pending_applications: 8,
  monthly_growth: 12.5,
  portfolio_at_risk: 3.5,
  approval_rate: 85
};

const MOCK_ADMIN_METRICS = {
  totalOutstandingBalance: 12500000,
  par30: 5,
  adminReversals: 2,
  staffCollections: 145
};

const MOCK_ACTIVITIES = [
  { id: '1', action: 'New loan created', user: 'John Doe', details: 'LN-2024-001 - UGX 5,000,000', time: '2 min ago' },
  { id: '2', action: 'Payment received', user: 'Jane Smith', details: 'UGX 250,000', time: '15 min ago' },
  { id: '3', action: 'Client registered', user: 'Mike Johnson', details: 'Robert Ochieng', time: '1 hour ago' },
  { id: '4', action: 'Loan approved', user: 'Sarah Williams', details: 'LN-2024-002', time: '2 hours ago' },
];

export default function DashboardPage() {
  const [showAdminMetrics, setShowAdminMetrics] = useState(false);

  const statCards = [
    { title: 'Total Portfolio', value: `UGX ${MOCK_STATS.total_portfolio.toLocaleString()}`, icon: DollarSign, color: 'bg-blue-500', trend: `↑ ${MOCK_STATS.monthly_growth}% this month` },
    { title: 'Active Clients', value: MOCK_STATS.active_clients.toString(), icon: Users, color: 'bg-green-500', trend: '+12 new' },
    { title: 'Active Loans', value: MOCK_STATS.active_loans.toString(), icon: CreditCard, color: 'bg-purple-500', trend: '+5 this week' },
    { title: "Today's Collection", value: `UGX ${MOCK_STATS.today_collection.toLocaleString()}`, icon: Receipt, color: 'bg-orange-500', trend: 'Target: UGX 5M' },
    { title: 'Overdue Loans', value: MOCK_STATS.overdue_loans.toString(), icon: AlertCircle, color: 'bg-red-500', trend: `${MOCK_STATS.portfolio_at_risk}% of portfolio` },
    { title: 'Pending Applications', value: MOCK_STATS.pending_applications.toString(), icon: FileText, color: 'bg-yellow-500', trend: `${MOCK_STATS.approval_rate}% approval rate` },
  ];

  const quickActions = [
    { title: 'Create New Loan', description: 'Process loan application', icon: DollarSign, color: 'bg-green-50 hover:bg-green-100', iconColor: 'text-green-600', href: '/dashboard/loans/create' },
    { title: 'Add New Client', description: 'Register new borrower', icon: Users, color: 'bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600', href: '/dashboard/clients/create' },
    { title: 'Record Payment', description: 'Log client payment', icon: CreditCard, color: 'bg-purple-50 hover:bg-purple-100', iconColor: 'text-purple-600', href: '/dashboard/payments/create' },
    { title: 'View Reports', description: 'Check performance', icon: Shield, color: 'bg-orange-50 hover:bg-orange-100', iconColor: 'text-orange-600', href: '/dashboard/reports' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Admin User!</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">Here's what's happening with your lending business today.</p>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">Admin</span>
            <button 
              onClick={() => setShowAdminMetrics(!showAdminMetrics)}
              className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors flex items-center gap-1 font-medium"
            >
              {showAdminMetrics ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showAdminMetrics ? 'Hide Admin' : 'Show Admin'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Admin Metrics Panel */}
      {showAdminMetrics && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Admin Governance Pulse</h2>
            <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full">Policy 2026-01-10</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AdminMetricCard title="Total Outstanding" value={`UGX ${MOCK_ADMIN_METRICS.totalOutstandingBalance.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
            <AdminMetricCard title="PAR 30 (At Risk)" value={`${MOCK_ADMIN_METRICS.par30} Riders`} icon={AlertCircle} color="bg-red-500" />
            <AdminMetricCard title="Admin Reversals" value={MOCK_ADMIN_METRICS.adminReversals.toString()} icon={Shield} color="bg-amber-500" />
            <AdminMetricCard title="Staff Collections" value={MOCK_ADMIN_METRICS.staffCollections.toString()} icon={TrendingUp} color="bg-emerald-500" />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.trend && <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>}
              </div>
              <div className={`${stat.color} p-2.5 rounded-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/activities" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {MOCK_ACTIVITIES.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.details}</p>
                    <p className="text-xs text-gray-400 mt-1">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-3">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-lg ${action.color} transition-colors group`}
              >
                <div className={`p-2 rounded-md ${action.iconColor} bg-white shadow-sm group-hover:shadow transition-shadow`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{action.title}</p>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
                <Plus className="h-4 w-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminMetricCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`${color} p-2 rounded-md`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}