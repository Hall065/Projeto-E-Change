import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_VEHICLE, type BatteryState, type VehicleProfile } from '../types/vehicle';

type VehicleContextValue = {
  vehicle: VehicleProfile;
  battery: BatteryState;
  setVehicle: (v: VehicleProfile) => void;
  setBatteryPercent: (percent: number) => void;
  updateVehicle: (patch: Partial<VehicleProfile>) => void;
};

const VEHICLE_KEY = 'echarge.vehicle.profile';
const BATTERY_KEY = 'echarge.vehicle.battery';
const VehicleContext = createContext<VehicleContextValue | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [vehicle, setVehicleState] = useState<VehicleProfile>(DEFAULT_VEHICLE);
  const [battery, setBattery] = useState<BatteryState>({
    percent: 72,
    source: 'manual',
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    (async () => {
      try {
        const [vRaw, bRaw] = await Promise.all([
          AsyncStorage.getItem(VEHICLE_KEY),
          AsyncStorage.getItem(BATTERY_KEY),
        ]);
        if (vRaw) setVehicleState({ ...DEFAULT_VEHICLE, ...JSON.parse(vRaw) });
        if (bRaw) {
          const parsed = JSON.parse(bRaw) as BatteryState;
          setBattery({
            percent: Math.max(1, Math.min(100, Number(parsed.percent) || 72)),
            source: 'manual',
            updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          });
        }
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const setVehicle = useCallback((v: VehicleProfile) => {
    setVehicleState(v);
    void AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(v));
  }, []);

  const updateVehicle = useCallback((patch: Partial<VehicleProfile>) => {
    setVehicleState((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setBatteryPercent = useCallback((percent: number) => {
    const nextPercent = Math.max(1, Math.min(100, Math.round(percent)));
    setBattery((prev) => {
      if (prev.percent === nextPercent && prev.source === 'manual') return prev;
      const next: BatteryState = {
        percent: nextPercent,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      };
      void AsyncStorage.setItem(BATTERY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ vehicle, battery, setVehicle, setBatteryPercent, updateVehicle }),
    [vehicle, battery, setVehicle, setBatteryPercent, updateVehicle],
  );

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicle() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider');
  return ctx;
}
