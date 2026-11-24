import { haversineKm } from './format';
import { mapConfig, SENAI_LUIZ_VARGA } from './config';
import type { LatLng } from '../services/routing';

const CAMPUS: LatLng = {
  latitude: SENAI_LUIZ_VARGA.latitude,
  longitude: SENAI_LUIZ_VARGA.longitude,
};

export type OpsOrigin = {
  /** Sempre a coordenada usada no mapa / GPS do usuário quando disponível */
  coord: LatLng;
  /** Origem para cálculo de distância dos postos */
  stationOrigin: LatLng;
  mode: 'gps' | 'fallback';
  label: string;
  stationsFar: boolean;
};

/**
 * Prioriza a localização real do dispositivo.
 * Sem GPS (bloqueado no PC do SENAI, permissão negada, etc.) → campus Luiz Varga / Limeira.
 */
export function resolveOpsOrigin(
  user: LatLng,
  opts?: { hasFix?: boolean; isFallback?: boolean },
): OpsOrigin {
  const hasFix = opts?.hasFix ?? true;
  const isFallback = opts?.isFallback ?? false;

  if (!hasFix || isFallback) {
    return {
      coord: CAMPUS,
      stationOrigin: CAMPUS,
      mode: 'fallback',
      label: mapConfig.fallbackCampus.label,
      stationsFar: false,
    };
  }

  const d = haversineKm(user.latitude, user.longitude, CAMPUS.latitude, CAMPUS.longitude);
  return {
    coord: user,
    stationOrigin: user,
    mode: 'gps',
    label: 'GPS do dispositivo',
    // Região Limeira / vizinhas — longe se > ~60 km do campus
    stationsFar: d > 60,
  };
}
