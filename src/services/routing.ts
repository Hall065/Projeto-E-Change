import { etaMinutes, haversineKm } from '../lib/format';

export type LatLng = { latitude: number; longitude: number };

export type TurnSide = 'left' | 'right' | 'straight' | 'u-turn';

export type RouteStep = {
  instruction: string;
  distanceM: number;
  durationS: number;
  name: string;
  modifier?: string;
  location: LatLng;
  /** Ângulo da curva no path (−180…180; + = direita). Derivado da geometria/OSRM. */
  turnDeg?: number;
  /** Lado da manobra conforme o caminho (não só o texto OSRM). */
  turnSide?: TurnSide;
};

export type NavRoute = {
  id: string;
  coordinates: LatLng[];
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
  provider: 'osrm' | 'fallback';
  label?: string;
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

/** Normaliza diferença de bearings para −180…180 (− esquerda, + direita). */
export function turnDeltaDeg(bearingBefore: number, bearingAfter: number) {
  return ((bearingAfter - bearingBefore + 540) % 360) - 180;
}

export function turnSideFromDelta(delta: number): TurnSide {
  const a = Math.abs(delta);
  if (a < 25) return 'straight';
  if (a > 150) return 'u-turn';
  return delta > 0 ? 'right' : 'left';
}

function instructionFromTurn(side: TurnSide, type?: string) {
  const t = (type ?? '').toLowerCase();
  if (t === 'arrive') return 'Chegue ao destino';
  if (t === 'depart') return 'Siga em frente';
  if (t.includes('roundabout')) return 'Entre na rotatória';
  switch (side) {
    case 'right':
      return 'Vire à direita';
    case 'left':
      return 'Vire à esquerda';
    case 'u-turn':
      return 'Faça o retorno';
    default:
      return 'Siga em frente';
  }
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

function parseOsrmRoute(route: any, from: LatLng, to: LatLng, index: number): NavRoute {
  const coordinates: LatLng[] = (route.geometry?.coordinates ?? []).map((c: number[]) => ({
    longitude: c[0],
    latitude: c[1],
  }));

  const steps: RouteStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const [lon, lat] = step.maneuver?.location ?? [to.longitude, to.latitude];
      const type = step.maneuver?.type as string | undefined;
      const modifier = step.maneuver?.modifier as string | undefined;

      // Prioridade: bearings OSRM (caminho real) → texto do modifier
      let turnDeg: number | undefined;
      let turnSide: TurnSide | undefined;
      const before = step.maneuver?.bearing_before;
      const after = step.maneuver?.bearing_after;
      if (typeof before === 'number' && typeof after === 'number') {
        turnDeg = turnDeltaDeg(before, after);
        turnSide = turnSideFromDelta(turnDeg);
      } else if (modifier) {
        const m = modifier.toLowerCase();
        if (m.includes('uturn') || m.includes('u-turn')) turnSide = 'u-turn';
        else if (m.includes('right')) turnSide = 'right';
        else if (m.includes('left')) turnSide = 'left';
        else if (m.includes('straight')) turnSide = 'straight';
      }

      const instruction =
        turnSide && type !== 'arrive' && type !== 'depart' && !String(type ?? '').includes('roundabout')
          ? instructionFromTurn(turnSide, type)
          : modifierToText(modifier, type);

      steps.push({
        instruction,
        distanceM: Number(step.distance ?? 0),
        durationS: Number(step.duration ?? 0),
        name: step.name || '',
        modifier,
        location: { latitude: lat, longitude: lon },
        turnDeg,
        turnSide,
      });
    }
  }

  // Refina turnSide pela geometria da polyline (fonte da verdade do mapa)
  refineStepsFromGeometry(steps, coordinates.length ? coordinates : [from, to]);

  return {
    id: `osrm-${index}-${Math.round(route.distance)}`,
    coordinates: coordinates.length ? coordinates : [from, to],
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    steps: steps.length
      ? steps
      : [
          {
            instruction: 'Siga até o destino',
            distanceM: route.distance,
            durationS: route.duration,
            name: '',
            location: to,
            turnSide: 'straight',
            turnDeg: 0,
          },
        ],
    provider: 'osrm',
    label: index === 0 ? 'Recomendada' : `Alternativa ${index}`,
  };
}

