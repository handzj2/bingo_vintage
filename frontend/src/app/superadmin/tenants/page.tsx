// superadmin/tenants/page.tsx
// RBAC patch 2026-06-15: enterprise tenant management portal
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface Tenant {
  id: number; name: string; slug: string; is_active: boolean;
  user_count: number; loan_count: number; created_at: string;
  contact_email?: string; contact_phone?: string; description?: string;
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

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
      active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-gray-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<CreateForm>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [toggling, setToggling] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    superadminApi.listTenants()
      .then((d: any) => {
        const data = d.data ?? d;
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load tenants'); setLoading(false); });
  };

  useEffect(load, []);

  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f, name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.adminUsername || !form.adminEmail || !form.adminPassword) {
      setError('Name, slug, admin username, email and password are required'); return;
    }
    setError(''); setSaving(true);
    try {
      const res  = await superadminApi.createTenant(form);
      const data: any = res.data ?? res;
      setSuccess(data.message ?? `Tenant "${form.name}" created successfully`);
      setShowForm(false); setForm(EMPTY); load();
    } catch (e: any) { setError(e.message ?? 'Failed to create tenant'); }
    finally { setSaving(false); }
  };

  const toggle = async (t: Tenant) => {
    setToggling(t.id);
    try {
      await (t.is_active ? superadminApi.deactivateTenant(t.id) : superadminApi.activateTenant(t.id));
      load();
    } catch (e: any) { setError(e.message ?? 'Failed to update tenant'); }
    finally { setToggling(null); }
  };

  const fields: [string, keyof CreateForm, string][] = [
    ['Tenant Name *',    'name',          'text'    ],
    ['Slug *',           'slug',          'text'    ],
    ['Description',      'description',   'text'    ],
    ['Contact Email',    'contactEmail',  'email'   ],
    ['Contact Phone',    'contactPhone',  'text'    ],
    ['Admin Username *', 'adminUsername', 'text'    ],
    ['Admin Email *',    'adminEmail',    'email'   ],
    ['Admin Password *', 'adminPassword', 'password'],
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Tenants</h1>
          <p className="text-gray-400 text-sm mt-1">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} on platform</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition">
          + New Tenant
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-5 p-4 bg-green-900/30 border border-green-700 rounded-xl text-green-300 text-sm flex justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-300">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-5 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-gray-800 rounded-xl p-6 border border-purple-700">
          <h2 className="font-bold mb-1 text-purple-300 text-lg">Create New Tenant</h2>
          <p className="text-xs text-gray-500 mb-5">An admin account will be created automatically for the new tenant.</p>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(([label, field, type]) => (
              <div key={field}>
                <label className="text-xs text-gray-400 mb-1 block font-medium">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={e => {
                    if (field === 'name') handleNameChange(e.target.value);
                    else setForm(f => ({ ...f, [field]: e.target.value }));
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleCreate} disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Tenant'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); setError(''); }}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition">
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
      ) : tenants.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No tenants found</div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id}
              className="bg-gray-800 border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-white">{t.name}</span>
                  <StatusDot active={t.is_active} />
                </div>
                <div className="text-xs text-gray-400 flex gap-3">
                  <span>/{t.slug}</span>
                  <span>·</span>
                  <span>{t.user_count ?? 0} users</span>
                  <span>·</span>
                  <span>{t.loan_count ?? 0} loans</span>
                  {t.contact_email && <><span>·</span><span>{t.contact_email}</span></>}
                </div>
              </div>
              {/* Date */}
              <div className="text-xs text-gray-500 flex-shrink-0">
                {new Date(t.created_at).toLocaleDateString()}
              </div>
              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggle(t)}
                  disabled={toggling === t.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                    t.is_active
                      ? 'bg-red-900/40 hover:bg-red-800/60 text-red-300'
                      : 'bg-green-900/40 hover:bg-green-800/60 text-green-300'
                  }`}>
                  {toggling === t.id ? '...' : (t.is_active ? 'Deactivate' : 'Activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
