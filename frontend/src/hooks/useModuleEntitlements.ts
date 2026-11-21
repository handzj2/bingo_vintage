'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

export type ModuleState = {
  moduleKey: string;
  name?: string;
  accessState: 'ENABLED' | 'DISABLED';
  visibilityState: 'VISIBLE' | 'HIDDEN';
  isIndependentlyControllable?: boolean;
  frontendRoutePrefixes?: string[] | null;
};

export type ModuleMap = Record<string, ModuleState>;

/**
 * Effective module entitlements for the caller's tenant (GET /module-entitlements/me).
 * Fails OPEN: if the request fails or has not loaded, no module is hidden, so an outage of this
 * endpoint can never lock tenants out of core screens. The backend guard is the real enforcement.
 */
export function useModuleEntitlements() {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleMap>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<ModuleState[]>('/module-entitlements/me');
    if (res.success && Array.isArray(res.data)) {
      const map: ModuleMap = {};
      for (const m of res.data) {
        const key = (m as any).moduleKey ?? (m as any).module_key;
        if (key) map[key] = { ...m, moduleKey: key };
      }
      setModules(map);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [user, load]);

  return { modules, loaded, reload: load };
}

/** Longest-prefix match of a pathname against each controllable module's frontend route prefixes. */
export function moduleForPath(modules: ModuleMap, pathname: string): ModuleState | null {
  let best: ModuleState | null = null;
  let bestLen = -1;
  for (const m of Object.values(modules)) {
    if (!m.isIndependentlyControllable) continue;
    for (const p of m.frontendRoutePrefixes ?? []) {
      if ((pathname === p || pathname.startsWith(p + '/')) && p.length > bestLen) {
        best = m; bestLen = p.length;
      }
    }
  }
  return best;
}
