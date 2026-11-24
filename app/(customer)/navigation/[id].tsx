import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas, type MapCanvasHandle } from '../../../src/components/MapCanvas';
import { NavInstructionBanner } from '../../../src/components/navigation/NavInstructionBanner';
import { NavBottomDock } from '../../../src/components/navigation/NavBottomDock';
import { NavSpeedometer } from '../../../src/components/navigation/NavSpeedometer';
import { Icon } from '../../../src/components/Icon';
import { useJourney } from '../../../src/context/JourneyContext';
import { useVehicle } from '../../../src/context/VehicleContext';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import { haversineKm } from '../../../src/lib/format';
import { estimateRouteEnergy } from '../../../src/services/energy';
import { computeNavProgress } from '../../../src/services/navigationEngine';
import { detectPathManeuvers, fetchDrivingRoute, type NavRoute } from '../../../src/services/routing';
import { fetchStationById } from '../../../src/services/stations';
import type { MapPerspective } from '../../../src/maps/types';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily } from '../../../src/theme/fonts';
import { elevation, radius } from '../../../src/theme/tokens';

export default function NavigationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { station, setStation, navRoute, setNavRoute } = useJourney();
  const { vehicle, battery } = useVehicle();
  const mapRef = useRef<MapCanvasHandle>(null);
  const { coord, location, speedKmh, ready, hasFix, error, refresh } = useDeviceLocation({
    watch: true,
    distanceInterval: 2,
  });

  const [route, setRoute] = useState<NavRoute | null>(navRoute);
  const [follow, setFollow] = useState(true);
  const [perspective, setPerspective] = useState<MapPerspective>('nav3d');
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const recalcLock = useRef(false);

  useEffect(() => {
    if (station?.id === id || !id) return;
    fetchStationById(id, coord).then((s) => {
      if (s) setStation(s);
    });
  }, [id]);

  useEffect(() => {
    if (!station || !ready || !hasFix) return;
    let cancelled = false;
    (async () => {
      // Mantém a alternativa escolhida no preview (não sobrescreve com a rota [0])
      const end = navRoute?.coordinates?.[navRoute.coordinates.length - 1];
      const matchesDestination =
        !!navRoute &&
        !!end &&
        navRoute.coordinates.length > 1 &&
        haversineKm(end.latitude, end.longitude, station.latitude, station.longitude) < 0.8;

      if (matchesDestination) {
        setRoute(navRoute);
        return;
      }

      const r = await fetchDrivingRoute(
        { latitude: coord.latitude, longitude: coord.longitude },
        { latitude: station.latitude, longitude: station.longitude },
      );
      if (cancelled) return;
      setRoute(r);
      setNavRoute(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [station?.id, ready, hasFix]);

  const lookAheadM = useMemo(() => {
    const speed = typeof speedKmh === 'number' ? speedKmh : 0;
    if (speed > 80) return 140;
    if (speed > 50) return 110;
    if (speed > 25) return 85;
    return 65;
  }, [speedKmh]);

  const progress = useMemo(
    () =>
      computeNavProgress({
        route,
        user: coord,
        deviceHeading: location.heading ?? null,
        lookAheadM,
      }),
    [route, coord.latitude, coord.longitude, location.heading, lookAheadM],
  );

  /** Próximos passos = curvas detectadas na linha azul (não texto fixo do OSRM). */
  const bannerStep = useMemo(() => {
    type Upcoming = { step: NonNullable<typeof progress.step>; distanceM?: number };
    const line =
      progress.remainingLine.length > 2
        ? progress.remainingLine
        : route?.coordinates?.length
          ? route.coordinates
          : [];

    if (line.length < 4) {
      return {
        step: progress.step,
        index: progress.stepIndex,
        upcoming: [] as Upcoming[],
        distanceM: progress.distanceToManeuverM,
      };
    }

    const maneuvers = detectPathManeuvers(line, 0, { minTurnDeg: 30, minGapM: 40, max: 5 });
    const turns = maneuvers.filter((m) => m.turnSide !== 'straight' || m.step.instruction.includes('Chegue'));
    const current = turns[0] ?? maneuvers[maneuvers.length - 1];
    const upcoming: Upcoming[] = turns.slice(1, 4).map((m) => ({
      step: m.step,
      distanceM: Math.max(30, m.distanceM),
    }));

    // Nome da via: tenta casar com step OSRM mais próximo (só rótulo)
    const osrm = route?.steps ?? [];
    if (current && osrm.length) {
      let best = osrm[0];
      let bestD = Number.POSITIVE_INFINITY;
      for (const s of osrm) {
        const d =
          Math.abs(s.location.latitude - current.location.latitude) +
          Math.abs(s.location.longitude - current.location.longitude);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      if (best?.name) current.step.name = best.name;
    }

    return {
      step: current?.step ?? progress.step,
      index: progress.stepIndex,
      upcoming,
      distanceM: Math.max(10, current?.distanceM ?? progress.distanceToManeuverM),
    };
  }, [
    progress.remainingLine,
    progress.step,
    progress.stepIndex,
    progress.distanceToManeuverM,
    route?.coordinates,
    route?.steps,
  ]);

  const bannerDistanceM = bannerStep.distanceM ?? progress.distanceToManeuverM;

  useEffect(() => {
    if (!hasFix || !station || !route || progress.offRouteKm < 0.12 || recalcLock.current) return;
    recalcLock.current = true;
    setRecalcMsg('Recalculando rota…');
    (async () => {
      try {
        const r = await fetchDrivingRoute(coord, {
          latitude: station.latitude,
          longitude: station.longitude,
        });
        setRoute(r);
        setNavRoute(r);
        setRecalcMsg('Rota atualizada');
        setTimeout(() => setRecalcMsg(null), 1400);
      } catch {
        setRecalcMsg('Falha ao recalcular');
        setTimeout(() => setRecalcMsg(null), 1800);
      } finally {
        setTimeout(() => {
          recalcLock.current = false;
        }, 4000);
      }
    })();
  }, [progress.offRouteKm, station?.id, hasFix]);

  const energy = useMemo(
    () => estimateRouteEnergy(vehicle, battery, progress.remainingKm),
    [vehicle, battery, progress.remainingKm],
  );

  const applyPerspective = (p: MapPerspective) => {
    setPerspective(p);
  };

  const onRecenter = () => {
    setFollow(true);
    void refresh();
    mapRef.current?.recenter({
      latitude: progress.snappedCoord.latitude,
      longitude: progress.snappedCoord.longitude,
      cameraLat: progress.cameraTarget.latitude,
      cameraLng: progress.cameraTarget.longitude,
      heading: progress.heading,
      perspective,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      <MapCanvas
        ref={mapRef}
        stations={station ? [station] : []}
        height="100%"
        perspective={perspective}
        dark={isDark}
        followUser={follow && hasFix}
        navigationMode
        showRoute
        routeCoordinates={progress.remainingLine.length ? progress.remainingLine : route?.coordinates}
        traveledCoordinates={progress.traveledLine}
        userCoord={hasFix ? progress.snappedCoord : undefined}
        userHeading={hasFix ? progress.heading : null}
        cameraTarget={hasFix ? progress.cameraTarget : undefined}
        focus={hasFix ? progress.snappedCoord : undefined}
        hideUserMarker={!hasFix}
        style={{ flex: 1 }}
      />

      {/* Topo: card flutuante, afastado das bordas */}
      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <View style={styles.bannerWrap}>
          <NavInstructionBanner
            step={bannerStep.step}
            distanceM={bannerDistanceM}
            streetFallback={station?.name}
            upcoming={bannerStep.upcoming}
          />
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.perspGroup, elevation.float, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => applyPerspective('top')}
              style={[styles.perspBtn, perspective === 'top' && styles.perspActive]}
            >
              <Icon name="map-outline" size={18} color={perspective === 'top' ? '#fff' : colors.ink} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fontFamily.bold,
                  color: perspective === 'top' ? '#fff' : colors.ink,
                  marginTop: 2,
                }}
              >
                Topo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => applyPerspective('nav3d')}
              style={[styles.perspBtn, perspective === 'nav3d' && styles.perspActive]}
            >
              <Icon name="navigate" size={18} color={perspective === 'nav3d' ? '#fff' : colors.ink} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fontFamily.bold,
                  color: perspective === 'nav3d' ? '#fff' : colors.ink,
                  marginTop: 2,
                }}
              >
                3D
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.iconFab, elevation.float, { backgroundColor: colors.surface }]}
            onPress={onRecenter}
          >
            <Icon name="locate" size={22} color={colors.blue} />
          </Pressable>

          <Pressable
            style={[styles.iconFab, elevation.float, { backgroundColor: colors.surface }]}
            onPress={() => setFollow((f) => !f)}
          >
            <Icon name={follow ? 'lock-closed' : 'lock-open'} size={18} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {recalcMsg ? (
        <View style={[styles.toast, { top: Math.max(insets.top, 12) + 150, backgroundColor: colors.overlay }]}>
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, fontSize: 12 }}>{recalcMsg}</Text>
        </View>
      ) : null}

      {!hasFix ? (
        <Pressable
          style={[styles.gpsBanner, { top: Math.max(insets.top, 12) + 150, backgroundColor: '#000' }]}
          onPress={() => void refresh()}
        >
          <Icon name="warning-outline" size={16} color="#FFC043" />
          <Text style={{ color: '#fff', fontFamily: fontFamily.bold, flex: 1 }}>
            {error ?? 'Ative a localização do dispositivo'}
          </Text>
          <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>Tentar</Text>
        </Pressable>
      ) : null}

      {progress.offRouteKm >= 0.08 && hasFix && !recalcMsg ? (
        <View style={[styles.offRoute, { top: Math.max(insets.top, 12) + 150 }]}>
          <Icon name="warning-outline" size={14} color="#FFC043" />
          <Text style={{ color: '#fff', fontFamily: fontFamily.semibold, fontSize: 12 }}>Fora da rota</Text>
        </View>
      ) : null}

      {/* Velocímetro — posição padrão Waze: baixo-esquerda, acima do dock */}
      <View
        pointerEvents="none"
        style={[styles.speedAnchor, { bottom: Math.max(insets.bottom, 10) + 168 }]}
      >
        <NavSpeedometer speedKmh={speedKmh} />
      </View>

      <NavBottomDock
        remainingKm={progress.remainingKm}
        remainingMin={progress.remainingMin}
        batteryPercent={energy.arrivalPercent}
        batteryOk={energy.viable}
        destination={station?.name}
        onArrive={() => router.push(`/(customer)/arrival/${id}`)}
        onEnd={() => router.replace('/(customer)/(tabs)/map')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 0,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerWrap: {
    flex: 1,
    minWidth: 0,
  },
  rightCol: {
    gap: 8,
    alignItems: 'center',
    paddingTop: 2,
  },
  perspGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E2E2',
  },
  perspBtn: {
    width: 56,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  perspActive: { backgroundColor: '#000' },
  iconFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedAnchor: {
    position: 'absolute',
    left: 18,
  },
  gpsBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  offRoute: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
