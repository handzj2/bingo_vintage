'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // ✅ consistent with layout
import { fetchBikes } from '@/lib/api/bikes';
import { Bike, BikeStatus } from '@/types/bike';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Bike as BikeIcon, 
  Plus, 
  Search,
  Loader2 
} from 'lucide-react';

export default function InventoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [filter, setFilter] = useState<BikeStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch bikes
  useEffect(() => {
    const loadBikes = async () => {
      try {
        setLoading(true);
        const data = await fetchBikes();
        setBikes(data);
      } catch (err) {
        setError('Failed to load inventory');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'admin') loadBikes();
  }, [user]);

  // Filtering
  const filtered = bikes
    .filter(bike => filter === 'all' || bike.status === filter)
    .filter(bike =>
      searchTerm
        ? bike.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bike.frame_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bike.engine_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bike.registration_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        : true
    );

  // Stats
  const total = bikes.length;
  const available = bikes.filter(b => b.status === 'available').length;
  const assigned = bikes.filter(b => b.status === 'assigned').length;
  const sold = bikes.filter(b => b.status === 'sold').length;

  const getStatusBadgeVariant = (status: BikeStatus) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned':  return 'bg-blue-100 text-blue-800';
      case 'sold':      return 'bg-gray-100 text-gray-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bike Inventory</h1>
          <p className="text-gray-600 mt-1">Manage motorcycle stock and assignments</p>
        </div>
        <Link href="/dashboard/inventory/add">
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4" /> Add Bike
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Bikes</p>
                <p className="text-2xl font-bold text-blue-600">{total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BikeIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold text-green-600">{available}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BikeIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{assigned}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BikeIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Sold</p>
                <p className="text-2xl font-bold text-gray-600">{sold}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <BikeIcon className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by model, frame, engine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'available', 'assigned', 'sold'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === status
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Model</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Frame #</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Engine #</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Reg #</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Purchase</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Sale</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Margin</th>
                <th className="text-left py-4 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    <BikeIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No bikes found</p>
                    {searchTerm && (
                      <p className="text-sm mt-1">Try adjusting your search</p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((bike) => (
                  <tr
                    key={bike.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/inventory/${bike.id}`)}
                  >
                    <td className="py-3 px-4 font-medium">{bike.model}</td>
                    <td className="py-3 px-4 font-mono text-sm">{bike.frame_number}</td>
                    <td className="py-3 px-4 font-mono text-sm">{bike.engine_number}</td>
                    <td className="py-3 px-4 text-sm">{bike.registration_number || '—'}</td>
                    <td className="py-3 px-4">UGX {bike.purchase_price.toLocaleString()}</td>
                    <td className="py-3 px-4">UGX {bike.sale_price.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={
                        bike.sale_price - bike.purchase_price > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }>
                        UGX {(bike.sale_price - bike.purchase_price).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadgeVariant(bike.status)}>
                        {bike.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}