import { etaMinutes, haversineKm } from '../lib/format';

export type LatLng = { latitude: number; longitude: number };

export type RouteStep = {
  instruction: string;
  distanceM: number;
  durationS: number;
  name: string;
  modifier?: string;
  location: LatLng;
};

export type NavRoute = {
  coordinates: LatLng[];
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
  provider: 'osrm' | 'fallback';
};

function bearing(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function modifierToText(modifier?: string, type?: string) {
  const m = (modifier ?? '').toLowerCase();
  const t = (type ?? '').toLowerCase();
  if (t === 'arrive') return 'Chegue ao destino';
  if (t === 'depart') return 'Siga em frente';
  if (m.includes('sharp right')) return 'Curva fechada à direita';
  if (m.includes('sharp left')) return 'Curva fechada à esquerda';
  if (m.includes('slight right')) return 'Mantenha à direita';
  if (m.includes('slight left')) return 'Mantenha à esquerda';
  if (m.includes('right')) return 'Vire à direita';
  if (m.includes('left')) return 'Vire à esquerda';
  if (m.includes('uturn') || m.includes('u-turn')) return 'Faça o retorno';
  if (m.includes('straight') || t === 'new name') return 'Siga em frente';
  if (t.includes('roundabout')) return 'Entre na rotatória';
  return 'Continue';
}

function formatDistance(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  if (m >= 100) return `${Math.round(m / 10) * 10} m`;
  return `${Math.max(10, Math.round(m))} m`;
}

export function describeStep(step: RouteStep) {
  return {
    banner: `${formatDistance(step.distanceM).toUpperCase()}`,
    title: step.instruction,
    road: step.name || 'via local',
  };
}

/** Rota real via OSRM (open source) — sensação de GPS Waze/Uber */
export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<NavRoute> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson&steps=true&annotations=false`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!res.ok || !route) throw new Error(json?.message ?? 'OSRM failed');

    const coordinates: LatLng[] = (route.geometry?.coordinates ?? []).map((c: number[]) => ({
      longitude: c[0],
      latitude: c[1],
    }));

    const steps: RouteStep[] = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        const [lon, lat] = step.maneuver?.location ?? [to.longitude, to.latitude];
        steps.push({
          instruction: modifierToText(step.maneuver?.modifier, step.maneuver?.type),
          distanceM: Number(step.distance ?? 0),
          durationS: Number(step.duration ?? 0),
          name: step.name || '',
          modifier: step.maneuver?.modifier,
          location: { latitude: lat, longitude: lon },
        });
      }
    }

    return {
      coordinates: coordinates.length ? coordinates : [from, to],
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      steps: steps.length ? steps : [{
        instruction: 'Siga até o destino',
        distanceM: route.distance,
        durationS: route.duration,
        name: '',
        location: to,
      }],
      provider: 'osrm',
    };
  } catch {
    const distanceKm = Number(haversineKm(from.latitude, from.longitude, to.latitude, to.longitude).toFixed(1));
    return {
      coordinates: [from, to],
      distanceKm,
      durationMin: etaMinutes(distanceKm),
      steps: [{
        instruction: 'Siga em direção ao posto',
        distanceM: distanceKm * 1000,
        durationS: etaMinutes(distanceKm) * 60,
        name: '',
        location: to,
      }],
      provider: 'fallback',
    };
  }
}

/** Índice do ponto da polyline mais próximo + bearing de follow */
export function nearestPointOnRoute(route: LatLng[], point: LatLng) {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length; i++) {
    const d = haversineKm(point.latitude, point.longitude, route[i].latitude, route[i].longitude);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const next = Math.min(route.length - 1, best + 1);
  return {
    index: best,
    distanceKm: bestD,
    heading: bearing(route[best], route[next]),
    remainingCoordinates: route.slice(best),
  };
}

export function remainingDistanceKm(route: LatLng[], fromIndex: number) {
  let total = 0;
  for (let i = fromIndex; i < route.length - 1; i++) {
    total += haversineKm(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude,
    );
  }
  return Number(total.toFixed(2));
}

export function nextStepForProgress(steps: RouteStep[], user: LatLng) {
  if (!steps.length) return null;
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  steps.forEach((s, i) => {
    const d = haversineKm(user.latitude, user.longitude, s.location.latitude, s.location.longitude);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  // se já passou do ponto da manobra, mostra a próxima
  const current = steps[best];
  if (bestD < 0.04 && best < steps.length - 1) return steps[best + 1];
  return current;
}
