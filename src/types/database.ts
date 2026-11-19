export type UserRole = 'customer' | 'owner' | 'admin';
export type StationStatus = 'pending' | 'active' | 'inactive' | 'maintenance';
export type ConnectorStatus = 'free' | 'occupied' | 'reserved' | 'maintenance';
export type ConnectorType = 'CCS' | 'CHAdeMO' | 'Type2';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'fulfilled';
export type SessionStatus = 'starting' | 'charging' | 'completed' | 'cancelled';
export type PaymentMethod = 'pix' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  cpf_cnpj: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Connector = {
  id: string;
  station_id: string;
  label: string;
  connector_type: ConnectorType;
  max_power_kw: number;
  price_per_kwh: number;
  status: ConnectorStatus;
  created_at: string;
};

export type Station = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  cep: string | null;
  latitude: number;
  longitude: number;
  status: StationStatus;
  opens_at: string;
  closes_at: string;
  rating_avg: number;
  rating_count: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  connectors?: Connector[];
};

export type Reservation = {
  id: string;
  user_id: string;
  station_id: string;
  connector_id: string;
  arrives_at: string;
  grace_until: string;
  status: ReservationStatus;
  created_at: string;
};

export type ChargingSession = {
  id: string;
  user_id: string;
  station_id: string;
  connector_id: string;
  reservation_id: string | null;
  started_at: string;
  ended_at: string | null;
  energy_kwh: number;
  power_kw: number;
  elapsed_minutes: number;
  estimated_cost: number;
  final_cost: number | null;
  battery_percent: number;
  status: SessionStatus;
  created_at: string;
};

export type Payment = {
  id: string;
  session_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  pix_payload: string | null;
  paid_at: string | null;
  created_at: string;
};

export type StationWithMetrics = Station & {
  min_price: number;
  free_connectors: number;
  total_connectors: number;
  max_power_kw: number;
  distance_km?: number;
  eta_min?: number;
};
