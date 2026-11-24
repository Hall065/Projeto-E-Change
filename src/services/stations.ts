import { supabase, supabaseConfigured } from '../lib/supabase';
import { getDemoStationById, getDemoStationsWithMetrics } from '../data/demoStations';
import { getMergedCatalog, patchStationStatus } from '../lib/localCatalog';
import { etaMinutes, haversineKm } from '../lib/format';
import { getCustomDestination, isCustomDestinationId } from './customDestination';
import { mapConfig } from '../lib/config';
import type { Connector, Station, StationStatus, StationWithMetrics } from '../types/database';

const DEFAULT_ORIGIN = mapConfig.defaultCenter;

/** Cache curto do catálogo remoto — evita round-trip a cada foco no mapa. */
let remoteCatalog: { at: number; stations: Station[]; connectors: Connector[] } | null = null;
const CATALOG_TTL_MS = 60_000;

function withMetrics(station: Station, connectors: Connector[], origin = DEFAULT_ORIGIN): StationWithMetrics {
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

async function getLocalActiveStations(origin = DEFAULT_ORIGIN): Promise<StationWithMetrics[]> {
  const { stations, connectors } = await getMergedCatalog();
  return stations
    .filter((s) => s.status === 'active')
    .map((s) => withMetrics(s, connectors.filter((c) => c.station_id === s.id), origin))
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

export async function fetchStations(origin = DEFAULT_ORIGIN): Promise<StationWithMetrics[]> {
  const local = await getLocalActiveStations(origin);
  if (!supabaseConfigured) return local.length ? local : getDemoStationsWithMetrics(origin);

  try {
    const fresh = remoteCatalog && Date.now() - remoteCatalog.at < CATALOG_TTL_MS;
    if (!fresh) {
      const [{ data: stations, error }, { data: connectors, error: cErr }] = await Promise.all([
        supabase.from('stations').select('*').eq('status', 'active').order('name'),
        supabase.from('connectors').select('*'),
      ]);
      if (error) throw error;
      if (cErr) throw cErr;
      remoteCatalog = {
        at: Date.now(),
        stations: (stations ?? []) as Station[],
        connectors: (connectors ?? []) as Connector[],
      };
    }

    const catalog = remoteCatalog!;
    const list = catalog.stations
      .map((s) =>
        withMetrics(
          s,
          catalog.connectors.filter((c) => c.station_id === s.id),
          origin,
        ),
      )
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

    if (!list.length) return local.length ? local : getDemoStationsWithMetrics(origin);

    // Mescla postos locais (ex.: criados pelo dono) que ainda não estão no remoto
    const remoteIds = new Set(list.map((s) => s.id));
    const extras = local.filter((s) => !remoteIds.has(s.id));
    return [...list, ...extras].sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  } catch {
    return local.length ? local : getDemoStationsWithMetrics(origin);
  }
}

export async function fetchStationById(id: string, origin = DEFAULT_ORIGIN): Promise<StationWithMetrics | null> {
  if (isCustomDestinationId(id)) {
    const custom = getCustomDestination(id);
    if (!custom) return null;
    const distance = haversineKm(origin.latitude, origin.longitude, custom.latitude, custom.longitude);
    return {
      ...custom,
      distance_km: Number(distance.toFixed(1)),
      eta_min: etaMinutes(distance),
    };
  }

  const { stations, connectors } = await getMergedCatalog();
  const localStation = stations.find((s) => s.id === id);
  if (localStation) {
    return withMetrics(
      localStation,
      connectors.filter((c) => c.station_id === id),
      origin,
    );
  }

  if (id.startsWith('demo-') || !supabaseConfigured) {
    return getDemoStationById(id, origin);
  }

  try {
    const { data: station, error } = await supabase.from('stations').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!station) return getDemoStationById(id, origin);
    const { data: connectorsRemote, error: cErr } = await supabase.from('connectors').select('*').eq('station_id', id);
    if (cErr) throw cErr;
    return withMetrics(station as Station, (connectorsRemote ?? []) as Connector[], origin);
  } catch {
    return getDemoStationById(id, origin);
  }
}

export async function fetchAllStationsAdmin() {
  const local = await getMergedCatalog();
  const localRows = local.stations.map((s) => ({
    ...s,
    connectors: local.connectors.filter((c) => c.station_id === s.id),
  }));

  if (!supabaseConfigured) return localRows;

  try {
    const { data, error } = await supabase.from('stations').select('*, connectors(*)').order('created_at', { ascending: false });
    if (error) throw error;
    const remote = data ?? [];
    const remoteIds = new Set(remote.map((s: any) => s.id));
    return [...remote, ...localRows.filter((s) => !remoteIds.has(s.id))];
  } catch {
    return localRows;
  }
}

export async function updateStationStatus(id: string, status: StationStatus) {
  await patchStationStatus(id, status);
  if (!supabaseConfigured || id.startsWith('demo-') || id.startsWith('local-')) return;
  const { error } = await supabase.from('stations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) console.warn('updateStationStatus remote:', error.message);
}
