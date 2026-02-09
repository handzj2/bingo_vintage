import { api } from '@/lib/api';
import { Client } from './client.types';

/* ===========================
   Core API functions
=========================== */

export const getClients = async (): Promise<Client[]> => {
  const res = await api.get('/clients');
  return res.data;
};

export const getClientById = async (id: string): Promise<Client> => {
  const res = await api.get(`/clients/${id}`);
  return res.data;
};

export const createClient = async (
  payload: Partial<Client>
): Promise<Client> => {
  const res = await api.post('/clients', payload);
  return res.data;
};

export const updateClient = async (
  id: string,
  payload: Partial<Client>
): Promise<Client> => {
  const res = await api.put(`/clients/${id}`, payload);
  return res.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

/* ===========================
   Optional grouped export
   (non-breaking, future use)
=========================== */

export const ClientAPI = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};

// Alias for backward compatibility with existing code
export const clientApi = ClientAPI;