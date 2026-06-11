// src/features/clients/client.api.ts
import { api } from '@/lib/api/client';
import type { Client } from '@/shared/api-types';

export const getClients = async (): Promise<Client[]> => {
  const res = await api.get<Client[]>('/clients');
  return res.data ?? [];
};

export const getClientById = async (id: string | number): Promise<Client> => {
  const res = await api.get<Client>(`/clients/${id}`);
  if (!res.success || !res.data) throw new Error('Client not found');
  return res.data;
};

export const createClient = async (payload: any): Promise<Client> => {
  const res = await api.post<Client>('/clients/register-form', payload);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to create client');
  return res.data;
};

export const updateClient = async (
  id: string | number,
  payload: Partial<Client>,
): Promise<Client> => {
  const res = await api.patch<Client>(`/clients/${id}`, payload);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to update client');
  return res.data;
};

export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

export const ClientAPI = { getClients, getClientById, createClient, updateClient, deleteClient };
export const clientApi = ClientAPI;
