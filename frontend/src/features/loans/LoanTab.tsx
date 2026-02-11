'use client';
import { CreateLoanModal } from './CreateLoanModal';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loanApi } from './loan.api';
import { LoanType } from './loan.types';
import { calculateCashLoan, calculateBikeLoan } from './loan.utils';
import { 
  Banknote, Bike, Plus, Search, Filter, 
  MoreHorizontal, AlertCircle, CheckCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

// Types for UI
interface Loan {
  id: string;
  client_name: string;
  loan_type: LoanType;
  principal_amount: number;
  total_payable: number;
  outstanding_balance: number;
  status: string;
  start_date: string;
}

export function LoanTab() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cash' | 'bike'>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      // Using existing API - assumes you have a list endpoint
      // If not, we'll adapt to what you have
      const response = await loanApi.getOverdueReport(); // Placeholder - replace with actual list endpoint
      setLoans(response.data || []);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      // Mock data for development
      setLoans([
        {
          id: '1',
          client_name: 'John Doe',
          loan_type: 'CASH',
          principal_amount: 1000000,
          total_payable: 1150000,
          outstanding_balance: 800000,
          status: 'active',
          start_date: '2024-01-15'
        },
        {
          id: '2',
          client_name: 'Jane Smith',
          loan_type: 'BIKE',
          principal_amount: 4000000,
          total_payable: 4800000,
          outstanding_balance: 3200000,
          status: 'active',
          start_date: '2024-02-01'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesFilter = filter === 'all' || loan.loan_type.toLowerCase() === filter;
    const matchesSearch = loan.client_name.toLowerCase().includes(search.toLowerCase()) ||
                         loan.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: loans.length,
    cash: loans.filter(l => l.loan_type === 'CASH').length,
    bike: loans.filter(l => l.loan_type === 'BIKE').length,
    outstanding: loans.reduce((sum, l) => sum + l.outstanding_balance, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Loans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Banknote className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cash Loans</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cash}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Banknote className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bike Loans</p>
                <p className="text-2xl font-bold text-orange-600">{stats.bike}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Bike className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  UGX {(stats.outstanding / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'cash' ? 'default' : 'outline'}
            onClick={() => setFilter('cash')}
            className="gap-2"
          >
            <Banknote className="w-4 h-4" /> Cash
          </Button>
          <Button 
            variant={filter === 'bike' ? 'default' : 'outline'}
            onClick={() => setFilter('bike')}
            className="gap-2"
          >
            <Bike className="w-4 h-4" /> Bike
          </Button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Search loans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Loan
          </Button>
        </div>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No loans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Principal</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Outstanding</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{loan.client_name}</div>
                        <div className="text-sm text-gray-500">#{loan.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={loan.loan_type === 'CASH' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                          {loan.loan_type === 'CASH' ? <Banknote className="w-3 h-3 mr-1" /> : <Bike className="w-3 h-3 mr-1" />}
                          {loan.loan_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        UGX {loan.principal_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={loan.outstanding_balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          UGX {loan.outstanding_balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                          {loan.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Loan Modal */}
      {showCreateModal && (
        <CreateLoanModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchLoans();
          }}
        />
      )}
    </div>
  );
}