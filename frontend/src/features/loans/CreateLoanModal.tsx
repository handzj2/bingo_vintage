'use client';

import { useState, useEffect } from 'react';
import { loanApi } from './loan.api';
import { calculateCashLoan, calculateBikeLoan } from './loan.utils';
import { Banknote, Bike, Calculator, ShieldCheck, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';

type LoanType = 'cash' | 'bike';

interface CreateLoanModalProps {
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  initialLoanType?: LoanType;   // pre-selects tab when opening from a typed context
}

export function CreateLoanModal({ onClose, onSuccess, clientId, initialLoanType }: CreateLoanModalProps) {
  // Pre-select loan type from caller (e.g. LoanTab CASH/BIKE filter tab)
  const [loanType, setLoanType] = useState<LoanType>(initialLoanType ?? 'cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (loanType === 'cash') {
      setCalculation(calculateCashLoan(principal, monthlyRate, termMonths));
    } else {
      setCalculation(calculateBikeLoan(bikePrice, deposit, weeklyRate, termWeeks));
    }
  }, [loanType, principal, bikePrice, deposit, monthlyRate, weeklyRate, termMonths, termWeeks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      toast.error('Policy [2026-01-10]: Justification note is required');
      return;
    }

    setIsSubmitting(true);

    try {
      /**
       * Payload aligned to ApplyLoanDto whitelist:
       *   clientId, bikeId?, loanType, amount, months, interestRate?, notes?
       *
       * loanType: state is already lowercase ('cash'|'bike') — matches LoanType enum values exactly.
       * start_date: omitted — optional, backend defaults to now().
       * notes: whitelisted in ApplyLoanDto.
       */
      const payload: Record<string, any> = {
        clientId:     Number(clientId) || undefined,
        loanType,                                                   // already 'cash' or 'bike'
        amount:       loanType === 'cash' ? principal : (bikePrice - deposit),
        months:       loanType === 'cash' ? termMonths : Math.ceil(termWeeks / 4),
        interestRate: loanType === 'cash' ? monthlyRate / 100 : weeklyRate / 100,
        notes:        `[2026-01-10]: ${notes}`,
      };

      await loanApi.applyCash(payload);
      toast.success('Loan created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Create New Loan</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Loan Type Switcher — shows which is selected */}
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
              <Banknote className="w-5 h-5" />
              Cash Loan
              {loanType === 'cash' && <span className="text-[10px] font-black ml-1">✓</span>}
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
              <Bike className="w-5 h-5" />
              Bike Loan
              {loanType === 'bike' && <span className="text-[10px] font-black ml-1">✓</span>}
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
                      className="text-2xl font-bold text-blue-600 w-full border rounded-lg p-3"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monthly Interest Rate (%)</Label>
                      <input
                        type="number"
                        value={monthlyRate}
                        onChange={(e) => setMonthlyRate(Number(e.target.value))}
                        className="w-full border rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <Label>Term (Months)</Label>
                      <input
                        type="number"
                        value={termMonths}
                        onChange={(e) => setTermMonths(Number(e.target.value))}
                        className="w-full border rounded-lg p-3"
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
                        className="font-bold text-orange-600 w-full border rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <Label>Deposit (UGX)</Label>
                      <input
                        type="number"
                        value={deposit}
                        onChange={(e) => setDeposit(Number(e.target.value))}
                        className="w-full border rounded-lg p-3"
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
                        className="w-full border rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <Label>Term (Weeks)</Label>
                      <input
                        type="number"
                        value={termWeeks}
                        onChange={(e) => setTermWeeks(Number(e.target.value))}
                        className="w-full border rounded-lg p-3"
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

          {/* Policy Note */}
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
                placeholder="Explain the purpose of this loan disbursement."
                className="w-full p-3 bg-white border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none h-24"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !notes.trim()} className="gap-2">
              {isSubmitting ? <>Processing...</> : <><Save className="w-4 h-4" /> Create Loan</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
