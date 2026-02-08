// src/app/dashboard/loans/page.tsx
'use client';

import { useState } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

// Mock data
const MOCK_LOANS = [
  { id: '1', loan_number: 'LN-2024-001', client_name: 'John Ochieng', client_phone: '+256 712 345 678', type: 'cash', amount: 5000000, outstanding: 3200000, status: 'active', days_overdue: 0, created_at: '2024-01-15' },
  { id: '2', loan_number: 'LN-2024-002', client_name: 'Sarah Nakato', client_phone: '+256 723 456 789', type: 'bike', amount: 8500000, outstanding: 6800000, status: 'active', days_overdue: 5, created_at: '2024-01-10' },
  { id: '3', loan_number: 'LN-2024-003', client_name: 'Mike Okello', client_phone: '+256 734 567 890', type: 'cash', amount: 3000000, outstanding: 0, status: 'completed', days_overdue: 0, created_at: '2023-12-20' },
  { id: '4', loan_number: 'LN-2024-004', client_name: 'Jane Akello', client_phone: '+256 745 678 901', type: 'emergency', amount: 1500000, outstanding: 1800000, status: 'overdue', days_overdue: 23, created_at: '2023-11-05' },
  { id: '5', loan_number: 'LN-2024-005', client_name: 'Robert Mugisha', client_phone: '+256 756 789 012', type: 'bike', amount: 12000000, outstanding: 9500000, status: 'active', days_overdue: 0, created_at: '2024-01-08' },
];

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredLoans = MOCK_LOANS.filter(loan => {
    const matchesSearch = loan.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      overdue: 'bg-red-100 text-red-700 border-red-200',
      completed: 'bg-blue-100 text-blue-700 border-blue-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600 mt-0.5">Manage all loan accounts and track repayments</p>
        </div>
        <Link 
          href="/dashboard/loans/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          New Loan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client name or loan number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4 text-gray-600" />
          More Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Loan Details</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Overdue</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLoans.map((loan) => (
              <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">{loan.loan_number}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{loan.type}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {loan.created_at}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{loan.client_name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {loan.client_phone}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">UGX {loan.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Outstanding: UGX {loan.outstanding.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusStyle(loan.status)}`}>
                    {loan.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {loan.days_overdue > 0 ? (
                    <span className="text-red-600 font-semibold">{loan.days_overdue} days</span>
                  ) : (
                    <span className="text-emerald-600 text-sm">On track</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-gray-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLoans.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No loans found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}