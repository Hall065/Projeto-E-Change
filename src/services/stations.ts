import { supabase } from '../lib/supabase';
import { etaMinutes, haversineKm } from '../lib/format';
import type { Connector, Station, StationWithMetrics } from '../types/database';

const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

function withMetrics(station: Station, connectors: Connector[], origin = SAO_PAULO): StationWithMetrics {
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
}

export async function fetchStations(origin = SAO_PAULO): Promise<StationWithMetrics[]> {
  const { data: stations, error } = await supabase
    .from('stations')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) throw error;

  const { data: connectors, error: cErr } = await supabase.from('connectors').select('*');
  if (cErr) throw cErr;

  return (stations ?? [])
    .map((s) => withMetrics(s as Station, (connectors ?? []).filter((c) => c.station_id === s.id) as Connector[], origin))
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

export async function fetchStationById(id: string, origin = SAO_PAULO): Promise<StationWithMetrics | null> {
  const { data: station, error } = await supabase.from('stations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!station) return null;
  const { data: connectors, error: cErr } = await supabase.from('connectors').select('*').eq('station_id', id);
  if (cErr) throw cErr;
  return withMetrics(station as Station, (connectors ?? []) as Connector[], origin);
}

export async function fetchAllStationsAdmin() {
  const { data, error } = await supabase.from('stations').select('*, connectors(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateStationStatus(id: string, status: Station['status']) {
  const { error } = await supabase.from('stations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
