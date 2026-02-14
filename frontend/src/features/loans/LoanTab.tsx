'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Banknote, Bike, ShieldCheck, 
  Filter, AlertCircle, Eye, Loader2 
} from 'lucide-react';

// API & Types
import { loanApi } from './loan.api';

// Shared Components
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import StatusBadge from '@/components/ui/StatusBadge';

// Operational Modals
import { CreateLoanModal } from './CreateLoanModal';
import RepaymentModal from '@/features/payments/components/RepaymentModal';
import ReversalModal from '@/features/admin/components/ReversalModal';

export function LoanTab() {
  const router = useRouter();
  
  // -- State Management --
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'CASH' | 'BIKE'>('all');
  
  // -- Modal State --
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [modalType, setModalType] = useState<'payment' | 'reversal' | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data } = await loanApi.getLoans();
      setLoans(data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  // -- 1:1 Logic Parity: Search & Filter --
  const filteredLoans = useMemo(() => {
    return loans.filter((loan: any) => {
      const matchesSearch = loan.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            loan.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTab === 'all' || loan.loan_type === activeTab;
      return matchesSearch && matchesType;
    });
  }, [loans, searchQuery, activeTab]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 italic">
            <Banknote className="w-6 h-6 text-blue-600" /> LOAN PORTFOLIO
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Managing {loans.length} active disbursements
          </p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-6 rounded-2xl font-black transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> DISBURSE FUNDS
        </Button>
      </div>

      {/* 2. Controls Section (Search & Tabs) [Restored from 245-line version] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Search by name or ID..." 
            className="pl-11 py-6 rounded-2xl border-slate-100 bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="lg:col-span-8 flex justify-end">
          <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ALL LOANS
            </button>
            <button 
              onClick={() => setActiveTab('CASH')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'CASH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              CASH ONLY
            </button>
            <button 
              onClick={() => setActiveTab('BIKE')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'BIKE' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              BIKE ASSETS
            </button>
          </div>
        </div>
      </div>

      {/* 3. Data Table */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-bold uppercase">Syncing with Railway...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <AlertCircle className="w-8 h-8 opacity-20" />
              <p className="text-xs font-bold uppercase">No records found matching filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Borrower</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-center">Type</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Principal</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Outstanding</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Status</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLoans.map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-6">
                        <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{loan.client_name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Ref: {loan.id.split('-')[0]}</p>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center">
                          {loan.loan_type === 'CASH' ? 
                            <Banknote className="w-5 h-5 text-blue-500 opacity-40" /> : 
                            <Bike className="w-5 h-5 text-orange-500 opacity-40" />
                          }
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-bold text-slate-600">
                          {loan.principal_amount.toLocaleString()} <span className="text-[10px] opacity-50">UGX</span>
                        </span>
                      </td>
                      <td className="p-6">
                        {/* 1:1 Color Logic */}
                        <span className={`text-sm font-black ${loan.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {loan.outstanding_balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6">
                        <StatusBadge status={loan.status} />
                      </td>
                      <td className="p-6 text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                          className="rounded-xl hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                        </Button>
                        <button 
                          onClick={() => { setSelectedLoan(loan); setModalType('payment'); }}
                          className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedLoan(loan); setModalType('reversal'); }}
                          className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Modals --- */}
      {showCreate && (
        <CreateLoanModal 
          onClose={() => setShowCreate(false)} 
          onSuccess={() => { setShowCreate(false); fetchLoans(); }} 
        />
      )}

      {modalType === 'payment' && (
  <RepaymentModal 
    loan={selectedLoan} 
    onClose={() => setModalType(null)} 
    // 1. Rename onSuccess to onSave
    onSave={() => { 
      setModalType(null); 
      fetchLoans(); 
    }} 
    // 2. Add the mandatory user object required for the audit log
    user={{ id: 'system_admin' }} 
  />
)}

      {modalType === 'reversal' && (
        <ReversalModal 
          loan={selectedLoan} 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchLoans(); }} 
        />
      )}
    </div>
  );
}