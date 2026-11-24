import type { ConnectorType } from './database';

export type VehicleProfile = {
  id: string;
  make: string;
  model: string;
  year: number;
  /** Capacidade útil (kWh) */
  usableBatteryKwh: number;
  /** Consumo médio declarado (kWh/100 km) */
  consumptionKwhPer100km: number;
  /** Potência máxima de recarga DC aceita (kW) */
  maxChargeKw: number;
  connectors: ConnectorType[];
  /** Reserva mínima de segurança (%) */
  reservePercent: number;
};

export type BatteryState = {
  /** Percentual informado manualmente — NÃO é telemetria real do veículo */
  percent: number;
  source: 'manual';
  updatedAt: string;
};

export const DEFAULT_VEHICLE: VehicleProfile = {
  id: 'manual-generic-ev',
  make: 'Genérico',
  model: 'EV Compact',
  year: 2024,
  usableBatteryKwh: 58,
  consumptionKwhPer100km: 16.5,
  maxChargeKw: 120,
  connectors: ['CCS', 'Type2'],
  reservePercent: 15,
};
