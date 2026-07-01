'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bike as BikeIcon, Plus, Search, Loader2,
  Pencil, Trash2, X, AlertCircle, Save
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

type BikeStatus = 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' | 'SOLD';
interface Bike {
  id: number;
  model: string;
  frame_number: string;
  engine_number?: string;
  registration_number?: string;
  sale_price: number;
  purchase_price: number;
  status: BikeStatus;
  assigned_client_id?: number;
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({ bike, onClose, onDone }: { bike: Bike; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    model:               bike.model || '',
    frame_number:        bike.frame_number || '',
    engine_number:       bike.engine_number || '',
    registration_number: bike.registration_number || '',
    sale_price:          String(bike.sale_price || ''),
    purchase_price:      String(bike.purchase_price || ''),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    setError('');
    if (!form.model.trim())        return setError('Model is required');
    if (!form.frame_number.trim()) return setError('Frame number is required');
    if (!form.sale_price)          return setError('Sale price is required');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/bikes/${bike.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          model:               form.model.trim(),
          frame_number:        form.frame_number.trim(),
          engine_number:       form.engine_number.trim() || undefined,
          registration_number: form.registration_number.trim() || undefined,
          sale_price:          Number(form.sale_price),
          purchase_price:      Number(form.purchase_price) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      onDone();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pencil className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">Edit Bike</h2>
              <p className="text-orange-200 text-xs">{bike.model} · {bike.frame_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-orange-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
            <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold ${
              bike.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
              bike.status === 'LOANED'    ? 'bg-blue-100 text-blue-800'   :
              bike.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>{bike.status}</span>
            {bike.status === 'LOANED' && <span className="text-xs text-gray-400 ml-2">managed by loans</span>}
          </div>

          {[
            { label: 'Model / Make',              field: 'model',               placeholder: 'e.g. Bajaj Boxer BM 150' },
            { label: 'Frame Number',              field: 'frame_number',        placeholder: 'e.g. MD2DHDHZZSCM12345'  },
            { label: 'Engine Number',             field: 'engine_number',       placeholder: 'e.g. DHZZSCM12345'       },
            { label: 'Registration / Plate #',    field: 'registration_number', placeholder: 'e.g. UAP 123B'           },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
              <input
                type="text"
                value={(form as any)[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Purchase Price (UGX)', field: 'purchase_price' },
              { label: 'Sale Price (UGX)',     field: 'sale_price'     },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                <input type="number"
                  value={(form as any)[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
          </div>

          {Number(form.sale_price) > 0 && Number(form.purchase_price) >= 0 && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-emerald-700 font-semibold">Margin</span>
              <span className="font-black text-emerald-700">{fmt(Number(form.sale_price) - Number(form.purchase_price))}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-gray-50 pt-4">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────
function DeleteModal({ bike, onClose, onDone }: { bike: Bike; onClose: () => void; onDone: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/bikes/${bike.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      onDone();
    } catch (e: any) { setError(e.message); setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-lg">Delete Bike</h2>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-bold text-red-800 text-sm mb-3">This cannot be undone</p>
            <div className="bg-white border border-red-100 rounded-xl px-4 py-3 space-y-1">
              <p className="font-bold text-gray-900">{bike.model}</p>
              <p className="text-xs text-gray-500">Frame: {bike.frame_number}</p>
              {bike.engine_number && <p className="text-xs text-gray-500">Engine: {bike.engine_number}</p>}
              {bike.registration_number && <p className="text-xs text-gray-500">Plate: {bike.registration_number}</p>}
              <p className="text-xs font-semibold text-orange-600 mt-1">Sale Price: {fmt(bike.sale_price)}</p>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function InventoryPage() {
  const { user, isLoading: authLoading, can } = useAuth();
  const router   = useRouter();
  // RBAC: use permission matrix — toggles in Settings now affect access
  const role     = (user?.role ?? '').toLowerCase();
  const isAdmin  = role === 'admin' || role === 'superadmin';
  // canEdit: only admin/superadmin/manager can edit bike inventory.
  // Deliberately not using can('client.edit') here — that permission
  // governs client record editing, not bike inventory. Mixing the two
  // caused cashiers with client.edit enabled to see the edit button
  // but receive a 403 from the backend (which correctly guards PATCH
  // /bikes with admin/manager roles only).
  const canEdit  = isAdmin || role === 'manager';
  // Guard: only roles with view_inventory permission can access
  if (!authLoading && user && !['admin','superadmin','manager','cashier','agent'].includes(role)) {
    router.replace('/dashboard');
    return null;
  }

  const [bikes, setBikes]       = useState<Bike[]>([]);
  const [filter, setFilter]     = useState<BikeStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editing, setEditing]   = useState<Bike | null>(null);
  const [deleting, setDeleting] = useState<Bike | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/dashboard');
  }, [user, authLoading, router]);

  const loadBikes = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/bikes`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load');
      setBikes(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadBikes(); }, [user]);

  const filtered = bikes
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b =>
      searchTerm
        ? b.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.frame_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (b.engine_number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (b.registration_number ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

  const stats = {
    total:       bikes.length,
    available:   bikes.filter(b => b.status === 'AVAILABLE').length,
    loaned:      bikes.filter(b => b.status === 'LOANED').length,
    maintenance: bikes.filter(b => b.status === 'MAINTENANCE').length,
    sold:        bikes.filter(b => b.status === 'SOLD').length,
  };

  const statusCls = (s: BikeStatus) => ({
    AVAILABLE:   'bg-green-100 text-green-800',
    LOANED:      'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    SOLD:        'bg-gray-100 text-gray-600',
  }[s] ?? 'bg-gray-100 text-gray-600');

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={loadBikes} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bike Inventory</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage stock — edit prices, plate numbers, and details</p>
        </div>
        {/* Only admin/manager can add bikes */}
        {canEdit && (
          <Link href="/dashboard/inventory/add"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Bike
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     val: stats.total,     cls: 'text-blue-600'   },
          { label: 'Available', val: stats.available, cls: 'text-green-600'  },
          { label: 'On Loan',   val: stats.loaned,    cls: 'text-orange-600' },
          { label: 'Sold',      val: stats.sold,      cls: 'text-gray-500'   },
        ].map(({ label, val, cls }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-black ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search model, frame, engine, plate..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'AVAILABLE', 'LOANED', 'MAINTENANCE', 'SOLD'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                filter === s ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="font-bold text-gray-900 text-sm">{filtered.length} bike{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Model', 'Frame #', 'Engine #', 'Plate #', 'Purchase', 'Sale Price', 'Margin', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <BikeIcon className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                    <p className="font-semibold text-gray-400">No bikes found</p>
                    {searchTerm && <p className="text-xs text-gray-300 mt-1">Try adjusting your search</p>}
                  </td>
                </tr>
              ) : (
                filtered.map(bike => (
                  <tr key={bike.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{bike.model}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-700">{bike.frame_number}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">{bike.engine_number || '—'}</td>
                    <td className="py-3.5 px-4 text-sm font-semibold">{bike.registration_number || '—'}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">{fmt(bike.purchase_price)}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{fmt(bike.sale_price)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-semibold ${bike.sale_price - bike.purchase_price > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(bike.sale_price - bike.purchase_price)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusCls(bike.status)}`}>{bike.status}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button onClick={() => setEditing(bike)}
                            className="p-2 text-orange-400 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Edit bike details">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleting(bike)}
                            disabled={bike.status === 'LOANED'}
                            className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={bike.status === 'LOANED' ? 'Cannot delete — bike is on loan' : 'Delete permanently'}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => router.push(`/dashboard/inventory/${bike.id}`)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                          View →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditModal bike={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); loadBikes(); }} />
      )}
      {deleting && (
        <DeleteModal bike={deleting} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); loadBikes(); }} />
      )}
    </div>
  );
}
