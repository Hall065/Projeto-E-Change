import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
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

/** Centro de mapa só enquanto não há GPS — NUNCA tratar como posição do usuário. */
const MAP_PARK: DeviceLocation = {
  ...mapConfig.defaultCenter,
  heading: null,
  speedMps: null,
  accuracy: null,
  timestamp: 0,
};

/**
 * Cache do último GPS real entre montagens de tela.
 * Sem isso, cada `router.push` zera hasFix e a tela de rota “quebra”
 * (fica em “aguardando GPS” / limpa alternativas) ao trocar de posto.
 */
let lastKnownFix: DeviceLocation | null = null;
const FIX_MAX_AGE_MS = 5 * 60_000;

function toDeviceLocation(coords: {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}, timestamp: number): DeviceLocation {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    heading: coords.heading != null && coords.heading >= 0 ? coords.heading : null,
    speedMps: coords.speed != null && coords.speed >= 0 ? coords.speed : null,
    accuracy: coords.accuracy ?? null,
    timestamp,
  };
}

/** Geolocation nativa do browser — mais confiável que expo-location no web. */
function webGetCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização indisponível neste navegador'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

function webWatchPosition(onOk: (p: GeolocationPosition) => void, onErr: (e: GeolocationPositionError) => void) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return -1;
  return navigator.geolocation.watchPosition(onOk, onErr, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 2000,
  });
}

function geoErrorMessage(code?: number, message?: string) {
  if (code === 1) {
    return Platform.OS === 'web'
      ? 'Permissão de localização bloqueada — clique no cadeado da barra de endereço e permita localização'
      : 'Permissão de localização negada';
  }
  if (code === 2) return 'GPS indisponível — verifique se a localização do dispositivo está ligada';
  if (code === 3) return 'Tempo esgotado ao obter GPS — tente de novo';
  return message ?? 'Falha ao obter GPS do dispositivo';
}

function readCachedFix(): DeviceLocation | null {
  if (!lastKnownFix) return null;
  if (Date.now() - lastKnownFix.timestamp > FIX_MAX_AGE_MS) return null;
  return lastKnownFix;
}

export function useDeviceLocation(options?: { watch?: boolean; distanceInterval?: number }) {
  const watch = options?.watch ?? true;
  const cached = readCachedFix();
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [location, setLocation] = useState<DeviceLocation>(cached ?? MAP_PARK);
  const [ready, setReady] = useState(!!cached);
  const [error, setError] = useState<string | null>(null);
  /** true somente com coordenada real do dispositivo/navegador */
  const [hasFix, setHasFix] = useState(!!cached);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchId = useRef<number>(-1);
  const locationRef = useRef(location);
  const hasFixRef = useRef(hasFix);
  locationRef.current = location;
  hasFixRef.current = hasFix;

  const apply = useCallback((coords: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
    accuracy?: number | null;
  }, timestamp: number) => {
    // Rejeita coordenadas inválidas / (0,0)
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
    if (Math.abs(coords.latitude) < 0.01 && Math.abs(coords.longitude) < 0.01) return;
    const next = toDeviceLocation(coords, timestamp);
    lastKnownFix = next;
    setLocation(next);
    setHasFix(true);
    setError(null);
  }, []);

  const refresh = useCallback(async (): Promise<DeviceLocation> => {
    try {
      if (Platform.OS === 'web') {
        try {
          const pos = await webGetCurrentPosition();
          const next = toDeviceLocation(
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
            },
            pos.timestamp,
          );
          lastKnownFix = next;
          setLocation(next);
          setHasFix(true);
          setError(null);
          setPermission(Location.PermissionStatus.GRANTED);
          setReady(true);
          return next;
        } catch (e: any) {
          const msg = geoErrorMessage(e?.code, e?.message);
          setError(msg);
          setReady(true);
          return hasFixRef.current ? locationRef.current : readCachedFix() ?? MAP_PARK;
        }
      }

      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        setError('Serviços de localização desativados no dispositivo');
        setReady(true);
        return hasFixRef.current ? locationRef.current : MAP_PARK;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') {
        setError('Permissão de localização negada');
        setReady(true);
        return hasFixRef.current ? locationRef.current : MAP_PARK;
      }

      // Última conhecida rápido, depois precisão alta
      const last = await Location.getLastKnownPositionAsync();
      if (last && !hasFixRef.current) {
        apply(last.coords, last.timestamp);
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      });
      const next = toDeviceLocation(pos.coords, pos.timestamp);
      lastKnownFix = next;
      setLocation(next);
      setHasFix(true);
      setError(null);
      setReady(true);
      return next;
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao obter GPS do dispositivo');
      setReady(true);
      return hasFixRef.current ? locationRef.current : readCachedFix() ?? MAP_PARK;
    }
  }, [apply]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Dispara o prompt do browser imediatamente
          try {
            const pos = await webGetCurrentPosition();
            if (!mounted) return;
            apply(
              {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                accuracy: pos.coords.accuracy,
              },
              pos.timestamp,
            );
            setPermission(Location.PermissionStatus.GRANTED);
            setReady(true);
          } catch (e: any) {
            if (!mounted) return;
            setError(geoErrorMessage(e?.code, e?.message));
            setReady(true);
          }

          if (watch && mounted) {
            webWatchId.current = webWatchPosition(
              (pos) => {
                if (!mounted) return;
                apply(
                  {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    accuracy: pos.coords.accuracy,
                  },
                  pos.timestamp,
                );
              },
              (err) => {
                if (!mounted || hasFixRef.current) return;
                setError(geoErrorMessage(err.code, err.message));
              },
            );
          }
          return;
        }

        const services = await Location.hasServicesEnabledAsync();
        if (!mounted) return;
        if (!services) {
          setError('Ative a localização do dispositivo');
          setReady(true);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        setPermission(status);
        if (status !== 'granted') {
          setError('Ative a localização do dispositivo para navegar');
          setReady(true);
          return;
        }

        const last = await Location.getLastKnownPositionAsync();
        if (mounted && last) apply(last.coords, last.timestamp);

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (!mounted) return;
        apply(pos.coords, pos.timestamp);
        setReady(true);

        if (!watch) return;

        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: options?.distanceInterval ?? 5,
            mayShowUserSettingsDialog: true,
          },
          (next) => {
            if (!mounted) return;
            apply(next.coords, next.timestamp);
          },
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'GPS indisponível neste dispositivo');
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
      subRef.current?.remove();
      subRef.current = null;
      if (webWatchId.current >= 0 && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(webWatchId.current);
        webWatchId.current = -1;
      }
    };
  }, [watch, options?.distanceInterval, apply]);

  return {
    location,
    permission,
    ready,
    error,
    hasFix,
    refresh,
    /** Só use como “você está aqui” quando hasFix === true */
    coord: { latitude: location.latitude, longitude: location.longitude },
    heading: location.heading,
    speedKmh: location.speedMps != null ? Math.round(location.speedMps * 3.6) : 0,
  };
}
