'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Plus, Pencil, Trash2, KeyRound, ShieldCheck, ShieldOff,
  Save, Eye, EyeOff, X, Check, UserCog, SlidersHorizontal,
  ChevronRight, Shield, Lock, AlertTriangle, Loader2,
  ToggleLeft, ToggleRight, Info, ShieldAlert, RefreshCw,
  User, Clock, Copy, CheckCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const api = {
  h() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  },
  async get(p: string)           { const r = await fetch(`${API_URL}${p}`, { headers: this.h() }); return r.json(); },
  async post(p: string, b: any)  { const r = await fetch(`${API_URL}${p}`, { method:'POST',   headers: this.h(), body: JSON.stringify(b) }); return r.json(); },
  async patch(p: string, b: any) { const r = await fetch(`${API_URL}${p}`, { method:'PATCH',  headers: this.h(), body: JSON.stringify(b) }); return r.json(); },
  async put(p: string, b: any)   { const r = await fetch(`${API_URL}${p}`, { method:'PUT',    headers: this.h(), body: JSON.stringify(b) }); return r.json(); },
  async del(p: string)           { const r = await fetch(`${API_URL}${p}`, { method:'DELETE', headers: this.h() }); return r.json(); },
};

const ROLES = ['admin', 'manager', 'cashier', 'agent'];
const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-purple-100 text-purple-700 border-purple-200',
  cashier: 'bg-blue-100 text-blue-700 border-blue-200',
  agent:   'bg-green-100 text-green-700 border-green-200',
};

const PERMISSION_GROUPS = [
  {
    group: 'Pages & Navigation',
    icon: '🗂️',
    permissions: [
      { key: 'view_dashboard',  label: 'Dashboard',        desc: 'Access the main dashboard',                  defaults: ['admin','manager','cashier','agent'] },
      { key: 'view_clients',    label: 'Clients',          desc: 'View and search client records',             defaults: ['admin','manager','agent'] },
      { key: 'view_loans',      label: 'Loans',            desc: 'View loan list and loan details',            defaults: ['admin','manager','agent'] },
      { key: 'view_payments',   label: 'Payments',         desc: 'View the payments page',                     defaults: ['admin','manager','cashier'] },
      { key: 'view_inventory',  label: 'Inventory',        desc: 'View bike inventory',                        defaults: ['admin','manager','cashier'] },
      { key: 'view_schedules',  label: 'Schedules',        desc: 'View loan repayment schedules',              defaults: ['admin','manager','cashier'] },
      { key: 'view_reports',    label: 'Reports',          desc: 'Access financial and portfolio reports',     defaults: ['admin','manager'] },
      { key: 'view_audit',      label: 'Audit Logs',       desc: 'View full system audit trail',               defaults: ['admin'] },
      { key: 'view_reversals',  label: 'Reversals',        desc: 'Access the reversals page',                  defaults: ['admin','manager','cashier'] },
      { key: 'view_settings',   label: 'Settings',         desc: 'Access system settings',                     defaults: ['admin'] },
    ],
  },
  {
    group: 'Client Actions',
    icon: '👤',
    permissions: [
      { key: 'create_clients',  label: 'Register Clients', desc: 'Create new client records',                  defaults: ['admin','manager','agent'] },
      { key: 'edit_clients',    label: 'Edit Clients',     desc: 'Modify existing client information',         defaults: ['admin','manager'] },
      { key: 'delete_clients',  label: 'Delete Clients',   desc: 'Permanently remove client records',          defaults: ['admin'] },
    ],
  },
  {
    group: 'Loan Actions',
    icon: '💰',
    permissions: [
      { key: 'create_loans',    label: 'Create Loans',     desc: 'Submit new loan applications',               defaults: ['admin','manager','agent'] },
      { key: 'approve_loans',   label: 'Approve Loans',    desc: 'Approve or reject loan applications',        defaults: ['admin','manager'] },
      { key: 'edit_loans',      label: 'Edit Loans',       desc: 'Modify existing loan terms',                 defaults: ['admin'] },
    ],
  },
  {
    group: 'Payment Actions',
    icon: '🧾',
    permissions: [
      { key: 'create_payments',  label: 'Record Payments',  desc: 'Enter new payment transactions',            defaults: ['admin','manager','cashier'] },
      { key: 'request_reversal', label: 'Request Reversal', desc: 'Submit a reversal request to admin',        defaults: ['admin','manager','cashier'] },
      { key: 'approve_reversal', label: 'Approve Reversals',desc: 'Approve or reject reversal requests',       defaults: ['admin','manager'] },
    ],
  },
];

