import { haversineKm } from './format';
import { mapConfig } from './config';
import type { LatLng } from '../services/routing';

const SP_HUB: LatLng = mapConfig.defaultCenter;

export type OpsOrigin = {
  /** Sempre a coordenada usada no mapa / GPS do usuário quando disponível */
  coord: LatLng;
  /** Origem para cálculo de distância dos postos demo (pode ser SP se o catálogo for só SP) */
  stationOrigin: LatLng;
  mode: 'gps' | 'fallback';
  label: string;
  stationsFar: boolean;
};

/**
 * Prioriza a localização real do dispositivo.
 * Postos demo ficam em SP: se o usuário estiver longe, o mapa/rota usam o GPS real
 * e as distâncias até os postos refletem isso (sem fingir que ele está em SP).
 */
export function resolveOpsOrigin(
  user: LatLng,
  opts?: { hasFix?: boolean },
): OpsOrigin {
  const hasFix = opts?.hasFix ?? true;
  if (!hasFix) {
    return {
      coord: SP_HUB,
      stationOrigin: SP_HUB,
      mode: 'fallback',
      label: 'Aguardando GPS',
      stationsFar: false,
    };
  }

  const d = haversineKm(user.latitude, user.longitude, SP_HUB.latitude, SP_HUB.longitude);
  return {
    coord: user,
    stationOrigin: user,
    mode: 'gps',
    label: 'GPS do dispositivo',
    stationsFar: d > 80,
  };
}