/** Recalcula esquerda/direita olhando o path antes/depois da manobra. */
function refineStepsFromGeometry(steps: RouteStep[], coordinates: LatLng[]) {
  if (coordinates.length < 3 || !steps.length) return;
  for (const step of steps) {
    const typeHint = `${step.instruction}`.toLowerCase();
    if (typeHint.includes('chegue') || typeHint.includes('rotatória')) continue;
    const geo = turnAtPathPoint(coordinates, step.location);
    if (!geo || Math.abs(geo.turnDeg) < 20) continue;
    step.turnDeg = geo.turnDeg;
    step.turnSide = geo.turnSide;
    step.instruction = instructionFromTurn(geo.turnSide);
    step.modifier =
      geo.turnSide === 'left'
        ? 'left'
        : geo.turnSide === 'right'
          ? 'right'
          : geo.turnSide === 'u-turn'
            ? 'uturn'
            : 'straight';
  }
}

function segmentLengthM(a: LatLng, b: LatLng) {
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000;
}

/** Bearing médio olhando ~`meters` atrás/à frente de `index` na polyline. */
function bearingAround(coordinates: LatLng[], index: number, meters: number, forward: boolean) {
  if (coordinates.length < 2) return 0;
  let left = meters;
  let i = index;
  const pts: LatLng[] = [coordinates[index]];
  if (forward) {
    while (left > 0 && i < coordinates.length - 1) {
      const d = segmentLengthM(coordinates[i], coordinates[i + 1]);
      pts.push(coordinates[i + 1]);
      left -= d;
      i += 1;
      if (pts.length > 8) break;
    }
  } else {
    while (left > 0 && i > 0) {
      const d = segmentLengthM(coordinates[i - 1], coordinates[i]);
      pts.unshift(coordinates[i - 1]);
      left -= d;
      i -= 1;
      if (pts.length > 8) break;
    }
  }
  if (pts.length < 2) {
    const j = Math.min(coordinates.length - 1, Math.max(0, forward ? index + 1 : index - 1));
    return forward ? bearing(coordinates[index], coordinates[j]) : bearing(coordinates[j], coordinates[index]);
  }
  return forward
    ? bearing(pts[0], pts[pts.length - 1])
    : bearing(pts[0], pts[pts.length - 1]);
}

function turnAtPathPoint(coordinates: LatLng[], point: LatLng) {
  if (coordinates.length < 3) return null;
  const at = nearestPointOnRoute(coordinates, point);
  const idx = Math.max(1, Math.min(coordinates.length - 2, at.index));
  const bIn = bearingAround(coordinates, idx, 28, false);
  const bOut = bearingAround(coordinates, idx, 28, true);
  const turnDeg = turnDeltaDeg(bIn, bOut);
  return { turnDeg, turnSide: turnSideFromDelta(turnDeg), index: idx };
}

export type PathManeuver = {
  location: LatLng;
  index: number;
  turnDeg: number;
  turnSide: TurnSide;
  /** metros ao longo do path desde `fromIndex` */
  distanceM: number;
  step: RouteStep;
};

/**
 * Detecta curvas reais na polyline azul (fonte da verdade do mapa).
 * Usado nos “próximos passos” — não depende de texto pré-setado do OSRM.
 */
export function detectPathManeuvers(
  coordinates: LatLng[],
  fromIndex = 0,
  opts?: { minTurnDeg?: number; minGapM?: number; max?: number },
): PathManeuver[] {
  const minTurn = opts?.minTurnDeg ?? 32;
  const minGap = opts?.minGapM ?? 45;
  const max = opts?.max ?? 6;
  if (coordinates.length < 4) return [];

  const out: PathManeuver[] = [];
  let distFromStart = 0;
  let lastEmitDist = -minGap;

  for (let i = Math.max(1, fromIndex); i < coordinates.length - 1; i++) {
    distFromStart += segmentLengthM(coordinates[i - 1], coordinates[i]);
    const bIn = bearingAround(coordinates, i, 30, false);
    const bOut = bearingAround(coordinates, i, 30, true);
    const turnDeg = turnDeltaDeg(bIn, bOut);
    const abs = Math.abs(turnDeg);
    if (abs < minTurn) continue;
    if (distFromStart - lastEmitDist < minGap) continue;

    const turnSide = turnSideFromDelta(turnDeg);
    if (turnSide === 'straight') continue;

    const location = coordinates[i];
    const step: RouteStep = {
      instruction: instructionFromTurn(turnSide),
      distanceM: 0,
      durationS: 0,
      name: '',
      modifier: turnSide === 'u-turn' ? 'uturn' : turnSide,
      location,
      turnDeg,
      turnSide,
    };
    out.push({
      location,
      index: i,
      turnDeg,
      turnSide,
      distanceM: Math.round(distFromStart),
      step,
    });
    lastEmitDist = distFromStart;
    if (out.length >= max) break;
  }

  // Destino final
  const end = coordinates[coordinates.length - 1];
  let endDist = 0;
  for (let i = Math.max(0, fromIndex); i < coordinates.length - 1; i++) {
    endDist += segmentLengthM(coordinates[i], coordinates[i + 1]);
  }
  out.push({
    location: end,
    index: coordinates.length - 1,
    turnDeg: 0,
    turnSide: 'straight',
    distanceM: Math.round(endDist),
    step: {
      instruction: 'Chegue ao destino',
      distanceM: 0,
      durationS: 0,
      name: 'Destino',
      location: end,
      turnSide: 'straight',
      turnDeg: 0,
    },
  });

  return out;
}

