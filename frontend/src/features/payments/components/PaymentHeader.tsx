import { Banknote, Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  onRecordClick: () => void;
}

export default function PaymentHeader({ onRecordClick }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* 🔙 Solid Navigation Back */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md w-fit font-black text-[10px] uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 italic flex items-center gap-2 uppercase tracking-tighter">
            <Banknote className="text-blue-600" /> REPAYMENT DESK
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Management & Audit Ledger</p>
        </div>
        
        <Button onClick={onRecordClick} className="bg-blue-600 h-14 px-8 rounded-2xl shadow-lg flex gap-2">
          <Plus className="w-5 h-5" />
          <span className="font-black uppercase text-sm tracking-tighter">Record New Payment</span>
        </Button>
      </div>
    </div>
  );
}