'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

const FIELDS: { key: string; label: string; help: string; kind: 'text' | 'number' | 'bool' }[] = [
  { key: 'drawer.closing_time', label: 'Closing time', help: 'Business-day closing time (HH:MM, 24h).', kind: 'text' },
  { key: 'drawer.reminder_lead_minutes', label: 'Reminder lead (minutes)', help: 'Minutes before closing time to remind staff.', kind: 'number' },
  { key: 'drawer.grace_period_minutes', label: 'Grace period (minutes)', help: 'Minutes after closing time before a drawer counts as overdue.', kind: 'number' },
  { key: 'drawer.allow_manager_override_open', label: 'Allow override open', help: 'Let authorised users open a second drawer on a day that already has a closed one.', kind: 'bool' },
  { key: 'drawer.require_force_close_reason', label: 'Require force-close reason', help: 'Force-closing always needs a written reason.', kind: 'bool' },
];

/** /dashboard/finance/drawers/settings — GET /settings, PATCH /settings/:key (admin on backend). */
export default function DrawerSettingsPage() {
  const { isLoading, can } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const res = await api.get<any[]>('/settings');
    if (res.success) {
      const m: Record<string, string> = {};
      (Array.isArray(res.data) ? res.data : []).forEach((s: any) => { if (s?.key?.startsWith('drawer.')) m[s.key] = String(s.value ?? ''); });
      setValues(m); setSaved(m);
    } else setErr(res.message || 'Failed to load settings');
    setLoading(false);
  }, []);
  useEffect(() => { if (!isLoading && can('settings.manage')) load(); }, [isLoading, can, load]);

  const save = async (key: string) => {
    setSavingKey(key);
    const res = await api.patch(`/settings/${encodeURIComponent(key)}`, { value: values[key] });
    setSavingKey(null);
    if (res.success) { toast.success('Setting saved'); setSaved((s) => ({ ...s, [key]: values[key] })); }
    else toast.error(res.message || 'Could not save setting');
  };

  if (isLoading || loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!can('settings.manage')) return <p className="p-6 text-sm text-bv-muted">Only administrators can change drawer settings.</p>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="border-b border-bv-border pb-4">
        <h1 className="text-lg font-semibold text-bv-text">Drawer settings</h1>
        <p className="text-sm text-bv-muted">Applies to your tenant. Changes take effect for the next drawer action.</p>
      </div>
      {err && <p className="text-sm text-bv-danger">{err}</p>}
      {FIELDS.map((f) => {
        const known = f.key in values;
        const dirty = values[f.key] !== saved[f.key];
        return (
          <div key={f.key} className="border border-bv-border rounded-bv p-4 space-y-2">
            <label className="block text-sm font-medium text-bv-text" htmlFor={f.key}>{f.label}</label>
            <p className="text-xs text-bv-meta">{f.help}</p>
            {!known ? <p className="text-xs text-bv-warning">This setting is not present yet. Run migration 031 to seed it.</p> : (
              <div className="flex gap-2 items-center">
                {f.kind === 'bool' ? (
                  <select id={f.key} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="border border-bv-border rounded-bv px-3 py-2 bg-bv-surface text-sm">
                    <option value="true">Yes</option><option value="false">No</option>
                  </select>
                ) : (
                  <input id={f.key} type={f.kind === 'number' ? 'number' : 'text'} min={0} value={values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className="border border-bv-border rounded-bv px-3 py-2 bg-bv-surface text-sm w-40" />
                )}
                <button type="button" disabled={!dirty || savingKey === f.key} onClick={() => save(f.key)}
                  className="px-3 py-2 text-sm font-semibold rounded-lg bg-bv-action text-white disabled:opacity-40">
                  {savingKey === f.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
