import { supabase } from '../lib/supabase';
import type { ChargingSession, Payment, PaymentMethod, Reservation } from '../types/database';

export async function createReservation(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  arrivesInMinutes: number;
}) {
  const arrives = new Date(Date.now() + input.arrivesInMinutes * 60_000);
  const grace = new Date(arrives.getTime() + 15 * 60_000);
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
}

export async function startSession(input: {
  userId: string;
  stationId: string;
  connectorId: string;
  reservationId?: string | null;
  pricePerKwh: number;
}) {
  const { data, error } = await supabase
    .from('charging_sessions')
    .insert({
      user_id: input.userId,
      station_id: input.stationId,
      connector_id: input.connectorId,
      reservation_id: input.reservationId ?? null,
      energy_kwh: 0,
      power_kw: 120,
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
}

export async function tickSession(sessionId: string, pricePerKwh: number) {
  const { data: current, error } = await supabase.from('charging_sessions').select('*').eq('id', sessionId).single();
  if (error) throw error;
  const energy = Number(current.energy_kwh) + 1.8;
  const elapsed = Number(current.elapsed_minutes) + 1;
  const battery = Math.min(100, Number(current.battery_percent) + 2);
  const estimated = Number((energy * pricePerKwh).toFixed(2));
  const { data, error: uErr } = await supabase
    .from('charging_sessions')
    .update({
      energy_kwh: energy,
      elapsed_minutes: elapsed,
      battery_percent: battery,
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

export async function createPayment(input: {
  sessionId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  pixPayload?: string | null;
}) {
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
  if (error) throw error;
  return data as Payment;
}

export async function markPaymentPaid(paymentId: string) {
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
  const { data, error } = await supabase
    .from('charging_sessions')
    .select('*, stations(name), payments(amount, method, status, paid_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleFavorite(userId: string, stationId: string, favorite: boolean) {
  if (favorite) {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, station_id: stationId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('station_id', stationId);
    if (error) throw error;
  }
}

export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('station_id, stations(*, connectors(*))')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}
