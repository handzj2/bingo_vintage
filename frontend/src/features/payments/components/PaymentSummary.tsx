import type { Payment } from "@/shared/api-types";

export default function PaymentSummary({ payments }: { payments: Payment[] }) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const todayStr = new Date().toLocaleDateString();
  const todayTotal = payments
    .filter(p => new Date(p.created_at).toLocaleDateString() === todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collected</p>
        <p className="text-2xl font-black text-slate-900 mt-1">UGX {total.toLocaleString()}</p>
      </div>
      
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Collected Today</p>
        <p className="text-2xl font-black text-emerald-600 mt-1">UGX {todayTotal.toLocaleString()}</p>
      </div>
      
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{payments.length}</p>
      </div>
    </div>
  );
}