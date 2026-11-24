import { haversineKm } from '../lib/format';
import type { LatLng, NavRoute, RouteStep } from './routing';
import { nearestPointOnRoute, remainingDistanceKm } from './routing';

export type NavProgress = {
  heading: number;
  remainingKm: number;
  remainingMin: number;
  remainingLine: LatLng[];
  traveledLine: LatLng[];
  step: RouteStep | null;
  stepIndex: number;
  distanceToManeuverM: number;
  offRouteKm: number;
  /** Posição do puck — snapada na rota (Waze), não o GPS bruto */
  snappedCoord: LatLng;
  /** Ponto à frente do usuário para a câmera (puck fica no terço inferior) */
  cameraTarget: LatLng;
  arrived: boolean;
};

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

export function bearingDegrees(a: LatLng, b: LatLng) {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Desloca `meters` na direção `headingDeg` a partir de `pos`. */
export function lookAheadPoint(pos: LatLng, headingDeg: number, meters: number): LatLng {
  const R = 6371000;
  const d = meters / R;
  const brng = toRad(headingDeg);
  const lat1 = toRad(pos.latitude);
  const lon1 = toRad(pos.longitude);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { latitude: toDeg(lat2), longitude: toDeg(lon2) };
}

/**
 * Câmera Waze/Uber: avança `meters` ao longo da polyline (não só bearing).
 * Assim a vista "olha a curva" em vez de um ponto reto no vazio.
 */
export function lookAheadAlongRoute(route: LatLng[], fromIndex: number, meters: number, fallback: LatLng, headingDeg: number): LatLng {
  if (!route.length || fromIndex >= route.length - 1) {
    return lookAheadPoint(fallback, headingDeg, meters);
  }
  // Começa no ponto snapado (fallback), depois segue os vértices à frente —
  // assim o heading acompanha a linha azul, não um vértice atrás na curva.
  let left = meters / 1000; // km
  let i = Math.max(0, fromIndex);
  let cur = fallback;
  // Primeiro segmento: snapped → próximo vértice útil
  const firstNext = route[Math.min(route.length - 1, i + 1)];
  while (i < route.length - 1 && left > 0) {
    const next = i === fromIndex ? firstNext : route[i + 1];
    const seg = haversineKm(cur.latitude, cur.longitude, next.latitude, next.longitude);
    if (seg >= left || seg < 1e-8) {
      const t = seg < 1e-8 ? 1 : left / seg;
      return {
        latitude: cur.latitude + (next.latitude - cur.latitude) * t,
        longitude: cur.longitude + (next.longitude - cur.longitude) * t,
      };
    }
    left -= seg;
    cur = next;
    i += 1;
  }
  return route[route.length - 1];
}

/** Distância ao longo da rota até o próximo passo (mais fiel que haversine direto). */
export function distanceAlongRouteTo(route: LatLng[], fromIndex: number, target: LatLng): number {
  if (!route.length) {
    return Math.round(haversineKm(0, 0, target.latitude, target.longitude) * 1000);
  }
  const targetNear = nearestPointOnRoute(route, target);
  let total = 0;
  const end = Math.max(fromIndex, targetNear.index);
  for (let i = fromIndex; i < end; i++) {
    if (i + 1 >= route.length) break;
    total += haversineKm(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude,
    );
  }
  return Math.round(total * 1000);
}

export function formatManeuverDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.max(10, Math.round(meters / 5) * 5)} m`;
}

export function maneuverKind(step: RouteStep | null): 'left' | 'right' | 'straight' | 'u-turn' | 'roundabout' | 'arrive' | 'depart' {
  if (!step) return 'straight';
  const t = `${step.instruction} ${step.modifier ?? ''}`.toLowerCase();
  if (t.includes('chegue') || t.includes('arrive') || step.modifier === 'arrive') return 'arrive';
  if (t.includes('rotatória') || t.includes('roundabout')) return 'roundabout';
  // Geometria da rota manda na seta (esquerda/direita/retorno/em frente)
  if (step.turnSide === 'left' || step.turnSide === 'right' || step.turnSide === 'u-turn') {
    return step.turnSide;
  }
  if (step.turnSide === 'straight') {
    if (t.includes('parta') || t.includes('depart')) return 'depart';
    return 'straight';
  }
  if (t.includes('parta') || t.includes('depart')) return 'depart';
  if (t.includes('retorno') || t.includes('u-turn') || t.includes('uturn')) return 'u-turn';
  if (t.includes('esquerda') || t.includes('left')) return 'left';
  if (t.includes('direita') || t.includes('right')) return 'right';
  return 'straight';
}

function isTrivialStep(step: RouteStep) {
  if (step.turnSide === 'left' || step.turnSide === 'right' || step.turnSide === 'u-turn') return false;
  const t = `${step.instruction} ${step.modifier ?? ''}`.toLowerCase();
  // Waze/Uber skip micro “continue/depart” and surface the next real turn
  if (t.includes('chegue') || t.includes('arrive')) return false;
  if (t.includes('esquerda') || t.includes('left')) return false;
  if (t.includes('direita') || t.includes('right')) return false;
  if (t.includes('retorno') || t.includes('u-turn') || t.includes('uturn')) return false;
  if (t.includes('rotatória') || t.includes('roundabout')) return false;
  return (
    t.includes('siga em frente') ||
    t.includes('continue') ||
    t.includes('parta') ||
    t.includes('depart') ||
    t.includes('new name') ||
    step.turnSide === 'straight' ||
    !step.modifier
  );
}

function activeStepIndex(steps: RouteStep[], route: LatLng[], user: LatLng) {
  if (!steps.length) return 0;
  const near = nearestPointOnRoute(route, user);
  let best = steps.length - 1;
  for (let i = 0; i < steps.length; i++) {
    const at = nearestPointOnRoute(route, steps[i].location);
    if (at.index >= near.index) {
      best = i;
      break;
    }
  }
  const d = haversineKm(user.latitude, user.longitude, steps[best].location.latitude, steps[best].location.longitude);
  if (d < 0.035 && best < steps.length - 1) best += 1;

  // Prefer next meaningful maneuver (turn / arrive) when current is trivial continue
  if (isTrivialStep(steps[best])) {
    for (let i = best + 1; i < steps.length; i++) {
      if (!isTrivialStep(steps[i])) return i;
    }
  }
  return best;
}

export function computeNavProgress(input: {
  route: NavRoute | null;
  user: LatLng;
  deviceHeading: number | null;
  lookAheadM?: number;
}): NavProgress {
  const { route, user, deviceHeading } = input;
  const lookAheadM = input.lookAheadM ?? 70;

  if (!route?.coordinates?.length) {
    return {
      heading: deviceHeading ?? 0,
      remainingKm: route?.distanceKm ?? 0,
      remainingMin: route?.durationMin ?? 0,
      remainingLine: [],
      traveledLine: [],
      step: route?.steps?.[0] ?? null,
      stepIndex: 0,
      distanceToManeuverM: 0,
      offRouteKm: 0,
      snappedCoord: user,
      cameraTarget: lookAheadPoint(user, deviceHeading ?? 0, lookAheadM),
      arrived: false,
    };
  }

  const near = nearestPointOnRoute(route.coordinates, user);
  const remKm = remainingDistanceKm(route.coordinates, near.index);
  const ratio = route.distanceKm > 0 ? remKm / route.distanceKm : 1;
  const remMin = Math.max(1, Math.round((route.durationMin || 1) * ratio));
  const stepIndex = activeStepIndex(route.steps, route.coordinates, user);
  const step = route.steps[stepIndex] ?? null;
  const onRoute = near.distanceKm < 0.04;
  const snappedCoord = onRoute ? near.point : user;
  // Heading da seta = segmento local da linha azul (curto).
  // Look-ahead longo puxava a seta “para dentro” da curva seguinte.
  const ahead = lookAheadAlongRoute(
    route.coordinates,
    near.index,
    16,
    snappedCoord,
    near.heading,
  );
  const routeHeading = bearingDegrees(snappedCoord, ahead);
  const pathHeading = Number.isFinite(near.heading) ? near.heading : routeHeading;
  // Na rota: path. Fora: GPS se houver.
  const heading =
    onRoute || deviceHeading == null || Number.isNaN(deviceHeading) ? pathHeading : deviceHeading;
  let distanceToManeuverM = step
    ? distanceAlongRouteTo(route.coordinates, near.index, step.location)
    : Math.round(remKm * 1000);
  if (step && distanceToManeuverM < 15 && step.distanceM > 40) {
    distanceToManeuverM = Math.round(step.distanceM);
  }
  distanceToManeuverM = Math.max(10, distanceToManeuverM);

  return {
    heading,
    remainingKm: remKm,
    remainingMin: remMin,
    remainingLine: near.remainingCoordinates,
    traveledLine: [...route.coordinates.slice(0, near.index + 1), snappedCoord],
    step,
    stepIndex,
    distanceToManeuverM,
    offRouteKm: near.distanceKm,
    snappedCoord,
    cameraTarget: lookAheadAlongRoute(route.coordinates, near.index, lookAheadM, snappedCoord, heading),
    arrived: remKm < 0.05,
  };
}
