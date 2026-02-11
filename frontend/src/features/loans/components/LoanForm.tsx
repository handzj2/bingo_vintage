'use client';

import { useState, useEffect } from 'react';
import { calculateCashLoan, calculateBikeLoan } from '../loan.utils';
import { Banknote, Bike, Calculator, ShieldCheck, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';

type LoanType = 'cash' | 'bike';

interface LoanFormProps {
  clientId?: string;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function LoanForm({ clientId, onSubmit, isSubmitting = false }: LoanFormProps) {
  const [loanType, setLoanType] = useState<LoanType>('cash');
  const [notes, setNotes] = useState('');
  
  // Cash loan inputs
  const [principal, setPrincipal] = useState(1000000);
  const [monthlyRate, setMonthlyRate] = useState(15);
  const [termMonths, setTermMonths] = useState(12);
  
  // Bike loan inputs
  const [bikePrice, setBikePrice] = useState(5500000);
  const [deposit, setDeposit] = useState(1500000);
  const [weeklyRate, setWeeklyRate] = useState(10);
  const [termWeeks, setTermWeeks] = useState(52);
  
  const [calculation, setCalculation] = useState<any>({});

  // Calculate on input change
  useEffect(() => {
    if (loanType === 'cash') {
      setCalculation(calculateCashLoan(principal, monthlyRate, termMonths));
    } else {
      setCalculation(calculateBikeLoan(bikePrice, deposit, weeklyRate, termWeeks));
    }
  }, [loanType, principal, bikePrice, deposit, monthlyRate, weeklyRate, termMonths, termWeeks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      toast.error('Policy [2026-01-10]: Justification note is required');
      return;
    }

    const payload = {
      clientId: clientId || 'temp-client-id',
      loanType: loanType.toUpperCase(),
      principalAmount: loanType === 'cash' ? principal : (bikePrice - deposit),
      interestRate: loanType === 'cash' ? monthlyRate / 100 : weeklyRate / 100,
      term_months: loanType === 'cash' ? termMonths : undefined,
      term_weeks: loanType === 'bike' ? termWeeks : undefined,
      deposit: loanType === 'bike' ? deposit : 0,
      notes: `[2026-01-10]: ${notes}`,
      loan_number: `LN-${Date.now()}`,
      start_date: new Date().toISOString()
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Type Switcher */}
      <div className="flex p-1.5 bg-gray-100 rounded-xl max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setLoanType('cash')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
            loanType === 'cash' 
              ? 'bg-white shadow-md text-blue-600' 
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          <Banknote className="w-5 h-5" /> Cash Loan
        </button>
        <button
          type="button"
          onClick={() => setLoanType('bike')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
            loanType === 'bike' 
              ? 'bg-white shadow-md text-orange-600' 
              : 'text-gray-500 hover:text-orange-600'
          }`}
        >
          <Bike className="w-5 h-5" /> Bike Loan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Calculator className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Loan Parameters</span>
          </div>

          {loanType === 'cash' ? (
            <div className="space-y-4">
              <div>
                <Label>Principal Amount (UGX)</Label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="text-2xl font-bold text-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Interest Rate (%)</Label>
                  <input
                    type="number"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Term (Months)</Label>
                  <input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bike Price (UGX)</Label>
                  <input
                    type="number"
                    value={bikePrice}
                    onChange={(e) => setBikePrice(Number(e.target.value))}
                    className="font-bold text-orange-600"
                  />
                </div>
                <div>
                  <Label>Deposit (UGX)</Label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weekly Interest Rate (%)</Label>
                  <input
                    type="number"
                    value={weeklyRate}
                    onChange={(e) => setWeeklyRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Term (Weeks)</Label>
                  <input
                    type="number"
                    value={termWeeks}
                    onChange={(e) => setTermWeeks(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calculation Summary */}
        <Card className={`${
          loanType === 'cash' 
            ? 'bg-gradient-to-br from-blue-600 to-blue-800' 
            : 'bg-gradient-to-br from-orange-500 to-orange-700'
        } text-white`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calculator className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase opacity-70">
                {loanType === 'cash' ? 'Monthly' : 'Weekly'} Payment
              </span>
            </div>
            
            <div>
              <p className="text-3xl font-black">
                {Math.round(calculation.installment || 0).toLocaleString()} 
                <span className="text-lg opacity-60 ml-1">UGX</span>
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/20 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Principal</span>
                <span className="font-bold">{calculation.principalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Total Interest</span>
                <span className="font-bold">{Math.round(calculation.totalInterest || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total Payable</span>
                <span>{Math.round(calculation.totalPayable || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Section */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wider">Policy [2026-01-10] Audit Trail</span>
        </div>
        <div>
          <Label className="text-red-700">Justification Note (Required)</Label>
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain the purpose of this loan disbursement. This note is immutable and linked to your staff ID."
            className="w-full p-3 bg-white border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none h-24"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !notes.trim()}
          className="gap-2"
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <><Save className="w-4 h-4" /> Create Loan</>
          )}
        </Button>
      </div>
    </form>
  );
}