'use client';
// src/features/payments/components/RepaymentModal.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Bike, Banknote } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPayment, CreatePaymentPayload } from '../payments.api';
import type { PaymentMethod } from '@/shared/api-types';
import { api } from '@/lib/api/client';

export default function RepaymentModal({
  loan,
  onSave,
  onClose,
  user,
}: {
  loan: any;
  onSave: Function;
  onClose: () => void;
  user: { id: string | number };
}) {
  const [amount, setAmount]             = useState('');
  const [method, setMethod]             = useState<PaymentMethod>('CASH');
  const [notes, setNotes]               = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextScheduleId, setNextScheduleId] = useState<number | undefined>(undefined);

  // Task 3.2: fetch next pending installment so schedule_id can be sent with payment
  useEffect(() => {
    if (!loan?.id) return;
    api.get<any>(`/schedules/loan/${loan.id}`).then(res => {
      const schedules: any[] = res.data?.schedules ?? res.data ?? [];
      const next = schedules.find((s: any) =>
        s.status === 'PENDING' || s.status === 'PARTIAL' || s.status === 'OVERDUE'
      );
      if (next?.id) setNextScheduleId(next.id);
    }).catch(() => {});
  }, [loan?.id]);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePaymentPayload & { schedule_id?: number } = {
        loan_id: Number(loan.id),
        amount: Number(amount),
        payment_method: method,
        notes: notes || undefined,
        collected_by: String(user.id),
        // Task 3.2: link to schedule installment so loan_schedules.amount_paid updates
        ...(nextScheduleId ? { schedule_id: nextScheduleId } : {}),
      };

      await createPayment(payload);
      toast.success('Payment recorded successfully');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
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
          <p className="text-xs text-slate-500 font-bold mt-1">
            CLIENT: {loan.client_name || loan.client?.full_name || 'Active Borrower'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {([
            ['CASH',         'Cash'],
            ['Momo',         'MTN MoMo'],
            ['BANK_TRANSFER','Bank Transfer'],
            ['Airtelmoney',  'Airtel Money'],
          ] as [PaymentMethod, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                method === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-100 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
          Amount (UGX)
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 250000"
          className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any relevant notes..."
          className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}
