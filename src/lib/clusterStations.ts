import type { StationWithMetrics } from '../types/database';

export type StationCluster =
  | { type: 'point'; station: StationWithMetrics }
  | {
      type: 'cluster';
      id: string;
      latitude: number;
      longitude: number;
      count: number;
      stations: StationWithMetrics[];
    };

/**
 * Agrupa postos próximos quando o zoom está afastado (mapa nativo sem MapLibre cluster).
 * `cellDeg` ~ tamanho da célula em graus (maior = mais agrupamento).
 */
export function clusterStations(
  stations: StationWithMetrics[],
  cellDeg: number,
): StationCluster[] {
  if (cellDeg <= 0.008 || stations.length <= 1) {
    return stations.map((station) => ({ type: 'point' as const, station }));
  }

  const buckets = new Map<string, StationWithMetrics[]>();
  for (const s of stations) {
    const key = `${Math.floor(s.latitude / cellDeg)}_${Math.floor(s.longitude / cellDeg)}`;
    const list = buckets.get(key) ?? [];
    list.push(s);
    buckets.set(key, list);
  }

  const out: StationCluster[] = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) {
      out.push({ type: 'point', station: group[0] });
      continue;
    }
    const lat = group.reduce((a, s) => a + s.latitude, 0) / group.length;
    const lng = group.reduce((a, s) => a + s.longitude, 0) / group.length;
    out.push({
      type: 'cluster',
      id: `cluster-${key}`,
      latitude: lat,
      longitude: lng,
      count: group.length,
      stations: group,
    });
  }
  return out;
}

export function cellDegForLatitudeDelta(latitudeDelta: number) {
  if (latitudeDelta > 0.35) return 0.12;
  if (latitudeDelta > 0.18) return 0.06;
  if (latitudeDelta > 0.09) return 0.03;
  if (latitudeDelta > 0.045) return 0.015;
  return 0;
}
