import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { mapConfig, SENAI_LUIZ_VARGA } from '../lib/config';

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speedMps: number | null;
  accuracy: number | null;
  timestamp: number;
};

/** Campus SENAI Luiz Varga (Limeira) — fallback quando GPS está bloqueado (ex.: PCs do SENAI). */
const CAMPUS_FALLBACK: DeviceLocation = {
  latitude: SENAI_LUIZ_VARGA.latitude,
  longitude: SENAI_LUIZ_VARGA.longitude,
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
function webGetCurrentPosition(opts?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização indisponível neste navegador'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      // Fix rápido primeiro (cached/rede); precisão alta fica no watch
      enableHighAccuracy: opts?.enableHighAccuracy ?? false,
      timeout: opts?.timeout ?? 4000,
      maximumAge: opts?.maximumAge ?? 60_000,
    });
  });
}

function webWatchPosition(onOk: (p: GeolocationPosition) => void, onErr: (e: GeolocationPositionError) => void) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return -1;
  return navigator.geolocation.watchPosition(onOk, onErr, {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 5000,
  });
}

function geoErrorMessage(code?: number, message?: string) {
  const campus = `Usando localização padrão: ${SENAI_LUIZ_VARGA.label}`;
  if (code === 1) {
    return Platform.OS === 'web'
      ? `Localização bloqueada no navegador/PC. ${campus}`
      : `Permissão de localização negada. ${campus}`;
  }
  if (code === 2) return `GPS indisponível. ${campus}`;
  if (code === 3) return `Tempo esgotado ao obter GPS. ${campus}`;
  return message ? `${message}. ${campus}` : `GPS indisponível. ${campus}`;
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
  const [location, setLocation] = useState<DeviceLocation>(cached ?? CAMPUS_FALLBACK);
  const [ready, setReady] = useState(!!cached);
  const [error, setError] = useState<string | null>(null);
  /** true com GPS real OU fallback de campus (permite mapa/rota no PC do SENAI) */
  const [hasFix, setHasFix] = useState(!!cached);
  /** true quando a posição é o campus SENAI (GPS bloqueado/indisponível) */
  const [isFallback, setIsFallback] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchId = useRef<number>(-1);
  const locationRef = useRef(location);
  const hasFixRef = useRef(hasFix);
  const isFallbackRef = useRef(isFallback);
  locationRef.current = location;
  hasFixRef.current = hasFix;
  isFallbackRef.current = isFallback;

  const applyCampusFallback = useCallback((reason?: string) => {
    const next: DeviceLocation = {
      ...CAMPUS_FALLBACK,
      timestamp: Date.now(),
    };
    setLocation(next);
    setHasFix(true);
    setIsFallback(true);
    setError(reason ?? `Usando localização padrão: ${SENAI_LUIZ_VARGA.label}`);
    setReady(true);
    return next;
  }, []);

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
    setIsFallback(false);
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
          setIsFallback(false);
          setError(null);
          setPermission(Location.PermissionStatus.GRANTED);
          setReady(true);
          return next;
        } catch (e: any) {
          if (hasFixRef.current && !isFallbackRef.current) return locationRef.current;
          const cachedFix = readCachedFix();
          if (cachedFix) {
            setLocation(cachedFix);
            setHasFix(true);
            setIsFallback(false);
            setReady(true);
            return cachedFix;
          }
          return applyCampusFallback(geoErrorMessage(e?.code, e?.message));
        }
      }

      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        if (hasFixRef.current && !isFallbackRef.current) {
          setReady(true);
          return locationRef.current;
        }
        return applyCampusFallback('Serviços de localização desativados no dispositivo');
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') {
        if (hasFixRef.current && !isFallbackRef.current) {
          setReady(true);
          return locationRef.current;
        }
        return applyCampusFallback('Permissão de localização negada');
      }

      // Última conhecida rápido, depois precisão alta
      const last = await Location.getLastKnownPositionAsync();
      if (last && (!hasFixRef.current || isFallbackRef.current)) {
        apply(last.coords, last.timestamp);
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      const next = toDeviceLocation(pos.coords, pos.timestamp);
      lastKnownFix = next;
      setLocation(next);
      setHasFix(true);
      setIsFallback(false);
      setError(null);
      setReady(true);
      return next;
    } catch (e: any) {
      if (hasFixRef.current && !isFallbackRef.current) {
        setReady(true);
        return locationRef.current;
      }
      const cachedFix = readCachedFix();
      if (cachedFix) {
        setLocation(cachedFix);
        setHasFix(true);
        setIsFallback(false);
        setReady(true);
        return cachedFix;
      }
      return applyCampusFallback(e?.message ?? 'Falha ao obter GPS do dispositivo');
    }
  }, [apply, applyCampusFallback]);

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
            if (!hasFixRef.current || isFallbackRef.current) {
              applyCampusFallback(geoErrorMessage(e?.code, e?.message));
            } else {
              setReady(true);
            }
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
                if (!mounted) return;
                if (hasFixRef.current && !isFallbackRef.current) return;
                applyCampusFallback(geoErrorMessage(err.code, err.message));
              },
            );
          }
          return;
        }

        const services = await Location.hasServicesEnabledAsync();
        if (!mounted) return;
        if (!services) {
          applyCampusFallback('Serviços de localização desativados no dispositivo');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        setPermission(status);
        if (status !== 'granted') {
          applyCampusFallback('Permissão de localização negada');
          return;
        }

        const last = await Location.getLastKnownPositionAsync();
        if (mounted && last) {
          apply(last.coords, last.timestamp);
          setReady(true);
        }

        // Fix balanceado rápido; watch sobe a precisão depois
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        apply(pos.coords, pos.timestamp);
        setReady(true);

        if (!watch) return;

        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1500,
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
        if (!hasFixRef.current || isFallbackRef.current) {
          applyCampusFallback(e?.message ?? 'GPS indisponível neste dispositivo');
        } else {
          setReady(true);
        }
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
  }, [watch, options?.distanceInterval, apply, applyCampusFallback]);

  return {
    location,
    permission,
    ready,
    error,
    hasFix,
    isFallback,
    refresh,
    /** Use com hasFix — GPS real ou campus SENAI (fallback) */
    coord: { latitude: location.latitude, longitude: location.longitude },
    heading: location.heading,
    speedKmh: location.speedMps != null ? Math.round(location.speedMps * 3.6) : 0,
  };
}
