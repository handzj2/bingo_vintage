     'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Banknote, 
  Bike, 
  Plus, 
  Search, 
  Filter,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Users
} from 'lucide-react';

// Mock data - replace with your actual API call
const MOCK_LOANS = [
  { id: 'LN-2024-001', client_name: 'John Doe', loan_type: 'CASH', principal_amount: 5000000, status: 'active', outstanding_balance: 3000000, date: '2024-01-10' },
  { id: 'LN-2024-002', client_name: 'Jane Smith', loan_type: 'BIKE', principal_amount: 15000000, status: 'active', outstanding_balance: 12000000, date: '2024-01-11' },
  { id: 'LN-2024-003', client_name: 'Robert Johnson', loan_type: 'CASH', principal_amount: 2000000, status: 'overdue', outstanding_balance: 2000000, date: '2024-01-09' },
  { id: 'LN-2024-004', client_name: 'Sarah Williams', loan_type: 'BIKE', principal_amount: 12000000, status: 'active', outstanding_balance: 8000000, date: '2024-01-12' },
  { id: 'LN-2024-005', client_name: 'Michael Brown', loan_type: 'CASH', principal_amount: 3000000, status: 'pending', outstanding_balance: 3000000, date: '2024-01-15' },
  { id: 'LN-2024-006', client_name: 'Emily Davis', loan_type: 'BIKE', principal_amount: 18000000, status: 'active', outstanding_balance: 15000000, date: '2024-01-14' },
  { id: 'LN-2024-007', client_name: 'David Wilson', loan_type: 'CASH', principal_amount: 4000000, status: 'overdue', outstanding_balance: 4000000, date: '2024-01-08' },
  { id: 'LN-2024-008', client_name: 'Lisa Taylor', loan_type: 'BIKE', principal_amount: 10000000, status: 'active', outstanding_balance: 6000000, date: '2024-01-13' },
];

export default function LoansPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanType = searchParams.get('type') || 'all';
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setLoans(MOCK_LOANS);
      setLoading(false);
    }, 500);
  }, []);

  // Filter loans based on type, status, and search
  const filteredLoans = loans.filter(loan => {
    // Filter by loan type
    if (loanType !== 'all') {
      const typeMap: Record<string, string> = {
        'cash': 'CASH',
        'bike': 'BIKE'
      };
      if (loanType in typeMap && loan.loan_type !== typeMap[loanType]) {
        return false;
      }
    }
    
    // Filter by status
    if (statusFilter !== 'all' && loan.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        loan.id.toLowerCase().includes(term) ||
        loan.client_name.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  // Calculate stats based on filtered loans
  const stats = {
    total: filteredLoans.length,
    cash: filteredLoans.filter(l => l.loan_type === 'CASH').length,
    bike: filteredLoans.filter(l => l.loan_type === 'BIKE').length,
    outstanding: filteredLoans.reduce((sum: number, l: any) => sum + (l.outstanding_balance || 0), 0),
    active: filteredLoans.filter(l => l.status === 'active').length,
    overdue: filteredLoans.filter(l => l.status === 'overdue').length,
    pending: filteredLoans.filter(l => l.status === 'pending').length,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    
    const icons: Record<string, JSX.Element> = {
      active: <CheckCircle className="w-3 h-3" />,
      overdue: <XCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
    };
    
    const statusText = status?.toUpperCase() || 'UNKNOWN';
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {icons[status]}
        {statusText}
      </span>
    );
  };

  const getPageTitle = () => {
    switch (loanType) {
      case 'cash': return 'Cash Loans';
      case 'bike': return 'Bike Loans';
      default: return 'All Loans';
    }
  };

  const getPageDescription = () => {
    switch (loanType) {
      case 'cash': return 'Manage all cash-based loans';
      case 'bike': return 'Manage all bike-backed loans';
      default: return 'View and manage all loan types';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-600 mt-1">{getPageDescription()}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/dashboard/loans/create">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Loan
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Loans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loanType === 'all' ? 'All types' : loanType === 'cash' ? 'Cash only' : 'Bike only'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Cash Loans</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cash}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Active: {filteredLoans.filter(l => l.loan_type === 'CASH' && l.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Banknote className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Bike Loans</p>
                <p className="text-2xl font-bold text-orange-600">{stats.bike}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Active: {filteredLoans.filter(l => l.loan_type === 'BIKE' && l.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Bike className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  UGX {(stats.outstanding / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredLoans.length > 0 ? `${((stats.outstanding / filteredLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0)) * 100).toFixed(1)}% of principal` : 'No loans'}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by loan ID or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Loan Type Tabs */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => router.push('/dashboard/loans')}
                    className={`px-4 py-2 text-sm font-medium ${loanType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/loans?type=cash')}
                    className={`px-4 py-2 text-sm font-medium ${loanType === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/loans?type=bike')}
                    className={`px-4 py-2 text-sm font-medium ${loanType === 'bike' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    Bike
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                  <div className="flex gap-2">
                    {['all', 'active', 'overdue', 'pending'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${statusFilter === status ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredLoans.length} Loan{filteredLoans.length !== 1 ? 's' : ''} Found
            {loanType !== 'all' && ` (${loanType.charAt(0).toUpperCase() + loanType.slice(1)} only)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">Loading loans...</p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">No loans found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm || statusFilter !== 'all' || loanType !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Start by creating your first loan'}
                </p>
                {!searchTerm && statusFilter === 'all' && loanType === 'all' && (
                  <Link href="/dashboard/loans/create" className="mt-4 inline-block">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Create New Loan
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Principal</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Outstanding</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan: any) => (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm font-medium">
                        #{loan.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <span>{loan.client_name || loan.client_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={loan.loan_type === 'CASH' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                          {loan.loan_type === 'CASH' ? (
                            <Banknote className="w-3 h-3 mr-1" />
                          ) : (
                            <Bike className="w-3 h-3 mr-1" />
                          )}
                          {loan.loan_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        UGX {(loan.principal_amount || loan.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">UGX {(loan.outstanding_balance || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(loan.status)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{loan.date}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/loans/${loan.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}