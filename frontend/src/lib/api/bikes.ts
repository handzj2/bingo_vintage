// src/lib/api/bikes.ts
// FIX: replaced MOCK_BIKES array — all functions now call the real backend
import { api } from '@/lib/api/client';

export interface Bike {
  id: number;
  model: string;
  frame_number: string;
  engine_number: string | null;
  registration_number: string | null;
  sale_price: number;
  purchase_price: number;
  status: 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' | 'SOLD';
  assigned_client_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBikePayload {
  model: string;
  frame_number: string;
  sale_price: number;
  purchase_price: number;
  engine_number?: string | null;
  registration_number?: string | null;
  status?: Bike['status'];
  assigned_client_id?: number | null;
}

export const fetchBikes = async (): Promise<Bike[]> => {
  const res = await api.get<Bike[]>('/bikes');
  return res.success ? (res.data ?? []) : [];
};

export const fetchBikeById = async (id: number): Promise<Bike> => {
  const res = await api.get<Bike>(`/bikes/${id}`);
  if (!res.success || !res.data) throw new Error('Bike not found');
  return res.data;
};

export const createBike = async (data: CreateBikePayload): Promise<Bike> => {
  const res = await api.post<Bike>('/bikes', data);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to create bike');
  return res.data;
};

export const updateBike = async (id: number, data: Partial<CreateBikePayload>): Promise<Bike> => {
  const res = await api.patch<Bike>(`/bikes/${id}`, data);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to update bike');
  return res.data;
};
