import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { mapConfig } from '../lib/config';

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speedMps: number | null;
  accuracy: number | null;
  timestamp: number;
};

export function useDeviceLocation(options?: { watch?: boolean; distanceInterval?: number }) {
  const watch = options?.watch ?? true;
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [location, setLocation] = useState<DeviceLocation>({
    ...mapConfig.defaultCenter,
    heading: null,
    speedMps: null,
    accuracy: null,
    timestamp: Date.now(),
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const apply = useCallback((coords: Location.LocationObjectCoords, timestamp: number) => {
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading != null && coords.heading >= 0 ? coords.heading : null,
      speedMps: coords.speed != null && coords.speed >= 0 ? coords.speed : null,
      accuracy: coords.accuracy ?? null,
      timestamp,
    });
  }, []);

  const refresh = useCallback(async (): Promise<DeviceLocation> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') {
        setError('Permissão de localização negada');
        setReady(true);
        return {
          ...mapConfig.defaultCenter,
          heading: null,
          speedMps: null,
          accuracy: null,
          timestamp: Date.now(),
        };
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next: DeviceLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading != null && pos.coords.heading >= 0 ? pos.coords.heading : null,
        speedMps: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp,
      };
      apply(pos.coords, pos.timestamp);
      setError(null);
      setReady(true);
      return next;
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao obter GPS');
      setReady(true);
      return {
        ...mapConfig.defaultCenter,
        heading: null,
        speedMps: null,
        accuracy: null,
        timestamp: Date.now(),
      };
    }
  }, [apply]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      setPermission(status);
      if (status !== 'granted') {
        setError('Ative a localização do dispositivo para navegar como no Waze/Uber.');
        setReady(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted) return;
        apply(pos.coords, pos.timestamp);
        setReady(true);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'GPS indisponível');
        setReady(true);
      }

      if (!watch) return;
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: options?.distanceInterval ?? 5,
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          if (!mounted) return;
          apply(pos.coords, pos.timestamp);
        },
      );
    })();

    return () => {
      mounted = false;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [watch, options?.distanceInterval, apply]);

  return {
    location,
    permission,
    ready,
    error,
    refresh,
    coord: { latitude: location.latitude, longitude: location.longitude },
    heading: location.heading,
    speedKmh: location.speedMps != null ? Math.round(location.speedMps * 3.6) : 0,
  };
}
