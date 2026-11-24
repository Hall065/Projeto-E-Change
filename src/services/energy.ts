import { haversineKm } from '../lib/format';
import type { StationWithMetrics } from '../types/database';
import type { BatteryState, VehicleProfile } from '../types/vehicle';
import type { LatLng, NavRoute } from './routing';

export type EnergyEstimate = {
  distanceKm: number;
  consumptionKwh: number;
  startPercent: number;
  arrivalPercent: number;
  usableKwh: number;
  availableKwh: number;
  reservePercent: number;
  viable: boolean;
  needsCharge: boolean;
  model: 'deterministic-avg-consumption';
  note: string;
};

export type ChargeStopPlan = {
  station: StationWithMetrics;
  arrivePercent: number;
  departPercent: number;
  chargeKwh: number;
  chargeMinutes: number;
  detourKm: number;
};

export type TripPlan = {
  estimate: EnergyEstimate;
  stops: ChargeStopPlan[];
  finalArrivalPercent: number;
  totalChargeMinutes: number;
  feasible: boolean;
  message: string;
};

export function availableEnergyKwh(vehicle: VehicleProfile, battery: BatteryState) {
  return (vehicle.usableBatteryKwh * battery.percent) / 100;
}

export function estimateRouteEnergy(
  vehicle: VehicleProfile,
  battery: BatteryState,
  distanceKm: number,
): EnergyEstimate {
  const consumptionKwh = (distanceKm * vehicle.consumptionKwhPer100km) / 100;
  const availableKwh = availableEnergyKwh(vehicle, battery);
  const arrivalKwh = availableKwh - consumptionKwh;
  const arrivalPercent = Math.max(0, Math.min(100, (arrivalKwh / vehicle.usableBatteryKwh) * 100));
  const needsCharge = arrivalPercent < vehicle.reservePercent;
  const viable = arrivalPercent >= vehicle.reservePercent;

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    consumptionKwh: Number(consumptionKwh.toFixed(2)),
    startPercent: battery.percent,
    arrivalPercent: Number(arrivalPercent.toFixed(1)),
    usableKwh: vehicle.usableBatteryKwh,
    availableKwh: Number(availableKwh.toFixed(2)),
    reservePercent: vehicle.reservePercent,
    viable,
    needsCharge,
    model: 'deterministic-avg-consumption',
    note: 'Estimativa simplificada com consumo médio do veículo. Sem telemetria OBD/API do carro.',
  };
}

/**
 * Tempo de carga aproximado: assume ~70% da potência nominal média
 * (curvas reais variam; documentado como aproximação).
 */
export function estimateChargeMinutes(kwhNeeded: number, chargerKw: number, vehicleMaxKw: number) {
  const effectiveKw = Math.max(5, Math.min(chargerKw, vehicleMaxKw) * 0.7);
  return Math.max(5, Math.round((kwhNeeded / effectiveKw) * 60));
}

function stationCompatible(station: StationWithMetrics, vehicle: VehicleProfile) {
  const types = new Set((station.connectors ?? []).map((c) => c.connector_type));
  return vehicle.connectors.some((c) => types.has(c));
}

function bestChargerKw(station: StationWithMetrics, vehicle: VehicleProfile) {
  const compatible = (station.connectors ?? []).filter((c) => vehicle.connectors.includes(c.connector_type));
  if (!compatible.length) return 0;
  return Math.max(...compatible.map((c) => c.max_power_kw));
}

/**
 * Planejador guloso ao longo da rota: escolhe estações próximas ao corredor
 * quando a autonomia projetada cair abaixo da reserva.
 */
