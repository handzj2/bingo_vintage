'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Lock, CheckCircle, Bike, Banknote } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPayment, CreatePaymentPayload } from '../payments.api';

export default function RepaymentModal({ loan, onSave, onClose, user }: { 
  loan: any, // Expected to have .id and optionally .loan_type
  onSave: Function, 
  onClose: () => void,
  user: { id: string }
}) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'cash' | 'MTNmomo' | 'bank'>('cash');
  // Manual selection for loan type (default to loan's type or 'BIKE')
  const [selectedType, setSelectedType] = useState<'BIKE' | 'CASH'>(loan?.loan_type || 'BIKE');
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    
    if (!justification || justification.length < 5) {
      toast.error("Please provide a justification (min 5 characters) for the audit log.");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData: CreatePaymentPayload = {
        loan_id: Number(loan.id),
        loan_type: selectedType, // 👈 Sends BIKE or CASH to the API
        amount: Number(amount),
        payment_method: method,
        justification: justification, // Policy [cite: 2026-01-10]
        recorded_by: Number(user.id)
      };

      await createPayment(paymentData);
      toast.success("Payment recorded and audited");
      onSave(); // Notify parent to refresh ledger
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <CheckCircle className="text-green-600" /> Record Payment
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">CLIENT: {loan.client_name || 'Active Borrower'}</p>
        </div>
      </div>
      
      {/* Selector for Bike vs Cash */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Select Transaction Type</label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => setSelectedType('BIKE')}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              selectedType === 'BIKE' 
              ? 'border-orange-500 bg-orange-50 text-orange-700' 
              : 'border-slate-100 text-slate-400 opacity-50'
            }`}
          >
            <Bike className="w-6 h-6" />
            <span className="font-black text-[10px] uppercase">Bike Installment</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('CASH')}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              selectedType === 'CASH' 
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
              : 'border-slate-100 text-slate-400 opacity-50'
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span className="font-black text-[10px] uppercase">Cash Repayment</span>
          </button>
        </div>
      </div>
      
      {/* Amount Input */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 uppercase">Amount (UGX)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full p-3 text-lg border rounded-xl mt-1 focus:ring-2 focus:ring-blue-200 outline-none"
        />
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 uppercase">Method</label>
        <div className="flex gap-2 mt-1">
          {['cash', 'MTNmomo', 'bank'].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m as any)}
              className={`flex-1 p-3 text-sm font-bold uppercase rounded-xl border transition ${
                method === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Governance Enforcement */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
        <label className="text-[10px] font-bold text-blue-600 uppercase">Mandatory Justification</label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="e.g., Weekly installment for Jan Week 2"
          className="w-full p-3 text-sm border-blue-200 rounded-lg mt-1 bg-white outline-none"
          rows={3}
        />
        <div className="flex items-center gap-2 mt-2">
          <Lock className="w-3 h-3 text-blue-400" />
          <p className="text-[9px] text-blue-400 italic">This entry is immutable [cite: 2026-01-10]. Verify details before confirming.</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 py-6 text-md font-black shadow-xl bg-blue-700 hover:bg-blue-800 text-white rounded-2xl"
          loading={isSubmitting}
          disabled={!amount || Number(amount) <= 0 || justification.length < 5}
        >
          Confirm & Lock Entry
        </Button>
      </div>
    </div>
  );
}