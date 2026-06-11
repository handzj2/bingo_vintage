import type { Payment } from "@/shared/api-types";
import { Bike, Banknote } from "lucide-react";

export default function PaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="text-left px-6 py-5 font-bold uppercase text-[10px] tracking-widest">Asset Type</th>
            <th className="text-left px-6 py-5 font-bold uppercase text-[10px] tracking-widest">Amount (UGX)</th>
            <th className="text-left px-6 py-5 font-bold uppercase text-[10px] tracking-widest">Method</th>
            <th className="text-right px-6 py-5 font-bold uppercase text-[10px] tracking-widest">Staff / Audit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {payments.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-12 text-slate-400 font-bold uppercase text-xs tracking-widest">
                No payments recorded in today's ledger.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  {/* SOLID COLOR BADGES */}
                  <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black text-white shadow-sm flex items-center gap-2 w-fit uppercase ${
                    p.receipt_number ? 'bg-emerald-600' : 'bg-slate-600'
                  }`}>
                    {<Banknote className="w-3 h-3" />}
                    {p.receipt_number ?? 'Payment'}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-slate-900 text-base italic group-hover:text-blue-600">
                  {p.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-800 text-white px-3 py-1 rounded text-[9px] font-black uppercase">
                    {p.payment_method}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{p.collected_by ?? 'Staff'}</span>
                    <span className="text-[9px] font-bold text-slate-400 italic">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}