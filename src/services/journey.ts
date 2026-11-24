import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  appendLocalHistory,
  getLocalFavoriteIds,
  getLocalHistory,
  setLocalFavorite,
} from '../lib/localUserData';
import type { ChargingSession, Payment, PaymentMethod, Reservation } from '../types/database';
import {
  CHARGE_SPEED_PRESETS,
  createDemoSession,
  endDemoSession,
  getDemoSession,
  isDemoSessionId,
  tickDemoSession,
  type ChargeSimSpeed,
} from './demoSession';
import { isCustomDestinationId } from './customDestination';
import { fetchStationById } from './stations';

function isLocalUserId(userId: string) {
  return userId.startsWith('demo-user-') || userId.startsWith('local-') || userId === 'demo-user';
}

const demoReservations = new Map<string, Reservation>();

function makeDemoReservation(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  arrivesInMinutes: number;
}): Reservation {
  const arrives = new Date(Date.now() + input.arrivesInMinutes * 60_000);
  const grace = new Date(arrives.getTime() + 15 * 60_000);
  const reservation: Reservation = {
    id: `demo-reservation-${Date.now().toString(36)}`,
    user_id: input.userId,
    station_id: input.stationId,
    connector_id: input.connectorId,
    arrives_at: arrives.toISOString(),
    grace_until: grace.toISOString(),
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };
  demoReservations.set(reservation.id, reservation);
  return reservation;
}

export function getDemoReservation(id: string) {
  return demoReservations.get(id) ?? null;
}

export async function createReservation(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  arrivesInMinutes: number;
}) {
  const useDemo =
    !supabaseConfigured ||
    input.stationId.startsWith('demo-') ||
    input.userId === 'demo-user' ||
    isCustomDestinationId(input.stationId);

  if (useDemo) {
    return makeDemoReservation(input);
  }

  const arrives = new Date(Date.now() + input.arrivesInMinutes * 60_000);
  const grace = new Date(arrives.getTime() + 15 * 60_000);
  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        user_id: input.userId,
        station_id: input.stationId,
        connector_id: input.connectorId,
        arrives_at: arrives.toISOString(),
        grace_until: grace.toISOString(),
        status: 'confirmed',
      })
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('connectors').update({ status: 'reserved' }).eq('id', input.connectorId);
    return data as Reservation;
  } catch (e) {
    console.warn('createReservation fallback demo:', e);
    return makeDemoReservation(input);
  }
}

function useLocalSession(stationId: string) {
  return !supabaseConfigured || isCustomDestinationId(stationId);
}

export async function startSession(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  reservationId?: string | null;
  pricePerKwh: number;
  powerKw?: number;
}) {
  if (useLocalSession(input.stationId)) {
    return createDemoSession({
      userId: input.userId,
      stationId: input.stationId,
      connectorId: input.connectorId,
      reservationId: input.reservationId,
      powerKw: input.powerKw,
    });
  }

  try {
    const { data, error } = await supabase
      .from('charging_sessions')
      .insert({
        user_id: input.userId,
        station_id: input.stationId,
        connector_id: input.connectorId,
        reservation_id: input.reservationId ?? null,
        energy_kwh: 0,
        power_kw: input.powerKw ?? 120,
        elapsed_minutes: 0,
        estimated_cost: 0,
        battery_percent: 32,
        status: 'charging',
      })
      .select('*')
      .single();
    if (error) throw error;
    await supabase.from('connectors').update({ status: 'occupied' }).eq('id', input.connectorId);
    return data as ChargingSession;
  } catch {
    // Fallback demo se RLS/rede falhar
    return createDemoSession({
      userId: input.userId,
      stationId: input.stationId,
      connectorId: input.connectorId,
      reservationId: input.reservationId,
      powerKw: input.powerKw,
    });
  }
}

export async function tickSession(
  sessionId: string,
  pricePerKwh: number,
  speed: ChargeSimSpeed = 'normal',
  dtSec?: number,
) {
  const preset = CHARGE_SPEED_PRESETS[speed];
  const dt = dtSec ?? preset.intervalMs / 1000;

  if (isDemoSessionId(sessionId) || getDemoSession(sessionId)) {
    return tickDemoSession(sessionId, pricePerKwh, speed, dt);
  }
  const { data: current, error } = await supabase.from('charging_sessions').select('*').eq('id', sessionId).single();
  if (error) throw error;
  const energy = Number(current.energy_kwh) + preset.energyPerSec * dt;
  const elapsed = Number(current.elapsed_minutes) + preset.minutesPerSec * dt;
  const battery = Math.min(100, Number(current.battery_percent) + preset.batteryPerSec * dt);
  const estimated = Number((energy * pricePerKwh).toFixed(2));
  const { data, error: uErr } = await supabase
    .from('charging_sessions')
    .update({
      energy_kwh: Number(energy.toFixed(2)),
      elapsed_minutes: Math.round(elapsed),
      battery_percent: Number(battery.toFixed(1)),
      power_kw: 110 + Math.random() * 20,
      estimated_cost: estimated,
    })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (uErr) throw uErr;
  return data as ChargingSession;
}

