'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { moduleControlApi, AccessState, VisibilityState, CommercialStatus } from '@/lib/api/module-control';
import { superadminApi } from '@/lib/api/superadmin';

type RegistryModule = {
  moduleKey: string;
  name: string;
  description?: string | null;
  category: string;
  commercialClass: string;
  isIndependentlyControllable: boolean;
  defaultAccessState: string;
  defaultVisibility: string;
};

type EffectiveModule = {
  moduleKey: string;
  name: string;
  description?: string | null;
  category: string;
  isIndependentlyControllable: boolean;
  accessState: AccessState;
  visibilityState: VisibilityState;
  commercialStatus: CommercialStatus;
  source: string;
  dependencies?: { dependsOnKey: string; dependencyType: string }[];
  dependents?: { moduleKey: string; dependencyType: string }[];
};

type Tenant = { id: number; name: string; slug?: string; is_active?: boolean };

export default function ModuleControlCentrePage() {
  const [registry, setRegistry] = useState<RegistryModule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [effective, setEffective] = useState<EffectiveModule[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');

  // Form state for selected module
  const [accessState, setAccessState] = useState<AccessState>('ENABLED');
  const [visibilityState, setVisibilityState] = useState<VisibilityState>('VISIBLE');
  const [commercialStatus, setCommercialStatus] = useState<CommercialStatus>('ACTIVE');
  const [reason, setReason] = useState('');

  const loadRegistry = useCallback(async () => {
    const res: any = await moduleControlApi.listRegistry();
    const rows = res?.data ?? res ?? [];
    setRegistry(Array.isArray(rows) ? rows : []);
  }, []);

  const loadTenants = useCallback(async () => {
    const res: any = await superadminApi.listTenants();
    const rows = res?.data ?? res ?? [];
    setTenants(Array.isArray(rows) ? rows : []);
  }, []);

  const loadEffective = useCallback(async (tid: number) => {
    const res: any = await moduleControlApi.effectiveForTenant(tid);
    const rows = res?.data ?? res ?? [];
    setEffective(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadRegistry(), loadTenants()])
      .catch((e) => setError(e?.message || 'Failed to load module control data'))
      .finally(() => setLoading(false));
  }, [loadRegistry, loadTenants]);

  useEffect(() => {
    if (tenantId === '') {
      setEffective([]);
      return;
    }
    setError(null);
    loadEffective(Number(tenantId)).catch((e) =>
      setError(e?.message || 'Failed to load tenant entitlements'),
    );
  }, [tenantId, loadEffective]);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return effective.find((m) => m.moduleKey === selectedKey)
      || registry.find((m) => m.moduleKey === selectedKey)
      || null;
  }, [selectedKey, effective, registry]);

  useEffect(() => {
    if (!selected) return;
    const eff = effective.find((m) => m.moduleKey === (selected as any).moduleKey);
    if (eff) {
      setAccessState(eff.accessState);
      setVisibilityState(eff.visibilityState);
      setCommercialStatus(eff.commercialStatus === 'RESTORED' ? 'ACTIVE' : eff.commercialStatus);
    } else {
      const reg = selected as RegistryModule;
      setAccessState((reg.defaultAccessState as AccessState) || 'ENABLED');
      setVisibilityState((reg.defaultVisibility as VisibilityState) || 'VISIBLE');
      setCommercialStatus('ACTIVE');
    }
    setReason('');
    setSuccess(null);
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const listSource: Array<RegistryModule | EffectiveModule> =
    tenantId !== '' && effective.length ? effective : registry;

  const filtered = listSource.filter((m) => {
    const key = (m as any).moduleKey as string;
    const name = (m as any).name as string;
    const cat = (m as any).category as string;
    if (category !== 'all' && cat !== category) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return key.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const categories = useMemo(() => {
    const s = new Set(registry.map((r) => r.category));
    return ['all', ...Array.from(s).sort()];
  }, [registry]);

  async function saveTenantEntitlement() {
    if (tenantId === '' || !selectedKey) {
      setError('Select a tenant and a module first.');
      return;
    }
    const mod = registry.find((r) => r.moduleKey === selectedKey);
    if (mod && !mod.isIndependentlyControllable) {
      setError('This module is core infrastructure and cannot be suspended independently.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await moduleControlApi.setTenantEntitlement(Number(tenantId), selectedKey, {
        accessState,
        visibilityState,
        commercialStatus,
        reason: reason.trim() || undefined,
      });
      await loadEffective(Number(tenantId));
      setSuccess(`Updated ${selectedKey} for tenant #${tenantId}.`);
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveProductPolicy() {
    if (!selectedKey) {
      setError('Select a module first.');
      return;
    }
    if (!window.confirm(
      `Apply PRODUCT-WIDE policy to "${selectedKey}"?\nThis affects all tenants. Product DISABLED cannot be overridden by a tenant.`,
    )) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await moduleControlApi.setProductPolicy(selectedKey, {
        accessState,
        visibilityState,
        reason: reason.trim() || undefined,
      });
      if (tenantId !== '') await loadEffective(Number(tenantId));
      setSuccess(`Product-wide policy updated for ${selectedKey}.`);
    } catch (e: any) {
      setError(e?.message || 'Product policy save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-bv-meta text-sm">Loading Module Control Centre…</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-white">Module Control Centre</h1>
        <p className="text-sm text-bv-meta mt-1">
          Provider commercial control — access and navigation visibility are independent.
          Core modules cannot be suspended. Product-wide DISABLED always wins.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300" role="status">
          {success}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: filters + list */}
        <section className="lg:w-1/2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-bv-meta">
              Tenant scope
              <select
                className="mt-1 w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Catalogue only (no tenant)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} — {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-bv-meta">
              Category
              <select
                className="mt-1 w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <input
            type="search"
            placeholder="Search modules…"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <ul className="rounded-xl border border-gray-800 divide-y divide-gray-800 max-h-[28rem] overflow-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-bv-meta">No modules match.</li>
            )}
            {filtered.map((m) => {
              const key = (m as any).moduleKey as string;
              const controllable = (m as any).isIndependentlyControllable !== false;
              const access = (m as any).accessState ?? (m as any).defaultAccessState;
              const vis = (m as any).visibilityState ?? (m as any).defaultVisibility;
              const active = selectedKey === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`w-full text-left px-4 py-3 text-sm transition ${
                      active ? 'bg-bv-action text-white' : 'hover:bg-gray-900 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{(m as any).name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-bv-meta">
                        {controllable ? 'controllable' : 'core'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded ${access === 'ENABLED' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                        {access}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-bv-meta">{vis}</span>
                      {(m as any).commercialStatus && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-bv-meta">
                          {(m as any).commercialStatus}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right: detail + controls */}
        <section className="lg:w-1/2 rounded-xl border border-gray-800 bg-gray-900/40 p-5">
          {!selectedKey || !selected ? (
            <div className="text-sm text-bv-meta py-12 text-center">
              Select a module to view dependencies and change entitlement.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{(selected as any).name}</h2>
                <p className="text-xs text-bv-meta font-mono mt-0.5">{selectedKey}</p>
                {(selected as any).description && (
                  <p className="text-sm text-gray-300 mt-2">{(selected as any).description}</p>
                )}
              </div>

              {(selected as EffectiveModule).dependencies?.length ? (
                <div className="text-xs text-bv-meta">
                  <div className="font-semibold text-gray-300 mb-1">Depends on</div>
                  <ul className="list-disc list-inside">
                    {(selected as EffectiveModule).dependencies!.map((d) => (
                      <li key={d.dependsOnKey}>
                        {d.dependsOnKey} <span className="opacity-70">({d.dependencyType})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-bv-meta">
                  Access
                  <select
                    className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white"
                    value={accessState}
                    onChange={(e) => setAccessState(e.target.value as AccessState)}
                  >
                    <option value="ENABLED">ENABLED</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </label>
                <label className="block text-xs text-bv-meta">
                  Navigation visibility
                  <select
                    className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white"
                    value={visibilityState}
                    onChange={(e) => setVisibilityState(e.target.value as VisibilityState)}
                  >
                    <option value="VISIBLE">VISIBLE</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </label>
                <label className="block text-xs text-bv-meta sm:col-span-2">
                  Commercial status
                  <select
                    className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white"
                    value={commercialStatus}
                    onChange={(e) => setCommercialStatus(e.target.value as CommercialStatus)}
                  >
                    {['ACTIVE', 'TRIAL', 'PAYMENT_PENDING', 'NOT_ENTITLED', 'SUSPENDED', 'EXPIRED', 'DEVELOPMENT', 'RESTORED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span className="block mt-1 text-[11px] opacity-80">
                    RESTORED is recorded in history; stored state becomes ACTIVE (or TRIAL).
                  </span>
                </label>
                <label className="block text-xs text-bv-meta sm:col-span-2">
                  Reason (audit)
                  <textarea
                    className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white min-h-[72px]"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Required for commercial suspensions in production practice"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving || tenantId === ''}
                  onClick={saveTenantEntitlement}
                  className="flex-1 rounded-lg bg-bv-action hover:bg-bv-action-hover disabled:opacity-40 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {saving ? 'Saving…' : 'Apply to tenant'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveProductPolicy}
                  className="flex-1 rounded-lg border border-amber-700 text-amber-200 hover:bg-amber-950/40 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold"
                >
                  Product-wide policy…
                </button>
              </div>
              {tenantId === '' && (
                <p className="text-xs text-bv-meta">Select a tenant to apply tenant-scoped entitlement.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
