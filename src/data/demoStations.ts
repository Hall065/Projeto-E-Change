import type { Connector, Station, StationWithMetrics } from '../types/database';
import { etaMinutes, haversineKm } from '../lib/format';

/** Seed local usado quando Supabase não está configurado ou falha (offline/demo). */
const DEMO_STATIONS: Station[] = [
  {
    id: 'demo-station-paulista',
    owner_id: null,
    name: 'E-Charge Paulista',
    description: 'Hub rápido no centro financeiro',
    address: 'Av. Paulista, 1578',
    city: 'São Paulo',
    state: 'SP',
    cep: '01310-200',
    latitude: -23.561414,
    longitude: -46.655881,
    status: 'active',
    opens_at: '06:00',
    closes_at: '23:00',
    rating_avg: 4.7,
    rating_count: 128,
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-station-pinheiros',
    owner_id: null,
    name: 'Pinheiros UltraCharge',
    description: 'CCS e Type2 cobertos',
    address: 'Rua dos Pinheiros, 498',
    city: 'São Paulo',
    state: 'SP',
    cep: '05422-000',
    latitude: -23.5678,
    longitude: -46.6912,
    status: 'active',
    opens_at: '00:00',
    closes_at: '23:59',
    rating_avg: 4.5,
    rating_count: 86,
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-station-ibirapuera',
    owner_id: null,
    name: 'Ibirapuera Charge Park',
    description: 'Estacionamento com 8 vagas EV',
    address: 'Av. Pedro Álvares Cabral, 1301',
    city: 'São Paulo',
    state: 'SP',
    cep: '04094-050',
    latitude: -23.587416,
    longitude: -46.657634,
    status: 'active',
    opens_at: '07:00',
    closes_at: '22:00',
    rating_avg: 4.3,
    rating_count: 54,
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-station-morumbi',
    owner_id: null,
    name: 'Morumbi Fast Lane',
    description: 'Corrente contínua até 150 kW',
    address: 'Av. Giovanni Gronchi, 5930',
    city: 'São Paulo',
    state: 'SP',
    cep: '05724-003',
    latitude: -23.6225,
    longitude: -46.7308,
    status: 'active',
    opens_at: '05:00',
    closes_at: '23:30',
    rating_avg: 4.6,
    rating_count: 71,
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-station-guarulhos',
    owner_id: null,
    name: 'GRU Airport Charge',
    description: 'Posto de acesso à rodovia',
    address: 'Rod. Hélio Smidt, s/n',
    city: 'Guarulhos',
    state: 'SP',
    cep: '07190-100',
    latitude: -23.4356,
    longitude: -46.4731,
    status: 'active',
    opens_at: '00:00',
    closes_at: '23:59',
    rating_avg: 4.1,
    rating_count: 39,
    photo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const DEMO_CONNECTORS: Connector[] = [
  { id: 'c1', station_id: 'demo-station-paulista', label: 'CCS A1', connector_type: 'CCS', max_power_kw: 150, price_per_kwh: 1.89, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c2', station_id: 'demo-station-paulista', label: 'Type2 B1', connector_type: 'Type2', max_power_kw: 22, price_per_kwh: 1.29, status: 'occupied', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c3', station_id: 'demo-station-pinheiros', label: 'CCS 01', connector_type: 'CCS', max_power_kw: 120, price_per_kwh: 1.79, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c4', station_id: 'demo-station-pinheiros', label: 'CHAdeMO', connector_type: 'CHAdeMO', max_power_kw: 50, price_per_kwh: 1.59, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c5', station_id: 'demo-station-ibirapuera', label: 'Type2 1', connector_type: 'Type2', max_power_kw: 22, price_per_kwh: 1.19, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c6', station_id: 'demo-station-ibirapuera', label: 'CCS 1', connector_type: 'CCS', max_power_kw: 60, price_per_kwh: 1.49, status: 'reserved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c7', station_id: 'demo-station-morumbi', label: 'Ultra 150', connector_type: 'CCS', max_power_kw: 150, price_per_kwh: 1.99, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c8', station_id: 'demo-station-morumbi', label: 'CCS 75', connector_type: 'CCS', max_power_kw: 75, price_per_kwh: 1.69, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c9', station_id: 'demo-station-guarulhos', label: 'CCS Aeroporto', connector_type: 'CCS', max_power_kw: 180, price_per_kwh: 2.09, status: 'free', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c10', station_id: 'demo-station-guarulhos', label: 'Type2', connector_type: 'Type2', max_power_kw: 22, price_per_kwh: 1.39, status: 'occupied', created_at: '2026-01-01T00:00:00Z' },
];

export function getDemoStationsWithMetrics(origin: { latitude: number; longitude: number }): StationWithMetrics[] {
  return DEMO_STATIONS.map((station) => {
    const connectors = DEMO_CONNECTORS.filter((c) => c.station_id === station.id);
    const free = connectors.filter((c) => c.status === 'free').length;
    const prices = connectors.map((c) => Number(c.price_per_kwh));
    const powers = connectors.map((c) => Number(c.max_power_kw));
    const distance = haversineKm(origin.latitude, origin.longitude, station.latitude, station.longitude);
    return {
      ...station,
      connectors,
      min_price: prices.length ? Math.min(...prices) : 0,
      free_connectors: free,
      total_connectors: connectors.length,
      max_power_kw: powers.length ? Math.max(...powers) : 0,
      distance_km: Number(distance.toFixed(1)),
      eta_min: etaMinutes(distance),
    };
  }).sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

export function getDemoStationById(id: string, origin: { latitude: number; longitude: number }) {
  return getDemoStationsWithMetrics(origin).find((s) => s.id === id) ?? null;
}
