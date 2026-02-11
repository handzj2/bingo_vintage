'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBike } from '@/lib/api/bikes';
import { Bike, BikeStatus } from '@/types/bike';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type NewBike = Omit<Bike, 'id' | 'created_at' | 'updated_at'>;

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
    status: 'available',
    assigned_client_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  if (!authLoading && (!user || user.role !== 'admin')) {
    router.replace('/dashboard');
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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Add New Bike
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <input
                type="text"
                required
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Frame & Engine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frame Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.frame_number}
                  onChange={(e) => updateField('frame_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Engine Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.engine_number}
                  onChange={(e) => updateField('engine_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Registration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={form.registration_number || ''}
                onChange={(e) => updateField('registration_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Optional</p>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price (UGX) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.purchase_price}
                  onChange={(e) => updateField('purchase_price', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Price (UGX) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={form.sale_price}
                  onChange={(e) => updateField('sale_price', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as BikeStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
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