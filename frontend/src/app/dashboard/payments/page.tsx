'use client';

import AllocationPreview from '@/features/payments/components/AllocationPreview';

import toast from 'react-hot-toast';

/**
 * Payments Page
 *
 * Changes from uploaded version:
 *
 * FIX 1 — Build error: "Module not found: Can't resolve './receipt.api'"
 *   Added imports for ReceiptButton, ReceiptModal (from components/ReceiptModal.tsx)
 *   and receipt.api.ts  — these files are now present in the repo.
 *
 * FIX 2 — Collision-prone genReceipt() removed from frontend
 *   genReceipt() used Date.now().toString(36) which collides on double-click.
 *   receipt_number is now OPTIONAL in the form (leave blank → backend auto-generates).
 *   Validation: required receipt_number check removed from handleSubmit.
 *   The "Generate" button is removed; placeholder says "Auto-generated if blank".
 *
 * FIX 3 — Print Receipt button on success screen
 *   The old window.open() inline receipt is replaced by ReceiptButton (variant="primary").
 *   It calls GET /receipts/payment/:id using the payment ID returned from the server.
 *
 * FIX 4 — Print Receipt button in payment table rows
 *   Added ReceiptButton (variant="icon") in the actions column next to Eye/Reverse.
 *
 * FIX 5 — Print Receipt button in PaymentDetailModal
 *   Added ReceiptButton (variant="ghost") inside the detail modal.
 *
 * FIX 6 — ReverseModal now routes to the correct endpoint based on user role:
 *   Admin/Manager → POST /payments/:id/reverse        (immediate, direct reversal)
 *   Cashier       → POST /payments/:id/request-reversal (submitted for admin review)
 *   Previously ALL users hit the admin-only /reverse endpoint, causing 403 for everyone
 *   including admins (because user.role was undefined due to the SnakeCaseInterceptor bug).
 *
 * Everything else is pixel-identical to the uploaded version.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Banknote, Plus, X, Search, RefreshCw, CheckCircle, AlertCircle,
  Receipt, TrendingUp, Calendar, Clock, RotateCcw, Loader2,
  Wallet, CreditCard, Smartphone, Building2, BadgeCheck, Eye,
  ArrowUpRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// FIX 1: import receipt components (previously missing, caused build error)
import { ReceiptButton } from '../../../features/payments/components/ReceiptModal';

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
// FIX 2: genReceipt() removed — backend now generates BV-{YYYY}-{8hex} via crypto.randomBytes
const clientName = (c: any) => c ? `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() : null;
const loanNum = (p: any) => p.loan?.loanNumber || p.loan?.loan_number || `#${p.loanId || p.loan_id}`;

const METHODS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH:          { label: 'Cash',          icon: Wallet,     color: 'text-bv-success',  bg: 'bg-bv-success-bg border-bv-border' },
  Momo:          { label: 'MTN MoMo',      icon: Smartphone, color: 'text-bv-warning',  bg: 'bg-bv-warning-bg border-yellow-200'  },
  BANK_TRANSFER: { label: 'Bank Transfer', icon: Building2,  color: 'text-bv-accent',    bg: 'bg-bv-info-bg border-blue-200'      },
  Airtelmoney:   { label: 'Airtel Money',  icon: CreditCard, color: 'text-bv-danger',     bg: 'bg-bv-danger-bg border-bv-danger/30'        },
};

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  COMPLETED:          { label: 'Completed',     color: 'bg-bv-success-bg text-bv-success', dot: 'bg-bv-success' },
  PENDING:            { label: 'Pending',        color: 'bg-bv-warning-bg text-bv-warning',   dot: 'bg-yellow-400'  },
  REVERSED:           { label: 'Reversed',       color: 'bg-bv-hover text-bv-meta',       dot: 'bg-gray-400'    },
  REVERSAL_REQUESTED: { label: 'Rev. Requested', color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400'  },
  FAILED:             { label: 'Failed',         color: 'bg-bv-danger-bg text-bv-danger',         dot: 'bg-bv-danger'     },
};

// ── Modal Shell ───────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-bv-surface rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-bv-border sticky top-0 bg-bv-surface rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-black text-bv-text">{title}</h3>
            {subtitle && <p className="text-sm text-bv-meta mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bv-hover rounded-xl transition-colors ml-4 flex-shrink-0">
            <X className="w-4 h-4 text-bv-meta" />
          </button>
        </div>
        <div className="p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────
function RecordPaymentModal({ onClose, onSaved, initialLoanId }: { onClose: () => void; onSaved: () => void; initialLoanId?: number | null }) {
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

  // FIX 2: receipt_number starts empty — backend generates BV-{YYYY}-{8hex}
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toTimeString().slice(0, 5),
    receipt_number: '',   // ← blank by default; optional
    collected_by: '',
    notes: '',
    cash_drawer_id: '',   // required — business rule: every payment needs an open drawer
  });

  const [drawers, setDrawers] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/cash-drawers?status=open')
      .then(r => {
        const list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        // Null-safe: only keep drawers with a valid id
        setDrawers(list.filter((d: any) => d && d.id != null));
      })
      .catch(() => setDrawers([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch('/loans?status=ACTIVE')
      .then(r => {
        const list = Array.isArray(r) ? r : r.data || r.loans || [];
        setAllLoans(list);
        if (initialLoanId) {
          const found = list.find((l: any) => Number(l.id) === Number(initialLoanId));
          if (found) {
            const c = found.client;
            if (c) setSelectedClient(c);
            setSelectedLoan(found);
            setStep(2);
          }
        }
      })
      .catch(() => setAllLoans([]))
      .finally(() => setLoading(false));
  }, [initialLoanId]);

  useEffect(() => {
    if (!selectedLoan) { setLoanSchedule(null); return; }
    apiFetch(`/schedules/loan/${selectedLoan.id}`)
      .then(d => {
        setLoanSchedule(d);
        const firstDue = (d?.schedules || []).find((s: any) =>
          ['PENDING','OVERDUE','PARTIAL'].includes(String(s.status || '').toUpperCase())
        );
        if (firstDue) {
          const suggested = Math.max(
            0,
            Math.round(Number(firstDue.amountDue ?? firstDue.amount_due ?? 0)) -
            Math.round(Number(firstDue.amountPaid ?? firstDue.amount_paid ?? 0))
          );
          if (suggested > 0) setForm(f => (!f.amount ? { ...f, amount: String(suggested) } : f));
        }
      })
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
  const suggestedAmount = nextDue ? Math.max(0, Number(nextDue.amountDue) - Number(nextDue.amountPaid || 0)) : Number(selectedLoan?.balance || 0);

  const handleSubmit = async () => {
    if (!selectedLoan) return setError('Please select a loan');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    if (!form.cash_drawer_id) return setError('Please select a cash drawer');
    // FIX 2: receipt_number is optional — no longer validated as required
    setError(''); setSubmitting(true);
    try {
      const dt = new Date(`${form.payment_date}T${form.payment_time}`);
      const result = await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          loan_id: selectedLoan.id,
          amount: Math.round(Number(form.amount)),
          payment_method: form.payment_method,
          ...(form.receipt_number.trim() ? { receipt_number: form.receipt_number.trim() } : {}),
          payment_date: dt.toISOString(),
          collected_by: form.collected_by || undefined,
          notes: form.notes || undefined,
          schedule_id: nextDue?.id ?? undefined,
          cash_drawer_id: Number(form.cash_drawer_id),
        }),
      });
      setSuccess(result);
      toast.success('Payment recorded');
      setTimeout(() => { onSaved(); }, 2200);
    } catch (e: any) {
      const msg = e.message || 'Failed to record payment';
      setError(msg);
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  // ── Success screen ──────────────────────────────────────────
  if (success) return (
    <Modal title="" onClose={onClose}>
      <div className="py-8 text-center">
        <div className="w-20 h-20 bg-bv-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <BadgeCheck className="w-10 h-10 text-bv-success" />
        </div>
        <h3 className="text-lg font-semibold text-bv-text">Payment recorded</h3>
        <p className="text-sm text-bv-muted mt-1">Receipt saved. Balance updated on the loan.</p>
        <div className="mt-5 bg-bv-hover rounded-2xl p-4 text-left space-y-2.5">
          {[
            ['Receipt', <span key="r" className="font-mono font-black text-bv-text">{success.receiptNumber}</span>],
            ['Amount', <span key="a" className="font-black text-bv-success">{fmt(form.amount)}</span>],
            ['New Balance', <span key="b" className="font-black text-bv-text">{fmt(success.newBalance)}</span>],
          ].map(([label, val]: any) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-bv-meta">{label}</span>{val}
            </div>
          ))}
        </div>
        {/* FIX 3: ReceiptButton with payment ID — replaces old window.open() */}
        <div className="mt-4 flex gap-2">
          {success.payment?.id && (
            <ReceiptButton paymentId={success.payment.id} variant="primary" />
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-bv-action hover:bg-bv-action-hover text-white rounded-lg text-sm font-medium">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal title="Record payment" subtitle="Select client and loan, then enter amount and method. Cash requires an open drawer." onClose={onClose} wide>
      {/* Step tabs */}
      <div className="flex gap-1 mb-6 bg-bv-hover p-1 rounded-xl">
        {[{ n: 1, label: '1. Select Client' }, { n: 2, label: '2. Payment Details' }].map(({ n, label }) => (
          <button key={n} onClick={() => n === 1 && setStep(1)}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${step === n ? 'bg-bv-surface shadow text-bv-accent' : 'text-bv-meta'}`}>
            {step > n ? `✓ ${label.slice(3)}` : label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-bv-danger-bg border border-bv-danger/30 text-bv-danger text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* STEP 1 — Client selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bv-meta" />
            <input className="w-full pl-9 pr-4 py-3 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action"
              placeholder="Search by name or phone..." value={clientSearch}
              onChange={e => setClientSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto border border-bv-border rounded-xl divide-y divide-gray-50">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-bv-border border-t-bv-action" role="status" />
                <p className="text-sm font-semibold text-bv-text">Bingo Vintage <span className="text-bv-meta font-normal">· loading</span></p>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="py-12 text-center text-sm text-bv-meta">{clientSearch ? 'No clients match' : 'No clients with active loans'}</p>
            ) : filteredClients.map(c => {
              const loans = allLoans.filter(l => l.client?.id === c.id);
              const bal = loans.reduce((s: number, l: any) => s + Number(l.balance || 0), 0);
              return (
                <button key={c.id} onClick={() => { setSelectedClient(c); setStep(2); }}
                  className="w-full text-left px-4 py-4 hover:bg-bv-info-bg transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm">
                      {(c.firstName || c.first_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-bv-text">{clientName(c)}</p>
                      <p className="text-xs text-bv-meta">{c.phone} · {loans.length} loan{loans.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-bv-danger">{fmt(bal)}</p>
                    <p className="text-xs text-bv-meta">balance</p>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="w-full py-3 border border-bv-border rounded-xl text-sm font-semibold text-bv-muted hover:bg-bv-hover">Cancel</button>
        </div>
      )}

      {/* STEP 2 — Payment form */}
      {step === 2 && selectedClient && (
        <div className="space-y-5">
          {/* Client bar */}
          <div className="flex items-center justify-between bg-bv-info-bg border border-blue-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-bv-action flex items-center justify-center text-white font-black text-sm">
                {(selectedClient.firstName || selectedClient.first_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-bv-text text-sm">{clientName(selectedClient)}</p>
                <p className="text-xs text-bv-meta">{selectedClient.phone}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedClient(null); setSelectedLoan(null); setStep(1); }}
              className="text-xs text-bv-accent font-bold hover:underline">Change</button>
          </div>

          {/* Loan picker */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Select Loan *</label>
            <div className="space-y-2">
              {clientLoans.map((l: any) => {
                const sel = selectedLoan?.id === l.id;
                return (
                  <button key={l.id} onClick={() => setSelectedLoan(sel ? null : l)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${sel ? 'border-blue-600 bg-bv-info-bg' : 'border-bv-border hover:border-bv-border'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-bv-text text-sm">{l.loanNumber || l.loan_number}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${l.loanType === 'bike' ? 'bg-orange-100 text-orange-700' : 'bg-bv-success-bg text-bv-success'}`}>
                            {l.loanType === 'bike' ? '🏍 Bike' : '💵 Cash'}
                          </span>
                        </div>
                        <p className="text-xs text-bv-meta mt-0.5">Balance: <span className="font-black text-bv-danger">{fmt(l.balance)}</span></p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${sel ? 'border-blue-600 bg-bv-action' : 'border-bv-border'}`}>
                        {sel && <div className="w-2 h-2 bg-bv-surface rounded-full" />}
                      </div>
                    </div>
                    {sel && nextDue && (
                      <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-bv-accent font-semibold">Next: Instalment #{nextDue.installmentNumber}</span>
                          <span className="font-black text-bv-accent">{fmt(suggestedAmount)} remaining</span>
                        </div>
                        {nextDue.dueDate && <p className="text-xs text-blue-500">Due: {fmtDate(nextDue.dueDate)}</p>}
                        <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, amount: String(suggestedAmount) })); }}
                          className="w-full py-1.5 bg-bv-action text-white rounded-lg text-xs font-black hover:bg-bv-action-hover transition-colors">
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
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Amount (UGX) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bv-meta font-bold text-sm">UGX</span>
              <input type="number" min="0"
                className="w-full border-2 border-bv-border rounded-xl pl-14 pr-4 py-3.5 text-2xl font-black focus:outline-none focus:border-bv-action transition-colors"
                placeholder="0" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            

          {selectedLoan && (
            <AllocationPreview
              loanId={selectedLoan.id}
              amount={form.amount}
              apiBase={typeof API_URL !== 'undefined' ? API_URL : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')}
              authToken={typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('accessToken') : null}
            />
          )}
{selectedLoan && suggestedAmount > 0 && String(Math.round(Number(form.amount))) !== String(suggestedAmount) && (
              <button type="button"
                onClick={() => setForm(f => ({ ...f, amount: String(suggestedAmount) }))}
                className="mt-1.5 flex items-center gap-1.5 px-3 py-1 bg-bv-info-bg border border-blue-200 rounded-lg text-xs font-bold text-bv-accent hover:bg-bv-info-bg transition-colors">
                💡 Suggested: {fmt(suggestedAmount)} — click to apply
              </button>
            )}
            {selectedLoan && form.amount && Number(form.amount) > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${Number(form.amount) > Number(selectedLoan.balance) ? 'text-bv-warning' : 'text-bv-success'}`}>
                {Number(form.amount) > Number(selectedLoan.balance)
                  ? `⚠️ Exceeds balance by ${fmt(Number(form.amount) - Number(selectedLoan.balance))}`
                  : `✓ New balance: ${fmt(Number(selectedLoan.balance) - Number(form.amount))}`}
              </p>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Payment Method *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(METHODS).map(([val, cfg]) => {
                const Icon = cfg.icon;
                const active = form.payment_method === val;
                return (
                  <button key={val} onClick={() => setForm({ ...form, payment_method: val })}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all ${active ? `${cfg.bg} ${cfg.color} border-current` : 'border-bv-border text-bv-meta hover:border-bv-border'}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash drawer — required for every payment method (business rule) */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Cash Drawer *</label>
            <select
              value={form.cash_drawer_id}
              onChange={e => setForm({ ...form, cash_drawer_id: e.target.value })}
              className="w-full border border-bv-border rounded-xl px-3 py-2.5 text-sm font-medium"
            >
              <option value="">Select an open drawer…</option>
              {drawers.map((d: any) => (
                <option key={d.id} value={d.id}>
                  Drawer #{d.id}
                  {d.user?.username ? ` — ${d.user.username}` : d.user?.fullName ? ` — ${d.user.fullName}` : ''}
                </option>
              ))}
            </select>
            {drawers.length === 0 && (
              <p className="text-xs text-bv-warning mt-1">
                No open drawers found. Open a drawer first before recording this payment.
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Payment Date *</label>
              <input type="date"
                className="w-full border-2 border-bv-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-bv-action"
                value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Time</label>
              <input type="time"
                className="w-full border-2 border-bv-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-bv-action"
                value={form.payment_time} onChange={e => setForm({ ...form, payment_time: e.target.value })} />
            </div>
          </div>

          {/* FIX 2: Receipt number — now optional */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">
              Receipt Number
              <span className="ml-1 text-bv-meta font-normal normal-case">(optional — auto-generated if blank)</span>
            </label>
            <input
              className="w-full border-2 border-bv-border rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-bv-action"
              placeholder="Auto-generated if blank  e.g. BV-2026-A3F9C21B"
              value={form.receipt_number}
              onChange={e => setForm({ ...form, receipt_number: e.target.value })}
            />
            <p className="text-xs text-bv-meta mt-1">
              Leave blank to auto-generate · or enter a physical receipt book number
            </p>
          </div>

          {/* Collected by */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Collected By</label>
            <input className="w-full border-2 border-bv-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-bv-action"
              placeholder="Staff name (optional)" value={form.collected_by}
              onChange={e => setForm({ ...form, collected_by: e.target.value })} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">Notes</label>
            <textarea rows={2}
              className="w-full border-2 border-bv-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-bv-action resize-none"
              placeholder="e.g. Week 3 instalment..." value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep(1); setSelectedLoan(null); setLoanSchedule(null); }}
              className="flex-1 py-3 border-2 border-bv-border rounded-xl text-sm font-bold text-bv-muted hover:bg-bv-hover">← Back</button>
            <button onClick={handleSubmit} disabled={submitting || !selectedLoan || !form.amount || Number(form.amount) <= 0 || !form.cash_drawer_id}
              className="flex-1 py-3 bg-bv-action hover:bg-bv-action-hover disabled:opacity-40 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200">
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
  const method = METHODS[pm] || { label: pm, icon: Wallet, color: 'text-bv-muted', bg: 'bg-bv-hover border-bv-border' };
  const Icon = method.icon;
  const isReversed = payment.status === 'REVERSED';
  const payDate = payment.paymentDate || payment.payment_date || payment.createdAt;
  const cn = clientName(payment.loan?.client);
  const receipt = payment.receiptNumber || payment.receipt_number;

  const rows = [
    ['Receipt Number', <span key="rn" className="font-mono font-black text-bv-text">{receipt}</span>],
    ['Loan', loanNum(payment)],
    ['Client', cn || '—'],
    ['Payment Method', <span key="pm" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${method.bg} ${method.color}`}><Icon className="w-3.5 h-3.5" />{method.label}</span>],
    ['Date', fmtDate(payDate)],
    ['Time', fmtTime(payDate)],
    ['Collected By', payment.collectedBy || payment.collected_by || '—'],
    ['Notes', payment.notes || '—'],
    ...(isReversed ? [
      ['Reversed At', fmtDate(payment.reversedAt || payment.reversed_at)],
      ['Reversal Reason', <span key="rr" className="text-bv-danger">{payment.reversalReason || payment.reversal_reason}</span>],
      ['Reversed By', payment.reversedBy || payment.reversed_by || '—'],
    ] : []),
  ];

  return (
    <Modal title="Transaction Detail" subtitle={`Receipt: ${receipt}`} onClose={onClose}>
      <div className="space-y-5">
        <div className={`rounded-2xl p-6 text-center ${isReversed ? 'bg-bv-hover' : 'bg-bv-success-bg'}`}>
          <p className={`text-4xl font-black tracking-tight ${isReversed ? 'line-through text-bv-meta' : 'text-bv-success'}`}>
            {fmt(payment.amount)}
          </p>
          <p className="text-sm text-bv-meta mt-1">Payment Amount</p>
          {isReversed && <span className="mt-2 inline-block px-3 py-1 bg-bv-danger-bg text-bv-danger text-xs font-black rounded-full">REVERSED</span>}
        </div>

        <div className="space-y-0 divide-y divide-gray-50">
          {rows.map(([label, val]: any) => (
            <div key={String(label)} className="flex items-start justify-between gap-4 py-3">
              <span className="text-xs font-bold text-bv-meta uppercase tracking-wide flex-shrink-0 pt-0.5 w-32">{label}</span>
              <span className="text-sm text-bv-text text-right flex-1">{val}</span>
            </div>
          ))}
        </div>

        {/* FIX 5: Print Receipt button in detail view */}
        <ReceiptButton paymentId={payment.id} variant="ghost" />

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
// FIX 6: Role-aware endpoint routing.
//   isAdmin = true  → POST /payments/:id/reverse         (direct, immediate)
//   isAdmin = false → POST /payments/:id/request-reversal (submitted for review)
function ReverseModal({ payment, onClose, onSaved, isAdmin }: {
  payment: any;
  onClose: () => void;
  onSaved: () => void;
  isAdmin: boolean;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (reason.trim().length < 10) return setError('Reason must be at least 10 characters');
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin: reverse immediately
        await apiFetch(`/payments/${payment.id}/reverse`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      } else {
        // Cashier/Manager: submit a request — admin reviews and approves
        await apiFetch(`/payments/${payment.id}/request-reversal`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      }
      onSaved(); onClose();
    } catch (e: any) { const msg = e.message || 'Failed'; setError(msg); toast.error(msg); }
    finally { setLoading(false); }
  };

  const title    = isAdmin ? 'Reverse Payment'              : 'Request Reversal';
  const subtitle = isAdmin ? 'This action cannot be undone' : 'Admin will review and action this request';
  const btnLabel = isAdmin ? 'Confirm Reversal'             : 'Send to Admin';

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
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
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-700">
            <span className="font-bold">ℹ</span>
            Your request goes to admin for approval. The payment stays active until they approve it.
          </div>
        )}
        {error && <p className="text-sm text-bv-danger bg-bv-danger-bg px-3 py-2 rounded-xl">{error}</p>}
        <div>
          <label className="block text-xs font-black text-bv-meta uppercase tracking-wider mb-2">
            Reason * <span className="text-bv-meta font-normal normal-case">(min 10 characters)</span>
          </label>
          <textarea rows={3} className="w-full border-2 border-bv-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            placeholder="Min 10 characters..." value={reason} onChange={e => setReason(e.target.value)} />
          <p className="text-xs text-bv-meta mt-1">{reason.length}/10 min</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-bv-border rounded-xl text-sm font-bold text-bv-muted hover:bg-bv-hover">Cancel</button>
          <button onClick={handle} disabled={loading || reason.trim().length < 10}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-black transition-colors">
            {loading ? 'Processing...' : btnLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────
function PaymentsPageInner() {
  const { user, can } = useAuth();
  const role      = (user?.role ?? '').toLowerCase();
  // canReverse: direct reversal (admin route). canRecord: create payment.
  // Both respond to Settings toggles for any role.
  const canRecord  = ['admin','manager','cashier','superadmin'].includes(role) || can('payment.create');
  const canReverse = role === 'admin' || role === 'superadmin' || can('payment.reverse');
  // isAdmin passed to ReverseModal — true = direct reverse, false = request review
  const isAdmin    = canReverse;

  const [payments, setPayments] = useState<any[]>([]);
  // Canonical "Collected Today" figure — sourced from getSummary(), which
  // correctly excludes REVERSED payments across the full dataset, not just
  // whatever page of `payments` happens to be loaded. See PAY-003.
  const [todaySummary, setTodaySummary] = useState<{ todayAmount: number; todayCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const searchParams = useSearchParams();
  const initialLoanId = searchParams.get('loanId') ? Number(searchParams.get('loanId')) : null;
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
    setLoadError('');
    try {
      // Backend is cursor-paginated: { items, nextCursor, count }.
      // Default limit is 50 — request the hard-cap max (100) so the
      // page reflects real volume instead of silently truncating.
      // (Previously this read data.data / data.payments, which don't
      // exist on this response shape — list was always [], page showed 0.)
      const data = await apiFetch('/payments?limit=100');
      const list: any[] = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      list.sort((a, b) =>
        new Date(b.paymentDate || b.payment_date || b.createdAt || 0).getTime() -
        new Date(a.paymentDate || a.payment_date || a.createdAt || 0).getTime()
      );
      setPayments(list);

      // PAY-003: fetch the canonical, REVERSED-excluded today total from the
      // backend rather than recomputing it client-side over a capped list.
      try {
        const summary = await apiFetch('/payments/summary');
        setTodaySummary({
          todayAmount: Number(summary?.todayAmount ?? 0),
          todayCount:  Number(summary?.todayCount  ?? 0),
        });
      } catch (e) { console.error('Failed to load payment summary:', e); }
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || 'Could not load payments. Check connection and try again.');
      setPayments([]);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toDateString();
  const stats = {
    total:    payments.filter(p => p.status !== 'REVERSED').reduce((s, p) => s + Number(p.amount), 0),
    // PAY-003: sourced from getSummary() — the canonical, all-data,
    // REVERSED-excluded figure — falling back to the old client-side
    // computation only if the summary fetch hasn't resolved yet.
    today:    todaySummary?.todayAmount ?? payments.filter(p => {
      if (p.status === 'REVERSED') return false;
      const d = p.paymentDate || p.payment_date || p.createdAt;
      return d && new Date(d).toDateString() === todayStr;
    }).reduce((s, p) => s + Number(p.amount), 0),
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
    const matchTo   = !dateTo   || d <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchMethod && matchStatus && matchFrom && matchTo;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen bg-bv-hover p-4 sm:p-6">
      <div className="max-w-bv mx-auto space-y-5">

        {/* Header — operational, not marketing */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bv-border pb-4">
          <div>
            <h1 className="text-lg font-semibold text-bv-text">Payments</h1>
            <p className="text-sm text-bv-muted mt-0.5">
              Record collections and review receipts. Today&apos;s total excludes reversed payments (Kampala business day on the server).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={loading}
              className="text-sm text-bv-muted border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover disabled:opacity-50">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => setShowRecord(true)}
              className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover">
              Record payment
            </button>
          </div>
        </div>

        {/* Figures — hierarchy, not four equal colourful cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border border-bv-border rounded-md p-4 bg-bv-surface">
          <div>
            <p className="text-xs text-bv-muted">Collected today</p>
            <p className="text-2xl font-semibold tabular-nums text-bv-text">{fmt(stats.today)}</p>
            <p className="text-xs text-bv-meta">{todaySummary?.todayCount ?? '—'} payment(s) · from server summary</p>
          </div>
          <div>
            <p className="text-xs text-bv-muted">In this list (non-reversed)</p>
            <p className="text-xl font-semibold tabular-nums text-bv-text">{fmt(stats.total)}</p>
            <p className="text-xs text-bv-meta">{stats.count} row(s) loaded (max 100)</p>
          </div>
          <div>
            <p className="text-xs text-bv-muted">Reversed in list</p>
            <p className="text-xl font-semibold tabular-nums text-bv-text">{stats.reversed}</p>
            <p className="text-xs text-bv-meta">Shown struck through; not in today total</p>
          </div>
        </div>

        {loadError && (
          <div className="border border-bv-danger/30 bg-bv-danger-bg text-bv-danger text-sm px-3 py-2 rounded-md flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <button type="button" onClick={load} className="font-medium underline">Retry</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-bv-surface border border-bv-border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bv-meta" />
              <input className="w-full pl-9 pr-4 py-2.5 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action"
                placeholder="Receipt, loan, client..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="px-3 py-2.5 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action bg-bv-surface font-medium"
              value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}>
              <option value="ALL">All Methods</option>
              {Object.entries(METHODS).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select className="px-3 py-2.5 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action bg-bv-surface font-medium"
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="ALL">All Status</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-bv-meta" />
              <input type="date" className="px-3 py-2.5 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action"
                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
              <span className="text-bv-meta">—</span>
              <input type="date" className="px-3 py-2.5 text-sm border border-bv-border rounded-xl focus:outline-none focus:ring-2 focus:ring-bv-action"
                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            {(search || methodFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setMethodFilter('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="text-sm text-bv-danger font-semibold hover:bg-bv-danger-bg px-3 py-2 rounded-xl transition-colors">Clear</button>
            )}
            <span className="text-xs text-bv-meta ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-bv-surface border border-bv-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-bv-border border-t-bv-action mx-auto" role="status" aria-label="Bingo Vintage loading" />
              <p className="text-sm font-semibold text-bv-text mt-3">Bingo Vintage <span className="text-bv-meta font-normal">· loading payments</span></p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto">
              <p className="text-sm font-semibold text-bv-text">No payments to show</p>
              <p className="text-sm text-bv-muted mt-1">
                {search || methodFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo
                  ? 'Nothing matches the current filters. Clear filters or change the date range.'
                  : 'No payments loaded yet. Record a collection when a client pays, or refresh after posting.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {(search || methodFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
                  <button type="button"
                    onClick={() => { setSearch(''); setMethodFilter('ALL'); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1); }}
                    className="text-sm border border-bv-border px-3 py-1.5 rounded hover:bg-bv-hover">
                    Clear filters
                  </button>
                )}
                <button type="button" onClick={() => setShowRecord(true)}
                  className="text-sm font-medium text-white bg-bv-action px-3 py-1.5 rounded hover:bg-bv-action-hover">
                  Record payment
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bv-border bg-bv-hover">
                    {['Receipt #', 'Client / Loan', 'Amount', 'Method', 'Date & Time', 'Collected By', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-black text-bv-meta uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(p => {
                    const pm      = p.paymentMethod || p.payment_method;
                    const method  = METHODS[pm];
                    const status  = STATUS_CFG[p.status] || STATUS_CFG['COMPLETED'];
                    const isReversed = p.status === 'REVERSED';
                    const payDate = p.paymentDate || p.payment_date || p.createdAt;
                    const cn      = clientName(p.loan?.client);
                    const receipt = p.receiptNumber || p.receipt_number;

                    return (
                      <tr key={p.id}
                        className={`hover:bg-bv-info-bg/30 transition-colors cursor-pointer ${isReversed ? 'opacity-50' : ''}`}
                        onClick={() => setDetailPayment(p)}>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-black bg-bv-hover text-bv-muted px-2.5 py-1 rounded-lg">{receipt}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-bv-text">{cn || '—'}</p>
                          <p className="text-xs text-bv-meta mt-0.5 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />{loanNum(p)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`font-black text-base ${isReversed ? 'line-through text-bv-meta' : 'text-bv-text'}`}>{fmt(p.amount)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {method
                            ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${method.bg} ${method.color}`}><method.icon className="w-3 h-3" />{method.label}</span>
                            : <span className="text-xs text-bv-meta">{pm}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-bv-text">{fmtDate(payDate)}</p>
                          <p className="text-xs text-bv-meta mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(payDate)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-bv-meta">{p.collectedBy || p.collected_by || '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 items-center">
                            <button onClick={() => setDetailPayment(p)} title="View"
                              className="p-1.5 hover:bg-bv-info-bg text-blue-500 rounded-lg transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {/* FIX 4: Print Receipt icon button in table row */}
                            <ReceiptButton paymentId={p.id} variant="icon" />
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
            <div className="px-4 py-3 border-t border-bv-border flex items-center justify-between bg-bv-hover/50">
              <p className="text-xs text-bv-meta">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-bv-border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${n === page ? 'bg-bv-action text-white' : 'hover:bg-bv-border text-bv-muted'}`}>{n}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-bv-border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRecord    && <RecordPaymentModal onClose={() => setShowRecord(false)} onSaved={load} initialLoanId={initialLoanId} />}
      {detailPayment && <PaymentDetailModal payment={detailPayment} onClose={() => setDetailPayment(null)} onReverse={() => { setReversePayment(detailPayment); setDetailPayment(null); }} />}
      {/* FIX 6: pass isAdmin so ReverseModal calls the correct endpoint */}
      {reversePayment && <ReverseModal payment={reversePayment} onClose={() => setReversePayment(null)} onSaved={load} isAdmin={isAdmin} />}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageInner />
    </Suspense>
  );
}