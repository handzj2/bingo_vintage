'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBikeById, updateBike } from '@/lib/api/bikes';
import { Bike, BikeStatus } from '@/types/bike';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function BikeDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bike, setBike] = useState<Bike | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Load bike data
  useEffect(() => {
    if (!id || user?.role !== 'admin') return;

    const loadBike = async () => {
      try {
        setLoading(true);
        const data = await fetchBikeById(id as string);
        setBike(data);
      } catch (err) {
        setError('Failed to load bike details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadBike();
  }, [id, user]);

  const handleSave = async () => {
    if (!bike) return;
    setError(null);

    // Validation
    if (bike.sale_price <= bike.purchase_price) {
      setError('Sale price must be greater than purchase price');
      return;
    }

    try {
      setSaving(true);
      await updateBike(bike.id, bike);
      router.push('/dashboard/inventory');
    } catch (err) {
      setError('Failed to update bike');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Bike, value: string | number | null) => {
    if (!bike) return;
    setBike({ ...bike, [field]: value });
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Bike not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Badge className={
          bike.status === 'available' ? 'bg-green-100 text-green-800' :
          bike.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }>
          {bike.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Edit Bike: {bike.model}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <input
                type="text"
                required
                value={bike.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  value={bike.frame_number}
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
                  value={bike.engine_number}
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
                value={bike.registration_number || ''}
                onChange={(e) => updateField('registration_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                  value={bike.purchase_price}
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
                  value={bike.sale_price}
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
                value={bike.status}
                onChange={(e) => updateField('status', e.target.value as BikeStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {new Date(bike.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">
                  {new Date(bike.updated_at).toLocaleDateString()}
                </p>
              </div>
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
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}