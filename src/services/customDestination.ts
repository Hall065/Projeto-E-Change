import { etaMinutes, haversineKm } from '../lib/format';
import type { StationWithMetrics } from '../types/database';
import type { PlaceSuggestion } from './geocode';
import type { LatLng } from './routing';

const CUSTOM = new Map<string, StationWithMetrics>();

function buildId(coord: LatLng, seed?: string) {
  const lat = coord.latitude.toFixed(5);
  const lng = coord.longitude.toFixed(5);
  const base = seed?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'pin';
  return `custom-${base}-${lat}_${lng}`;
}

/** Registra um destino livre (endereço/coordenada) como “posto sintético” p/ rota. */
export function registerCustomDestination(
  place: PlaceSuggestion,
  origin?: LatLng,
): StationWithMetrics {
  const id = buildId(place.coord, place.id);
  const distance =
    origin != null
      ? haversineKm(origin.latitude, origin.longitude, place.coord.latitude, place.coord.longitude)
      : 0;
  const station: StationWithMetrics = {
    id,
    owner_id: null,
    name: place.label || 'Destino',
    description: 'Destino personalizado',
    address: place.subtitle || place.label || 'Endereço',
    city: '',
    state: '',
    cep: null,
    latitude: place.coord.latitude,
    longitude: place.coord.longitude,
    status: 'active',
    opens_at: '00:00',
    closes_at: '23:59',
    rating_avg: 0,
    rating_count: 0,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    connectors: [],
    min_price: 0,
    free_connectors: 0,
    total_connectors: 0,
    max_power_kw: 0,
    distance_km: Number(distance.toFixed(1)),
    eta_min: etaMinutes(distance),
  };
  CUSTOM.set(id, station);
  return station;
}

export function getCustomDestination(id: string): StationWithMetrics | null {
  return CUSTOM.get(id) ?? null;
}

export function isCustomDestinationId(id: string) {
  return id.startsWith('custom-');
}
