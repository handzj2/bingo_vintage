import React, { useState } from 'react';
import { api } from '@/lib/api/client'; // FIX: was `import api from` (default) — client only has named export
import { safeDate } from '@/lib/utils';

export default function ExpenseApprovalPanel({ expenses, onAction }: any) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    await api.patch(`/expenses/${id}/approve`, {});
    setProcessingId(null);
    onAction();
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    await api.patch(`/expenses/${id}/reject`, {});
    setProcessingId(null);
    onAction();
  };

  if (!expenses.length) return <div className="text-gray-400 text-sm py-4">No pending expenses.</div>;

  return (
    <div className="space-y-4">
      {expenses.map((exp: any) => (
        <div key={exp.id} className="border border-gray-200 rounded-xl p-4">
          <div className="font-medium">Amount: {exp.amount}</div>
          <div className="text-sm text-gray-600">Category: {exp.category?.name ?? exp.categoryId}</div>
          <div className="text-sm text-gray-600">{exp.description}</div>
          <div className="text-xs text-gray-400">Requested: {safeDate(exp.createdAt ?? exp.created_at)}</div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleApprove(exp.id)}
              disabled={processingId === exp.id}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              {processingId === exp.id ? '…' : 'Approve'}
            </button>
            <button
              onClick={() => handleReject(exp.id)}
              disabled={processingId === exp.id}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              {processingId === exp.id ? '…' : 'Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
