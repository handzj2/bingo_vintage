'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LoanDetail, LoanKind } from '@/features/loans/loan.mapper';
import toast from 'react-hot-toast';
import { Loader2, History, CalendarClock, Scale, Edit3 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

type Mode = null | 'reschedule' | 'terms' | 'balance';
type TermKey = 'principalAmount' | 'interestRate' | 'termWeeks' | 'termMonths' | 'weeklyAmount';

/**
 * Loan correction workflows on the loan detail page. Every action needs a written reason
 * (backend enforces it too) and is permission-gated:
 *   Reschedule        PATCH /loans/:id/reschedule         loan.reschedule
 *   Correct terms     PATCH /loans/:id/edit-details       loan.correct_terms
 *   Correct balance   PATCH /loans/:id/correct-balance    loan.correct_balance
 *   History           GET   /loans/:id/correction-history loan.view_correction_history
 *   Approve / reject  POST  /loans/corrections/:id/decide loan.approve_correction
 */
export type CorrectionRequest = { mode: 'reschedule' | 'terms' | 'balance'; n: number };

export default function LoanCorrectionPanel({ loan, onChanged, request }: { loan: LoanDetail; onChanged: () => void; request?: CorrectionRequest | null }) {
  const { user, can } = useAuth();
  const loanId = loan.id;
  const mayResched = can('loan.reschedule'), mayTerms = can('loan.correct_terms'),
        mayBal = can('loan.correct_balance'), mayHist = can('loan.view_correction_history'),
        mayDecide = can('loan.approve_correction');

  const [mode, setMode] = useState<Mode>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [balance, setBalance] = useState('');
  const [booksPaid, setBooksPaid] = useState('');
  const [terms, setTerms] = useState<Record<TermKey, string>>({ principalAmount: '', interestRate: '', termWeeks: '', termMonths: '', weeklyAmount: '' });
  // '' = keep the loan's current type.
  const [newType, setNewType] = useState<'' | LoanKind>('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [histErr, setHistErr] = useState('');

  const loadHistory = useCallback(async () => {
    if (!mayHist) return;
    const res = await api.get<any>(`/loans/${loanId}/correction-history`);
    if (res.success) { setHistory(res.data?.corrections ?? []); setHistErr(''); }
    else setHistErr(res.message || 'Could not load correction history');
  }, [loanId, mayHist]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Header "Correct balance" button asks this panel to open the form and scroll to it.
  useEffect(() => {
    if (!request) return;
    const allowed = request.mode === 'balance' ? mayBal : request.mode === 'terms' ? mayTerms : mayResched;
    if (!allowed) return;
    setMode(request.mode); setErr(''); setConfirmed(false);
    document.getElementById('loan-corrections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);
  // Deep link from the Work Queue: /dashboard/loans/:id#loan-corrections
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#loan-corrections') {
      setTimeout(() => document.getElementById('loan-corrections')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, []);

  if (!(mayResched || mayTerms || mayBal || mayHist)) return null;

  const close = () => { setMode(null); setErr(''); setReason(''); setBalance(''); setBooksPaid(''); setNewType(''); setConfirmed(false); };
  const done = (msg: string) => { toast.success(msg); close(); onChanged(); loadHistory(); };

  const submit = async () => {
    setErr('');
    if (reason.trim().length < 5) return setErr('Please give a reason of at least 5 characters.');
    setBusy(true);
    let res;
    if (mode === 'reschedule') {
      if (!startDate) { setBusy(false); return setErr('Choose the corrected start date.'); }
      res = await api.patch(`/loans/${loanId}/reschedule`, { startDate, reason: reason.trim() });
    } else if (mode === 'balance') {
      const n = Number(balance);
      if (balance.trim() === '' || !Number.isFinite(n) || n < 0) { setBusy(false); return setErr('Enter a valid new balance (0 or more).'); }
      if (n === Number(loan.balance ?? 0)) { setBusy(false); return setErr('The new balance is the same as the current balance.'); }
      if (!confirmed) { setBusy(false); return setErr('Tick the box to confirm the difference is correct.'); }
      res = await api.patch(`/loans/${loanId}/correct-balance`, { newBalance: n, reason: reason.trim() });
    } else {
      const body: Record<string, unknown> = { reason: reason.trim() };
      const switching = newType !== '' && newType !== loan.loanType;
      const finalType: LoanKind = newType || loan.loanType;
      if (switching) {
        body.loanType = newType;
        // The two kinds are scheduled differently, so the new term must be stated, not guessed.
        if (finalType === 'bike' && !(Number(terms.termWeeks) > 0)) { setBusy(false); return setErr('Changing to a bike loan needs the term in weeks.'); }
        if (finalType === 'cash' && !(Number(terms.termMonths) > 0)) { setBusy(false); return setErr('Changing to a cash loan needs the term in months.'); }
      }
      (Object.keys(terms) as TermKey[]).forEach((k) => {
        if (terms[k] === '') return;
        // Interest is typed as a percentage (15) and stored as a fraction (0.15), as on the Edit form.
        body[k] = k === 'interestRate' ? Number(terms[k]) / 100 : Number(terms[k]);
      });
      if (startDate) body.startDate = startDate;
      if (Object.keys(body).length < 2) { setBusy(false); return setErr('Change at least one term.'); }
      res = await api.patch(`/loans/${loanId}/edit-details`, body);
    }
    setBusy(false);
    if (!res.success) { setErr(res.message || 'The correction was rejected'); toast.error(res.message || 'Correction failed'); return; }
    if (mode === 'balance' && (res.data as any)?.status === 'PENDING') {
      done('Balance correction submitted — a second authorised user must approve it before the balance changes');
    } else {
      done(mode === 'reschedule' ? 'Loan rescheduled' : mode === 'balance' ? 'Balance corrected' : 'Loan terms corrected');
    }
  };

  const decide = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    const res = await api.post(`/loans/corrections/${id}/decide`, { decision });
    if (res.success) { toast.success(decision === 'APPROVE' ? 'Correction approved' : 'Correction rejected'); onChanged(); loadHistory(); }
    else toast.error(res.message || 'Decision failed');
  };

  // Same loan states the backend accepts for a balance correction.
  const balanceCorrectable = ['ACTIVE', 'COMPLETED', 'DEFAULTED'].includes(String(loan.status));
  const appliesNow = mayDecide || ['admin', 'superadmin'].includes(String(user?.role ?? '').toLowerCase());
  const curBal = Number(loan.balance ?? 0);
  // Align-to-books helper: contract total minus what the books say was collected.
  const contractTotal = loan.totalAmount > 0 ? loan.totalAmount : NaN;
  const systemPaid = Number.isFinite(contractTotal) ? contractTotal - curBal : NaN;
  const booksPaidNum = booksPaid.trim() === '' ? NaN : Number(booksPaid);
  const newBalNum = balance.trim() === '' ? NaN : Number(balance);
  const delta = Number.isFinite(newBalNum) ? newBalNum - curBal : null;
  const fmt = (n: number) => Math.abs(n).toLocaleString();
  const snap = (v: any) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };
  const field = 'mt-1 w-full border border-bv-border rounded-bv px-3 py-2 bg-bv-surface text-sm';
  return (
    <section id="loan-corrections" className="scroll-mt-24 border border-bv-border rounded-bv p-4 space-y-4 bg-bv-surface" aria-label="Loan corrections">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-bv-text">Corrections</h2>
        <div className="flex flex-wrap gap-2">
          {mayResched && <button type="button" onClick={() => setMode('reschedule')} className="px-3 py-1.5 text-xs font-semibold border border-bv-border rounded-lg flex items-center gap-1.5 hover:bg-bv-hover"><CalendarClock className="w-3.5 h-3.5" />Reschedule</button>}
          {mayTerms && <button type="button" onClick={() => setMode('terms')} className="px-3 py-1.5 text-xs font-semibold border border-bv-border rounded-lg flex items-center gap-1.5 hover:bg-bv-hover"><Edit3 className="w-3.5 h-3.5" />Correct terms</button>}
          {mayBal && balanceCorrectable && <button type="button" onClick={() => setMode('balance')} className="px-3 py-1.5 text-xs font-semibold border border-bv-border rounded-lg flex items-center gap-1.5 hover:bg-bv-hover"><Scale className="w-3.5 h-3.5" />Correct balance</button>}
        </div>
      </div>
      <p className="text-xs text-bv-meta">Corrections keep all payments and receipts. Each one is recorded with your name and reason.</p>

      {mode && (
        <div className="border border-bv-border rounded-bv p-3 space-y-3 bg-bv-hover/40">
          <h3 className="text-sm font-semibold">{mode === 'reschedule' ? 'Reschedule loan' : mode === 'balance' ? 'Correct balance' : 'Correct loan terms'}</h3>
          {mode === 'reschedule' && <label className="block text-sm">New start date<input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>}
          {mode === 'balance' && Number.isFinite(contractTotal) && (
            <div className="text-sm border border-bv-border rounded-bv p-3 space-y-2 bg-bv-surface">
              <p className="font-medium">Align to the books</p>
              <p className="text-xs text-bv-meta">Contract total {contractTotal.toLocaleString()} · system shows {systemPaid.toLocaleString()} paid · balance {curBal.toLocaleString()}</p>
              <label className="block text-sm">Total paid per books (UGX)
                <input type="number" min={0} className={field} value={booksPaid} placeholder="e.g. 7880000"
                  onChange={(e) => {
                    setBooksPaid(e.target.value); setConfirmed(false);
                    const n = Number(e.target.value);
                    setBalance(e.target.value.trim() !== '' && Number.isFinite(n) && n >= 0 ? String(Math.max(0, contractTotal - n)) : '');
                  }} /></label>
              {Number.isFinite(booksPaidNum) && (
                <p className="text-xs">{contractTotal.toLocaleString()} − {booksPaidNum.toLocaleString()} = <b>{Math.max(0, contractTotal - booksPaidNum).toLocaleString()}</b>{booksPaidNum > contractTotal ? ' (books show more paid than the contract total; balance set to 0)' : ''}</p>
              )}
              <p className="text-xs text-bv-meta">If the system and books differ because some payments were wrong, reverse those payments first (client → Payments tab) instead of overriding the balance.</p>
            </div>
          )}
          {mode === 'balance' && <label className="block text-sm">New outstanding balance (UGX) <span className="text-bv-meta">— currently {Number(loan.balance ?? 0).toLocaleString()}</span>
            <input type="number" min={0} className={field} value={balance} onChange={(e) => { setBalance(e.target.value); setConfirmed(false); }} /></label>}
          {mode === 'balance' && delta !== null && delta !== 0 && (
            <div className="text-sm border border-bv-border rounded-bv p-3 space-y-1 bg-bv-surface">
              <p>Balance goes from <b>{curBal.toLocaleString()}</b> to <b>{newBalNum.toLocaleString()}</b> UGX ({delta > 0 ? '+' : '−'}{fmt(delta)}).</p>
              {newBalNum === 0 && <p className="text-bv-meta">The loan will be marked COMPLETED.</p>}
              {newBalNum > 0 && String(loan.status) === 'COMPLETED' && <p className="text-bv-meta">The loan will be re-opened as ACTIVE.</p>}
              <p className="text-bv-meta">{appliesNow ? 'You can approve corrections, so this applies immediately.' : 'This will be queued; a second authorised user must approve it before the balance changes.'} Payments and receipts are not altered.</p>
              <label className="flex items-start gap-2 pt-1"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I have checked this difference against the payment records.</label>
            </div>
          )}
          {mode === 'terms' && (() => {
            const kind: LoanKind = newType || loan.loanType;
            const switching = kind !== loan.loanType;
            const fields: [TermKey, string][] = [
              ['principalAmount', 'Principal'],
              ['interestRate', `Interest rate (%) — ${kind === 'bike' ? 'weekly' : 'monthly'}`],
              ...(kind === 'bike'
                ? ([['termWeeks', 'Term (weeks)'], ['weeklyAmount', 'Weekly amount']] as [TermKey, string][])
                : ([['termMonths', 'Term (months)']] as [TermKey, string][])),
            ];
            return (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm col-span-2">Loan type
                  <select className={field} value={newType || loan.loanType} onChange={(e) => setNewType(e.target.value === loan.loanType ? '' : (e.target.value as LoanKind))}>
                    <option value="bike">Bike loan — weekly instalments</option>
                    <option value="cash">Cash loan — monthly instalments</option>
                  </select>
                  {switching && <span className="block text-xs text-bv-warning mt-1">Changing the type rebuilds the schedule as {kind === 'bike' ? 'weekly' : 'monthly'}. Enter the {kind === 'bike' ? 'term in weeks' : 'term in months'} below. Payments, receipts and history are kept.</span>}
                </label>
                {fields.map(([k, label]) => (
                  <label key={k} className="block text-sm">{label}<input type="number" min={0} step="any" placeholder={switching && (k === 'termWeeks' || k === 'termMonths') ? 'required' : 'unchanged'} className={field} value={terms[k]} onChange={(e) => setTerms({ ...terms, [k]: e.target.value })} /></label>
                ))}
                <label className="block text-sm">Start date<input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
              </div>
            );
          })()}
          <label className="block text-sm">Reason (required)<textarea rows={2} className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          {err && <p className="text-sm text-bv-danger">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={close} disabled={busy} className="px-4 py-2 text-sm border border-bv-border rounded-lg">Cancel</button>
            <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 text-sm font-semibold bg-bv-action text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? 'Saving…' : mode === 'balance' && !appliesNow ? 'Submit for approval' : 'Apply correction'}
            </button>
          </div>
        </div>
      )}

      {mayHist && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-bv-meta flex items-center gap-1.5"><History className="w-3.5 h-3.5" />History</h3>
          {histErr && <p className="text-sm text-bv-danger">{histErr}</p>}
          {history === null && !histErr && <Loader2 className="w-4 h-4 animate-spin" />}
          {history && history.length === 0 && <p className="text-sm text-bv-meta">No corrections recorded for this loan.</p>}
          {history && history.length > 0 && (
            <ul className="divide-y divide-bv-border border border-bv-border rounded-bv">
              {history.map((c) => (
                <li key={c.id} className="px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{String(c.correction_type ?? '').replace(/_/g, ' ')} · <span className="text-bv-meta">{c.status}</span></p>
                    {String(c.correction_type) === 'BALANCE' && snap(c.previous_snapshot)?.balance != null && snap(c.new_snapshot)?.balance != null && (
                      <p className="text-xs text-bv-text">UGX {Number(snap(c.previous_snapshot).balance).toLocaleString()} → {Number(snap(c.new_snapshot).balance).toLocaleString()}</p>
                    )}
                    <p className="text-xs text-bv-muted">{c.reason}</p>
                    <p className="text-xs text-bv-meta">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</p>
                  </div>
                  {c.status === 'PENDING' && mayDecide && Number(c.requested_by_id) !== Number(user?.id) && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => decide(c.id, 'APPROVE')} className="px-3 py-1 text-xs font-semibold bg-bv-action text-white rounded-lg">Approve</button>
                      <button type="button" onClick={() => decide(c.id, 'REJECT')} className="px-3 py-1 text-xs font-semibold border border-bv-danger text-bv-danger rounded-lg">Reject</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
