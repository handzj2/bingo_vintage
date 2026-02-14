'use client';

import { useState, useMemo } from 'react';
import { calculateCashLoan, calculateBikeLoan } from '../utils/calculations';
import { loanApi } from '../loan.api';
import { ShieldCheck, Save, Calculator, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ClientSearch from './ClientSearch';
import BikeSearch from '../../inventory/components/BikeSearch';
import LoanTypeSelector from './LoanTypeSelector';

export function LoanForm({ clientId, onSuccess }: { clientId: string, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loanType, setLoanType] = useState<'CASH' | 'BIKE'>('CASH');
  
  // Core State
  const [amount, setAmount] = useState(1000000);
  const [deposit, setDeposit] = useState(1500000);
  const [rate, setRate] = useState(15);
  const [term, setTerm] = useState(12);
  const [notes, setNotes] = useState('');
  
  // New stateful tracking for selected client and bike
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedBike, setSelectedBike] = useState<any>(null);

  // 1. Math Sync: Always matches backend logic
  const results = useMemo(() => {
    return loanType === 'CASH' 
      ? calculateCashLoan(amount, rate, term)
      : calculateBikeLoan(amount, deposit, rate, term);
  }, [loanType, amount, deposit, rate, term]);

  // 2. Submission Handler (Policy Locked)
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Policy [2026-01-10] Justification Check
    if (notes.trim().length < 15) {
      return toast.error("Policy Violation: Audit justification must be at least 15 characters.");
    }

    setLoading(true);
    try {
      const payload = {
        client_id: clientId,
        loan_type: loanType,
        principal_amount: loanType === 'CASH' ? amount : (amount - deposit),
        interest_rate: rate / 100,
        term_period: term, // Months for cash, Weeks for bike
        notes: `[POLICY 2026-01-10]: ${notes}`,
        start_date: new Date().toISOString()
      };

      await loanApi.createLoan(payload);
      toast.success("Disbursement Recorded and Locked.");
      onSuccess();
    } catch (error: any) {
      toast.error("API Connection Error: Could not post to Railway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePost} className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">
      <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button type="button" onClick={() => setLoanType('CASH')} className={`px-8 py-2.5 rounded-xl font-black text-xs transition-all ${loanType === 'CASH' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>CASH</button>
          <button type="button" onClick={() => setLoanType('BIKE')} className={`px-8 py-2.5 rounded-xl font-black text-xs transition-all ${loanType === 'BIKE' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>BIKE</button>
        </div>

        {/* Client Search Component */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Client</label>
          <ClientSearch 
            onSelect={(client) => setSelectedClient(client)} 
            selectedClient={selectedClient}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{loanType === 'CASH' ? 'Principal (UGX)' : 'Bike Sale Price'}</label>
          
          {/* Bike Search for BIKE loans */}
          {loanType === 'BIKE' && (
            <BikeSearch 
              onSelect={(bike) => {
                setSelectedBike(bike);
                setAmount(bike.current_value);
              }} 
              selectedBike={selectedBike} 
            />
          )}
          
          {/* Amount input - shown for CASH or when no bike selected */}
          {(loanType === 'CASH' || !selectedBike) && (
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))} 
              className="w-full p-6 bg-slate-50 rounded-3xl text-4xl font-black outline-none focus:ring-2 focus:ring-blue-500" 
            />
          )}
          
          {loanType === 'BIKE' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Deposit</label>
              <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400">RATE %</label>
              <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full bg-transparent text-xl font-bold outline-none" />
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{loanType === 'CASH' ? 'Months' : 'Weeks'}</label>
              <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full bg-transparent text-xl font-bold outline-none" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-red-50">
          <label className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase mb-3">
            <AlertCircle className="w-4 h-4" /> Audit Justification (Immutable)
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-5 bg-red-50/10 border border-red-100 rounded-2xl text-sm h-32 outline-none" placeholder="Explain the purpose of this disbursement..." />
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className={`p-10 rounded-[3rem] text-white shadow-xl flex-1 flex flex-col justify-between ${loanType === 'CASH' ? 'bg-blue-600' : 'bg-orange-600'}`}>
          <Calculator className="w-12 h-12 opacity-20" />
          <div>
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest font-mono">Installment</p>
            <h2 className="text-5xl font-black mt-2 tracking-tighter">
              {results.installment.toLocaleString()} <span className="text-sm opacity-50 uppercase font-mono tracking-normal">UGX</span>
            </h2>
            <p className="text-sm font-bold opacity-40 mt-2 italic">per {loanType === 'CASH' ? 'month' : 'week'}</p>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 space-y-4">
             <div className="flex justify-between items-center opacity-70">
               <span className="text-[10px] font-bold uppercase">Total Interest</span>
               <span className="font-black">{Math.round(results.totalInterest).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center text-2xl">
               <span className="font-bold opacity-80 uppercase text-xs">Total Payable</span>
               <span className="font-black border-b-2 border-white/30">{Math.round(results.totalPayable).toLocaleString()}</span>
             </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl">
          {loading ? "EXECUTING..." : "SAVE TO RAILWAY"}
          <Save className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200">
          <ShieldCheck className="w-5 h-5 text-slate-400" />
          <p className="text-[9px] leading-tight text-slate-500 font-bold uppercase font-mono italic">
            Entries are read-only for staff immediately after saving [Policy 2026-01-10].
          </p>
        </div>
      </div>
    </form>
  );
}