export async function endSession(sessionId: string, connectorId: string, pricePerKwh: number) {
  if (isDemoSessionId(sessionId) || getDemoSession(sessionId)) {
    const ended = endDemoSession(sessionId, pricePerKwh);
    try {
      const station = await fetchStationById(ended.station_id);
      await appendLocalHistory({
        userId: ended.user_id,
        sessionId: ended.id,
        stationId: ended.station_id,
        stationName: station?.name ?? 'Posto',
        connectorId: ended.connector_id,
        startedAt: ended.started_at,
        endedAt: ended.ended_at,
        energyKwh: ended.energy_kwh,
        finalCost: Number(ended.final_cost ?? ended.estimated_cost ?? 0),
      });
    } catch {
      /* histórico local best-effort */
    }
    return ended;
  }
  const { data: current, error } = await supabase.from('charging_sessions').select('*').eq('id', sessionId).single();
  if (error) throw error;
  const finalCost = Number((Number(current.energy_kwh) * pricePerKwh).toFixed(2));
  const { data, error: uErr } = await supabase
    .from('charging_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      final_cost: finalCost,
      estimated_cost: finalCost,
    })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (uErr) throw uErr;
  await supabase.from('connectors').update({ status: 'free' }).eq('id', connectorId);
  return data as ChargingSession;
}

const demoPayments = new Map<string, Payment>();

function makeDemoPayment(input: {
  sessionId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  pixPayload?: string | null;
}): Payment {
  const payment: Payment = {
    id: `demo-payment-${Date.now().toString(36)}`,
    session_id: input.sessionId,
    user_id: input.userId,
    amount: input.amount,
    method: input.method,
    status: 'pending',
    pix_payload: input.method === 'pix' ? input.pixPayload ?? null : null,
    paid_at: null,
    created_at: new Date().toISOString(),
  };
  demoPayments.set(payment.id, payment);
  return payment;
}

export async function createPayment(input: {
  sessionId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  pixPayload?: string | null;
}) {
  if (!supabaseConfigured || isDemoSessionId(input.sessionId) || input.userId === 'demo-user') {
    return makeDemoPayment(input);
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      session_id: input.sessionId,
      user_id: input.userId,
      amount: input.amount,
      method: input.method,
      status: 'pending',
      pix_payload: input.method === 'pix' ? input.pixPayload ?? null : null,
    })
    .select('*')
    .single();
  if (error) {
    console.warn('createPayment fallback demo:', error.message);
    return makeDemoPayment(input);
  }
  return data as Payment;
}

export async function markPaymentPaid(paymentId: string) {
  const local = demoPayments.get(paymentId);
  if (local || paymentId.startsWith('demo-payment-') || !supabaseConfigured) {
    const base = local ?? {
      id: paymentId,
      session_id: 'demo',
      user_id: 'demo-user',
      amount: 0,
      method: 'pix' as PaymentMethod,
      status: 'pending' as const,
      pix_payload: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    };
    const paid: Payment = {
      ...base,
      status: 'paid',
      paid_at: new Date().toISOString(),
    };
    demoPayments.set(paymentId, paid);
    return paid;
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Payment;
}

export async function fetchUserHistory(userId: string) {
  const local = await getLocalHistory(userId);
  if (!supabaseConfigured || isLocalUserId(userId)) return local;

  try {
    const { data, error } = await supabase
      .from('charging_sessions')
      .select('*, stations(name), payments(amount, method, status, paid_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const remote = data ?? [];
    const remoteIds = new Set(remote.map((r: any) => r.id));
    return [...remote, ...local.filter((r) => !remoteIds.has(r.id))];
  } catch {
    return local;
  }
}

export async function toggleFavorite(userId: string, stationId: string, favorite: boolean) {
  await setLocalFavorite(userId, stationId, favorite);
  if (!supabaseConfigured || isLocalUserId(userId)) return;

  try {
    if (favorite) {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, station_id: stationId });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('station_id', stationId);
      if (error) throw error;
    }
  } catch (err) {
    console.warn('toggleFavorite remote:', err);
  }
}

export async function fetchFavorites(userId: string) {
  const localIds = await getLocalFavoriteIds(userId);
  const localRows = localIds.map((station_id) => ({ station_id }));

  if (!supabaseConfigured || isLocalUserId(userId)) return localRows;

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('station_id, stations(*, connectors(*))')
      .eq('user_id', userId);
    if (error) throw error;
    const remote = data ?? [];
    const remoteIds = new Set(remote.map((f: any) => f.station_id));
    return [...remote, ...localRows.filter((f) => !remoteIds.has(f.station_id))];
  } catch {
    return localRows;
  }
}

export async function isFavorite(userId: string, stationId: string) {
  const ids = await getLocalFavoriteIds(userId);
  return ids.includes(stationId);
}
