'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, Plus, X, Search, RefreshCw, CheckCircle, AlertCircle,
  Receipt, TrendingUp, Calendar, Clock, RotateCcw, Loader2,
  Wallet, CreditCard, Smartphone, Building2, BadgeCheck, Eye,
  ArrowUpRight, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(), ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Request failed: ${res.status}`);
  return json;
};

const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: any) => d ? new Date(d).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' }) : '';
const genReceipt = () => `BV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const clientName = (c: any) => c ? `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() : null;
const loanNum = (p: any) => p.loan?.loanNumber || p.loan?.loan_number || `#${p.loanId || p.loan_id}`;

const METHODS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH:          { label: 'Cash',          icon: Wallet,     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  Momo:          { label: 'MTN MoMo',      icon: Smartphone, color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200' },
  BANK_TRANSFER: { label: 'Bank Transfer', icon: Building2,  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  Airtelmoney:   { label: 'Airtel Money',  icon: CreditCard, color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
};

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  COMPLETED:          { label: 'Completed',       color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING:            { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-400' },
  REVERSED:           { label: 'Reversed',         color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400'   },
  REVERSAL_REQUESTED: { label: 'Rev. Requested',   color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400' },
  FAILED:             { label: 'Failed',           color: 'bg-red-100 text-red-700',         dot: 'bg-red-500'    },
};

// ── Modal Shell ───────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-4 flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────
function RecordPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loanSchedule, setLoanSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toTimeString().slice(0, 5),
    receipt_number: genReceipt(),
    collected_by: '',
    notes: '',
  });

  useEffect(() => {
    setLoading(true);
    apiFetch('/loans?status=ACTIVE')
      .then(r => setAllLoans(Array.isArray(r) ? r : r.data || r.loans || []))
      .catch(() => setAllLoans([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedLoan) { setLoanSchedule(null); return; }
    apiFetch(`/schedules/loan/${selectedLoan.id}`)
      .then(d => setLoanSchedule(d))
      .catch(() => setLoanSchedule(null));
  }, [selectedLoan]);

  const clients: any[] = (() => {
    const seen = new Set<number>();
    const list: any[] = [];
    allLoans.forEach(l => {
      if (l.client && !seen.has(l.client.id)) { seen.add(l.client.id); list.push(l.client); }
    });
    return list;
  })();

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    const name = clientName(c)?.toLowerCase() || '';
    return !q || name.includes(q) || (c.phone || '').includes(q);
  });

  const clientLoans = selectedClient ? allLoans.filter(l => l.client?.id === selectedClient.id) : [];

  const nextDue = loanSchedule?.schedules?.find((s: any) => s.status === 'PENDING' || s.status === 'PARTIAL');
  // Phase 5.3: dual-read camelCase + snake_case — schedule service may return either format
  const suggestedAmount = nextDue
    ? Math.max(0,
        Number(nextDue.amountDue ?? nextDue.amount_due ?? 0) -
        Number(nextDue.amountPaid ?? nextDue.amount_paid ?? 0)
      )
    : Number(selectedLoan?.balance || 0);

  const handleSubmit = async () => {
    if (!selectedLoan) return setError('Please select a loan');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    if (!form.receipt_number.trim()) return setError('Receipt number is required');
    setError(''); setSubmitting(true);
    try {
      const dt = new Date(`${form.payment_date}T${form.payment_time}`);
      const result = await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          loan_id: selectedLoan.id,
          amount: Number(form.amount),
          payment_method: form.payment_method,
          receipt_number: form.receipt_number,
          payment_date: dt.toISOString(),
          collected_by: form.collected_by || undefined,
          notes: form.notes || undefined,
          // Phase 3.2: link payment to schedule so installment status updates
          schedule_id: nextDue?.id || undefined,
        }),
      });
      setSuccess(result);
      setTimeout(() => { onSaved(); onClose(); }, 2200);
    } catch (e: any) {
      setError(e.message || 'Failed to record payment');
    } finally { setSubmitting(false); }
  };

  if (success) return (
    <Modal title="" onClose={onClose}>
      <div className="py-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BadgeCheck className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Payment Recorded!</h3>
        <p className="text-sm text-gray-500 mt-1">Transaction saved successfully</p>
        <div className="mt-5 bg-gray-50 rounded-2xl p-4 text-left space-y-2.5">
          {[
            ['Receipt', <span className="font-mono font-black text-gray-900">{success.receiptNumber || form.receipt_number}</span>],
            ['Amount', <span className="font-black text-emerald-700">{fmt(form.amount)}</span>],
            ['New Balance', <span className="font-black text-gray-900">{fmt(success.newBalance)}</span>],
          ].map(([label, val]: any) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{label}</span>{val}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal title="Record Payment" subtitle="Enter payment details below" onClose={onClose} wide>
      {/* Step tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {[{ n: 1, label: '1. Select Client' }, { n: 2, label: '2. Payment Details' }].map(({ n, label }) => (
          <button key={n} onClick={() => n === 1 && setStep(1)}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${step === n ? 'bg-white shadow text-blue-700' : 'text-gray-400'}`}>
            {step > n ? `✓ ${label.slice(3)}` : label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* STEP 1 — Client selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or phone..." value={clientSearch}
              onChange={e => setClientSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">{clientSearch ? 'No clients match' : 'No clients with active loans'}</p>
            ) : filteredClients.map(c => {
              const loans = allLoans.filter(l => l.client?.id === c.id);
              const bal = loans.reduce((s: number, l: any) => s + Number(l.balance || 0), 0);
              return (
                <button key={c.id} onClick={() => { setSelectedClient(c); setStep(2); }}
                  className="w-full text-left px-4 py-4 hover:bg-blue-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm">
                      {(c.firstName || c.first_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{clientName(c)}</p>
                      <p className="text-xs text-gray-400">{c.phone} · {loans.length} loan{loans.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-red-600">{fmt(bal)}</p>
                    <p className="text-xs text-gray-400">balance</p>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      )}

      {/* STEP 2 — Payment form */}
      {step === 2 && selectedClient && (
        <div className="space-y-5">
          {/* Client bar */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                {(selectedClient.firstName || selectedClient.first_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">{clientName(selectedClient)}</p>
                <p className="text-xs text-gray-500">{selectedClient.phone}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedClient(null); setSelectedLoan(null); setStep(1); }}
              className="text-xs text-blue-600 font-bold hover:underline">Change</button>
          </div>

          {/* Loan picker */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Select Loan *</label>
            <div className="space-y-2">
              {clientLoans.map((l: any) => {
                const sel = selectedLoan?.id === l.id;
                return (
                  <button key={l.id} onClick={() => setSelectedLoan(sel ? null : l)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${sel ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-900 text-sm">{l.loanNumber || l.loan_number}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${l.loanType === 'bike' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {l.loanType === 'bike' ? '🏍 Bike' : '💵 Cash'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Balance: <span className="font-black text-red-600">{fmt(l.balance)}</span></p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${sel ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                        {sel && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                    {sel && nextDue && (
                      <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-600 font-semibold">Next: Instalment #{nextDue.installmentNumber}</span>
                          <span className="font-black text-blue-700">{fmt(suggestedAmount)} remaining</span>
                        </div>
                        {nextDue.dueDate && <p className="text-xs text-blue-500">Due: {fmtDate(nextDue.dueDate)}</p>}
                        <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, amount: String(suggestedAmount) })); }}
                          className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 transition-colors">
                          Use {fmt(suggestedAmount)} (suggested)
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Amount (UGX) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">UGX</span>
              <input type="number" min="0"
                className="w-full border-2 border-gray-200 rounded-xl pl-14 pr-4 py-3.5 text-2xl font-black focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="0" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            {selectedLoan && form.amount && Number(form.amount) > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${Number(form.amount) > Number(selectedLoan.balance) ? 'text-orange-600' : 'text-emerald-600'}`}>
                {Number(form.amount) > Number(selectedLoan.balance)
                  ? `⚠️ Exceeds balance by ${fmt(Number(form.amount) - Number(selectedLoan.balance))}`
                  : `✓ New balance: ${fmt(Number(selectedLoan.balance) - Number(form.amount))}`}
              </p>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Payment Method *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(METHODS).map(([val, cfg]) => {
                const Icon = cfg.icon;
                const active = form.payment_method === val;
                return (
                  <button key={val} onClick={() => setForm({ ...form, payment_method: val })}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all ${active ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Payment Date *</label>
              <input type="date"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
                value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Time</label>
              <input type="time"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
                value={form.payment_time} onChange={e => setForm({ ...form, payment_time: e.target.value })} />
            </div>
          </div>

          {/* Receipt number */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Receipt Number *</label>
            <div className="flex gap-2">
              <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
              <button onClick={() => setForm({ ...form, receipt_number: genReceipt() })}
                className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {/* Collected by */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Collected By</label>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Staff name (optional)" value={form.collected_by}
              onChange={e => setForm({ ...form, collected_by: e.target.value })} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="e.g. Week 3 instalment..." value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep(1); setSelectedLoan(null); setLoanSchedule(null); }}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">← Back</button>
            <button onClick={handleSubmit} disabled={submitting || !selectedLoan || !form.amount || Number(form.amount) <= 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Payment Detail Modal ──────────────────────────────────────
function PaymentDetailModal({ payment, onClose, onReverse }: { payment: any; onClose: () => void; onReverse: () => void }) {
  const pm = payment.paymentMethod || payment.payment_method;
  const method = METHODS[pm] || { label: pm, icon: Wallet, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
  const Icon = method.icon;
  const isReversed = payment.status === 'REVERSED';
  const payDate = payment.paymentDate || payment.payment_date || payment.createdAt;
  const cn = clientName(payment.loan?.client);
  const receipt = payment.receiptNumber || payment.receipt_number;

  const rows = [
    ['Receipt Number', <span className="font-mono font-black text-gray-900">{receipt}</span>],
    ['Loan', loanNum(payment)],
    ['Client', cn || '—'],
    ['Payment Method', <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${method.bg} ${method.color}`}><Icon className="w-3.5 h-3.5" />{method.label}</span>],
    ['Date', fmtDate(payDate)],
    ['Time', fmtTime(payDate)],
    ['Collected By', payment.collectedBy || payment.collected_by || '—'],
    ['Notes', payment.notes || '—'],
    ...(isReversed ? [
      ['Reversed At', fmtDate(payment.reversedAt || payment.reversed_at)],
      ['Reversal Reason', <span className="text-red-600">{payment.reversalReason || payment.reversal_reason}</span>],
      ['Reversed By', payment.reversedBy || payment.reversed_by || '—'],
    ] : []),
  ];

  return (
    <Modal title="Transaction Detail" subtitle={`Receipt: ${receipt}`} onClose={onClose}>
      <div className="space-y-5">
        <div className={`rounded-2xl p-6 text-center ${isReversed ? 'bg-gray-50' : 'bg-gradient-to-br from-emerald-50 to-green-100'}`}>
          <p className={`text-4xl font-black tracking-tight ${isReversed ? 'line-through text-gray-400' : 'text-emerald-700'}`}>
            {fmt(payment.amount)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Payment Amount</p>
          {isReversed && <span className="mt-2 inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full">REVERSED</span>}
        </div>

        <div className="space-y-0 divide-y divide-gray-50">
          {rows.map(([label, val]: any) => (
            <div key={String(label)} className="flex items-start justify-between gap-4 py-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0 pt-0.5 w-32">{label}</span>
              <span className="text-sm text-gray-800 text-right flex-1">{val}</span>
            </div>
          ))}
        </div>

        {!isReversed && (
          <button onClick={() => { onClose(); onReverse(); }}
            className="w-full py-3 border-2 border-orange-200 text-orange-600 font-black text-sm rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Request Reversal
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Reverse Modal ─────────────────────────────────────────────
function ReverseModal({ payment, onClose, onSaved }: { payment: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (reason.trim().length < 10) return setError('Reason must be at least 10 characters');
    setLoading(true);
    try {
      await apiFetch(`/payments/${payment.id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) });
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Reverse Payment" subtitle="This action cannot be undone" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-orange-700 font-semibold">Receipt</span>
            <span className="font-mono font-black">{payment.receiptNumber || payment.receipt_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-orange-700 font-semibold">Amount</span>
            <span className="font-black">{fmt(payment.amount)}</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Reason *</label>
          <textarea rows={3} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            placeholder="Min 10 characters..." value={reason} onChange={e => setReason(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">{reason.length}/10 min</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handle} disabled={loading || reason.trim().length < 10}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-black transition-colors">
            {loading ? 'Processing...' : 'Confirm Reversal'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PaymentsPage() {
  const [payments,    setPayments]    = useState<any[]>([]);
  const [nextCursor,  setNextCursor]  = useState<number | null>(null);
  const [totalCount,  setTotalCount]  = useState<number>(0);
  const [summary,     setSummary]     = useState<{ todayAmount: number; todayCount: number }>({ todayAmount: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any>(null);
  const [reversePayment, setReversePayment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch payments list and today's summary in parallel
      const [data, sumData] = await Promise.all([
        apiFetch('/payments'),
        apiFetch('/payments/summary').catch(() => null),
      ]);

      const { items = [], nextCursor: nc = null, count = 0 } =
        (data && typeof data === 'object' && 'items' in data)
          ? data
          : { items: Array.isArray(data) ? data : (data?.data ?? data?.payments ?? []), nextCursor: null, count: 0 };
      items.sort((a: any, b: any) =>
        new Date(b.paymentDate || b.payment_date || b.createdAt || 0).getTime() -
        new Date(a.paymentDate || a.payment_date || a.createdAt || 0).getTime()
      );
      setPayments(items);
      setNextCursor(nc);
      setTotalCount(count);

      // Use server-computed today totals — avoids timezone mismatch between
      // client (UTC+3 Kampala) and UTC ISO strings stored by the backend.
      if (sumData) {
        setSummary({
          todayAmount: Number(sumData.todayAmount ?? 0),
          todayCount:  Number(sumData.todayCount  ?? 0),
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:    payments.filter(p => p.status !== 'REVERSED').reduce((s, p) => s + Number(p.amount), 0),
    // Server-computed today values — correct regardless of client timezone.
    // The backend uses setHours(0,0,0,0) on the server clock (UTC) and filters
    // with MoreThanOrEqual, so it matches the actual Uganda business day when
    // the server timezone is set to Africa/Kampala, or can be adjusted there.
    today:    summary.todayAmount,
    count:    payments.filter(p => p.status !== 'REVERSED').length,
    reversed: payments.filter(p => p.status === 'REVERSED').length,
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const receipt = (p.receiptNumber || p.receipt_number || '').toLowerCase();
    const loan = (p.loan?.loanNumber || p.loan?.loan_number || '').toLowerCase();
    const cn = clientName(p.loan?.client)?.toLowerCase() || '';
    const collector = (p.collectedBy || p.collected_by || '').toLowerCase();
    const matchSearch = !q || receipt.includes(q) || loan.includes(q) || cn.includes(q) || collector.includes(q);
    const pm = p.paymentMethod || p.payment_method;
    const matchMethod = methodFilter === 'ALL' || pm === methodFilter;
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const d = new Date(p.paymentDate || p.payment_date || p.createdAt);
    const matchFrom = !dateFrom || d >= new Date(dateFrom);
    const matchTo = !dateTo || d <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchMethod && matchStatus && matchFrom && matchTo;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              Payments
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{stats.count} transactions · {fmt(stats.total)} total collected</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowRecord(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 transition-colors">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Collected', value: fmt(stats.total), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Collected Today', value: fmt(stats.today), icon: Calendar,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Transactions',   value: stats.count,       icon: Receipt,    color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Reversed',       value: stats.reversed,    icon: RotateCcw,  color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Receipt, loan, client..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}>
              <option value="ALL">All Methods</option>
              {Object.entries(METHODS).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="ALL">All Status</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
              <span className="text-gray-400">—</span>
              <input type="date" className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            {(search || methodFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setMethodFilter('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="text-sm text-red-500 font-semibold hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">Clear</button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading payments...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-24 text-center">
              <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-lg">No payments found</p>
              <p className="text-sm text-gray-300 mt-1">Adjust your filters or record a new payment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Receipt #', 'Client / Loan', 'Amount', 'Method', 'Date & Time', 'Collected By', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(p => {
                    const pm = p.paymentMethod || p.payment_method;
                    const method = METHODS[pm];
                    const status = STATUS_CFG[p.status] || STATUS_CFG['COMPLETED'];
                    const isReversed = p.status === 'REVERSED';
                    const payDate = p.paymentDate || p.payment_date || p.createdAt;
                    const cn = clientName(p.loan?.client);
                    const receipt = p.receiptNumber || p.receipt_number;

                    return (
                      <tr key={p.id}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${isReversed ? 'opacity-50' : ''}`}
                        onClick={() => setDetailPayment(p)}>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{receipt}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-900">{cn || '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />{loanNum(p)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`font-black text-base ${isReversed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{fmt(p.amount)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {method
                            ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${method.bg} ${method.color}`}><method.icon className="w-3 h-3" />{method.label}</span>
                            : <span className="text-xs text-gray-500">{pm}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800">{fmtDate(payDate)}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(payDate)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{p.collectedBy || p.collected_by || '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => setDetailPayment(p)} title="View"
                              className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!isReversed && (
                              <button onClick={() => setReversePayment(p)} title="Reverse"
                                className="p-1.5 hover:bg-orange-50 text-orange-500 rounded-lg transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${n === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}>{n}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} onSaved={load} />}
      {detailPayment && <PaymentDetailModal payment={detailPayment} onClose={() => setDetailPayment(null)} onReverse={() => { setReversePayment(detailPayment); setDetailPayment(null); }} />}
      {reversePayment && <ReverseModal payment={reversePayment} onClose={() => setReversePayment(null)} onSaved={load} />}
    </div>
  );
}
