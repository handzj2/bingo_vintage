'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBike } from '@/lib/api/bikes';
import type { Bike } from '@/shared/api-types';
type BikeStatus = Bike['status'];
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type NewBike = Omit<Bike, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'branch_id'>;

export default function AddBikePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<NewBike>({
    model: '',
    frame_number: '',
    engine_number: '',
    registration_number: '',
    purchase_price: 0,
    sale_price: 0,
    status: 'AVAILABLE',
    assigned_client_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: only admin and manager can add bikes
  const role3 = (user?.role ?? '').toLowerCase();
  if (!authLoading && user && !['admin','superadmin','manager'].includes(role3)) {
    router.replace('/dashboard/inventory');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (form.sale_price <= form.purchase_price) {
      setError('Sale price must be greater than purchase price');
      return;
    }

    try {
      setSaving(true);
      await createBike(form);
      router.push('/dashboard/inventory');
    } catch (err) {
      setError('Failed to create bike');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof NewBike, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="border-b border-bv-border pb-4">
        <p className="text-xs text-bv-meta mb-1">
          <a href="/dashboard/inventory" className="hover:underline">Bike inventory</a>
          {' / '}Add
        </p>
        <h1 className="text-lg font-semibold text-bv-text">Add bike</h1>
        <p className="text-sm text-bv-muted mt-0.5">
          Register a unit for the asset book. Frame and engine numbers should be unique before assignment to a loan.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-bv-muted mb-1">
                Model *
              </label>
              <input
                type="text"
                required
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action focus:border-transparent"
              />
            </div>

            {/* Frame & Engine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-bv-muted mb-1">
                  Frame Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.frame_number}
                  onChange={(e) => updateField('frame_number', e.target.value)}
                  className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-bv-muted mb-1">
                  Engine Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.engine_number ?? ''}
                  onChange={(e) => updateField('engine_number', e.target.value)}
                  className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
                />
              </div>
            </div>

            {/* Registration */}
            <div>
              <label className="block text-sm font-medium text-bv-muted mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={form.registration_number || ''}
                onChange={(e) => updateField('registration_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
              />
              <p className="text-xs text-bv-meta mt-1">Optional</p>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-bv-muted mb-1">
                  Purchase Price (UGX) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.purchase_price}
                  onChange={(e) => updateField('purchase_price', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-bv-muted mb-1">
                  Sale Price (UGX) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.sale_price}
                  onChange={(e) => updateField('sale_price', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-bv-muted mb-1">
                Status *
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as BikeStatus)}
                className="w-full px-3 py-2 border border-bv-border rounded-lg focus:ring-2 focus:ring-bv-action"
              >
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-bv-danger-bg border border-bv-danger/30 rounded-lg text-sm text-bv-danger">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-bv-action hover:bg-bv-action-hover text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Bike'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}