// patch 2026-06-16
'use client';
import { api } from '@/lib/api/client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Banknote, Bike, Search, User, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, Calculator, Phone, CreditCard,
  Loader2, X, Calendar, Percent, ChevronRight, Info
} from 'lucide-react';
import Link from 'next/link';

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

interface Client {
  id: number;
  // TypeORM entity returns camelCase; support both shapes
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  nin?: string;
  id_number?: string;
  email?: string;
  occupation?: string;
  monthly_income?: number;
  status?: string;
  verified?: boolean;
  loan_limit?: number;
}

interface Bike {
  id: number;
  model: string;
  frame_number: string;
  registration_number?: string;
  sale_price: number;
  status: string;
}

function fmt(n: number) { return `UGX ${Number(n || 0).toLocaleString()}`; }
function genLoanNumber() { return `LN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`; }

// ── Step Indicator ───────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Select Client', 'Loan Type', 'Loan Details', 'Review'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${step > n ? 'bg-green-400' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Client Selection ──────────────────────────────────
// Helper: get display name handling both camelCase and snake_case from API
const cName = (c: Client) => `${c.firstName ?? c.first_name ?? ''} ${c.lastName ?? c.last_name ?? ''}`.trim();

function ClientSelector({ onSelect, preselectedId }: { onSelect: (c: Client) => void; preselectedId?: number | null }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    api.get('/clients')
      .then(r => {
        const list: Client[] = Array.isArray(r) ? r : ((r as any).data || (r as any).clients || []);
        setClients(list);
        // Auto-select if clientId was passed via URL
        if (preselectedId) {
          const found = list.find(c => Number(c.id) === Number(preselectedId));
          if (found) setSelected(found);
        }
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [preselectedId]);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      cName(c).toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.nin?.toLowerCase().includes(q) ||
      c.id_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Client</h2>
        <p className="text-sm text-gray-500">Search by name, phone number, or NIN</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name, phone, NIN, or ID number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Client list */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading clients...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400 text-sm">
              {search ? 'No clients match your search' : 'No clients found'}
            </p>
            {search && <p className="text-xs text-gray-300 mt-1">Try searching by phone number or NIN</p>}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left px-5 py-4 hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-4 ${
                  selected?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    selected?.id === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {(c.firstName ?? c.first_name ?? "?").charAt(0)}{(c.lastName ?? c.last_name ?? "").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{cName(c)}</p>
                      {c.verified && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Verified</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.nin && <span className="text-xs text-gray-400 flex items-center gap-1"><CreditCard className="w-3 h-3" />NIN: {c.nin}</span>}
                      {c.occupation && <span className="text-xs text-gray-400">{c.occupation}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  {c.loan_limit && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Loan Limit</p>
                      <p className="text-xs font-bold text-gray-700">{fmt(c.loan_limit)}</p>
                    </div>
                  )}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selected?.id === c.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {selected?.id === c.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected client preview + proceed */}
      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900">{cName(selected)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected.phone && `${selected.phone}`}
              {selected.nin && ` · NIN: ${selected.nin}`}
              {selected.monthly_income && ` · Income: ${fmt(selected.monthly_income)}/mo`}
            </p>
          </div>
          <button onClick={() => onSelect(selected)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors flex-shrink-0">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Loan Type ─────────────────────────────────────────
function LoanTypeSelector({ selected, onSelect }: { selected: string; onSelect: (t: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Loan Type</h2>
        <p className="text-sm text-gray-500">Choose the type of loan for this application</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            id: 'cash', label: 'Cash Loan', Icon: Banknote, color: 'blue',
            desc: 'Standard cash disbursement loan repaid in monthly installments',
            details: ['Monthly repayments', 'Up to 24 months', 'No collateral required'],
          },
          {
            id: 'bike', label: 'Bike Loan', Icon: Bike, color: 'orange',
            desc: 'Motorcycle purchase loan with the bike as collateral',
            details: ['Weekly repayments', 'Bike as collateral', 'Deposit required'],
          },
        ].map(({ id, label, Icon, color, desc, details }) => (
          <button key={id} onClick={() => onSelect(id)}
            className={`text-left p-6 rounded-2xl border-2 transition-all ${
              selected === id
                ? color === 'blue' ? 'border-blue-600 bg-blue-50' : 'border-orange-500 bg-orange-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selected === id
                  ? color === 'blue' ? 'bg-blue-600' : 'bg-orange-500'
                  : 'bg-gray-100'
              }`}>
                <Icon className={`w-6 h-6 ${selected === id ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === id
                  ? color === 'blue' ? 'border-blue-600 bg-blue-600' : 'border-orange-500 bg-orange-500'
                  : 'border-gray-300'
              }`}>
                {selected === id && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </div>
            <p className={`font-bold text-gray-900 mb-1`}>{label}</p>
            <p className="text-xs text-gray-500 mb-3">{desc}</p>
            <ul className="space-y-1">
              {details.map(d => (
                <li key={d} className="text-xs text-gray-500 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${color === 'blue' ? 'bg-blue-400' : 'bg-orange-400'}`} />
                  {d}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Loan Details ──────────────────────────────────────
// BIKE LOAN: zero interest. balance = price - deposit.
// Mode A: client picks weekly instalment → weeks auto-calculated = ceil(balance/instalment)
// Mode B: agent picks weeks            → instalment auto-calculated = ceil(balance/weeks)
function LoanDetailsForm({
  loanType, client, form, setForm, bikes, loadingBikes
}: {
  loanType: string; client: Client; form: any; setForm: any; bikes: Bike[]; loadingBikes: boolean;
}) {
  const isCash = loanType === 'cash';

  // ── Cash calculations ──────────────────────────────────────
  const principal     = Number(form.principal_amount) || 0;
  const rate          = Number(form.interest_rate) || 0;
  const months        = Number(form.term_months) || 0;
  const cashInterest  = isCash ? principal * (rate / 100) * months : 0;
  const cashTotal     = principal + cashInterest;
  const cashMonthly   = months > 0 ? cashTotal / months : 0;

  // ── Bike calculations — ZERO INTEREST ─────────────────────
  const bikePrice  = Number(form.principal_amount) || 0;
  const deposit    = Number(form.deposit) || 0;
  const balance    = Math.max(bikePrice - deposit, 0);
  const weeklyAmt  = Number(form.weekly_installment) || 0;
  const weeksInput = Number(form.term_weeks_input) || 0;

  // Mode A: client enters weekly amount → derive weeks
  const calcWeeks = weeklyAmt > 0 && balance > 0
    ? Math.ceil(balance / weeklyAmt) : 0;
  // Mode B: agent enters weeks → derive instalment
  const calcInstalment = weeksInput > 0 && balance > 0
    ? Math.ceil(balance / weeksInput) : 0;

  const activeWeeks  = form.bike_mode === 'weeks' ? weeksInput  : calcWeeks;
  const activeAmt    = form.bike_mode === 'weeks' ? calcInstalment : weeklyAmt;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {isCash ? 'Cash Loan' : 'Bike Loan'} Details
        </h2>
        <p className="text-sm text-gray-500">
          For <span className="font-semibold text-gray-700">{cName(client)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Inputs ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Bike picker */}
          {!isCash && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Bike from Inventory</label>
              {loadingBikes ? (
                <div className="border border-gray-100 rounded-xl p-4 text-center text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading bikes...
                </div>
              ) : bikes.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                  No bikes in inventory — enter price manually below
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {bikes.map(b => (
                    <button key={b.id} type="button" onClick={() => setForm({
                      ...form,
                      bike_id: form.bike_id === b.id ? null : b.id,
                      principal_amount: form.bike_id === b.id ? '' : String(b.sale_price),
                    })}
                      className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors flex items-center justify-between ${
                        form.bike_id === b.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                      }`}>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{b.model}</p>
                        <p className="text-xs text-gray-400">{b.frame_number}{b.registration_number ? ` · ${b.registration_number}` : ''}</p>
                      </div>
                      <span className="font-bold text-orange-600 text-sm">{fmt(b.sale_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price / Principal */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {isCash ? 'Principal Amount (UGX)' : 'Bike Price (UGX)'}
            </label>
            <input type="number"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              value={form.principal_amount}
              onChange={e => setForm({ ...form, principal_amount: e.target.value })}
            />
          </div>

          {/* Credit limit warning */}
          {client?.loan_limit && Number(form.principal_amount) > 0 && (() => {
            const amt   = Number(form.principal_amount);
            const limit = Number(client.loan_limit);
            if (amt > limit) return (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Amount <strong>{fmt(amt)}</strong> exceeds this client's loan limit of <strong>{fmt(limit)}</strong>.</span>
              </div>
            );
            return null;
          })()}

          {/* ── CASH FIELDS ── */}
          {isCash && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Interest Rate (% / month)</label>
                <div className="relative">
                  <input type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15" value={form.interest_rate}
                    onChange={e => setForm({ ...form, interest_rate: e.target.value })}
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Term (Months)</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.term_months} onChange={e => setForm({ ...form, term_months: e.target.value })}>
                  {[1,2,3,4,6,9,12,18,24].map(n => <option key={n} value={n}>{n} Month{n>1?'s':''}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── BIKE FIELDS — ZERO INTEREST ── */}
          {!isCash && (
            <div className="space-y-4">

              {/* Zero-interest badge */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">
                  Bike loans carry <strong>zero interest</strong> — client repays only the financed balance
                </span>
              </div>

              {/* Initial Deposit */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Initial Deposit (UGX)
                </label>
                <input type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. 1,000,000"
                  value={form.deposit}
                  onChange={e => setForm({ ...form, deposit: e.target.value })}
                />
                {bikePrice > 0 && deposit > 0 && deposit < bikePrice && (
                  <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-orange-700">Balance to finance</span>
                    <span className="text-lg font-black text-orange-700">{fmt(balance)}</span>
                  </div>
                )}
                {deposit >= bikePrice && bikePrice > 0 && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">Deposit cannot equal or exceed bike price</p>
                )}
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">How will repayment be set?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'payment', label: 'I know the weekly amount' },
                    { val: 'weeks',   label: 'I know the no. of weeks'  },
                  ].map(opt => (
                    <button key={opt.val} type="button"
                      onClick={() => setForm({ ...form, bike_mode: opt.val })}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        (form.bike_mode || 'payment') === opt.val
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode A: enter weekly amount */}
              {(form.bike_mode || 'payment') === 'payment' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Agreed Weekly Instalment (UGX)
                  </label>
                  <input type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-black focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="e.g. 75,000"
                    value={form.weekly_installment || ''}
                    onChange={e => setForm({ ...form, weekly_installment: e.target.value })}
                  />
                  {calcWeeks > 0 && balance > 0 && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Repayment period</span>
                        <span className="font-black text-orange-800">{calcWeeks} weeks <span className="font-normal text-orange-500">({Math.round(calcWeeks/4.33)} months)</span></span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Total to collect</span>
                        <span className="font-black text-orange-800">{fmt(weeklyAmt * calcWeeks)}</span>
                      </div>
                      <p className="text-xs text-orange-400 italic">Last instalment may be slightly reduced to avoid overpayment</p>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: enter weeks */}
              {form.bike_mode === 'weeks' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Repayment Period (Number of Weeks)
                  </label>
                  <input type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-black focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="e.g. 104"
                    value={form.term_weeks_input || ''}
                    onChange={e => setForm({ ...form, term_weeks_input: e.target.value })}
                  />
                  {calcInstalment > 0 && balance > 0 && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Weekly instalment</span>
                        <span className="font-black text-orange-800">{fmt(calcInstalment)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Total to collect</span>
                        <span className="font-black text-orange-800">{fmt(calcInstalment * weeksInput)}</span>
                      </div>
                      <p className="text-xs text-orange-400 italic">Last instalment may be slightly reduced to avoid overpayment</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Purpose of loan, additional context..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {/* ── Live Summary Panel ── */}
        <div className={`rounded-2xl p-6 text-white h-fit bg-gradient-to-br ${isCash ? 'from-blue-600 to-blue-800' : 'from-orange-500 to-orange-700'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Calculator className="w-5 h-5 opacity-70" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Live Summary</span>
          </div>

          {isCash ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="opacity-70">Principal</span><span className="font-bold">{fmt(principal)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Total Interest</span><span className="font-bold">{fmt(cashInterest)}</span></div>
              <div className="border-t border-white/20 pt-3 flex justify-between">
                <span className="font-bold">Total Payable</span><span className="text-xl font-black">{fmt(cashTotal)}</span>
              </div>
              {cashMonthly > 0 && (
                <div className="bg-white/10 rounded-xl p-3 mt-2">
                  <p className="text-xs opacity-60 mb-1">Monthly Payment</p>
                  <p className="text-2xl font-black">{fmt(cashMonthly)}</p>
                  <p className="text-xs opacity-50 mt-0.5">for {months} months</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="opacity-70">Bike Price</span><span className="font-bold">{fmt(bikePrice)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Deposit Paid</span><span className="font-bold text-emerald-300">{fmt(deposit)}</span></div>
              <div className="border-t border-white/20 pt-3 flex justify-between">
                <span className="opacity-70">Balance to Finance</span>
                <span className="font-bold">{fmt(balance)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-50">Interest</span>
                <span className="text-emerald-300 font-bold">NONE ✓</span>
              </div>
              {activeWeeks > 0 && (
                <div className="flex justify-between">
                  <span className="opacity-70">Weeks</span>
                  <span className="font-bold">{activeWeeks}</span>
                </div>
              )}
              {activeAmt > 0 && (
                <div className="bg-white/10 rounded-xl p-3 mt-1">
                  <p className="text-xs opacity-60 mb-1">Weekly Instalment</p>
                  <p className="text-2xl font-black">{fmt(activeAmt)}</p>
                  {activeWeeks > 0 && (
                    <p className="text-xs opacity-50 mt-0.5">× {activeWeeks} wks = {fmt(activeAmt * activeWeeks)}</p>
                  )}
                </div>
              )}
              {!activeAmt && !activeWeeks && (
                <p className="text-xs opacity-50 italic mt-4">Enter deposit + weekly amount to preview</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────
function ReviewStep({ client, loanType, form, bikes }: { client: Client; loanType: string; form: any; bikes: Bike[] }) {
  const isCash = loanType === 'cash';
  const selectedBike = bikes.find(b => b.id === form.bike_id);

  // Cash
  const principal    = Number(form.principal_amount) || 0;
  const rate         = Number(form.interest_rate) || 0;
  const months       = Number(form.term_months) || 0;
  const cashInterest = principal * (rate / 100) * months;
  const cashTotal    = principal + cashInterest;

  // Bike (zero interest)
  const bikePrice    = Number(form.principal_amount) || 0;
  const deposit      = Number(form.deposit) || 0;
  const balance      = bikePrice - deposit;
  const weeklyAmt    = Number(form.weekly_installment) || 0;
  const weeksInput   = Number(form.term_weeks_input) || 0;
  const bikeInstalment = weeklyAmt > 0 ? weeklyAmt : (weeksInput > 0 ? Math.ceil(balance / weeksInput) : 0);
  const bikeWeeks      = weeklyAmt > 0 ? Math.ceil(balance / weeklyAmt) : weeksInput;

  const rows = isCash ? [
    { label: 'Client',          value: cName(client) },
    { label: 'Phone',           value: client.phone || '—' },
    { label: 'NIN',             value: client.nin || '—' },
    { label: 'Loan Type',       value: 'Cash Loan' },
    { label: 'Principal',       value: fmt(principal) },
    { label: 'Interest Rate',   value: `${rate}% / month (flat)` },
    { label: 'Term',            value: `${months} month${months > 1 ? 's' : ''}` },
    { label: 'Total Interest',  value: fmt(cashInterest) },
    { label: 'Total Payable',   value: fmt(cashTotal) },
    { label: 'Monthly',         value: fmt(months > 0 ? cashTotal / months : 0) },
    { label: 'Start Date',      value: form.start_date },
  ] : [
    { label: 'Client',          value: cName(client) },
    { label: 'Phone',           value: client.phone || '—' },
    { label: 'NIN',             value: client.nin || '—' },
    { label: 'Loan Type',       value: 'Bike Loan' },
    ...(selectedBike ? [{ label: 'Bike', value: `${selectedBike.model} (${selectedBike.registration_number || selectedBike.frame_number})` }] : []),
    { label: 'Bike Price',      value: fmt(bikePrice) },
    { label: 'Initial Deposit', value: fmt(deposit) },
    { label: 'Balance Financed',value: fmt(balance) },
    { label: 'Interest',        value: 'NONE (zero interest)' },
    { label: 'Weekly Instalment', value: fmt(bikeInstalment) },
    { label: 'Repayment Period',  value: `${bikeWeeks} weeks (≈${Math.round(bikeWeeks / 4.33)} months)` },
    { label: 'Total to Collect',  value: fmt(bikeInstalment * bikeWeeks) },
    { label: 'Start Date',      value: form.start_date },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Review Application</h2>
        <p className="text-sm text-gray-500">Confirm all details before submitting</p>
      </div>
      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
        {rows.map(({ label, value }, i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className={`text-sm font-bold ${label === 'Interest' ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</span>
          </div>
        ))}
      </div>
      {form.notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-600 uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-700">{form.notes}</p>
        </div>
      )}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">This loan will be submitted for admin approval. It becomes active once approved and the payment schedule will be generated automatically.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CreateLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId') ? Number(searchParams.get('clientId')) : null;
  const [step, setStep]           = useState(1);
  const [client, setClient]       = useState<Client | null>(null);
  const [loanType, setLoanType]   = useState('cash');
  const [bikes, setBikes]         = useState<Bike[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [clientLoans, setClientLoans] = useState<any[]>([]);  // active loans for selected client

  const [form, setForm] = useState({
    principal_amount: '',
    interest_rate: '15',
    term_months: '12',
    start_date: new Date().toISOString().split('T')[0],
    deposit: '',
    notes: '',
    bike_id: null as number | null,
    weekly_installment: '',
    term_weeks_input: '',
    bike_mode: 'payment',  // 'payment' | 'weeks'
  });

  // Load bikes when bike type selected
  useEffect(() => {
    if (loanType === 'bike' && bikes.length === 0) {
      setLoadingBikes(true);
      api.get('/bikes/available')
        .then(r => {
          const all = Array.isArray(r) ? r : (r as any).data || (r as any).bikes || [];
          // Extra client-side guard: only AVAILABLE status, not LOANED/SOLD
          const avail = all.filter((b: any) =>
            !b.status || b.status.toUpperCase() === 'AVAILABLE'
          );
          setBikes(avail);
        })
        .catch(() => {
          // Fallback: fetch all and filter
          api.get('/bikes')
            .then(r => {
              const all = Array.isArray(r) ? r : (r as any).data || (r as any).bikes || [];
              setBikes(all.filter((b: any) => !b.status || b.status.toUpperCase() === 'AVAILABLE'));
            })
            .catch(() => setBikes([]));
        })
        .finally(() => setLoadingBikes(false));
    }
  }, [loanType]);

  // Reset fields when loan type changes
  useEffect(() => {
    setForm(f => ({
      ...f,
      interest_rate: '15',
      term_months: '12',
      bike_id: null,
      deposit: '',
      weekly_installment: '',
      term_weeks_input: '',
      bike_mode: 'payment',
    }));
  }, [loanType]);

  const canProceed = () => {
    if (step === 1) return !!client;
    if (step === 2) {
      // Block if client already has an active loan of this type
      const alreadyHas = clientLoans.some((l: any) => {
        const lt = (l.loanType || l.loan_type || '').toLowerCase();
        return lt === loanType;
      });
      return !!loanType && !alreadyHas;
    }
    if (step === 3) {
      const isCashStep = loanType === 'cash';
      const price = Number(form.principal_amount);
      if (!price || price <= 0) return false;
      if (isCashStep) {
        if (!form.interest_rate || !form.term_months) return false;
      } else {
        // Bike: need deposit < price, and either weekly amount or weeks
        const dep = Number(form.deposit) || 0;
        const bal = price - dep;
        if (dep <= 0 || bal <= 0) return false;
        const hasPayment = Number(form.weekly_installment) > 0;
        const hasWeeks   = Number(form.term_weeks_input) > 0;
        if (!hasPayment && !hasWeeks) return false;
      }
      if (client?.loan_limit && price > Number(client.loan_limit)) return false;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!client) return;
    setError('');
    setSubmitting(true);
    try {
      const isCash = loanType === 'cash';

      if (isCash) {
        // ── CASH LOAN ────────────────────────────────────────────────
        const principal = Number(form.principal_amount);
        const rate      = Number(form.interest_rate);
        const months    = Number(form.term_months);

        // Phase 6.2: prevent submission with zero/empty term
        // Compute bike weeks from form state (weeksInput/calcWeeks are in JSX scope only)
        const _weeksInput = Number(form.term_weeks_input) || 0;
        const _weeklyAmt  = Number(form.weekly_installment) || 0;
        const _balance    = Number(form.principal_amount) || 0;
        const _calcWeeks  = _weeklyAmt > 0 && _balance > 0 ? Math.ceil(_balance / _weeklyAmt) : 0;
        const _activeWeeks = form.bike_mode === 'weeks' ? _weeksInput : _calcWeeks;
        const termVal = isCash ? Number(form.term_months) : _activeWeeks;
        if (!termVal || termVal <= 0) {
          setError('Loan term must be greater than zero.');
          setSubmitting(false);
          return;
        }
        await api.post('/loans/apply', {
            clientId:     client.id,
            amount:       principal,
            months,
            interestRate: rate / 100,
            loanType:     'cash',
            start_date:   form.start_date,
            notes:        form.notes || undefined,
        });

      } else {
        // ── BIKE LOAN (zero interest) ─────────────────────────────────
        const bikePrice = Number(form.principal_amount);
        const deposit   = Number(form.deposit) || 0;
        const balance   = bikePrice - deposit;

        // Resolve weeks + instalment from whichever mode was used
        let weeks      = 0;
        let instalment = 0;
        if (form.weekly_installment && Number(form.weekly_installment) > 0) {
          instalment = Number(form.weekly_installment);
          weeks      = Math.ceil(balance / instalment);
        } else if (form.term_weeks_input && Number(form.term_weeks_input) > 0) {
          weeks      = Number(form.term_weeks_input);
          instalment = Math.ceil(balance / weeks);
        } else {
          throw new Error('Enter either a weekly instalment amount or a repayment period');
        }

        await api.post('/loans/create-bike-loan', {
            client_id:          client.id,
            bike_id:             form.bike_id || undefined,
            principal_amount:   bikePrice,
            deposit,
            term_weeks:          weeks,
            interest_rate:       0,
            notes:               form.notes || undefined,
            weekly_installment:  instalment,
        });
      }

      router.push('/dashboard/loans');
    } catch (e: any) {
      setError(e.message || 'Failed to create loan');
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/loans" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Loans
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Loan</h1>
        <p className="text-sm text-gray-500 mt-1">Complete all steps to submit a loan application</p>
      </div>

      <StepBar step={step} />

      {/* Step content */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {error && (
          <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 mb-5 text-sm ${
            error.includes('Policy') || error.includes('already has') || error.includes('repay')
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              {(error.includes('Policy') || error.includes('already has') || error.includes('repay')) && (
                <p className="font-bold mb-0.5">Application Blocked</p>
              )}
              <p>{error}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <ClientSelector preselectedId={preselectedClientId} onSelect={async c => {
            setClient(c);
            setClientLoans([]);
            // Pre-fetch this client's active loans for instant policy warning on step 3
            try {
              const r = await fetch(`${API_URL}/loans?clientId=${c.id}`, { headers: getHeaders() });
              const j = await r.json();
              const all = Array.isArray(j) ? j : j?.data || [];
              setClientLoans(all.filter((l: any) =>
                ['PENDING_APPROVAL','ACTIVE','DELINQUENT'].includes(l.status)
              ));
            } catch { /* silent */ }
            setStep(2);
          }} />
        )}

        {step === 2 && (
          <div className="space-y-6">
            {clientLoans.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
                <p className="font-bold mb-2">⚠️ This client has active loans</p>
                <ul className="space-y-1.5">
                  {clientLoans.map((l: any) => {
                    const lt = (l.loanType || l.loan_type || '').toLowerCase();
                    const ln = l.loanNumber || l.loan_number || `#${l.id}`;
                    const blocked = lt === loanType;
                    return (
                      <li key={l.id} className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">{ln}</span>
                        <span className="capitalize">{lt} loan</span>
                        <span className="text-amber-700 font-semibold">({l.status})</span>
                        {blocked && (
                          <span className="text-red-700 font-black text-xs">✗ Must repay fully before new {lt} loan</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <LoanTypeSelector selected={loanType} onSelect={setLoanType} />
          </div>
        )}

        {step === 3 && client && (
          <LoanDetailsForm
            loanType={loanType} client={client}
            form={form} setForm={setForm}
            bikes={bikes} loadingBikes={loadingBikes}
          />
        )}

        {step === 4 && client && (
          <ReviewStep client={client} loanType={loanType} form={form} bikes={bikes} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => step > 1 ? setStep(s => (s - 1) as any) : router.push('/dashboard/loans')}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => (s + 1) as any)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Loan Application'}
          </button>
        )}
      </div>
    </div>
  );
}