function fallbackRoute(from: LatLng, to: LatLng): NavRoute {
  const distanceKm = Number(haversineKm(from.latitude, from.longitude, to.latitude, to.longitude).toFixed(1));
  return {
    id: 'fallback-direct',
    coordinates: [from, to],
    distanceKm,
    durationMin: etaMinutes(distanceKm),
    steps: [
      {
        instruction: 'Siga em direção ao posto',
        distanceM: distanceKm * 1000,
        durationS: etaMinutes(distanceKm) * 60,
        name: '',
        location: to,
      },
    ],
    provider: 'fallback',
    label: 'Direta (estimado)',
  };
}

/** Rota real via OSRM (open source) — sensação de GPS Waze/Uber */
export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<NavRoute> {
  const routes = await fetchDrivingAlternatives(from, to);
  return routes[0];
}

/** Alternativas reais do OSRM (`alternatives=true`). Não inventa rotas se o provedor não enviar. */
export async function fetchDrivingAlternatives(from: LatLng, to: LatLng): Promise<NavRoute[]> {
  if (
    !Number.isFinite(from.latitude) ||
    !Number.isFinite(from.longitude) ||
    !Number.isFinite(to.latitude) ||
    !Number.isFinite(to.longitude)
  ) {
    return [fallbackRoute(from, to)];
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson&steps=true&alternatives=true&annotations=false`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const routes = json?.routes;
    if (!res.ok || !Array.isArray(routes) || !routes.length) throw new Error(json?.message ?? 'OSRM failed');
    return routes.slice(0, 3).map((route: any, index: number) => parseOsrmRoute(route, from, to, index));
  } catch {
    return [fallbackRoute(from, to)];
  }
}

/** Projeta `point` no segmento A→B (aproximação equiretangular local). */
function projectOnSegment(point: LatLng, a: LatLng, b: LatLng) {
  const ax = a.longitude;
  const ay = a.latitude;
  const bx = b.longitude;
  const by = b.latitude;
  const px = point.longitude;
  const py = point.latitude;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return {
    point: { latitude: ay + dy * t, longitude: ax + dx * t } as LatLng,
    t,
  };
}

/**
 * Ponto mais próximo na polyline (sobre o segmento, não só vértices) + bearing.
 * Usado para “snap to road” estilo Waze — o puck fica em cima da linha azul.
 */
export function nearestPointOnRoute(route: LatLng[], point: LatLng) {
  if (!route.length) {
    return {
      index: 0,
      distanceKm: 0,
      heading: 0,
      point,
      remainingCoordinates: [] as LatLng[],
    };
  }
  if (route.length === 1) {
    return {
      index: 0,
      distanceKm: haversineKm(point.latitude, point.longitude, route[0].latitude, route[0].longitude),
      heading: 0,
      point: route[0],
      remainingCoordinates: route.slice(0),
    };
  }

  let bestIndex = 0;
  let bestD = Number.POSITIVE_INFINITY;
  let bestPoint = route[0];
  for (let i = 0; i < route.length - 1; i++) {
    const proj = projectOnSegment(point, route[i], route[i + 1]);
    const d = haversineKm(point.latitude, point.longitude, proj.point.latitude, proj.point.longitude);
    if (d < bestD) {
      bestD = d;
      bestIndex = i;
      bestPoint = proj.point;
    }
  }
  const next = Math.min(route.length - 1, bestIndex + 1);
  return {
    index: bestIndex,
    distanceKm: bestD,
    heading: bearing(route[bestIndex], route[next]),
    point: bestPoint,
    remainingCoordinates: [bestPoint, ...route.slice(bestIndex + 1)],
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
