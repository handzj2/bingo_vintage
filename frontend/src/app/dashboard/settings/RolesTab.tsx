'use client';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Lock } from 'lucide-react';
import { settingsApi, asList } from './settingsApi';

type Role = { id: number; name: string; description?: string };
type Perm = { code: string; name?: string; resource?: string; description?: string };

// admin/superadmin bypass permission checks in the backend, so editing their list changes nothing.
const LOCKED = ['admin', 'superadmin', 'super_admin'];

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([settingsApi.get('/roles'), settingsApi.get('/permissions')])
      .then(([r, p]) => {
        const rl = asList(r) as Role[];
        setRoles(rl);
        setPerms(asList(p) as Perm[]);
        if (rl.length) setRoleId(rl[0].id);
      })
      .catch(e => setMsg({ ok: false, text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (roleId == null) return;
    setLoadingRole(true);
    setMsg(null);
    settingsApi.get(`/roles/${roleId}`)
      .then(role => {
        const codes = new Set<string>((role?.rolePermissions ?? [])
          .map((rp: any) => rp?.permission?.code ?? rp?.permissionCode).filter(Boolean));
        setSaved(codes);
        setDraft(new Set(codes));
      })
      .catch(e => setMsg({ ok: false, text: e.message }))
      .finally(() => setLoadingRole(false));
  }, [roleId]);

  const role = roles.find(r => r.id === roleId);
  const locked = !!role && LOCKED.includes(role.name.toLowerCase());

  const groups = useMemo(() => {
    const m: Record<string, Perm[]> = {};
    perms.forEach(p => {
      const g = p.resource || p.code.split('.')[0] || 'other';
      (m[g] ||= []).push(p);
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
  }, [perms]);

  const added = Array.from(draft).filter(c => !saved.has(c));
  const removed = Array.from(saved).filter(c => !draft.has(c));
  const dirty = added.length + removed.length > 0;

  const toggle = (code: string) => {
    if (locked) return;
    setDraft(prev => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  const save = async () => {
    if (!role || !dirty) return;
    const ok = window.confirm(
      `Save permissions for "${role.name}"?\n\nGranting ${added.length}, revoking ${removed.length}.\n` +
      `This takes effect for everyone holding this role the next time they sign in or refresh.`);
    if (!ok) return;
    setSaving(true);
    setMsg(null);
    try {
      await settingsApi.post(`/roles/${role.id}/permissions/set`, { codes: Array.from(draft) });
      setSaved(new Set(draft));
      setMsg({ ok: true, text: `Permissions for "${role.name}" saved.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-bv-meta" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-bv-text">Roles &amp; permissions</h2>
        <p className="text-xs text-bv-muted mt-0.5">Choose what each role may do. Per-user overrides stay under Users &amp; Access.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={roleId ?? ''} onChange={e => setRoleId(Number(e.target.value))}
          className="border border-bv-border rounded-md bg-bv-surface px-3 py-2 text-sm">
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {role?.description && <span className="text-xs text-bv-muted">{role.description}</span>}
      </div>

      {locked && (
        <div className="flex items-center gap-2 rounded-md border border-bv-border bg-bv-surface p-3 text-xs text-bv-muted">
          <Lock className="w-4 h-4" /> Administrators always have every permission, so this role cannot be edited.
        </div>
      )}

      {loadingRole ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-bv-meta" /></div>
      ) : (
        <div className="space-y-3">
          {groups.map(([group, list]) => (
            <div key={group} className="bg-bv-surface border border-bv-border rounded-md p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-bv-meta mb-2">{group}</p>
              <div className="grid sm:grid-cols-2 gap-1">
                {list.map(p => (
                  <label key={p.code} className={`flex items-start gap-2 text-sm ${locked ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input type="checkbox" className="mt-1" disabled={locked}
                      checked={locked || draft.has(p.code)} onChange={() => toggle(p.code)} />
                    <span>
                      <span className="text-bv-text">{p.name || p.code}</span>
                      <span className="block text-xs text-bv-meta">{p.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`} role="status">{msg.text}</p>
      )}

      {!locked && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={!dirty || saving}
            className="flex items-center gap-2 bg-bv-action text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save permissions
          </button>
          {dirty && <span className="text-xs text-bv-muted">{added.length} to grant, {removed.length} to revoke</span>}
        </div>
      )}
    </div>
  );
}
