// superadmin/tenants/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface Tenant {
  id: number; name: string; slug: string; is_active: boolean;
  user_count: number; loan_count: number; created_at: string;
  contact_email?: string;
}

interface CreateForm {
  name: string; slug: string; description: string;
  adminUsername: string; adminEmail: string; adminPassword: string;
  contactEmail: string; contactPhone: string;
}

const EMPTY: CreateForm = {
  name: '', slug: '', description: '', adminUsername: '',
  adminEmail: '', adminPassword: '', contactEmail: '', contactPhone: '',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<CreateForm>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const load = () => {
    setLoading(true);
    superadminApi.listTenants()
      .then((d: any) => {
        const data = d.data ?? d;
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message ?? 'Failed to load tenants');
        setLoading(false);
      });
  };

  useEffect(load, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f, name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleCreate = async () => {
    setError(''); setSaving(true);
    try {
      const res = await superadminApi.createTenant(form);
      const data: any = res.data ?? res;
      setSuccess(data.message ?? 'Tenant created successfully');
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create tenant');
    } finally { setSaving(false); }
  };

  const toggle = async (t: Tenant) => {
    await (t.is_active ? superadminApi.deactivateTenant(t.id) : superadminApi.activateTenant(t.id));
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black">Tenants</h1>
          <p className="text-gray-400 text-sm">{tenants.length} tenants on platform</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition">
          + New Tenant
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-gray-800 rounded-xl p-6 border border-purple-800">
          <h2 className="font-bold mb-4 text-purple-300">Create New Tenant</h2>
          {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Tenant Name',      'name',          'text',     handleNameChange],
              ['Slug',             'slug',          'text',     null],
              ['Description',      'description',   'text',     null],
              ['Contact Email',    'contactEmail',  'email',    null],
              ['Contact Phone',    'contactPhone',  'text',     null],
              ['Admin Username',   'adminUsername', 'text',     null],
              ['Admin Email',      'adminEmail',    'email',    null],
              ['Admin Password',   'adminPassword', 'password', null],
            ].map(([label, field, type, onChange]) => (
              <div key={field as string}>
                <label className="text-xs text-gray-400 mb-1 block">{label as string}</label>
                <input
                  type={type as string}
                  value={(form as any)[field as string]}
                  onChange={e => {
                    if (onChange) (onChange as any)(e.target.value);
                    else setForm(f => ({ ...f, [field as string]: e.target.value }));
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Tenant'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); setError(''); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tenant list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id} className="bg-gray-800 rounded-xl p-5 flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-gray-400">{t.slug} · {t.user_count} users · {t.loan_count} loans</div>
              </div>
              <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</div>
              <a href={`/superadmin/tenants/${t.id}`}
                 className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold transition">
                View
              </a>
              <button onClick={() => toggle(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  t.is_active
                    ? 'bg-red-900/50 hover:bg-red-800 text-red-300'
                    : 'bg-green-900/50 hover:bg-green-800 text-green-300'
                }`}>
                {t.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
