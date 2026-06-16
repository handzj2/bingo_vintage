// superadmin/tenants/page.tsx — full tenant onboarding + branch management
// 2026-06-16: enterprise tenant portal with branch allocation
'use client';
import { useEffect, useState } from 'react';
import { superadminApi } from '@/lib/api/superadmin';

interface Tenant {
  id: number; name: string; slug: string; is_active: boolean;
  user_count: number; loan_count: number; created_at: string;
  contact_email?: string; contact_phone?: string; description?: string;
}
interface Branch {
  id: number; name: string; location: string; is_active: boolean;
  manager_name?: string; contact_phone?: string; created_at: string;
}
interface CreateForm {
  name: string; slug: string; description: string;
  adminUsername: string; adminEmail: string; adminPassword: string;
  contactEmail: string; contactPhone: string;
  branchName: string; branchLocation: string;
}
const EMPTY: CreateForm = {
  name: '', slug: '', description: '', adminUsername: '',
  adminEmail: '', adminPassword: '', contactEmail: '', contactPhone: '',
  branchName: 'Main Branch', branchLocation: '',
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

function BranchPanel({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name: '', location: '', managerName: '', contactPhone: '' });
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState<number | null>(null);
  const [error, setError]         = useState('');

  const load = () => {
    setLoading(true);
    superadminApi.listBranches(tenant.id)
      .then((d: any) => {
        const data = d.data ?? d;
        setBranches(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(load, [tenant.id]);

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Branch name is required'); return; }
    setSaving(true); setError('');
    try {
      await superadminApi.createBranch(tenant.id, form);
      setForm({ name: '', location: '', managerName: '', contactPhone: '' });
      setShowAdd(false);
      load();
    } catch (e: any) { setError(e?.message ?? 'Failed to create branch'); }
    finally { setSaving(false); }
  };

  const toggleBranch = async (b: Branch) => {
    setToggling(b.id);
    try {
      await (b.is_active ? superadminApi.deactivateBranch(b.id) : superadminApi.activateBranch(b.id));
      load();
    } catch {}
    finally { setToggling(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-black text-white">{tenant.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Branch Management · {branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition">
              + Add Branch
            </button>
            <button onClick={onClose}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold transition">
              Close
            </button>
          </div>
        </div>

        {/* Add Branch Form */}
        {showAdd && (
          <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-800">
            <h3 className="text-sm font-bold text-purple-300 mb-3">New Branch</h3>
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Branch Name *', 'name', 'text'],
                ['Location / Address', 'location', 'text'],
                ['Manager Name', 'managerName', 'text'],
                ['Contact Phone', 'contactPhone', 'text'],
              ].map(([label, field, type]) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input type={type}
                    value={(form as any)[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} disabled={saving}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold disabled:opacity-50 transition">
                {saving ? 'Creating...' : 'Create Branch'}
              </button>
              <button onClick={() => { setShowAdd(false); setError(''); }}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Branch List */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="bg-gray-800 h-14 rounded-lg animate-pulse" />)
          ) : branches.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-sm">No branches yet</p>
              <p className="text-xs mt-1">Add a branch so cashiers can be assigned</p>
            </div>
          ) : branches.map(b => (
            <div key={b.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white text-sm">{b.name}</span>
                  <StatusDot active={b.is_active} />
                </div>
                <div className="text-xs text-gray-400 flex gap-2 flex-wrap">
                  {b.location && <span>{b.location}</span>}
                  {b.manager_name && <><span>·</span><span>Mgr: {b.manager_name}</span></>}
                  {b.contact_phone && <><span>·</span><span>{b.contact_phone}</span></>}
                </div>
              </div>
              <button
                onClick={() => toggleBranch(b)}
                disabled={toggling === b.id}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                  b.is_active
                    ? 'bg-red-900/40 hover:bg-red-800/60 text-red-300'
                    : 'bg-green-900/40 hover:bg-green-800/60 text-green-300'
                }`}>
                {toggling === b.id ? '...' : b.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<CreateForm>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [toggling, setToggling]   = useState<number | null>(null);
  const [branchTenant, setBranchTenant] = useState<Tenant | null>(null);
  // Extra branches during onboarding
  const [extraBranches, setExtraBranches] = useState<{name:string;location:string}[]>([]);

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

  const addExtraBranch = () => setExtraBranches(b => [...b, { name: '', location: '' }]);
  const removeExtraBranch = (i: number) => setExtraBranches(b => b.filter((_, j) => j !== i));
  const updateExtraBranch = (i: number, field: string, val: string) =>
    setExtraBranches(b => b.map((x, j) => j === i ? { ...x, [field]: val } : x));

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.adminUsername || !form.adminEmail || !form.adminPassword) {
      setError('Name, slug, admin username, email and password are required'); return;
    }
    if (!form.branchName) { setError('Main branch name is required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        ...form,
        additionalBranches: extraBranches.filter(b => b.name.trim()),
      };
      const res   = await superadminApi.createTenant(payload);
      const data: any = res.data ?? res;
      setSuccess(data.message ?? `Tenant "${form.name}" created with ${1 + extraBranches.filter(b=>b.name).length} branch(es)`);
      setShowForm(false); setForm(EMPTY); setExtraBranches([]); load();
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

  const tenantFields: [string, keyof CreateForm, string][] = [
    ['Tenant Name *',    'name',          'text'    ],
    ['Slug *',           'slug',          'text'    ],
    ['Description',      'description',   'text'    ],
    ['Contact Email',    'contactEmail',  'email'   ],
    ['Contact Phone',    'contactPhone',  'text'    ],
  ];
  const adminFields: [string, keyof CreateForm, string][] = [
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
          + Onboard Tenant
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

      {/* Onboarding Form */}
      {showForm && (
        <div className="mb-6 bg-gray-800 rounded-xl p-6 border border-purple-700 space-y-6">
          <div>
            <h2 className="font-black text-purple-300 text-lg mb-1">Onboard New Tenant</h2>
            <p className="text-xs text-gray-500">Creates tenant, seeds all roles, creates admin account, and sets up branches.</p>
          </div>

          {/* Tenant Info */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tenant Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {tenantFields.map(([label, field, type]) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 mb-1 block font-medium">{label}</label>
                  <input type={type} value={form[field]}
                    onChange={e => field === 'name' ? handleNameChange(e.target.value) : setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Admin Account */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Admin Account</h3>
            <div className="grid grid-cols-2 gap-4">
              {adminFields.map(([label, field, type]) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 mb-1 block font-medium">{label}</label>
                  <input type={type} value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-500 mt-2">⚠ Admin will be required to change password on first login.</p>
          </div>

          {/* Branch Setup */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Branch Setup</h3>
            <p className="text-xs text-gray-500 mb-3">At least one branch is required. Cashiers must be assigned to a branch.</p>

            {/* Main Branch */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-3 border border-gray-600">
              <p className="text-xs font-bold text-purple-300 mb-2">Main Branch *</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Branch Name *</label>
                  <input value={form.branchName}
                    onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Main Branch"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Location / Address</label>
                  <input value={form.branchLocation}
                    onChange={e => setForm(f => ({ ...f, branchLocation: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Kampala, Uganda"
                  />
                </div>
              </div>
            </div>

            {/* Additional Branches */}
            {extraBranches.map((b, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4 mb-3 border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-gray-400">Branch {i + 2}</p>
                  <button onClick={() => removeExtraBranch(i)}
                    className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Branch Name *</label>
                    <input value={b.name} onChange={e => updateExtraBranch(i, 'name', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Location</label>
                    <input value={b.location} onChange={e => updateExtraBranch(i, 'location', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addExtraBranch}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold transition">
              + Add Another Branch
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-700">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition disabled:opacity-50">
              {saving ? 'Creating...' : '✓ Create Tenant & Branches'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); setExtraBranches([]); setError(''); }}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tenant List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-800 rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No tenants yet. Onboard your first tenant above.</div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id}
              className="bg-gray-800 border border-gray-700/50 rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-white">{t.name}</span>
                  <StatusDot active={t.is_active} />
                </div>
                <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
                  <span>/{t.slug}</span>
                  <span>·</span>
                  <span>{t.user_count ?? 0} users</span>
                  <span>·</span>
                  <span>{t.loan_count ?? 0} loans</span>
                  {t.contact_email && <><span>·</span><span>{t.contact_email}</span></>}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">
                {new Date(t.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setBranchTenant(t)}
                  className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded-lg text-xs font-bold transition">
                  Branches
                </button>
                <button onClick={() => toggle(t)} disabled={toggling === t.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                    t.is_active
                      ? 'bg-red-900/40 hover:bg-red-800/60 text-red-300'
                      : 'bg-green-900/40 hover:bg-green-800/60 text-green-300'
                  }`}>
                  {toggling === t.id ? '...' : t.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Management Modal */}
      {branchTenant && <BranchPanel tenant={branchTenant} onClose={() => setBranchTenant(null)} />}
    </div>
  );
}
