'use client';

/**
 * ReceiptModal + ReceiptButton
 *
 * ReceiptModal — renders a print-ready receipt from backend data.
 *   • Shows VOID watermark + banner for reversed payments.
 *   • Shows REPRINT banner when backend flags it.
 *   • window.print() hides everything except .receipt-print-area via CSS.
 *   • Handles loading and error states inline.
 *
 * ReceiptButton — drop-in button that fetches receipt data and opens the modal.
 *   variant:
 *     "icon"    — small printer icon only (table rows)
 *     "ghost"   — icon + "Print Receipt" text, outlined style (detail modals)
 *     "primary" — filled blue button (success screen)
 */

import { useState } from 'react';
import { Printer, X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import {
  fetchReceiptByPaymentId,
  fetchReceiptByNumber,
  type ReceiptData,
} from './receipt.api';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: any) =>
  d ? new Date(d).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' }) : '';

// ─── ReceiptModal ─────────────────────────────────────────────────────────────
interface ReceiptModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  const handlePrint = () => window.print();

  const isBike    = receipt.loan_type === 'bike' || Boolean(receipt.bike_plate);
  const payDate   = receipt.payment_date ? new Date(receipt.payment_date) : new Date();

  return (
    <>
      {/* ── Print-only CSS ────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > *                        { display: none !important; }
          .receipt-print-area             { display: block !important; }
          .receipt-print-area .no-print   { display: none !important; }
          .receipt-modal-overlay          { display: none !important; }
          .receipt-print-area             {
            position: fixed; top: 0; left: 0; width: 100%;
            background: white; z-index: 99999;
          }
        }
        @media screen {
          .receipt-print-area { display: block; }
        }
      `}</style>

      {/* ── Screen overlay ────────────────────────────────────────────────── */}
      <div
        className="receipt-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto flex flex-col">

          {/* modal header — hidden on print */}
          <div className="no-print flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h3 className="text-base font-black text-gray-900">
                {receipt.is_void ? '🚫 Void Receipt' : receipt.reprint ? '🔁 Re-print Receipt' : '🧾 Receipt'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{receipt.receipt_no}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors no-print">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ── Printable receipt body ───────────────────────────────────── */}
          <div className="receipt-print-area p-5 flex-1">

            {/* void / reprint banners */}
            {receipt.is_void && (
              <div className="no-print mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs font-bold text-red-600 flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                REVERSED — {receipt.void_reason || 'Payment reversed'}
              </div>
            )}
            {receipt.reprint && !receipt.is_void && (
              <div className="no-print mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-amber-600">
                RE-PRINT — original print already recorded
              </div>
            )}

            {/* receipt paper */}
            <div
              className="relative border-2 border-dashed border-gray-300 rounded-2xl p-5 font-mono text-xs space-y-3"
              style={{ fontFamily: 'ui-monospace, Courier New, monospace' }}
            >
              {/* void watermark (print visible) */}
              {receipt.is_void && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ transform: 'rotate(-35deg)' }}
                >
                  <span
                    className="text-red-200 font-black tracking-widest select-none"
                    style={{ fontSize: '64px', opacity: 0.35 }}
                  >
                    VOID
                  </span>
                </div>
              )}

              {/* header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-300 pb-3">
                <p className="text-sm font-black tracking-widest uppercase">
                  {receipt.company_name || 'BINGO VINTAGE'}
                </p>
                {receipt.branch_name && (
                  <p className="text-gray-500">{receipt.branch_name}</p>
                )}
                {(receipt.branch_location || receipt.company_phone) && (
                  <p className="text-gray-400">
                    {[receipt.branch_location, receipt.company_phone].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-gray-400 font-bold mt-1">OFFICIAL PAYMENT RECEIPT</p>
              </div>

              {/* receipt meta */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <Row label="Receipt #"  value={receipt.receipt_no}         mono />
                <Row label="Date"       value={fmtDate(receipt.payment_date)} />
                <Row label="Time"       value={fmtTime(receipt.payment_date)} />
                <Row label="Method"     value={receipt.payment_method} />
                {receipt.transaction_id && receipt.transaction_id !== '—' && (
                  <Row label="Txn ID"   value={receipt.transaction_id} mono />
                )}
              </div>

              {/* client / loan */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <Row label="Client"     value={receipt.client_name} />
                {receipt.client_phone && receipt.client_phone !== '—' && (
                  <Row label="Phone"    value={receipt.client_phone} />
                )}
                {receipt.client_id_number && receipt.client_id_number !== '—' && (
                  <Row label="ID No."   value={receipt.client_id_number} />
                )}
                <Row label="Loan #"     value={receipt.loan_number} mono />
                <Row
                  label="Loan Type"
                  value={isBike ? '🏍 Bike Loan' : '💵 Cash Loan'}
                />
                {isBike && receipt.bike_plate && (
                  <Row label="Plate"    value={receipt.bike_plate} mono />
                )}
                {isBike && receipt.bike_model && (
                  <Row label="Model"    value={receipt.bike_model} />
                )}
              </div>

              {/* payment breakdown */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <p className="font-black text-gray-600 uppercase text-[10px] tracking-wider">Payment Breakdown</p>
                <Row label="Principal"  value={fmt(receipt.principal_paid)} />
                <Row label="Interest"   value={fmt(receipt.interest_paid)} />
                <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 mt-1">
                  <span className="font-black text-gray-800">TOTAL PAID</span>
                  <span className="font-black text-gray-900 text-sm">{fmt(receipt.amount)}</span>
                </div>
              </div>

              {/* balance */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <Row label="Loan Balance" value={fmt(receipt.balance_remaining)} bold />
              </div>

              {/* staff + notes */}
              <div className="space-y-1.5">
                <Row label="Collected By" value={receipt.collected_by} />
                {receipt.notes && (
                  <Row label="Notes" value={receipt.notes} />
                )}
                <Row
                  label="Printed"
                  value={`${fmtDate(receipt.printed_at)} ${fmtTime(receipt.printed_at)}`}
                />
              </div>

              {/* footer */}
              <div className="text-center text-gray-400 border-t border-dashed border-gray-300 pt-3 space-y-0.5">
                <p>Thank you for your payment</p>
                {receipt.reprint && <p className="font-bold">** RE-PRINT **</p>}
                {receipt.is_void && <p className="font-black text-red-500">** VOID — REVERSED **</p>}
              </div>
            </div>

            {/* action buttons — hidden on print */}
            <div className="no-print mt-4 flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Simple label/value row ───────────────────────────────────────────────────
function Row({
  label, value, mono = false, bold = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={`text-right break-all ${bold ? 'font-black text-gray-900' : 'font-semibold text-gray-800'} ${mono ? 'font-mono' : ''}`}
      >
        {String(value || '—')}
      </span>
    </div>
  );
}

// ─── ReceiptButton ────────────────────────────────────────────────────────────
interface ReceiptButtonProps {
  /** Fetch by payment numeric ID (preferred) */
  paymentId?: number;
  /** Fetch by receipt number string (fallback) */
  receiptNumber?: string;
  /** "icon" = printer icon only  |  "ghost" = icon + text, outlined  |  "primary" = filled */
  variant?: 'icon' | 'ghost' | 'primary';
  /** Called after the modal is opened successfully */
  onSuccess?: (receipt: ReceiptData) => void;
}

export function ReceiptButton({
  paymentId,
  receiptNumber,
  variant = 'ghost',
  onSuccess,
}: ReceiptButtonProps) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [receipt, setReceipt]   = useState<ReceiptData | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent table-row click bubbling
    setError('');
    setLoading(true);
    try {
      let data: ReceiptData;
      if (paymentId) {
        data = await fetchReceiptByPaymentId(paymentId);
      } else if (receiptNumber) {
        data = await fetchReceiptByNumber(receiptNumber);
      } else {
        throw new Error('No payment ID or receipt number provided');
      }
      setReceipt(data);
      onSuccess?.(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load receipt');
    } finally {
      setLoading(false);
    }
  };

  const buttonClass = {
    icon: 'p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors',
    ghost: 'flex items-center gap-2 px-3 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-bold transition-colors',
    primary: 'flex items-center justify-center gap-2 flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all',
  }[variant];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        title="Print Receipt"
        className={buttonClass}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Printer className="w-3.5 h-3.5" />
        }
        {variant !== 'icon' && (loading ? 'Loading...' : '🖨️ Print Receipt')}
      </button>

      {error && (
        <span
          className="inline-flex items-center gap-1 text-xs text-red-500 ml-1"
          title={error}
        >
          <AlertCircle className="w-3 h-3" />
          {error.length > 40 ? error.slice(0, 40) + '…' : error}
        </span>
      )}

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </>
  );
}
