import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haversineKm } from '../lib/format';
import type { LatLng } from '../services/routing';

export type SimSpeed = 'normal' | 'fast' | 'veryFast';

/** Velocidade de avanço na polyline (m/s) + km/h mostrado no velocímetro. */
export const SIM_SPEED_PRESETS: Record<SimSpeed, { mps: number; displayKmh: number; label: string }> = {
  normal: { mps: 22, displayKmh: 48, label: 'Normal' },
  fast: { mps: 55, displayKmh: 95, label: 'Rápida' },
  veryFast: { mps: 120, displayKmh: 160, label: 'Muito rápida' },
};

const TICK_MS = 50;

function bearing(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function segmentM(a: LatLng, b: LatLng) {
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000;
}

function buildCum(coords: LatLng[]) {
  const cum = new Array(coords.length).fill(0) as number[];
  for (let i = 0; i < coords.length - 1; i++) {
    cum[i + 1] = cum[i] + segmentM(coords[i], coords[i + 1]);
  }
  return cum;
}

function pointAtDistance(coords: LatLng[], cum: number[], distM: number) {
  const total = cum[cum.length - 1] || 0;
  const d = Math.max(0, Math.min(distM, total));
  if (coords.length < 2) {
    return { point: coords[0] ?? { latitude: 0, longitude: 0 }, heading: 0, index: 0 };
  }
  let i = 0;
  while (i < cum.length - 1 && cum[i + 1] < d) i += 1;
  const a = coords[i];
  const b = coords[Math.min(coords.length - 1, i + 1)];
  const seg = Math.max(1e-6, cum[i + 1] - cum[i]);
  const t = (d - cum[i]) / seg;
  return {
    point: {
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    },
    heading: bearing(a, b),
    index: i,
  };
}

export function useRouteSimulation(coordinates: LatLng[] | undefined) {
  const [active, setActive] = useState(false);
  const [speed, setSpeed] = useState<SimSpeed>('normal');
  const [distanceM, setDistanceM] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState(0);

  const coords = coordinates?.length ? coordinates : [];
  const cum = useMemo(() => (coords.length ? buildCum(coords) : []), [coords]);
  const totalM = cum.length ? cum[cum.length - 1] : 0;

  const activeRef = useRef(active);
  const speedRef = useRef(speed);
  const distRef = useRef(distanceM);
  activeRef.current = active;
  speedRef.current = speed;
  distRef.current = distanceM;

  const stop = useCallback(() => {
    setActive(false);
  }, []);

  const reset = useCallback(() => {
    setActive(false);
    setDistanceM(0);
    setArrived(false);
    distRef.current = 0;
    if (coords.length) {
      const startPt = pointAtDistance(coords, cum, 0);
      setPosition(startPt.point);
      setHeading(startPt.heading);
    } else {
      setPosition(null);
    }
  }, [coords, cum]);

  const start = useCallback(
    (preset?: SimSpeed) => {
      if (coords.length < 2) return;
      if (preset) {
        setSpeed(preset);
        speedRef.current = preset;
      }
      setArrived(false);
      setDistanceM(0);
      distRef.current = 0;
      const startPt = pointAtDistance(coords, cum, 0);
      setPosition(startPt.point);
      setHeading(startPt.heading);
      setActive(true);
    },
    [coords, cum],
  );

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const next = s === 'normal' ? 'fast' : s === 'fast' ? 'veryFast' : 'normal';
      speedRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!active || coords.length < 2) return;

    const id = setInterval(() => {
      if (!activeRef.current) return;
      const mps = SIM_SPEED_PRESETS[speedRef.current].mps;
      const step = mps * (TICK_MS / 1000);
      let next = distRef.current + step;
      if (next >= totalM) {
        next = totalM;
        const end = pointAtDistance(coords, cum, next);
        setDistanceM(next);
        distRef.current = next;
        setPosition(end.point);
        setHeading(end.heading);
        setArrived(true);
        setActive(false);
        return;
      }
      distRef.current = next;
      setDistanceM(next);
      const at = pointAtDistance(coords, cum, next);
      setPosition(at.point);
      setHeading(at.heading);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [active, coords, cum, totalM]);

  useEffect(() => {
    if (!coords.length || active || position) return;
    const startPt = pointAtDistance(coords, cum, 0);
    setPosition(startPt.point);
    setHeading(startPt.heading);
  }, [coords, cum, active, position]);

  const progress01 = totalM > 0 ? Math.min(1, distanceM / totalM) : 0;
  const preset = SIM_SPEED_PRESETS[speed];

  return {
    active,
    arrived,
    speed,
    speedLabel: preset.label,
    displayKmh: active ? preset.displayKmh : arrived ? 0 : 0,
    position,
    heading,
    distanceM,
    totalM,
    progress01,
    start,
    stop,
    reset,
    setSpeed,
    cycleSpeed,
    presets: SIM_SPEED_PRESETS,
  };
}