export function planChargeStops(input: {
  vehicle: VehicleProfile;
  battery: BatteryState;
  route: NavRoute;
  stations: StationWithMetrics[];
  origin: LatLng;
  destination: LatLng;
}): TripPlan {
  const { vehicle, battery, route, stations, origin, destination } = input;
  const estimate = estimateRouteEnergy(vehicle, battery, route.distanceKm);
  if (estimate.viable) {
    return {
      estimate,
      stops: [],
      finalArrivalPercent: estimate.arrivalPercent,
      totalChargeMinutes: 0,
      feasible: true,
      message: 'Autonomia suficiente com a reserva configurada.',
    };
  }

  // Subamostra o corredor — polylines OSRM têm milhares de pontos e travavam a UI ao trocar de alternativa
  const rawCorridor = route.coordinates.length > 1 ? route.coordinates : [origin, destination];
  const step = Math.max(1, Math.ceil(rawCorridor.length / 48));
  const corridor = rawCorridor.filter((_, i) => i % step === 0 || i === rawCorridor.length - 1);
  const candidates = stations
    .filter((s) => stationCompatible(s, vehicle) && bestChargerKw(s, vehicle) > 0)
    .map((s) => {
      let minDetour = Number.POSITIVE_INFINITY;
      for (const p of corridor) {
        const d = haversineKm(p.latitude, p.longitude, s.latitude, s.longitude);
        if (d < minDetour) minDetour = d;
      }
      return { station: s, detourKm: minDetour, power: bestChargerKw(s, vehicle) };
    })
    .filter((c) => c.detourKm <= 8)
    .sort((a, b) => a.detourKm - b.detourKm || b.power - a.power);

  if (!candidates.length) {
    return {
      estimate,
      stops: [],
      finalArrivalPercent: estimate.arrivalPercent,
      totalChargeMinutes: 0,
      feasible: false,
      message: 'Sem estações compatíveis no corredor da rota para completar a viagem com a reserva atual.',
    };
  }

  const stops: ChargeStopPlan[] = [];
  let percent = battery.percent;
  let remainingKm = route.distanceKm;
  let safety = 0;

  while (remainingKm > 0 && safety < 4) {
    safety += 1;
    const rangeKm = ((percent - vehicle.reservePercent) / 100) * vehicle.usableBatteryKwh / (vehicle.consumptionKwhPer100km / 100);
    if (rangeKm >= remainingKm) break;

    const targetDistance = Math.max(5, rangeKm * 0.75);
    const traveled = route.distanceKm - remainingKm;
    const pick =
      candidates.find((c) => {
        const fromStart = haversineKm(origin.latitude, origin.longitude, c.station.latitude, c.station.longitude);
        return fromStart >= traveled * 0.4 && fromStart <= traveled + targetDistance + 12 && !stops.some((s) => s.station.id === c.station.id);
      }) ?? candidates.find((c) => !stops.some((s) => s.station.id === c.station.id));

    if (!pick) break;

    const toStationKm = haversineKm(
      // approx position along remaining trip
      origin.latitude + (destination.latitude - origin.latitude) * (traveled / Math.max(route.distanceKm, 0.1)),
      origin.longitude + (destination.longitude - origin.longitude) * (traveled / Math.max(route.distanceKm, 0.1)),
      pick.station.latitude,
      pick.station.longitude,
    );
    const arriveEstimate = estimateRouteEnergy(vehicle, { ...battery, percent }, Math.max(toStationKm, 1));
    const arrivePercent = arriveEstimate.arrivalPercent;
    const departPercent = Math.min(90, Math.max(arrivePercent + 25, vehicle.reservePercent + 40));
    const chargeKwh = ((departPercent - arrivePercent) / 100) * vehicle.usableBatteryKwh;
    const chargeMinutes = estimateChargeMinutes(chargeKwh, pick.power, vehicle.maxChargeKw);

    stops.push({
      station: pick.station,
      arrivePercent: Number(arrivePercent.toFixed(1)),
      departPercent: Number(departPercent.toFixed(1)),
      chargeKwh: Number(Math.max(0, chargeKwh).toFixed(2)),
      chargeMinutes,
      detourKm: Number(pick.detourKm.toFixed(1)),
    });

    percent = departPercent;
    const afterStopToDest = haversineKm(pick.station.latitude, pick.station.longitude, destination.latitude, destination.longitude);
    remainingKm = afterStopToDest;
  }

  const final = estimateRouteEnergy(vehicle, { ...battery, percent }, remainingKm);
  const feasible = final.arrivalPercent >= vehicle.reservePercent;
  return {
    estimate,
    stops,
    finalArrivalPercent: final.arrivalPercent,
    totalChargeMinutes: stops.reduce((acc, s) => acc + s.chargeMinutes, 0),
    feasible,
    message: feasible
      ? `Viagem viável com ${stops.length} parada(s) de recarga (modelo determinístico).`
      : 'Não foi possível montar uma sequência viável de recargas com os postos disponíveis.',
  };
}
