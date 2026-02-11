import { Bike } from '@/types/bike';

// 🎯 Mock data – your inventory will instantly load
const MOCK_BIKES: Bike[] = [
  {
    id: '1',
    model: 'Honda CG 125',
    frame_number: 'FR123456',
    engine_number: 'EN789012',
    registration_number: 'UAF 123A',
    purchase_price: 1500000,
    sale_price: 1800000,
    status: 'available',
    assigned_client_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    model: 'TVS Star 100',
    frame_number: 'FR654321',
    engine_number: 'EN210987',
    registration_number: 'UAG 456B',
    purchase_price: 1200000,
    sale_price: 1500000,
    status: 'assigned',
    assigned_client_id: 'client-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    model: 'Bajaj Boxer 150',
    frame_number: 'FR789012',
    engine_number: 'EN345678',
    registration_number: 'UAH 789C',
    purchase_price: 1800000,
    sale_price: 2200000,
    status: 'sold',
    assigned_client_id: 'client-456',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ✅ Mock API functions – no backend needed
export const fetchBikes = async (): Promise<Bike[]> => {
  return MOCK_BIKES;
};

export const fetchBikeById = async (id: string): Promise<Bike> => {
  const bike = MOCK_BIKES.find(b => b.id === id);
  if (!bike) throw new Error('Bike not found');
  return bike;
};

export const createBike = async (data: Partial<Bike>): Promise<Bike> => {
  const newBike = {
    id: Date.now().toString(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Bike;
  MOCK_BIKES.push(newBike);
  return newBike;
};

export const updateBike = async (id: string, data: Partial<Bike>): Promise<Bike> => {
  const index = MOCK_BIKES.findIndex(b => b.id === id);
  if (index === -1) throw new Error('Bike not found');
  MOCK_BIKES[index] = { ...MOCK_BIKES[index], ...data, updated_at: new Date().toISOString() };
  return MOCK_BIKES[index];
};

export const deleteBike = async (id: string): Promise<void> => {
  const index = MOCK_BIKES.findIndex(b => b.id === id);
  if (index > -1) MOCK_BIKES.splice(index, 1);
};