import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { PaymentMethod } from '../types/database';

const FAV_KEY = 'echarge.local.favorites.v1';
const HISTORY_KEY = 'echarge.local.history.v1';

export type LocalHistoryRow = {
  id: string;
  user_id: string;
  station_id: string;
  connector_id: string;
  started_at: string;
  ended_at: string | null;
  energy_kwh: number;
  final_cost: number;
  estimated_cost: number;
  status: 'completed';
  stations: { name: string } | null;
  payments: { amount: number; method: PaymentMethod; status: string; paid_at: string | null }[];
  created_at: string;
};

type FavStore = Record<string, string[]>;
type HistoryStore = Record<string, LocalHistoryRow[]>;

function webGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function webSet(key: string, value: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

async function readRaw(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return webGet(key);
  return AsyncStorage.getItem(key);
}

async function writeRaw(key: string, value: string) {
  if (Platform.OS === 'web') {
    webSet(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function loadFavs(): Promise<FavStore> {
  try {
    const raw = await readRaw(FAV_KEY);
    return raw ? (JSON.parse(raw) as FavStore) : {};
  } catch {
    return {};
  }
}

async function saveFavs(store: FavStore) {
  await writeRaw(FAV_KEY, JSON.stringify(store));
}

async function loadHistory(): Promise<HistoryStore> {
  try {
    const raw = await readRaw(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryStore) : {};
  } catch {
    return {};
  }
}

async function saveHistory(store: HistoryStore) {
  await writeRaw(HISTORY_KEY, JSON.stringify(store));
}

export async function getLocalFavoriteIds(userId: string): Promise<string[]> {
  const store = await loadFavs();
  return store[userId] ?? [];
}

export async function isLocalFavorite(userId: string, stationId: string): Promise<boolean> {
  const ids = await getLocalFavoriteIds(userId);
  return ids.includes(stationId);
}

export async function setLocalFavorite(userId: string, stationId: string, favorite: boolean) {
  const store = await loadFavs();
  const current = new Set(store[userId] ?? []);
  if (favorite) current.add(stationId);
  else current.delete(stationId);
  store[userId] = Array.from(current);
  await saveFavs(store);
}

export async function getLocalHistory(userId: string): Promise<LocalHistoryRow[]> {
  const store = await loadHistory();
  return [...(store[userId] ?? [])].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
}

export async function appendLocalHistory(input: {
  userId: string;
  sessionId: string;
  stationId: string;
  stationName: string;
  connectorId: string;
  startedAt: string;
  endedAt?: string | null;
  energyKwh: number;
  finalCost: number;
  method?: PaymentMethod;
}) {
  const store = await loadHistory();
  const rows = store[input.userId] ?? [];
  if (rows.some((r) => r.id === input.sessionId)) {
    return;
  }
  const now = new Date().toISOString();
  const row: LocalHistoryRow = {
    id: input.sessionId,
    user_id: input.userId,
    station_id: input.stationId,
    connector_id: input.connectorId,
    started_at: input.startedAt,
    ended_at: input.endedAt ?? now,
    energy_kwh: input.energyKwh,
    final_cost: input.finalCost,
    estimated_cost: input.finalCost,
    status: 'completed',
    stations: { name: input.stationName },
    payments: [
      {
        amount: input.finalCost,
        method: input.method ?? 'pix',
        status: 'paid',
        paid_at: now,
      },
    ],
    created_at: now,
  };
  store[input.userId] = [row, ...rows].slice(0, 100);
  await saveHistory(store);
}
