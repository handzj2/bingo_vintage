'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { formatUGX } from '@/shared/api-types';
import { Bike, ArrowLeft, Edit, Package } from 'lucide-react';

interface BikeDetail {
  id:                  number;
  model:               string;
  frame_number:        string;
  engine_number?:      string;
  registration_number?: string;
  sale_price:          number;
  purchase_price:      number;
  status:              string;
  assigned_client_id?: number;
  client?:             { id: number; first_name: string; last_name: string; phone: string } | null;
  loans?:              any[];
  created_at?:         string;
  updated_at?:         string;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  LOANED:      'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  SOLD:        'bg-gray-100 text-gray-600',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

export default function InventoryDetailPage() {
  const { id }          = useParams<{ id: string }>();
  const router          = useRouter();
  const [bike, setBike] = useState<BikeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<BikeDetail>(`/bikes/${id}`).then(res => {
      if (res.success && res.data) setBike(res.data);
      else setError(res.message ?? 'Bike not found');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error || 'Bike not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 text-sm hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const profit = Number(bike.sale_price) - Number(bike.purchase_price);
  const clientName = bike.client
    ? `${bike.client.first_name} ${bike.client.last_name}`
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bike className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bike.model}</h1>
            <p className="text-sm text-gray-500">{bike.frame_number}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[bike.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {bike.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bike Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Bike Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Model" value={bike.model} />
            <Field label="Frame Number" value={bike.frame_number} />
            <Field label="Engine Number" value={bike.engine_number} />
            <Field label="Registration" value={bike.registration_number} />
            <Field label="Status" value={bike.status} />
            <Field label="Assigned Client" value={clientName} />
          </div>
        </div>

        {/* Financials */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Financials</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sale Price"     value={formatUGX(Number(bike.sale_price))} />
            <Field label="Purchase Price" value={formatUGX(Number(bike.purchase_price))} />
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Gross Profit</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatUGX(profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      {bike.client && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 border-b pb-2 mb-4">Assigned Client</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Name"  value={clientName} />
            <Field label="Phone" value={bike.client.phone} />
            <Field label="ID"    value={`#${bike.client.id}`} />
          </div>
        </div>
      )}

      {/* Loan History */}
      {bike.loans && bike.loans.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 border-b pb-2 mb-4">
            Loan History ({bike.loans.length})
          </h2>
          <div className="space-y-3">
            {bike.loans.map((loan: any) => (
              <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-sm">{loan.loan_number ?? loan.loanNumber ?? `#${loan.id}`}</p>
                  <p className="text-xs text-gray-500">{loan.status}</p>
                </div>
                <p className="font-semibold">{formatUGX(Number(loan.principal_amount ?? loan.principalAmount ?? 0))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
