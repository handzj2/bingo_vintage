// lib/api/superadmin.ts — typed calls to /api/superadmin/*
import { api } from './client';

export const superadminApi = {
  getStats:           () => api.get('/superadmin/stats'),
  listTenants:        () => api.get('/superadmin/tenants'),
  getTenant:          (id: number) => api.get(`/superadmin/tenants/${id}`),
  createTenant:       (data: any)  => api.post('/superadmin/tenants', data),
  activateTenant:     (id: number) => api.patch(`/superadmin/tenants/${id}/activate`, {}),
  deactivateTenant:   (id: number) => api.patch(`/superadmin/tenants/${id}/deactivate`, {}),
  // Branch management
  listBranches:       (tenantId: number) => api.get(`/superadmin/tenants/${tenantId}/branches`),
  createBranch:       (tenantId: number, data: any) => api.post(`/superadmin/tenants/${tenantId}/branches`, data),
  activateBranch:     (branchId: number) => api.patch(`/superadmin/branches/${branchId}/activate`, {}),
  deactivateBranch:   (branchId: number) => api.patch(`/superadmin/branches/${branchId}/deactivate`, {}),
  // Users
  listUsers:          (search?: string) =>
    api.get(`/superadmin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  impersonate:        (data: { userId: number; tenantId: number; reason: string }) =>
    api.post('/superadmin/impersonate', data),
  getAuditLogs:       (page = 1) => api.get(`/superadmin/audit-logs?page=${page}`),
};
