import type { LatLng } from './routing';

export type PlaceSuggestion = {
  id: string;
  label: string;
  subtitle: string;
  coord: LatLng;
  kind: 'address' | 'place' | 'station';
};

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
};

const controllers = new Map<string, AbortController>();

/** Nominatim (OSM) — uso gratuito com User-Agent identificável; debounce no caller. */
export async function searchPlaces(query: string, near?: LatLng, key = 'default'): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  controllers.get(key)?.abort();
  const controller = new AbortController();
  controllers.set(key, controller);

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '0',
    limit: '6',
    countrycodes: 'br',
  });
  if (near) {
    params.set('viewbox', `${near.longitude - 0.35},${near.latitude + 0.35},${near.longitude + 0.35},${near.latitude - 0.35}`);
    params.set('bounded', '0');
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
      // Nominatim exige identificação; chave pública do app
      'User-Agent': 'EChargeMap/1.0 (expo; navigation; contact: suporte@echargemap.app)',
    },
  });
  if (!res.ok) throw new Error('Falha na busca de endereços');
  const data = (await res.json()) as NominatimItem[];
  return data.map((item) => {
    const parts = item.display_name.split(',');
    return {
      id: String(item.place_id),
      label: parts[0]?.trim() || item.display_name,
      subtitle: parts.slice(1, 4).join(',').trim(),
      coord: { latitude: Number(item.lat), longitude: Number(item.lon) },
      kind: item.class === 'highway' || item.type === 'house' ? 'address' : 'place',
    };
  });
}

export function parseCoordinateQuery(query: string): LatLng | null {
  const m = query.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
