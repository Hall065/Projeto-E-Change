import type { ChargingSession, Connector, StationWithMetrics } from '../types/database';

const sessions = new Map<string, ChargingSession>();

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Conectores sintéticos para destino custom / posto sem plugs no catálogo. */
export function ensureDemoConnectors(station: StationWithMetrics): StationWithMetrics {
  if ((station.connectors ?? []).length > 0) return station;
  const connectors: Connector[] = [
    {
      id: `${station.id}-ccs-1`,
      station_id: station.id,
      label: 'CCS A1',
      connector_type: 'CCS',
      max_power_kw: 120,
      price_per_kwh: 1.79,
      status: 'free',
      created_at: new Date().toISOString(),
    },
    {
      id: `${station.id}-type2-1`,
      station_id: station.id,
      label: 'Type2 B1',
      connector_type: 'Type2',
      max_power_kw: 22,
      price_per_kwh: 1.29,
      status: 'free',
      created_at: new Date().toISOString(),
    },
  ];
  return {
    ...station,
    connectors,
    free_connectors: connectors.filter((c) => c.status === 'free').length,
    total_connectors: connectors.length,
    max_power_kw: Math.max(...connectors.map((c) => c.max_power_kw)),
    min_price: Math.min(...connectors.map((c) => c.price_per_kwh)),
  };
}

export function createDemoSession(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  reservationId?: string | null;
  powerKw?: number;
}): ChargingSession {
  const session: ChargingSession = {
    id: uid('demo-session'),
    user_id: input.userId,
    station_id: input.stationId,
    connector_id: input.connectorId,
    reservation_id: input.reservationId ?? null,
    started_at: new Date().toISOString(),
    ended_at: null,
    energy_kwh: 0,
    power_kw: input.powerKw ?? 90,
    elapsed_minutes: 0,
    estimated_cost: 0,
    final_cost: null,
    battery_percent: 28,
    status: 'charging',
    created_at: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getDemoSession(id: string) {
  return sessions.get(id) ?? null;
}

export type ChargeSimSpeed = 'normal' | 'fast' | 'veryFast';

/**
 * Taxa contínua por segundo — a % da bateria sobe proporcional à velocidade.
 * Tick curto (~200 ms) multiplica por dt.
 */
export const CHARGE_SPEED_PRESETS: Record<
  ChargeSimSpeed,
  {
    label: string;
    intervalMs: number;
    /** pontos percentuais de bateria por segundo */
    batteryPerSec: number;
    energyPerSec: number;
    /** minutos de sessão simulados por segundo real */
    minutesPerSec: number;
  }
> = {
  normal: { label: 'Normal', intervalMs: 250, batteryPerSec: 1.5, energyPerSec: 0.9, minutesPerSec: 0.4 },
  fast: { label: 'Rápida', intervalMs: 200, batteryPerSec: 5, energyPerSec: 2.8, minutesPerSec: 1.2 },
  veryFast: { label: 'Muito rápida', intervalMs: 150, batteryPerSec: 14, energyPerSec: 7.5, minutesPerSec: 3.5 },
};

export function tickDemoSession(
  sessionId: string,
  pricePerKwh: number,
  speed: ChargeSimSpeed = 'normal',
  dtSec = 0.25,
): ChargingSession {
  const current = sessions.get(sessionId);
  if (!current) throw new Error('Sessão demo não encontrada');
  if (current.status !== 'charging') return current;

  const preset = CHARGE_SPEED_PRESETS[speed];
  const dt = Math.max(0.05, dtSec);
  const energy = Number(current.energy_kwh) + preset.energyPerSec * dt;
  const elapsed = Number(current.elapsed_minutes) + preset.minutesPerSec * dt;
  const battery = Math.min(100, Number(current.battery_percent) + preset.batteryPerSec * dt);
  const power = Math.max(18, Number(current.power_kw) * (0.97 + Math.random() * 0.06));
  const estimated = Number((energy * pricePerKwh).toFixed(2));
  const next: ChargingSession = {
    ...current,
    energy_kwh: Number(energy.toFixed(2)),
    elapsed_minutes: Math.round(elapsed),
    battery_percent: Number(battery.toFixed(1)),
    power_kw: Number(power.toFixed(1)),
    estimated_cost: estimated,
  };
  sessions.set(sessionId, next);
  return next;
}

export function endDemoSession(sessionId: string, pricePerKwh: number): ChargingSession {
  const current = sessions.get(sessionId);
  if (!current) throw new Error('Sessão demo não encontrada');
  const finalCost = Number((Number(current.energy_kwh) * pricePerKwh).toFixed(2));
  const next: ChargingSession = {
    ...current,
    status: 'completed',
    ended_at: new Date().toISOString(),
    final_cost: finalCost,
    estimated_cost: finalCost,
    power_kw: 0,
  };
  sessions.set(sessionId, next);
  return next;
}

export function isDemoSessionId(id: string) {
  return id.startsWith('demo-session-');
}
