'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

interface ReversalModalProps {
  loan: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReversalModal({ loan, onClose, onSuccess }: ReversalModalProps) {
  const [reason, setReason] = useState('');
  const [newBalance, setNewBalance] = useState(loan.balance || 0);
  const [loading, setLoading] = useState(false);

  const handleReversal = async () => {
    // 2026-01-10 Policy: Justification must be substantial
    if (reason.length < 15) {
      toast.error("Please provide a more detailed justification (min 15 characters).");
      return;
    }

    setLoading(true);
    try {
      // Talking to the Backend API
      await api.post(`/loans/${loan.id}/reverse`, {
        reason: `[POLICY 2026-01-10]: ${reason}`,
        newBalance: Number(newBalance)
      });
      
      toast.success("Transaction successfully reversed/adjusted.");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Only admins can perform reversals.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
        {/* Header - Red color signals a critical Admin action */}
        <div className="bg-red-700 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-tight">Admin Policy Override</h3>
          </div>
          <button onClick={onClose} className="hover:bg-red-800 rounded-full p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 p-3 rounded flex gap-3 text-amber-800 text-xs border border-amber-200">
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600" />
            <p>
              <strong>Policy [2026-01-10] Enforcement:</strong> You are about to modify a locked transaction. This will be permanently logged in the audit timeline with your Admin ID.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Corrected Balance (UGX)</label>
            <input 
              type="number" 
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mandatory Justification</label>
            <textarea 
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this reversal is necessary (e.g., system error, double payment, admin correction)..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm italic"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button 
              className="flex-1 bg-red-700 hover:bg-red-800 text-white shadow-lg" 
              onClick={handleReversal}
              loading={loading}
            >
              {loading ? "Processing..." : "Confirm Override"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}