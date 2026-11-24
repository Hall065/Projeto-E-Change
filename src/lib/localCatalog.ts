import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  DEMO_CONNECTORS_BASE,
  DEMO_OWNER_ID,
  DEMO_STATIONS_BASE,
} from '../data/demoStations';
import type { Connector, ConnectorStatus, Station, StationStatus } from '../types/database';

const STORAGE_KEY = 'echarge.local.catalog.v1';

type CatalogStore = {
  /** Postos criados pelo dono/admin (além do seed). */
  extraStations: Station[];
  extraConnectors: Connector[];
  stationPatches: Record<string, Partial<Station>>;
  connectorPatches: Record<string, Partial<Connector>>;
};

function emptyStore(): CatalogStore {
  return {
    extraStations: [],
    extraConnectors: [],
    stationPatches: {},
    connectorPatches: {},
  };
}

function webGet(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function webSet(value: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, value);
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web') return webGet();
  return AsyncStorage.getItem(STORAGE_KEY);
}

async function writeRaw(value: string) {
  if (Platform.OS === 'web') {
    webSet(value);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

async function loadStore(): Promise<CatalogStore> {
  try {
    const raw = await readRaw();
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as CatalogStore;
    return {
      extraStations: parsed.extraStations ?? [],
      extraConnectors: parsed.extraConnectors ?? [],
      stationPatches: parsed.stationPatches ?? {},
      connectorPatches: parsed.connectorPatches ?? {},
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: CatalogStore) {
  await writeRaw(JSON.stringify(store));
}

function applyStation(base: Station, patch?: Partial<Station>): Station {
  if (!patch) return base;
  return { ...base, ...patch, id: base.id };
}

function applyConnector(base: Connector, patch?: Partial<Connector>): Connector {
  if (!patch) return base;
  return { ...base, ...patch, id: base.id };
}

/** Catálogo completo mesclado (seed + extras + patches). */
export async function getMergedCatalog(): Promise<{ stations: Station[]; connectors: Connector[] }> {
  const store = await loadStore();
  const stations = [
    ...DEMO_STATIONS_BASE.map((s) => applyStation(s, store.stationPatches[s.id])),
    ...store.extraStations.map((s) => applyStation(s, store.stationPatches[s.id])),
  ];
  const connectors = [
    ...DEMO_CONNECTORS_BASE.map((c) => applyConnector(c, store.connectorPatches[c.id])),
    ...store.extraConnectors.map((c) => applyConnector(c, store.connectorPatches[c.id])),
  ];
  return { stations, connectors };
}

export async function getStationsForOwner(ownerId: string): Promise<Station[]> {
  const { stations } = await getMergedCatalog();
  return stations.filter((s) => s.owner_id === ownerId);
}

export async function getConnectorsForOwner(ownerId: string): Promise<(Connector & { stations?: { name: string } })[]> {
  const { stations, connectors } = await getMergedCatalog();
  const ownedIds = new Set(stations.filter((s) => s.owner_id === ownerId).map((s) => s.id));
  const byId = new Map(stations.map((s) => [s.id, s]));
  return connectors
    .filter((c) => ownedIds.has(c.station_id))
    .map((c) => ({ ...c, stations: { name: byId.get(c.station_id)?.name ?? 'Posto' } }));
}

export async function createOwnerStation(input: {
  ownerId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}): Promise<Station> {
  const store = await loadStore();
  const now = new Date().toISOString();
  const id = `local-station-${Date.now().toString(36)}`;
  const station: Station = {
    id,
    owner_id: input.ownerId,
    name: input.name.trim(),
    description: 'Posto cadastrado no portal do dono',
    address: input.address.trim(),
    city: input.city ?? 'Limeira',
    state: input.state ?? 'SP',
    cep: null,
    latitude: input.latitude ?? -22.571 + (Math.random() - 0.5) * 0.04,
    longitude: input.longitude ?? -47.404 + (Math.random() - 0.5) * 0.04,
    status: 'pending',
    opens_at: '08:00',
    closes_at: '22:00',
    rating_avg: 5,
    rating_count: 0,
    photo_url: null,
    created_at: now,
    updated_at: now,
  };
  const connectors: Connector[] = [
    {
      id: `${id}-ccs`,
      station_id: id,
      label: 'CCS 01',
      connector_type: 'CCS',
      max_power_kw: 120,
      price_per_kwh: 1.79,
      status: 'free',
      created_at: now,
    },
    {
      id: `${id}-type2`,
      station_id: id,
      label: 'Type2 01',
      connector_type: 'Type2',
      max_power_kw: 22,
      price_per_kwh: 1.29,
      status: 'free',
      created_at: now,
    },
  ];
  store.extraStations = [station, ...store.extraStations];
  store.extraConnectors = [...connectors, ...store.extraConnectors];
  await saveStore(store);
  return station;
}

export async function patchStationStatus(stationId: string, status: StationStatus) {
  const store = await loadStore();
  store.stationPatches[stationId] = {
    ...(store.stationPatches[stationId] ?? {}),
    status,
    updated_at: new Date().toISOString(),
  };
  await saveStore(store);
}

export async function patchConnectorStatus(connectorId: string, status: ConnectorStatus) {
  const store = await loadStore();
  store.connectorPatches[connectorId] = {
    ...(store.connectorPatches[connectorId] ?? {}),
    status,
  };
  await saveStore(store);
}

export async function patchConnectorPrice(connectorId: string, pricePerKwh: number) {
  const store = await loadStore();
  store.connectorPatches[connectorId] = {
    ...(store.connectorPatches[connectorId] ?? {}),
    price_per_kwh: pricePerKwh,
  };
  await saveStore(store);
}

export async function getOwnerStats(ownerId: string) {
  const stations = await getStationsForOwner(ownerId);
  const connectors = await getConnectorsForOwner(ownerId);
  return {
    stations: stations.length,
    free: connectors.filter((c) => c.status === 'free').length,
    occupied: connectors.filter((c) => c.status === 'occupied' || c.status === 'reserved').length,
    revenue: 0,
  };
}

export { DEMO_OWNER_ID };
