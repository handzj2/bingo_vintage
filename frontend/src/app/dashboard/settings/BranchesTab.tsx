'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { settingsApi, asList } from './settingsApi';

type Branch = { id: number; name: string; location?: string; managerName?: string; contactPhone?: string; isActive: boolean };
const EMPTY = { name: '', location: '', managerName: '', contactPhone: '' };

export default function BranchesTab({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    try { setRows(asList(await settingsApi.get('/admin/branches'))); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = (b: Branch | 'new') => {
    setEditing(b);
    setMsg(null);
    setForm(b === 'new' ? EMPTY : {
      name: b.name || '', location: b.location || '', managerName: b.managerName || '', contactPhone: b.contactPhone || '',
    });
  };

  const submit = async () => {
    if (form.name.trim().length < 2) return setMsg({ ok: false, text: 'Branch name is required.' });
    setSaving(true);
    setMsg(null);
    try {
      if (editing === 'new') await settingsApi.post('/admin/branches', form);
      else if (editing) await settingsApi.patch(`/admin/branches/${editing.id}`, form);
      setEditing(null);
      setMsg({ ok: true, text: 'Branch saved.' });
      await load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setSaving(false); }
  };

  const setActive = async (b: Branch, isActive: boolean) => {
    if (!isActive && !window.confirm(`Deactivate "${b.name}"? Its history is kept.`)) return;
    try {
      await settingsApi.patch(`/admin/branches/${b.id}`, { isActive });
      setMsg({ ok: true, text: `${b.name} ${isActive ? 'reactivated' : 'deactivated'}.` });
      await load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  };

  const remove = async (b: Branch) => {
    if (!window.confirm(`Delete "${b.name}" permanently? Only possible if nothing refers to it.`)) return;
    try {
      await settingsApi.del(`/admin/branches/${b.id}`);
      setMsg({ ok: true, text: `${b.name} deleted.` });
      await load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-bv-meta" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-bv-text">Branches</h2>
          {!canWrite && <p className="text-xs text-bv-muted mt-0.5">View only. Administrators manage branches.</p>}
        </div>
        {canWrite && (
          <button onClick={() => open('new')}
            className="flex items-center gap-2 bg-bv-action text-white text-sm font-semibold px-3 py-2 rounded-md">
            <Plus className="w-4 h-4" /> Add branch
          </button>
        )}
      </div>

      {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`} role="status">{msg.text}</p>}

      <div className="bg-bv-surface border border-bv-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-bv-meta text-left">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Phone</th><th className="px-3 py-2">Status</th>{canWrite && <th className="px-3 py-2" />}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-bv-meta">No branches yet.</td></tr>}
            {rows.map(b => (
              <tr key={b.id} className="border-t border-bv-border">
                <td className="px-3 py-2 font-medium text-bv-text">{b.name}</td>
                <td className="px-3 py-2">{b.location || '—'}</td>
                <td className="px-3 py-2">{b.managerName || '—'}</td>
                <td className="px-3 py-2">{b.contactPhone || '—'}</td>
                <td className="px-3 py-2">{b.isActive ? 'Active' : 'Inactive'}</td>
                {canWrite && (
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <button title="Edit" onClick={() => open(b)} className="p-1.5"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setActive(b, !b.isActive)} className="px-2 text-xs underline">
                      {b.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button title="Delete" onClick={() => remove(b)} className="p-1.5 text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-bv-surface rounded-xl border border-bv-border w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-bv-text">{editing === 'new' ? 'Add branch' : `Edit ${editing.name}`}</h3>
              <button onClick={() => setEditing(null)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            {([['name', 'Name *'], ['location', 'Location'], ['managerName', 'Manager name'], ['contactPhone', 'Contact phone']] as const).map(([k, label]) => (
              <label key={k} className="block text-xs text-bv-meta">{label}
                <input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 w-full border border-bv-border rounded-md px-3 py-2 text-sm text-bv-text bg-bv-surface" />
              </label>
            ))}
            {msg && !msg.ok && <p className="text-sm text-red-600">{msg.text}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm">Cancel</button>
              <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 bg-bv-action text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