function defaultPermsForRole(role: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => {
    out[p.key] = p.defaults.includes(role);
  }));
  return out;
}

function resolvePerms(user: any): Record<string, boolean> {
  return { ...defaultPermsForRole(user.role || 'cashier'), ...(user.permissions || {}) };
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function UserFormModal({ user, onClose, onSaved }: any) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '', email: user?.email || '',
    full_name: user?.fullName || user?.full_name || '',
    role: user?.role || 'cashier', password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.username || !form.email || !form.full_name) return setError('All fields are required');
    if (!isEdit && form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = isEdit
        ? await api.patch(`/users/${user.id}`, { email: form.email, full_name: form.full_name })
        : await api.post('/users', {
          username:   form.username,
          email:      form.email,
          password:   form.password,
          full_name:  form.full_name,
        });
      if (res.id || res.success) { onSaved(); onClose(); }
      else setError(res.message || 'Failed to save');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit User' : 'Create New User'} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {(['full_name','username','email'] as const).map(field => (
          <div key={field}>
            <label className="block text-sm font-semibold text-gray-700 mb-1 capitalize">{field.replace('_',' ')}</label>
            <input type={field==='email'?'email':'text'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})}
              disabled={isEdit && field === 'username'} />
          </div>
        ))}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
          <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 6 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({ user, onClose }: any) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (form.newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (form.newPassword !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const res = await api.put(`/users/${user.id}/change-password`, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (res.success || res.id || res.message?.toLowerCase().includes('success')) { setSuccess(true); setTimeout(onClose, 1500); }
      else setError(res.message || 'Failed to change password');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Change Password — ${user.username}`} onClose={onClose}>
      <div className="space-y-4">
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2"><Check className="w-4 h-4" /> Password changed!</div>}
        {(['currentPassword','newPassword','confirm'] as const).map(field => (
          <div key={field}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {field === 'confirm' ? 'Confirm New Password' : field === 'newPassword' ? 'New Password' : 'Current Password'}
            </label>
            <div className="relative">
              <input type={show ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})} />
              {field === 'newPassword' && (
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PermissionsModal({ user, onClose, onSaved }: any) {
  const [perms, setPerms]   = useState<Record<string,boolean>>(resolvePerms(user));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);

  const toggle = (key: string) => setPerms(p => ({ ...p, [key]: !p[key] }));
  const resetToDefaults = () => setPerms(defaultPermsForRole(user.role));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await api.patch(`/users/${user.id}/permissions`, { permissions: perms });
      if (res.id || res.permissions !== undefined || res.success) {
        setSaved(true);
        setTimeout(() => { onSaved(); onClose(); }, 700);
      } else setError(res.message || 'Failed to save');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const customised = PERMISSION_GROUPS.flatMap(g => g.permissions).filter(p => {
    const isDefault = p.defaults.includes(user.role);
    return perms[p.key] !== isDefault;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${ROLE_COLORS[user.role] || 'bg-gray-100 border-gray-200'}`}>
              {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-gray-900">{user.fullName || user.username}</p>
              <p className="text-xs text-gray-400">
                @{user.username} ·&nbsp;
                <span className={`font-semibold capitalize px-1.5 py-0.5 rounded text-xs ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                {customised.length > 0 && <span className="ml-2 text-amber-600 font-semibold">{customised.length} custom override{customised.length > 1 ? 's' : ''}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-2 flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Toggles override this user's role defaults. <strong>Green = access granted</strong>, grey = access revoked.
            Badges show <span className="text-green-700 font-bold">+ granted</span> (extra beyond role) or <span className="text-red-600 font-bold">− revoked</span> (removed from role).
          </p>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.group}>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <span className="text-base">{group.icon}</span>
                <h4 className="font-bold text-gray-800 text-sm">{group.group}</h4>
              </div>
              <div className="space-y-2">
                {group.permissions.map(p => {
                  const isDefault = p.defaults.includes(user.role);
                  const current   = perms[p.key] ?? isDefault;
                  const changed   = current !== isDefault;
                  return (
                    <div key={p.key}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        current ? 'bg-white border-gray-100' : 'bg-gray-50/60 border-dashed border-gray-200'
                      }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${current ? 'text-gray-800' : 'text-gray-400'}`}>{p.label}</span>
                          {changed && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                              current ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {current ? '+ granted' : '− revoked'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                      </div>
                      <button onClick={() => toggle(p.key)} className="flex-shrink-0 ml-4 transition-transform active:scale-95">
                        {current
                          ? <ToggleRight className="w-9 h-9 text-blue-600" />
                          : <ToggleLeft  className="w-9 h-9 text-gray-300" />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
          {error && <div className="flex items-center gap-2 text-red-600 text-sm mb-3"><AlertTriangle className="w-4 h-4" /> {error}</div>}
          {saved && <div className="flex items-center gap-2 text-green-600 text-sm mb-3"><Check className="w-4 h-4" /> Permissions saved!</div>}
          <div className="flex gap-3">
            <button onClick={resetToDefaults} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white transition-colors">Reset to defaults</button>
            <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<any>(null);
  const [pwUser, setPwUser]         = useState<any>(null);
  const [permUser, setPermUser]     = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/users'); setUsers(Array.isArray(r) ? r : r.data || []); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (u: any) => {
    await (u.isActive ? api.patch(`/users/${u.id}/deactivate`, {}) : api.patch(`/users/${u.id}/activate`, {}));
    load();
  };
  const deleteUser = async (u: any) => { await api.del(`/users/${u.id}`); setConfirmDel(null); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">System Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-3">
          {users.map(u => {
            const customCount = Object.keys(u.permissions || {}).length;
            return (
              <div key={u.id}
                className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${!u.isActive ? 'opacity-55 border-gray-100' : 'border-gray-100 hover:shadow-sm'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(u.fullName || u.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{u.fullName || u.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{u.role}</span>
                    {!u.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">Inactive</span>}
                    {customCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {customCount} custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">@{u.username} · {u.email}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => setPermUser(u)} title="Edit Permissions" className="p-2 hover:bg-purple-50 hover:text-purple-600 text-gray-400 rounded-lg transition-colors"><Shield className="w-4 h-4" /></button>
                  <button onClick={() => setEditUser(u)} title="Edit User" className="p-2 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setPwUser(u)} title="Change Password" className="p-2 hover:bg-amber-50 hover:text-amber-600 text-gray-400 rounded-lg transition-colors"><KeyRound className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive(u)} title={u.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg transition-colors ${u.isActive ? 'hover:bg-orange-50 hover:text-orange-600' : 'hover:bg-green-50 hover:text-green-600'} text-gray-400`}>
                    {u.isActive ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </button>
                  {u.id !== me?.id && (
                    <button onClick={() => setConfirmDel(u)} title="Delete user" className="p-2 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No users yet</p>
            </div>
          )}
        </div>
      )}

      {confirmDel && (
        <Modal title="Delete User" onClose={() => setConfirmDel(null)}>
          <div className="flex items-start gap-3 mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">Permanently delete <strong>{confirmDel.fullName || confirmDel.username}</strong>? Their audit history will remain but the account will be removed.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDel(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => deleteUser(confirmDel)} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Delete</button>
          </div>
        </Modal>
      )}

      {showCreate && <UserFormModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editUser   && <UserFormModal user={editUser} onClose={() => setEditUser(null)} onSaved={load} />}
      {pwUser     && <ChangePasswordModal user={pwUser} onClose={() => setPwUser(null)} />}
      {permUser   && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} onSaved={load} />}
    </div>
  );
}

// ── Password Reset Requests Tab ───────────────────────────────
// Uses the new /admin/reset-requests endpoints (PasswordResetModule)
type ResetRequest = {
  id: string;      // UUID
  status: string;  // PENDING | APPROVED | OTP_VERIFIED | COMPLETED | EXPIRED
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  otpExpiresAt: string | null;
  user: { id: number; email: string; username: string; fullName: string } | null;
};
type OTPResult = { otp: string; expiresAt: string; requestId: string };

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING:      { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  APPROVED:     { bg: 'bg-blue-50 border-blue-200',     text: 'text-blue-800',   dot: 'bg-blue-500'   },
  OTP_VERIFIED: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  COMPLETED:    { bg: 'bg-green-50 border-green-200',   text: 'text-green-800',  dot: 'bg-green-500'  },
  EXPIRED:      { bg: 'bg-gray-50 border-gray-200',     text: 'text-gray-600',   dot: 'bg-gray-400'   },
};

function PasswordResetsTab() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);
  const [otpResult, setOtpResult] = useState<OTPResult | null>(null);
  const [copied, setCopied]     = useState(false);
  const [filter, setFilter]     = useState<string>('PENDING');

  const load = async () => {
    setLoading(true);
    try {
      // GET /admin/reset-requests — requires admin/manager JWT
      const data = await api.get('/admin/reset-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const approve = async (id: string) => {
    setActing(id);
    try {
      // POST /admin/reset-requests/:id/approve → returns { otp, expiresAt, message }
      const data = await api.post(`/admin/reset-requests/${id}/approve`, {});
      if (data.otp) {
        setOtpResult({ requestId: id, otp: data.otp, expiresAt: data.expiresAt });
        setFilter('APPROVED'); // Switch to approved tab to see the updated request
      } else if (data.message) {
        alert(data.message);
      }
      load();
    } catch (err: any) { alert('Error: ' + (err.message || 'Failed to approve')); }
    finally { setActing(null); }
  };

  const copyOTP = () => {
    if (!otpResult) return;
    navigator.clipboard.writeText(otpResult.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Password Reset Requests
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve staff password reset requests · auto-refreshes every 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* OTP reveal banner — shown once after admin approval */}
      {otpResult && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-green-800 mb-1">✅ 6-Digit OTP Generated</p>
              <p className="text-sm text-green-700 mb-4">
                Share this code with the user <strong>via phone call or in person</strong>. It expires in <strong>10 minutes</strong> and is valid for one use only.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white border-2 border-green-300 rounded-xl px-6 py-3 font-mono text-3xl font-black tracking-[8px] text-green-900">
                  {otpResult.otp}
                </div>
                <button onClick={copyOTP}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy OTP</>}
                </button>
                <button onClick={() => setOtpResult(null)} className="flex items-center gap-1 px-3 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  <X className="w-4 h-4" /> Dismiss
                </button>
              </div>
              <p className="text-xs text-green-600 mt-3">
                ⏰ Expires at: {new Date(otpResult.expiresAt).toLocaleString()} · This code is shown <strong>once only</strong> for security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['ALL', 'PENDING', 'APPROVED', 'OTP_VERIFIED', 'COMPLETED', 'EXPIRED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors border ${
              filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {f === 'ALL' ? 'All' : f === 'OTP_VERIFIED' ? 'OTP Verified' : f.charAt(0) + f.slice(1).toLowerCase()}
            {f === 'PENDING' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests</p>
          <p className="text-sm mt-1">Password reset requests from staff will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const sc = STATUS_STYLES[req.status] || STATUS_STYLES['PENDING'];
            const isPending = req.status === 'PENDING';
            const displayName = req.user?.fullName || req.user?.username || 'Unknown User';
            const initials = displayName.charAt(0).toUpperCase();

            return (
              <div key={req.id}
                className={`bg-white border rounded-xl p-4 flex items-center gap-4 flex-wrap transition-all ${isPending ? 'border-yellow-200 shadow-sm shadow-yellow-50' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">{displayName}</span>
                    {req.user?.username && <span className="text-xs text-gray-400">@{req.user.username}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{req.user?.email || '—'}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">Requested: {new Date(req.createdAt).toLocaleString()}</span>
                    </div>
                    {req.approvedAt && (
                      <span className="text-xs text-gray-400">· Approved: {new Date(req.approvedAt).toLocaleString()}</span>
                    )}
                    {req.otpExpiresAt && req.status === 'APPROVED' && (
                      <span className={`text-xs font-semibold ${new Date(req.otpExpiresAt) < new Date() ? 'text-red-500' : 'text-amber-600'}`}>
                        · OTP expires: {new Date(req.otpExpiresAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${sc.bg} ${sc.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {req.status === 'OTP_VERIFIED' ? 'OTP Verified' : req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                </div>

                {/* Approve button — only for PENDING requests */}
                {isPending && (
                  <div className="flex gap-2">
                    <button disabled={acting === req.id} onClick={() => approve(req.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                      {acting === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve &amp; Issue OTP
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── App Settings Tab ──────────────────────────────────────────
function AppSettingsTab() {
  const CONFIG = [
    { key: 'interest_rate_cash',   label: 'Cash Loan Interest Rate', suffix: '% per month', desc: 'Monthly flat interest rate for cash loans' },
    { key: 'processing_fee_rate',  label: 'Processing Fee Rate',     suffix: '%',           desc: 'Fee as % of principal charged when loan is created' },
    { key: 'late_fee_rate',        label: 'Late Payment Penalty',    suffix: '%',           desc: 'Penalty applied to overdue installments' },
    { key: 'max_loan_term_months', label: 'Max Loan Term',           suffix: 'months',      desc: 'Maximum repayment period allowed for cash loans' },
    { key: 'overdue_grace_days',   label: 'Overdue Grace Days',      suffix: 'days',        desc: 'Days after due date before marking overdue (0 = same day)' },
    { key: 'COMPANY_NAME',         label: 'Company Name',            suffix: '',            desc: 'Appears on receipts and reports' },
    { key: 'COMPANY_PHONE',        label: 'Company Phone',           suffix: '',            desc: 'Contact number printed on receipts' },
    { key: 'COMPANY_ADDRESS',      label: 'Company Address',         suffix: '',            desc: 'Address printed on receipts' },
  ];

  const SMS_CONFIG = [
    { key: 'ENABLE_SMS',    label: 'Enable SMS',           type: 'toggle', desc: 'Master switch — turn SMS on/off globally' },
    { key: 'SMS_PROVIDER',  label: 'SMS Provider',         type: 'select', options: ['africas_talking','twilio'], desc: 'Gateway provider' },
    { key: 'SMS_API_KEY',   label: 'API Key',              type: 'password', desc: 'Twilio: AccountSID:AuthToken | Africa\'s Talking: your API key' },
    { key: 'SMS_SENDER_ID', label: 'Sender Name/Number',  type: 'text',   desc: 'Name or number shown as SMS sender (max 11 chars for name)' },
    { key: 'sms_on_payment',label: 'SMS on Payment',       type: 'toggle', desc: 'Send confirmation SMS when a payment is recorded' },
    { key: 'sms_on_overdue',label: 'SMS on Overdue',       type: 'toggle', desc: 'Send reminder SMS when a loan becomes overdue' },
    { key: 'sms_on_approval',label: 'SMS on Loan Approval',type: 'toggle', desc: 'Notify client when their loan is approved' },
  ];
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string|null>(null);
  const [saved, setSaved]       = useState<string|null>(null);
  const [error, setError]       = useState<string|null>(null);

  useEffect(() => {
    api.get('/settings').then((res: any) => {
      const arr = Array.isArray(res) ? res : res.data || [];
      const map: Record<string,string> = {};
      arr.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map); setLoading(false);
    });
  }, []);

  const save = async (key: string) => {
    setSaving(key); setError(null);
    try {
      await api.patch(`/settings/${key}`, { value: settings[key] });
      setSaved(key); setTimeout(() => setSaved(null), 2000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Application Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure system-wide defaults for loans and fees</p>
      </div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div className="space-y-4">
        {CONFIG.map(({ key, label, suffix, desc }) => (
          <div key={key} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
                  {suffix && <span className="text-sm text-gray-400 font-medium">{suffix}</span>}
                </div>
              </div>
              <button onClick={() => save(key)} disabled={saving === key}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all mt-1 min-w-[90px] justify-center ${
                  saved === key ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}>
                {saved === key ? <><Check className="w-4 h-4" />Saved</> : saving === key ? 'Saving...' : <><Save className="w-4 h-4" />Save</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── SMS Settings ─────────────────────────────────────── */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">📱</span> SMS Notifications
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure SMS gateway and notification triggers</p>
      </div>
      <div className="space-y-4">
        {SMS_CONFIG.map(({ key, label, desc, type, options }: any) => (
          <div key={key} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                {(type === 'text' || type === 'password') && (
                  <input type={type}
                    className="mt-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
                )}
                {type === 'select' && (
                  <select
                    className="mt-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })}>
                    {(options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
              {type === 'toggle' ? (
                <button
                  onClick={() => {
                    const next = settings[key] === 'true' ? 'false' : 'true';
                    setSettings({ ...settings, [key]: next });
                    api.patch(`/settings/${key}`, { value: next }).catch(() => {});
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settings[key] === 'true'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {settings[key] === 'true'
                    ? <><ToggleRight className="w-4 h-4" />ON</>
                    : <><ToggleLeft className="w-4 h-4" />OFF</>}
                </button>
              ) : (
                <button onClick={() => save(key)} disabled={saving === key}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all mt-1 min-w-[90px] justify-center ${
                    saved === key ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                  {saved === key ? <><Check className="w-4 h-4" />Saved</> : saving === key ? 'Saving...' : <><Save className="w-4 h-4" />Save</>}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────
const TABS = [
  { id: 'users',    label: 'Users & Access',   icon: UserCog          },
  { id: 'resets',   label: 'Password Resets',  icon: ShieldAlert      },
  { id: 'settings', label: 'App Settings',     icon: SlidersHorizontal},
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-400">Admin access required</p>
          <p className="text-sm text-gray-300 mt-1">Only system administrators can access Settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Dashboard</span><ChevronRight className="w-3 h-3" /><span className="text-gray-900 font-medium">Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage users, control access permissions, and configure the system</p>
        </div>

        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit shadow-sm">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
          {activeTab === 'users'    && <UsersTab />}
          {activeTab === 'resets'   && <PasswordResetsTab />}
          {activeTab === 'settings' && <AppSettingsTab />}
        </div>
      </div>
    </div>
  );
}
