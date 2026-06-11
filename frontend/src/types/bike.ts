// Aligned with backend BikeStatus enum
export type BikeStatus = 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' | 'SOLD';

export interface Bike {
  id: number;                      // backend uses integer PK
  model: string;
  frame_number: string;
  engine_number: string | null;
  registration_number: string | null;
  sale_price: number;
  purchase_price: number;
  status: BikeStatus;
  assigned_client_id: number | null;
  created_at: string;
  updated_at: string;
}
