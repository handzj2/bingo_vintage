"use client";

import { useEffect, useState } from "react";
import { getPayments } from "./payments.api";
import { Payment } from "./payments.types";
import { Plus, Banknote, ShieldCheck, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import RepaymentModal from "./components/RepaymentModal";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      setPayments(data);
    } catch (error) {
      console.error("Ledger Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* 🔙 Navigation Back */}
      <button 
        onClick={() => window.history.back()} 
        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all group"
      >
        <div className="p-2 rounded-full group-hover:bg-blue-50">
          <Plus className="w-4 h-4 rotate-45" /> {/* Using Plus rotated as an 'X' or back arrow */}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">
          Back to Dashboard
        </span>
      </button>

      {/* --- Action Header with Search --- */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic flex items-center gap-2 uppercase">
              <Banknote className="text-blue-600" /> Repayment Desk
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register Weekly Installments & Loan Pays</p>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-2xl shadow-lg flex gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-black uppercase text-sm">New Payment</span>
          </Button>
        </div>

        {/* 🔎 New Client/Loan Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search Client Name or Loan ID (e.g. BIK-042)..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* --- The Ledger --- */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Audit Log [cite: 2026-01-10]
          </span>
          <button onClick={fetchLedger} className="text-slate-400 hover:text-blue-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 font-bold uppercase text-[10px]">Client / Loan</th>
              <th className="text-left px-6 py-4 font-bold uppercase text-[10px]">Amount</th>
              <th className="text-left px-6 py-4 font-bold uppercase text-[10px]">Method</th>
              <th className="text-left px-6 py-4 font-bold uppercase text-[10px]">Staff</th>
              <th className="text-left px-6 py-4 font-bold uppercase text-[10px]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-medium">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                  No payments recorded in today's ledger.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-blue-700 font-bold text-xs tracking-tighter">#LN-{payment.loan_id}</span>
                      {/* 🎨 Solid Color Badges */}
                      <span className={`text-[10px] font-black w-fit px-3 py-1 rounded-md uppercase text-white shadow-sm ${
                        payment.loan_type === 'BIKE' 
                          ? 'bg-orange-600' // Solid Orange for Bikes
                          : 'bg-emerald-600' // Solid Emerald for Cash
                      }`}>
                        {payment.loan_type === 'BIKE' ? '🏍️ BIKE' : '💵 CASH'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 text-base">
                    UGX {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {/* Solid Method Badge */}
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase text-white ${
                      payment.payment_method === 'MTNmomo' ? 'bg-yellow-500 text-black' : 'bg-slate-800'
                    }`}>
                      {payment.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Staff-{payment.recorded_by}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium text-xs">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
             <RepaymentModal 
                onClose={() => setIsModalOpen(false)}
                onSave={async () => {
                  await fetchLedger();
                  setIsModalOpen(false);
                }}
                loan={{ id: "SEARCHED_ID", client_name: searchQuery || "Active Borrower" }} 
                user={{ id: "1" }}
             />
          </div>
        </div>
      )}
    </div>
  );
}