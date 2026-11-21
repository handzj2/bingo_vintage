// lib/api/module-control.ts — real Super Admin Module Control APIs
import { api } from './client';

export type AccessState = 'ENABLED' | 'DISABLED';
export type VisibilityState = 'VISIBLE' | 'HIDDEN';
export type CommercialStatus =
  | 'DEVELOPMENT'
  | 'NOT_ENTITLED'
  | 'PAYMENT_PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'RESTORED';

export const moduleControlApi = {
  listRegistry: () => api.get('/superadmin/modules'),

  getModule: (moduleKey: string) => api.get(`/superadmin/modules/${encodeURIComponent(moduleKey)}`),

  effectiveForTenant: (tenantId: number) =>
    api.get(`/superadmin/modules/tenant/${tenantId}/effective`),

  effectiveOne: (tenantId: number, moduleKey: string) =>
    api.get(`/superadmin/modules/tenant/${tenantId}/effective/${encodeURIComponent(moduleKey)}`),

  setTenantEntitlement: (
    tenantId: number,
    moduleKey: string,
    body: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      commercialStatus?: CommercialStatus;
      commercialRef?: string;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      reason?: string;
    },
  ) => api.put(`/superadmin/modules/tenant/${tenantId}/${encodeURIComponent(moduleKey)}`, body),

  setProductPolicy: (
    moduleKey: string,
    body: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      reason?: string;
    },
  ) => api.put(`/superadmin/modules/product/${encodeURIComponent(moduleKey)}`, body),

  history: (params?: { tenantId?: number; moduleKey?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.tenantId) q.set('tenantId', String(params.tenantId));
    if (params?.moduleKey) q.set('moduleKey', params.moduleKey);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/superadmin/modules/history${qs ? `?${qs}` : ''}`);
  },
};

/** Tenant-facing (any authenticated user) — for sidebar later */
export const moduleEntitlementsApi = {
  me: () => api.get('/module-entitlements/me'),
};
