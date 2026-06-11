"use client";

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { Shield, AlertTriangle, RotateCcw } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  receiptNumber: string;
  status: string;
}

interface Props {
  payment: Payment;
  loanId: string;
  onClose: () => void;
}

export function PaymentReversalModal({ payment, loanId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const reversal = useMutation({
    mutationFn: async () => {
      // 👈 CORRECT: Reversing specific Payment ID, not Loan ID
      return api.post(`/payments/${payment.id}/reverse`, {
        reason: reason,
        adminUser: null // Backend gets user from JWT via @Req()
      });
    },
    onSuccess: () => {
      toast.success('Payment reversed and audit trail created');
      // 👈 Invalidate both payments and loan data
      queryClient.invalidateQueries({ queryKey: ['payments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Reversal failed');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <Shield className="w-6 h-6" />
          <h2 className="text-lg font-bold">ADMIN REVERSAL [2026-01-10]</h2>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Critical Financial Action</p>
              <p>Receipt: {payment.receiptNumber}</p>
              <p>Amount: ${payment.amount}</p>
              <p>This will restore the balance to the loan.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Reversal Reason (Required for Audit)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              rows={3}
              placeholder="e.g., Incorrect amount entered, duplicate payment..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/500 characters (min 10 required)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              disabled={reversal.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => reversal.mutate()}
              disabled={reason.length < 10 || reversal.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {reversal.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Confirm Reversal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}