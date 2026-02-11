export type BikeStatus = 'available' | 'assigned' | 'sold';

export interface Bike {
  id: string;
  model: string;
  frame_number: string;
  engine_number: string;
  registration_number: string | null;
  sale_price: number;
  purchase_price: number;
  status: BikeStatus;
  assigned_client_id: string | null;
  created_at: string;
  updated_at: string;
}
